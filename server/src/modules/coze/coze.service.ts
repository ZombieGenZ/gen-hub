import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CozeRepository } from './coze.repository';
import {
    ICozeConfig,
    IAiChatResult,
    IAiContext,
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
     */
    async chat(
        userMessage: string,
        conversationId?: string,
        userId?: string,
    ): Promise<IAiChatResult> {
        if (!this.isEnabled()) {
            return {
                success: false,
                content: '',
                model: 'coze',
                error: 'Coze AI is not enabled',
            };
        }

        try {
            const systemPrompt = await this.buildSystemPrompt();

            // Gọi Coze API
            const response = await fetch(`${this.config.apiBaseUrl}/v3/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    bot_id: this.config.botId,
                    user_id: userId || 'anonymous',
                    stream: false,
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
                this.logger.error(`Coze API error: ${response.status} - ${errorText}`);
                return {
                    success: false,
                    content: '',
                    model: 'coze',
                    error: `API error: ${response.status}`,
                };
            }

            const data = await response.json();

            // Lấy message từ response
            const assistantMessage = data.messages?.find(
                (m: { role: string }) => m.role === 'assistant',
            );

            if (assistantMessage) {
                // Ghi log vào AILog
                await this.logAiInteraction(
                    userMessage,
                    assistantMessage.content,
                    conversationId,
                );

                return {
                    success: true,
                    content: assistantMessage.content,
                    model: 'coze-gpt-4o-mini',
                    confidence: 1.0,
                };
            }

            return {
                success: false,
                content: '',
                model: 'coze',
                error: 'No assistant message in response',
            };
        } catch (error) {
            this.logger.error(`Coze chat error: ${error}`);
            return {
                success: false,
                content: '',
                model: 'coze',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Ghi log tương tác AI (sử dụng Logger)
     */
    private logAiInteraction(
        input: string,
        output: string,
        conversationId?: string,
    ): void {
        this.logger.log({
            message: 'AI Chat Interaction',
            action: 'CONTACT_AUTO_REPLY',
            model: 'coze-gpt-4o-mini',
            conversationId,
            inputLength: input.length,
            outputLength: output.length,
        });
    }
}
