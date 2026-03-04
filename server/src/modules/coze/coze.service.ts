import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CozeRepository } from './coze.repository';
import {
    ICozeConfig,
    IAiChatResult,
    IAiContext,
    ICozeLogOptions,
} from './interfaces/coze.interface';

/**
 * Service tích hợp Coze AI
 * Xử lý việc gọi Coze API và build context từ database
 */
@Injectable()
export class CozeService implements OnModuleInit {
    private readonly logger = new Logger(CozeService.name);
    private config: ICozeConfig;
    private credentials: Array<{ apiKey: string; botId: string }> = [];
    private currentCredentialIndex = 0;
    private contextCache: IAiContext | null = null;
    private contextCacheTime: number = 0;
    private readonly CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 phút

    constructor(
        private readonly configService: ConfigService,
        private readonly cozeRepository: CozeRepository,
        private readonly prisma: PrismaService,
    ) {
        const apiKeys = this.parseCsvConfigValue(
            this.configService.get<string>('COZE_API_KEYS'),
            this.configService.get<string>('COZE_API_KEY'),
        );
        const botIds = this.parseCsvConfigValue(
            this.configService.get<string>('COZE_BOT_IDS'),
            this.configService.get<string>('COZE_BOT_ID'),
        );

        this.config = {
            enabled: this.configService.get<boolean>('COZE_ENABLED') ?? false,
            apiKeys,
            botIds,
            apiBaseUrl:
                this.configService.get<string>('COZE_API_BASE_URL') ??
                'https://api.coze.com',
        };

        this.credentials = this.buildCredentials(apiKeys, botIds);
    }

    async onModuleInit(): Promise<void> {
        if (this.config.enabled) {
            this.logger.log(
                `🤖 Coze AI Service initialized with ${this.credentials.length} credential set(s)`,
            );
            // Preload context khi khởi động
            await this.getAiContext();
        } else {
            this.logger.log('🤖 Coze AI Service is disabled');
        }
    }

    /**
     * Kiểm tra Coze có được bật không
     */
    isEnabled(): boolean {
        return this.config.enabled && this.credentials.length > 0;
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
        botIds: string[],
    ): Array<{ apiKey: string; botId: string }> {
        if (apiKeys.length === 0 || botIds.length === 0) {
            return [];
        }

        if (apiKeys.length === botIds.length) {
            return apiKeys.map((apiKey, index) => ({ apiKey, botId: botIds[index] }));
        }

        if (botIds.length === 1) {
            return apiKeys.map((apiKey) => ({ apiKey, botId: botIds[0] }));
        }

        if (apiKeys.length === 1) {
            return botIds.map((botId) => ({ apiKey: apiKeys[0], botId }));
        }

        const minLength = Math.min(apiKeys.length, botIds.length);
        this.logger.warn(
            `COZE_API_KEYS (${apiKeys.length}) and COZE_BOT_IDS (${botIds.length}) length mismatch. Using first ${minLength} pair(s) by index.`,
        );
        return apiKeys
            .slice(0, minLength)
            .map((apiKey, index) => ({ apiKey, botId: botIds[index] }));
    }

    private getCurrentCredential(): { apiKey: string; botId: string } | null {
        return this.credentials[this.currentCredentialIndex] ?? null;
    }

    private rotateToNextCredential(): void {
        if (this.credentials.length <= 1) {
            return;
        }

        this.currentCredentialIndex =
            (this.currentCredentialIndex + 1) % this.credentials.length;
        this.logger.warn(
            `Rotated Coze credential to ${this.currentCredentialIndex + 1}/${this.credentials.length}`,
        );
    }

    private shouldRotateOnHttpStatus(status: number): boolean {
        return status === 401 || status === 403 || status === 429 || status >= 500;
    }

    private shouldRotateOnError(errorMessage: string): boolean {
        const msg = errorMessage.toLowerCase();
        return (
            msg.includes('quota') ||
            msg.includes('rate') ||
            msg.includes('limit') ||
            msg.includes('exceed') ||
            msg.includes('429') ||
            msg.includes('401') ||
            msg.includes('403') ||
            msg.includes('unauthorized') ||
            msg.includes('invalid token') ||
            msg.includes('coze chat failed')
        );
    }

    /**
     * Lấy AI context từ database (có cache)
     */
    async getAiContext(): Promise<IAiContext> {
        const now = Date.now();
        if (
            this.contextCache &&
            now - this.contextCacheTime < this.CONTEXT_CACHE_TTL
        ) {
            return this.contextCache;
        }

        this.contextCache = await this.cozeRepository.getFullContext();
        this.contextCacheTime = now;
        return this.contextCache;
    }

    /**
     * Xóa cache context (gọi khi có update warehouse/addon/insurance)
     */
    clearContextCache(): void {
        this.contextCache = null;
        this.contextCacheTime = 0;
    }

