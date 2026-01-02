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
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { EmailInboundProvider } from './email-inbound.provider';
import { IGmailPubSubNotification } from './interfaces';
import type { IPubSubMessage } from './interfaces';
import { Public } from '../../common/decorators/public.decorator';

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
    @ApiOperation({ summary: 'Gmail webhook health check' })
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}
