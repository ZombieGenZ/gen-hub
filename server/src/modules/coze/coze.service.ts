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
    private contextCache: IAiContext | null = null;
    private contextCacheTime: number = 0;
    private readonly CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 phút

    constructor(
        private readonly configService: ConfigService,
        private readonly cozeRepository: CozeRepository,
        private readonly prisma: PrismaService,
    ) {
        this.config = {
            enabled: this.configService.get<boolean>('COZE_ENABLED') ?? false,
            apiKey: this.configService.get<string>('COZE_API_KEY') ?? '',
            botId: this.configService.get<string>('COZE_BOT_ID') ?? '',
            apiBaseUrl:
                this.configService.get<string>('COZE_API_BASE_URL') ??
                'https://api.coze.com',
        };
    }

    async onModuleInit(): Promise<void> {
        if (this.config.enabled) {
            this.logger.log('🤖 Coze AI Service initialized');
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
        return this.config.enabled && !!this.config.apiKey && !!this.config.botId;
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
     * Gửi tin nhắn đến Coze AI và nhận phản hồi
     * @param userMessage - Tin nhắn từ người dùng
     * @param conversationId - ID session để nhóm conversation
     * @param userId - ID user (optional)
     * @param options - Options cho Discord logging
     */
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
        // Giữ currentEvent ngoài vòng lặp while để persist across chunks
        let currentEvent = '';
        const receivedEvents: string[] = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse các SSE events trong buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Giữ lại dòng chưa hoàn chỉnh

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('event:')) {
                        currentEvent = trimmedLine.slice(6).trim();
                        receivedEvents.push(currentEvent);
                    } else if (trimmedLine.startsWith('data:')) {
                        const dataStr = trimmedLine.slice(5).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);

                            // Log để debug: ghi nhận event + data type/role
                            if (data.role || data.type) {
                                this.logger.debug(
                                    `SSE event="${currentEvent}" role="${data.role}" type="${data.type}" hasContent=${!!data.content}`,
                                );
                            }

                            // Coze trả về nhiều loại event, ta quan tâm đến message với type = 'answer'
                            if (currentEvent === 'conversation.message.completed') {
                                if (data.type === 'answer' && data.role === 'assistant') {
                                    finalContent = data.content || '';
                                }
                            }
                            // Fallback: check trong data trực tiếp (bất kể event name)
                            if (!finalContent && data.type === 'answer' && data.role === 'assistant' && data.content) {
                                finalContent = data.content;
                            }
                        } catch {
                            // Ignore JSON parse errors for incomplete data
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // Log tất cả events nhận được để debug
        if (!finalContent) {
            this.logger.warn(
                `No assistant answer found. Received events: [${receivedEvents.join(', ')}]`,
            );
        }

        return finalContent;
    }

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

        try {
            // Gọi Coze API với stream: true
            const response = await fetch(`${this.config.apiBaseUrl}/v3/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({
                    bot_id: this.config.botId,
                    user_id: userId || 'anonymous',
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

            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `API error: ${response.status} - ${errorText}`;

                // Ghi log lỗi vào AILog
                this.logAiMetadata({
                    purpose: options?.discordChannelId ? 'COZE_DISCORD' : 'COZE_API',
                    inputText: userMessage,
                    durationMs: responseTime,
                    isSuccess: false,
                    errorMessage: errorMsg,
                });

                return {
                    success: false,
                    content: '',
                    model: 'coze',
                    error: errorMsg,
                };
            }

            // Parse SSE stream để lấy response
            const assistantContent = await this.parseSSEStream(response);
            const totalTime = Date.now() - startTime;

            if (assistantContent) {
                // Ghi log metadata vào AILog
                this.logAiMetadata({
                    purpose: options?.discordChannelId ? 'COZE_DISCORD' : 'COZE_API',
                    inputText: userMessage,
                    outputText: assistantContent,
                    durationMs: totalTime,
                    isSuccess: true,
                });

                // Ghi conversation vào CozeConversation
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

            // Ghi log khi không có response
            const noMsgError = `No assistant message in stream response. Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`;
            this.logger.warn(noMsgError);
            this.logAiMetadata({
                purpose: options?.discordChannelId ? 'COZE_DISCORD' : 'COZE_API',
                inputText: userMessage,
                durationMs: totalTime,
                isSuccess: false,
                errorMessage: noMsgError,
            });

            return {
                success: false,
                content: '',
                model: 'coze',
                error: noMsgError,
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            // Ghi log lỗi vào AILog
            this.logAiMetadata({
                purpose: options?.discordChannelId ? 'COZE_DISCORD' : 'COZE_API',
                inputText: userMessage,
                durationMs: responseTime,
                isSuccess: false,
                errorMessage: errorMsg,
            });

            return {
                success: false,
                content: '',
                model: 'coze',
                error: errorMsg,
            };
        }
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
