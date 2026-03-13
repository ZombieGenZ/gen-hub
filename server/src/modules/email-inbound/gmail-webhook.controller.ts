import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Logger,
    Headers,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiExcludeEndpoint, ApiResponse } from '@nestjs/swagger';
import { EmailInboundProvider } from './email-inbound.provider';
import { IGmailPubSubNotification } from './interfaces';
import type { IPubSubMessage } from './interfaces';
import { Public } from '../../common/decorators/public.decorator';
import { OkResponse } from '../../common/responses/success.response';
import { buildSuccessResponseSchema } from '../../common/swagger/swagger-response.helper';

/**
 * Gmail Webhook Controller
 * Nhận push notifications từ Google Cloud Pub/Sub
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class GmailWebhookController {
    private readonly logger = new Logger(GmailWebhookController.name);
    private readonly webhookSecret: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly emailInboundProvider: EmailInboundProvider,
    ) {
        this.webhookSecret = this.configService.get<string>('GMAIL_WEBHOOK_SECRET') || '';
    }

    /**
     * Endpoint nhận push notifications từ Gmail via Pub/Sub
     */
    @Post('gmail')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiExcludeEndpoint()
    async handleGmailWebhook(
        @Body() body: IPubSubMessage,
        @Headers('authorization') authHeader?: string,
    ): Promise<{ success: boolean }> {
        // Verify webhook secret nếu được cấu hình
        if (this.webhookSecret && authHeader) {
            const token = authHeader.replace('Bearer ', '');
            if (token !== this.webhookSecret) {
                this.logger.warn('Invalid webhook secret');
                throw new BadRequestException('Unauthorized');
            }
        }

        if (!body?.message?.data) {
            this.logger.warn('Invalid Pub/Sub message format');
            return { success: false };
        }

        try {
            // Decode Base64 message data
            const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8');
            const notification: IGmailPubSubNotification = JSON.parse(decoded);

            this.logger.log(`📬 Gmail webhook received: ${body.message.messageId}`);

            // Xử lý notification
            await this.emailInboundProvider.handlePubSubNotification(notification);

            return { success: true };
        } catch (error) {
            this.logger.error('Error processing Gmail webhook:', error);
            // Trả về 200 để Pub/Sub không retry
            return { success: false };
        }
    }

    /**
     * Health check cho webhook
     */
    @Post('gmail/health')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Kiểm tra trạng thái webhook Gmail',
        description: 'Endpoint public dùng để kiểm tra nhanh webhook Gmail có hoạt động hay không. Không yêu cầu xác thực và thường được dùng cho health check từ hệ thống giám sát.',
    })
    @ApiResponse({
        status: 200,
        description: 'Webhook Gmail đang hoạt động bình thường',
        schema: buildSuccessResponseSchema({
            code: 'webhooks.gmail.health',
            message: 'Webhook Gmail hoạt động bình thường',
            dataSchema: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        description: 'Trạng thái hiện tại của webhook',
                        example: 'ok',
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Thời điểm hệ thống phản hồi health check',
                        example: '2026-03-13T10:30:00.000Z',
                    },
                },
            },
            dataExample: {
                status: 'ok',
                timestamp: '2026-03-13T10:30:00.000Z',
            },
        }),
    })
    async healthCheck() {
        return new OkResponse('webhooks.gmail.health', {
            status: 'ok',
            timestamp: new Date().toISOString(),
        }, 'Webhook Gmail hoạt động bình thường');
    }
}
