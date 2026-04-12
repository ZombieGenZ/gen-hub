import { Injectable } from '@nestjs/common';
import { AiContextRepository } from './ai-context.repository';
import {
  IAiChatOptions,
  IAiChatResult,
  IAiContext,
  IEmailClassification,
  IWebformClassification,
} from './interfaces/ai.interface';
import { CozeService } from './services/coze.service';
import { DifyService } from './services/dify.service';
import { GeminiService } from './services/gemini.service';

@Injectable()
export class AiHubService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly cozeService: CozeService,
    private readonly difyService: DifyService,
    private readonly aiContextRepository: AiContextRepository,
  ) {}

  async chat(
    userMessage: string,
    conversationId?: string,
    userId?: string,
    options?: IAiChatOptions,
  ): Promise<IAiChatResult> {
    if (this.cozeService.isEnabled()) {
      const cozeResult = await this.cozeService.chat(
        userMessage,
        conversationId,
        userId,
        options,
      );
      if (cozeResult.success) {
        return cozeResult;
      }
    }

    if (this.difyService.isEnabled()) {
      return this.difyService.chat(
        userMessage,
        conversationId,
        userId,
        options,
      );
    }

    return {
      success: false,
      content: '',
      model: 'ai-hub',
      error: 'No AI chat provider is available',
    };
  }

  classifyEmail(
    senderEmail: string,
    senderName: string,
    subject: string,
    content: string,
  ): Promise<IEmailClassification> {
    return this.geminiService.classifyEmail(
      senderEmail,
      senderName,
      subject,
      content,
    );
  }

  classifyWebform(
    senderEmail: string,
    senderName: string,
    company: string | undefined,
    phone: string | undefined,
    subject: string,
    message: string,
  ): Promise<IWebformClassification> {
    return this.geminiService.classifyWebform(
      senderEmail,
      senderName,
      company,
      phone,
      subject,
      message,
    );
  }

  getAiContext(): Promise<IAiContext> {
    return this.aiContextRepository.getFullContext();
  }

  clearContextCache(): void {
    this.cozeService.clearContextCache();
    this.difyService.clearContextCache();
  }

  buildSystemPrompt(): Promise<string> {
    if (this.cozeService.isEnabled()) {
      return this.cozeService.buildSystemPrompt();
    }

    return this.difyService.buildSystemPrompt();
  }

  isGeminiEnabled(): boolean {
    return this.geminiService.enabled;
  }

  isCozeEnabled(): boolean {
    return this.cozeService.isEnabled();
  }

  isDifyEnabled(): boolean {
    return this.difyService.isEnabled();
  }

  isChatAvailable(): boolean {
    return this.isCozeEnabled() || this.isDifyEnabled();
  }
}
