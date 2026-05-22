import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerateContentResult,
} from '@google/generative-ai';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IEmailClassification,
  IAILogData,
  IWebformClassification,
} from '../interfaces/ai.interface';
import {
  buildEmailClassificationPrompt,
  buildWebformClassificationPrompt,
} from '../prompts/ai.prompts';

/**
 * GeminiService
 * Service để tương tác với Gemini AI API
 * - Hỗ trợ rotation nhiều API keys
 * - Async logging để không ảnh hưởng hiệu suất
 */
@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private apiKeys: string[] = [];
  private currentKeyIndex = 0;
  private models: Map<number, GenerativeModel> = new Map();
  private modelName: string;
  private isEnabled = false;
  private lastExhaustionTime: number = 0;
  private readonly EXHAUSTION_COOLDOWN_MS = 60000; // 1 minute cooldown

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    // Parse comma-separated API keys
    const keysString = this.configService.get<string>('GEMINI_API_KEYS');
    if (keysString) {
      this.apiKeys = keysString
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      this.isEnabled = this.apiKeys.length > 0;
    }

    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';

    if (this.isEnabled) {
      this.logger.log(
        `Gemini AI initialized with ${this.apiKeys.length} API key(s)`,
      );
    } else {
      this.logger.warn('Gemini AI is disabled - no API keys configured');
    }
  }

  onModuleInit() {
    // Khởi tạo model cho từng API key
    this.apiKeys.forEach((key, index) => {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: this.modelName });
      this.models.set(index, model);
    });
  }

  /**
   * Kiểm tra xem service có được enable không
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Lấy model hiện tại
   */
  private getCurrentModel(): GenerativeModel | null {
    return this.models.get(this.currentKeyIndex) || null;
  }

  /**
   * Chuyển sang API key tiếp theo
   */
  private rotateToNextKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.logger.log(
      `Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`,
    );
  }

  /**
   * Phân loại email sử dụng Gemini AI
   * Xác định email là contact từ người dùng hay spam/quảng cáo
   */
  async classifyEmail(
    senderEmail: string,
    senderName: string,
    subject: string,
    content: string,
  ): Promise<IEmailClassification> {
    if (!this.isEnabled) {
      this.logger.warn(
        'Gemini AI is disabled, returning default classification',
      );
      return {
        isUserContact: true,
        isSpamOrAdvertising: false,
        category: 'contact',
        confidence: 0.5,
        reason: 'AI classification disabled',
      };
    }

    // Check if we're in cooldown period after exhaustion
    const timeSinceExhaustion = Date.now() - this.lastExhaustionTime;
    if (
      this.lastExhaustionTime > 0 &&
      timeSinceExhaustion < this.EXHAUSTION_COOLDOWN_MS
    ) {
      this.logger.warn(
        `In cooldown period (${Math.ceil((this.EXHAUSTION_COOLDOWN_MS - timeSinceExhaustion) / 1000)}s remaining)`,
      );
      return {
        isUserContact: true,
        isSpamOrAdvertising: false,
        category: 'contact',
        confidence: 0.4,
        reason: 'API keys in cooldown period',
      };
    }

    const startTime = Date.now();
    const prompt = buildEmailClassificationPrompt(
      senderEmail,
      senderName,
      subject,
      content,
    );

    // Thử với các API keys khác nhau nếu có lỗi quota
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) {
          throw new Error('No valid Gemini model available');
        }

        const response = await model.generateContent(prompt);
        const result = this.parseEmailClassificationResponse(response);
        const durationMs = Date.now() - startTime;

        // Async logging - không block response
        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'email_classification',
            inputText: prompt,
            outputText: response.response.text(),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
            metadata: {
              senderEmail,
              senderName,
              subject: subject.substring(0, 100),
            },
          });
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message.toLowerCase();

        // Kiểm tra các lỗi liên quan đến quota/rate limit
        if (
          errorMessage.includes('quota') ||
          errorMessage.includes('rate') ||
          errorMessage.includes('exceeded') ||
          errorMessage.includes('429')
        ) {
          this.logger.warn(
            `API key ${this.currentKeyIndex + 1} quota exceeded, rotating...`,
          );
          this.rotateToNextKey();
          continue;
        }

        // Lỗi khác - log và throw
        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'email_classification',
            inputText: prompt,
            durationMs: Date.now() - startTime,
            isSuccess: false,
            errorMessage: lastError?.message,
            metadata: { senderEmail, subject: subject.substring(0, 100) },
          });
        });
        throw error;
      }
    }

    // Tất cả API keys đều bị exhausted
    this.logger.error('All Gemini API keys exhausted');
    this.lastExhaustionTime = Date.now();

    // Return default classification instead of throwing to prevent cascading failures
    this.logger.warn('Returning default classification due to API exhaustion');
    return {
      isUserContact: true,
      isSpamOrAdvertising: false,
      category: 'contact',
      confidence: 0.3,
      reason: 'All API keys exhausted',
    };
  }

  /**
   * Parse response từ Gemini API cho phân loại email
   */
  private parseEmailClassificationResponse(
    response: GenerateContentResult,
  ): IEmailClassification {
    try {
      const text = response.response.text();
      // Xử lý trường hợp response có markdown code block
      const jsonText = text
        .replace(/```json?\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(jsonText);

      return {
        isUserContact: Boolean(parsed.isUserContact),
        isSpamOrAdvertising: Boolean(parsed.isSpamOrAdvertising),
        category: parsed.category || 'unknown',
        confidence: Number(parsed.confidence) || 0.5,
        reason: parsed.reason || undefined,
      };
    } catch (error) {
      this.logger.warn(
        'Failed to parse Gemini response, using default classification',
      );
      return {
        isUserContact: true,
        isSpamOrAdvertising: false,
        category: 'unknown',
        confidence: 0.3,
        reason: 'Failed to parse AI response',
      };
    }
  }

  /**
   * Phân loại form liên hệ từ website sử dụng Gemini AI
   * Prompt riêng biệt cho webform, khác với email
   */
  async classifyWebform(
    senderEmail: string,
    senderName: string,
    company: string | undefined,
    phone: string | undefined,
    subject: string,
    message: string,
  ): Promise<IWebformClassification> {
    if (!this.isEnabled) {
      this.logger.warn(
        'Gemini AI is disabled, returning default classification',
      );
      return {
        isUserContact: true,
        isSpamOrAdvertising: false,
        category: 'inquiry',
        confidence: 0.5,
        reason: 'AI classification disabled',
        isPotentialCustomer: Boolean(company || phone),
      };
    }

    // Check if we're in cooldown period after exhaustion
    const timeSinceExhaustion = Date.now() - this.lastExhaustionTime;
    if (
      this.lastExhaustionTime > 0 &&
      timeSinceExhaustion < this.EXHAUSTION_COOLDOWN_MS
    ) {
      this.logger.warn(
        `In cooldown period (${Math.ceil((this.EXHAUSTION_COOLDOWN_MS - timeSinceExhaustion) / 1000)}s remaining)`,
      );
      return {
        isUserContact: true,
        isSpamOrAdvertising: false,
        category: 'inquiry',
        confidence: 0.4,
        reason: 'API keys in cooldown period',
        isPotentialCustomer: Boolean(company || phone),
      };
    }

    const startTime = Date.now();
    const prompt = buildWebformClassificationPrompt(
      senderEmail,
      senderName,
      company,
      phone,
      subject,
      message,
    );

    // Thử với các API keys khác nhau nếu có lỗi quota
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) {
          throw new Error('No valid Gemini model available');
        }

        const response = await model.generateContent(prompt);
        const result = this.parseWebformClassificationResponse(response);
        const durationMs = Date.now() - startTime;

        // Async logging - không block response
        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'webform_classification',
            inputText: prompt,
            outputText: response.response.text(),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
            metadata: {
              senderEmail,
              senderName,
              company,
              phone,
              subject: subject?.substring(0, 100),
            },
          });
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message.toLowerCase();

        // Kiểm tra các lỗi liên quan đến quota/rate limit
        if (
          errorMessage.includes('quota') ||
          errorMessage.includes('rate') ||
          errorMessage.includes('exceeded') ||
          errorMessage.includes('429')
        ) {
          this.logger.warn(
            `API key ${this.currentKeyIndex + 1} quota exceeded, rotating...`,
          );
          this.rotateToNextKey();
          continue;
        }

        // Lỗi khác - log và throw
        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'webform_classification',
            inputText: prompt,
            durationMs: Date.now() - startTime,
            isSuccess: false,
            errorMessage: lastError?.message,
            metadata: { senderEmail, subject: subject?.substring(0, 100) },
          });
        });
        throw error;
      }
    }

    // Tất cả API keys đều bị exhausted
    this.logger.error('All Gemini API keys exhausted');
    this.lastExhaustionTime = Date.now();

    // Return default classification instead of throwing to prevent cascading failures
    this.logger.warn('Returning default classification due to API exhaustion');
    return {
      isUserContact: true,
      isSpamOrAdvertising: false,
      category: 'inquiry',
      confidence: 0.3,
      reason: 'All API keys exhausted',
      isPotentialCustomer: Boolean(company || phone),
    };
  }

  /**
   * Parse response từ Gemini API cho phân loại webform
   */
  private parseWebformClassificationResponse(
    response: GenerateContentResult,
  ): IWebformClassification {
    try {
      const text = response.response.text();
      // Xử lý trường hợp response có markdown code block
      const jsonText = text
        .replace(/```json?\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(jsonText);

      return {
        isUserContact: Boolean(parsed.isUserContact),
        isSpamOrAdvertising: Boolean(parsed.isSpamOrAdvertising),
        category: parsed.category || 'unknown',
        confidence: Number(parsed.confidence) || 0.5,
        reason: parsed.reason || undefined,
        isPotentialCustomer: Boolean(parsed.isPotentialCustomer),
      };
    } catch (error) {
      this.logger.warn(
        'Failed to parse Gemini webform response, using default classification',
      );
      return {
        isUserContact: true,
        isSpamOrAdvertising: false,
        category: 'unknown',
        confidence: 0.3,
        reason: 'Failed to parse AI response',
        isPotentialCustomer: false,
      };
    }
  }

  /**
   * Generate text response từ prompt tùy ý
   * Dùng cho các use-case như cảnh báo tồn kho, phân tích ngắn
   */
  async generateText(prompt: string, purpose = 'general'): Promise<string> {
    if (!this.isEnabled) {
      return '';
    }

    const startTime = Date.now();

    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) throw new Error('No valid Gemini model available');

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const durationMs = Date.now() - startTime;

        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose,
            inputText: prompt.substring(0, 500),
            outputText: text.substring(0, 500),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
          });
        });

        return text;
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) {
          this.rotateToNextKey();
          continue;
        }
        this.logger.error(`generateText error: ${(error as Error).message}`);
        return '';
      }
    }

    this.logger.error('All Gemini API keys exhausted in generateText');
    return '';
  }

  /**
   * Nhận diện biển số xe từ ảnh base64 bằng Gemini Vision
   */
  async recognizeLicensePlate(
    base64: string,
    mimeType: string,
  ): Promise<{ plate: string; confidence: number }> {
    if (!this.isEnabled) {
      return { plate: '', confidence: 0 };
    }

    const startTime = Date.now();
    const prompt =
      'Extract the vehicle license plate number from this image. Return ONLY valid JSON in this exact format: {"plate": "LICENSE_PLATE_TEXT", "confidence": 0.95}. The confidence should be a number between 0 and 1. If no license plate is visible, return {"plate": "", "confidence": 0}.';

    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) throw new Error('No valid Gemini model available');

        const response = await model.generateContent([
          { inlineData: { data: base64, mimeType } },
          prompt,
        ]);
        const text = response.response.text().trim();
        const durationMs = Date.now() - startTime;

        const jsonText = text
          .replace(/```json?\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed = JSON.parse(jsonText);
        const result = {
          plate: String(parsed.plate || ''),
          confidence: Number(parsed.confidence) || 0,
        };

        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'license_plate_ocr',
            inputText: '[image data]',
            outputText: text.substring(0, 500),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
          });
        });

        return result;
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        if (
          msg.includes('quota') ||
          msg.includes('rate') ||
          msg.includes('exceeded') ||
          msg.includes('429')
        ) {
          this.rotateToNextKey();
          continue;
        }
        this.logger.error(
          `recognizeLicensePlate error: ${(error as Error).message}`,
        );
        return { plate: '', confidence: 0 };
      }
    }

    this.logger.error('All Gemini API keys exhausted in recognizeLicensePlate');
    return { plate: '', confidence: 0 };
  }

  /**
   * Lưu log AI call vào database (bất đồng bộ)
   */
  private async logAICall(data: IAILogData): Promise<void> {
    try {
      await this.prismaService.aILog.create({
        data: {
          model: data.model,
          purpose: data.purpose,
          input_text: data.inputText,
          output_text: data.outputText,
          input_tokens: data.inputTokens,
          output_tokens: data.outputTokens,
          total_tokens: data.totalTokens,
          duration_ms: data.durationMs,
          is_success: data.isSuccess,
          error_message: data.errorMessage,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log AI call:', error);
    }
  }
}
