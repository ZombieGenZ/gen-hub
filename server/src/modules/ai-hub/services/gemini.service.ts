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
  IVehicleAnalysisResult,
  IExtractedWarehouseFilters,
  IWarehouseRankItem,
} from '../interfaces/ai.interface';
import {
  buildEmailClassificationPrompt,
  buildWebformClassificationPrompt,
  VEHICLE_ANALYSIS_PROMPT,
  buildWarehouseFilterExtractPrompt,
  buildWarehouseRankingPrompt,
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
        if (
          msg.includes('quota') ||
          msg.includes('rate') ||
          msg.includes('429')
        ) {
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
   * Phân tích toàn diện xe từ ảnh: biển số, loại xe, màu, tình trạng
   */
  async analyzeVehicle(
    base64: string,
    mimeType: string,
  ): Promise<IVehicleAnalysisResult> {
    const defaultResult: IVehicleAnalysisResult = {
      license_plate: '',
      plate_confidence: 0,
      vehicle_type: 'OTHER',
      vehicle_color: '',
      plate_format: 'unknown',
      condition_flags: ['no_vehicle'],
    };

    if (!this.isEnabled) return defaultResult;

    const startTime = Date.now();

    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) throw new Error('No valid Gemini model available');

        const response = await model.generateContent([
          { inlineData: { data: base64, mimeType } },
          VEHICLE_ANALYSIS_PROMPT,
        ]);
        const text = response.response.text().trim();
        const durationMs = Date.now() - startTime;

        const jsonText = text
          .replace(/```json?\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed = JSON.parse(jsonText);

        const result: IVehicleAnalysisResult = {
          license_plate: String(parsed.license_plate || ''),
          plate_confidence: Number(parsed.plate_confidence) || 0,
          vehicle_type: parsed.vehicle_type || 'OTHER',
          vehicle_color: String(parsed.vehicle_color || ''),
          plate_format: parsed.plate_format || 'unknown',
          condition_flags: Array.isArray(parsed.condition_flags)
            ? parsed.condition_flags
            : [],
        };

        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'vehicle_analysis',
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
        this.logger.error(`analyzeVehicle error: ${(error as Error).message}`);
        return defaultResult;
      }
    }

    this.logger.error('All Gemini API keys exhausted in analyzeVehicle');
    return defaultResult;
  }

  /**
   * Trích xuất bộ lọc kho từ câu mô tả nhu cầu tự nhiên tiếng Việt
   */
  async extractWarehouseFilters(
    query: string,
  ): Promise<IExtractedWarehouseFilters> {
    if (!this.isEnabled) return {};

    const startTime = Date.now();
    const prompt = buildWarehouseFilterExtractPrompt(query);

    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) throw new Error('No valid Gemini model available');

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const durationMs = Date.now() - startTime;

        const jsonText = text
          .replace(/```json?\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed: IExtractedWarehouseFilters = JSON.parse(jsonText);

        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'warehouse_filter_extract',
            inputText: query.substring(0, 300),
            outputText: text.substring(0, 500),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
          });
        });

        return parsed;
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
          `extractWarehouseFilters error: ${(error as Error).message}`,
        );
        return {};
      }
    }

    this.logger.error(
      'All Gemini API keys exhausted in extractWarehouseFilters',
    );
    return {};
  }

  /**
   * Xếp hạng kho theo mức độ phù hợp với nhu cầu của khách hàng
   */
  async rankWarehouses(
    query: string,
    warehouses: object[],
  ): Promise<IWarehouseRankItem[]> {
    if (!this.isEnabled || warehouses.length === 0) return [];

    const startTime = Date.now();
    const prompt = buildWarehouseRankingPrompt(query, warehouses);

    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) throw new Error('No valid Gemini model available');

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        const durationMs = Date.now() - startTime;

        const jsonText = text
          .replace(/```json?\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed: IWarehouseRankItem[] = JSON.parse(jsonText);

        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'warehouse_ranking',
            inputText: query.substring(0, 300),
            outputText: text.substring(0, 500),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
            metadata: { warehouse_count: warehouses.length },
          });
        });

        return Array.isArray(parsed) ? parsed : [];
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
        this.logger.error(`rankWarehouses error: ${(error as Error).message}`);
        return [];
      }
    }

    this.logger.error('All Gemini API keys exhausted in rankWarehouses');
    return [];
  }

  /**
   * Phân tích lộ trình GPS của tài xế — phát hiện bất thường và dự đoán rủi ro
   */
  async analyzeGpsRoute(input: {
    tracks: { lat: number; lng: number; speed: number | null; recorded_at: string }[];
    warehouseName: string;
    licensePlate: string;
    currentDistanceM: number;
  }): Promise<{
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
    warnings: string[];
    eta_note: string;
  }> {
    const defaultResult = {
      risk_level: 'LOW' as const,
      summary: 'Hành trình bình thường.',
      warnings: [],
      eta_note: '',
    };

    if (!this.isEnabled || input.tracks.length < 3) return defaultResult;

    const validSpeeds = input.tracks
      .map((t) => t.speed)
      .filter((s): s is number => s !== null);
    const avgSpeed = validSpeeds.length
      ? validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length
      : 0;
    const maxSpeed = validSpeeds.length ? Math.max(...validSpeeds) : 0;

    // Đếm số lần dừng (speed < 1 km/h) liên tục > 2 phút
    let stopCount = 0;
    let consecutiveSlow = 0;
    for (const t of input.tracks) {
      const kmh = t.speed !== null ? t.speed * 3.6 : null;
      if (kmh !== null && kmh < 1) {
        consecutiveSlow++;
        if (consecutiveSlow >= 4) stopCount++;
      } else {
        consecutiveSlow = 0;
      }
    }

    const durationMin =
      input.tracks.length >= 2
        ? Math.round(
            (new Date(input.tracks[input.tracks.length - 1].recorded_at).getTime() -
              new Date(input.tracks[0].recorded_at).getTime()) /
              60_000,
          )
        : 0;

    const distText =
      input.currentDistanceM >= 1000
        ? `${(input.currentDistanceM / 1000).toFixed(1)} km`
        : `${input.currentDistanceM} m`;

    const prompt = `Bạn là hệ thống giám sát vận tải. Phân tích dữ liệu GPS sau và trả về JSON.

Xe: ${input.licensePlate}
Kho đến: ${input.warehouseName}
Số điểm GPS: ${input.tracks.length} điểm trong ${durationMin} phút
Tốc độ trung bình: ${(avgSpeed * 3.6).toFixed(1)} km/h
Tốc độ tối đa: ${(maxSpeed * 3.6).toFixed(1)} km/h
Số lần dừng bất thường: ${stopCount}
Khoảng cách còn lại đến kho: ${distText}

Trả về JSON hợp lệ (không có markdown, không có backtick):
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "summary": "1 câu tóm tắt tình trạng bằng tiếng Việt",
  "warnings": ["cảnh báo 1 nếu có", "cảnh báo 2 nếu có"],
  "eta_note": "nhận xét về thời gian đến nếu có"
}`;

    try {
      const raw = await this.generateText(prompt, 'gps_route_analysis');
      if (!raw) return defaultResult;

      const clean = raw
        .replace(/```json?\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(clean) as {
        risk_level?: string;
        summary?: string;
        warnings?: string[];
        eta_note?: string;
      };

      return {
        risk_level:
          parsed.risk_level === 'HIGH'
            ? 'HIGH'
            : parsed.risk_level === 'MEDIUM'
            ? 'MEDIUM'
            : 'LOW',
        summary: typeof parsed.summary === 'string' ? parsed.summary : defaultResult.summary,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 4) : [],
        eta_note: typeof parsed.eta_note === 'string' ? parsed.eta_note : '',
      };
    } catch {
      this.logger.warn('analyzeGpsRoute: failed to parse Gemini response');
      return defaultResult;
    }
  }

  /**
   * Phân tích tài liệu pháp lý từ ảnh/PDF (base64) bằng Gemini Vision
   */
  async analyzeDocument(
    base64Data: string,
    mimeType: string,
    docType: string,
  ): Promise<{
    is_valid_document: boolean;
    document_type_detected: string;
    issuer: string | null;
    license_number: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    is_expired: boolean;
    confidence: number;
    issues: string[];
    summary: string;
  }> {
    const defaultResult = {
      is_valid_document: false,
      document_type_detected: 'unknown',
      issuer: null,
      license_number: null,
      issue_date: null,
      expiry_date: null,
      is_expired: false,
      confidence: 0,
      issues: ['Không thể phân tích tài liệu'],
      summary: 'Không thể phân tích tài liệu này.',
    };

    if (!this.isEnabled) return defaultResult;

    const prompt = `Bạn là hệ thống kiểm tra tài liệu pháp lý kho bãi. Phân tích ảnh tài liệu sau (loại: ${docType}) và trả về JSON.

Trả về JSON hợp lệ (KHÔNG có markdown, KHÔNG có backtick):
{
  "is_valid_document": boolean,
  "document_type_detected": "tên loại tài liệu phát hiện được",
  "issuer": "cơ quan cấp hoặc null",
  "license_number": "số giấy phép/chứng nhận hoặc null",
  "issue_date": "YYYY-MM-DD hoặc null",
  "expiry_date": "YYYY-MM-DD hoặc null",
  "is_expired": boolean,
  "confidence": 0.0-1.0,
  "issues": ["vấn đề 1 nếu có", "vấn đề 2 nếu có"],
  "summary": "tóm tắt 1 câu bằng tiếng Việt"
}`;

    const startTime = Date.now();

    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const model = this.getCurrentModel();
        if (!model) throw new Error('No valid Gemini model available');

        const response = await model.generateContent([
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } },
        ]);

        const raw = response.response.text().trim();
        const clean = raw
          .replace(/```json?\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed = JSON.parse(clean) as Record<string, unknown>;
        const durationMs = Date.now() - startTime;

        setImmediate(() => {
          this.logAICall({
            model: this.modelName,
            purpose: 'legal_document_analysis',
            inputText: `docType:${docType}`,
            outputText: clean.substring(0, 500),
            inputTokens: response.response.usageMetadata?.promptTokenCount,
            outputTokens: response.response.usageMetadata?.candidatesTokenCount,
            totalTokens: response.response.usageMetadata?.totalTokenCount,
            durationMs,
            isSuccess: true,
          });
        });

        const today = new Date().toISOString().split('T')[0];
        const expiryDate =
          typeof parsed.expiry_date === 'string' ? parsed.expiry_date : null;

        return {
          is_valid_document: Boolean(parsed.is_valid_document),
          document_type_detected:
            typeof parsed.document_type_detected === 'string'
              ? parsed.document_type_detected
              : 'unknown',
          issuer: typeof parsed.issuer === 'string' ? parsed.issuer : null,
          license_number:
            typeof parsed.license_number === 'string'
              ? parsed.license_number
              : null,
          issue_date:
            typeof parsed.issue_date === 'string' ? parsed.issue_date : null,
          expiry_date: expiryDate,
          is_expired: expiryDate ? expiryDate < today : Boolean(parsed.is_expired),
          confidence: Number(parsed.confidence) || 0,
          issues: Array.isArray(parsed.issues)
            ? (parsed.issues as string[]).slice(0, 5)
            : [],
          summary:
            typeof parsed.summary === 'string'
              ? parsed.summary
              : 'Đã phân tích xong.',
        };
      } catch (error) {
        const msg = (error as Error).message.toLowerCase();
        if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) {
          this.rotateToNextKey();
          continue;
        }
        this.logger.error(`analyzeDocument error: ${(error as Error).message}`);
        return defaultResult;
      }
    }

    this.logger.error('All Gemini API keys exhausted in analyzeDocument');
    return defaultResult;
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
