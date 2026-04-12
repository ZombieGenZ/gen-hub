import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiContextRepository } from '../ai-context.repository';
import {
  IAiChatOptions,
  IAiChatResult,
  IAiContext,
  IDifyConfig,
} from '../interfaces/ai.interface';

@Injectable()
export class DifyService implements OnModuleInit {
  private readonly logger = new Logger(DifyService.name);
  private readonly CONTEXT_CACHE_TTL = 5 * 60 * 1000;

  private config: IDifyConfig;
  private credentials: Array<{ apiKey: string; appId: string }> = [];
  private currentCredentialIndex = 0;
  private contextCache: IAiContext | null = null;
  private contextCacheTime = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiContextRepository: AiContextRepository,
    private readonly prisma: PrismaService,
  ) {
    const apiKeys = this.parseCsvConfigValue(
      this.configService.get<string>('DIFY_API_KEYS'),
      this.configService.get<string>('DIFY_API_KEY'),
    );
    const appIds = this.parseCsvConfigValue(
      this.configService.get<string>('DIFY_APP_IDS'),
      this.configService.get<string>('DIFY_APP_ID'),
    );

    this.config = {
      enabled: this.configService.get<boolean>('DIFY_ENABLED') ?? false,
      apiKeys,
      appIds,
      apiBaseUrl:
        this.configService.get<string>('DIFY_API_BASE_URL') ??
        'https://api.dify.ai/v1',
    };

    this.credentials = this.buildCredentials(apiKeys, appIds);
  }

  async onModuleInit(): Promise<void> {
    if (this.isEnabled()) {
      this.logger.log(
        `Dify AI Service initialized with ${this.credentials.length} credential set(s)`,
      );
      await this.getAiContext();
      return;
    }

    this.logger.log('Dify AI Service is disabled');
  }

  isEnabled(): boolean {
    return this.config.enabled && this.credentials.length > 0;
  }

  clearContextCache(): void {
    this.contextCache = null;
    this.contextCacheTime = 0;
  }

  async getAiContext(): Promise<IAiContext> {
    const now = Date.now();
    if (
      this.contextCache &&
      now - this.contextCacheTime < this.CONTEXT_CACHE_TTL
    ) {
      return this.contextCache;
    }

    this.contextCache = await this.aiContextRepository.getFullContext();
    this.contextCacheTime = now;
    return this.contextCache;
  }

  async buildSystemPrompt(): Promise<string> {
    const context = await this.getAiContext();

    const warehouseInfo = context.warehouseTemplates
      .map(
        (item) =>
          `- ${item.name}: ${item.area}m², ${item.pricePerMonth.toLocaleString('vi-VN')} VNĐ/tháng`,
      )
      .join('\n');
    const addonInfo = context.addons
      .map(
        (item) =>
          `- ${item.name}: ${item.price.toLocaleString('vi-VN')} VNĐ${item.isMonthlyPayment ? '/tháng' : '/lần'}`,
      )
      .join('\n');
    const insuranceInfo = context.insurances
      .map(
        (item) => `- ${item.name}: ${item.price.toLocaleString('vi-VN')} VNĐ`,
      )
      .join('\n');

    return `Bạn là trợ lý AI của GEN-HUB.\n\nKho:\n${warehouseInfo || 'Chưa có dữ liệu'}\n\nAddon:\n${addonInfo || 'Chưa có dữ liệu'}\n\nBảo hiểm:\n${insuranceInfo || 'Chưa có dữ liệu'}`;
  }

  async chat(
    userMessage: string,
    conversationId?: string,
    userId?: string,
    options?: IAiChatOptions,
  ): Promise<IAiChatResult> {
    const startTime = Date.now();

    if (!this.isEnabled()) {
      return {
        success: false,
        content: '',
        model: 'dify',
        error: 'Dify AI is not enabled',
      };
    }

    let lastErrorMsg = 'Unknown error';

    for (let attempt = 0; attempt < this.credentials.length; attempt++) {
      const credential = this.getCurrentCredential();
      if (!credential) {
        break;
      }

      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/chat-messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${credential.apiKey}`,
              Accept: 'text/event-stream',
            },
            body: JSON.stringify({
              inputs: {},
              query: userMessage,
              user: userId || conversationId || 'anonymous',
              response_mode: 'streaming',
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          lastErrorMsg = `API error: ${response.status} - ${errorText}`;

          if (
            this.shouldRotateOnHttpStatus(response.status) &&
            attempt < this.credentials.length - 1
          ) {
            this.rotateToNextCredential();
            continue;
          }

          break;
        }

        const assistantContent = await this.parseSSEStream(response);
        const totalTime = Date.now() - startTime;

        if (assistantContent) {
          this.logAiMetadata({
            purpose: options?.discordChannelId ? 'DIFY_DISCORD' : 'DIFY_API',
            inputText: userMessage,
            outputText: assistantContent,
            durationMs: totalTime,
            isSuccess: true,
          });

          return {
            success: true,
            content: assistantContent,
            model: 'dify',
            confidence: 1,
          };
        }

        lastErrorMsg = 'No assistant message in Dify stream response';
        break;
      } catch (error) {
        lastErrorMsg = error instanceof Error ? error.message : 'Unknown error';

        if (
          this.shouldRotateOnError(lastErrorMsg) &&
          attempt < this.credentials.length - 1
        ) {
          this.rotateToNextCredential();
          continue;
        }

        break;
      }
    }

    this.logger.error(`[Dify AI Error] ${lastErrorMsg}`);
    this.logAiMetadata({
      purpose: options?.discordChannelId ? 'DIFY_DISCORD' : 'DIFY_API',
      inputText: userMessage,
      durationMs: Date.now() - startTime,
      isSuccess: false,
      errorMessage: lastErrorMsg,
    });

    return {
      success: false,
      content: '',
      model: 'dify',
      error: lastErrorMsg,
    };
  }

  private parseCsvConfigValue(
    preferredValue?: string,
    fallbackValue?: string,
  ): string[] {
    const raw = preferredValue || fallbackValue || '';
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private buildCredentials(
    apiKeys: string[],
    appIds: string[],
  ): Array<{ apiKey: string; appId: string }> {
    if (apiKeys.length === 0 || appIds.length === 0) {
      return [];
    }

    if (apiKeys.length === appIds.length) {
      return apiKeys.map((apiKey, index) => ({ apiKey, appId: appIds[index] }));
    }

    if (appIds.length === 1) {
      return apiKeys.map((apiKey) => ({ apiKey, appId: appIds[0] }));
    }

    if (apiKeys.length === 1) {
      return appIds.map((appId) => ({ apiKey: apiKeys[0], appId }));
    }

    const minLength = Math.min(apiKeys.length, appIds.length);
    this.logger.warn(
      `DIFY_API_KEYS (${apiKeys.length}) and DIFY_APP_IDS (${appIds.length}) length mismatch. Using first ${minLength} pair(s) by index.`,
    );
    return apiKeys
      .slice(0, minLength)
      .map((apiKey, index) => ({ apiKey, appId: appIds[index] }));
  }

  private getCurrentCredential(): { apiKey: string; appId: string } | null {
    return this.credentials[this.currentCredentialIndex] ?? null;
  }

  private rotateToNextCredential(): void {
    if (this.credentials.length <= 1) {
      return;
    }

    this.currentCredentialIndex =
      (this.currentCredentialIndex + 1) % this.credentials.length;
    this.logger.warn(
      `Rotated Dify credential to ${this.currentCredentialIndex + 1}/${this.credentials.length}`,
    );
  }

  private shouldRotateOnHttpStatus(status: number): boolean {
    return status === 401 || status === 403 || status === 429 || status >= 500;
  }

  private shouldRotateOnError(errorMessage: string): boolean {
    const message = errorMessage.toLowerCase();
    return (
      message.includes('quota') ||
      message.includes('rate') ||
      message.includes('limit') ||
      message.includes('429') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized')
    );
  }

  private async parseSSEStream(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let finalContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const eventBlocks = buffer.split('\n\n');
        buffer = eventBlocks.pop() || '';

        for (const block of eventBlocks) {
          if (!block.trim()) {
            continue;
          }

          const lines = block.split('\n');
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              dataStr = line.slice(5).trim();
            }
          }

          if (!dataStr || dataStr === '[DONE]') {
            continue;
          }

          const data = JSON.parse(dataStr) as {
            event?: string;
            answer?: string;
            message?: string;
          };
          if (data.event === 'error') {
            throw new Error(data.message || 'Unknown error from Dify AI');
          }

          if (data.answer) {
            finalContent += data.answer;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return finalContent.trim();
  }

  private logAiMetadata(data: {
    purpose: string;
    inputText: string;
    outputText?: string;
    durationMs: number;
    isSuccess: boolean;
    errorMessage?: string;
  }): void {
    this.prisma.aILog
      .create({
        data: {
          model: 'dify',
          purpose: data.purpose,
          input_text: data.inputText,
          output_text: data.outputText,
          duration_ms: data.durationMs,
          is_success: data.isSuccess,
          error_message: data.errorMessage,
        },
      })
      .catch((error) => {
        this.logger.error(`Failed to log Dify AI metadata: ${error.message}`);
      });
  }
}