    /**
     * Build system prompt với context từ database
     */
    async buildSystemPrompt(): Promise<string> {
        const context = await this.getAiContext();

        const warehouseInfo = context.warehouseTemplates
            .map(
                (w) => `
- **${w.name}**: ${w.area}m², ${w.pricePerMonth.toLocaleString('vi-VN')} VNĐ/tháng
  - Địa chỉ: ${w.address || 'Chưa cập nhật'}
  - Loại: ${w.isSharedWarehouse ? 'Kho chia sẻ' : 'Kho riêng'}${w.isColdStorage ? ', Kho lạnh' : ''}
  - Cấu trúc: ${w.totalRows} dãy, ${w.totalRacks} kệ, ${w.totalShelves} tầng, ${w.totalBlocks} ô
  ${w.addonGifts.length > 0 ? `- Addon miễn phí: ${w.addonGifts.map((g) => g.name).join(', ')}` : ''}
  ${w.insuranceGifts.length > 0 ? `- Bảo hiểm miễn phí: ${w.insuranceGifts.map((g) => g.name).join(', ')}` : ''}
  ${w.discountConfigs.length > 0 ? `- Khuyến mãi: ${w.discountConfigs.map((d) => `${d.tierName}: giảm ${d.discountPercent}%`).join(', ')}` : ''}`,
            )
            .join('\n');

        const addonInfo = context.addons
            .map(
                (a) =>
                    `- ${a.name}: ${a.price.toLocaleString('vi-VN')} VNĐ${a.isMonthlyPayment ? '/tháng' : '/lần'}${a.types.length > 0 ? ` (${a.types.join(', ')})` : ''}`,
            )
            .join('\n');

        const insuranceInfo = context.insurances
            .map(
                (i) =>
                    `- ${i.name}: ${i.price.toLocaleString('vi-VN')} VNĐ${i.useManagementFee ? ` + phí quản lý ${i.managementFeeType === 'PERCENT' ? `${i.managementFeeValue}%` : `${i.managementFeeValue?.toLocaleString('vi-VN')} VNĐ`}` : ''}`,
            )
            .join('\n');

        return `Bạn là trợ lý AI của GEN-HUB - nền tảng cho thuê kho bãi. Nhiệm vụ của bạn là hỗ trợ khách hàng tìm hiểu về dịch vụ cho thuê kho.

## Thông tin về các kho:
${warehouseInfo || 'Chưa có kho nào.'}

## Dịch vụ bổ sung (Addon):
${addonInfo || 'Chưa có dịch vụ bổ sung.'}

## Bảo hiểm:
${insuranceInfo || 'Chưa có gói bảo hiểm.'}

## Hướng dẫn trả lời:
1. Luôn lịch sự và chuyên nghiệp
2. Trả lời ngắn gọn, súc tích
3. Nếu khách muốn thuê, hướng dẫn họ liên hệ hotline hoặc đăng ký tài khoản
4. Nếu không biết câu trả lời, hãy nói rõ và đề nghị chuyển đến nhân viên hỗ trợ
5. Sử dụng tiếng Việt`;
    }

    /**
     * Parse SSE stream response từ Coze API
     * SSE format: event: xxx\ndata: {...}\n\n
     */
    private async parseSSEStream(response: Response): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let finalContent = '';
        const receivedEvents: string[] = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE events được phân tách bởi '\n\n' (double newline)
                const eventBlocks = buffer.split('\n\n');
                // Giữ lại block cuối có thể chưa hoàn chỉnh
                buffer = eventBlocks.pop() || '';

                for (const block of eventBlocks) {
                    if (!block.trim()) continue;

                    // Parse từng dòng trong event block
                    const lines = block.split('\n');
                    let currentEvent = '';
                    let dataStr = '';

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            currentEvent = line.slice(6).trim();
                            receivedEvents.push(currentEvent);
                        } else if (line.startsWith('data:')) {
                            dataStr = line.slice(5).trim();
                        }
                    }

                    if (!dataStr || dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);

                        // Log để debug
                        this.logger.debug(
                            `SSE event="${currentEvent}" role="${data.role ?? '-'}" type="${data.type ?? '-'}" hasContent=${!!data.content}`,
                        );

                        if (currentEvent === 'conversation.chat.failed' || currentEvent === 'conversation.message.failed') {
                            const errorMsg = data.last_error?.msg || data.error?.message || 'Unknown error from Coze AI';
                            const errorCode = data.last_error?.code || data.error?.code || 'UNKNOWN_CODE';
                            throw new Error(`Coze Chat Failed [Code: ${errorCode}]: ${errorMsg}`);
                        }

                        // Ưu tiên event completed để lấy full text (tránh mất chunk)
                        if (currentEvent === 'conversation.message.completed') {
                            if (data.type === 'answer' && data.content) {
                                finalContent = data.content;
                            }
                        }
                        // Accumulate từng delta chunk
                        else if (currentEvent === 'conversation.message.delta') {
                            if (data.type === 'answer' && data.content) {
                                finalContent += data.content;
                            }
                        }
                        // Fallback: check trực tiếp trong data nếu không có event label
                        else if (!finalContent && data.type === 'answer' && data.content) {
                            finalContent += data.content;
                        }

                    } catch (err) {
                        // Nếu là lỗi chủ động ném ra từ Coze Failed, thì throw tiếp ra ngoài
                        if (err instanceof Error && err.message.includes('Coze Chat Failed')) {
                            throw err;
                        }
                        // Ignore JSON parse errors for incomplete data
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // Log tất cả events nhận được để debug nếu không có content
        if (!finalContent) {
            this.logger.warn(
                `No assistant answer found. Received events: [${receivedEvents.join(', ')}]`,
            );
        }

        return finalContent;
    }

    /**
     * Gửi tin nhắn đến Coze AI và nhận phản hồi
     */
    async chat(
        userMessage: string,
        conversationId?: string,
        userId?: string,
        options?: ICozeLogOptions,
    ): Promise<IAiChatResult> {
        const startTime = Date.now();

        if (!this.isEnabled()) {
            return {
                success: false,
                content: '',
                model: 'coze',
                error: 'Coze AI is not enabled',
            };
        }

        let lastErrorMsg = 'Unknown error';

        for (let attempt = 0; attempt < this.credentials.length; attempt++) {
            const credential = this.getCurrentCredential();
            if (!credential) {
                break;
            }

            try {
                const response = await fetch(`${this.config.apiBaseUrl}/v3/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${credential.apiKey}`,
                        Accept: 'text/event-stream',
                    },
                    body: JSON.stringify({
                        bot_id: credential.botId,
                        user_id: userId || 'anonymous',
                        ...(conversationId ? { conversation_id: conversationId } : {}),
                        stream: true,
                        auto_save_history: true,
                        additional_messages: [
                            {
                                role: 'user',
                                content: userMessage,
                                content_type: 'text',
                            },
                        ],
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMsg = `API error: ${response.status} - ${errorText}`;
                    lastErrorMsg = errorMsg;

                    if (
                        this.shouldRotateOnHttpStatus(response.status) &&
                        attempt < this.credentials.length - 1
                    ) {
                        this.logger.warn(
                            `Coze API failed with status ${response.status}, rotating credential...`,
                        );
                        this.rotateToNextCredential();
                        continue;
                    }

                    break;
                }

                const assistantContent = await this.parseSSEStream(response);
                const totalTime = Date.now() - startTime;

                if (assistantContent) {
                    this.logAiMetadata({
                        purpose: options?.discordChannelId ? 'COZE_DISCORD' : 'COZE_API',
                        inputText: userMessage,
                        outputText: assistantContent,
                        durationMs: totalTime,
                        isSuccess: true,
                    });

                    this.logConversation({
                        sessionId: conversationId || `session-${Date.now()}`,
                        userInput: userMessage,
                        botResponse: assistantContent,
                        discordChannelId: options?.discordChannelId,
                        discordUserId: options?.discordUserId,
                    });

                    return {
                        success: true,
                        content: assistantContent,
                        model: 'coze-gpt-4o-mini',
                        confidence: 1.0,
                    };
                }

                lastErrorMsg = `No assistant message in stream response. Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`;
                break;
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                lastErrorMsg = errorMsg;

                if (
                    this.shouldRotateOnError(errorMsg) &&
                    attempt < this.credentials.length - 1
                ) {
                    this.logger.warn(
                        `Coze request failed (attempt ${attempt + 1}), rotating credential...`,
                    );
                    this.rotateToNextCredential();
                    continue;
                }

                break;
            }
        }

        const responseTime = Date.now() - startTime;
        this.logger.error(`[Coze AI Error] ${lastErrorMsg}`);
        this.logAiMetadata({
            purpose: options?.discordChannelId ? 'COZE_DISCORD' : 'COZE_API',
            inputText: userMessage,
            durationMs: responseTime,
            isSuccess: false,
            errorMessage: lastErrorMsg,
        });

        return {
            success: false,
            content: '',
            model: 'coze',
            error: lastErrorMsg,
        };
    }

    /**
     * Ghi log metadata AI request vào bảng AILog (async, không block)
     */
    private logAiMetadata(data: {
        purpose: string;
        inputText: string;
        outputText?: string;
        durationMs: number;
        isSuccess: boolean;
        errorMessage?: string;
    }): void {
        this.prisma.aILog.create({
            data: {
                model: 'coze-gpt-4o-mini',
                purpose: data.purpose,
                input_text: data.inputText,
                output_text: data.outputText,
                duration_ms: data.durationMs,
                is_success: data.isSuccess,
                error_message: data.errorMessage,
            },
        }).catch(err => {
            this.logger.error(`Failed to log AI metadata: ${err.message}`);
        });
    }

    /**
     * Ghi nội dung conversation vào bảng CozeConversation (async, không block)
     */
    private logConversation(data: {
        sessionId: string;
        userInput: string;
        botResponse: string;
        discordChannelId?: string;
        discordUserId?: string;
    }): void {
        this.prisma.cozeConversation.create({
            data: {
                session_id: data.sessionId,
                user_input: data.userInput,
                bot_response: data.botResponse,
                discord_channel_id: data.discordChannelId,
                discord_user_id: data.discordUserId,
            },
        }).catch(err => {
            this.logger.error(`Failed to log conversation: ${err.message}`);
        });
    }
}

