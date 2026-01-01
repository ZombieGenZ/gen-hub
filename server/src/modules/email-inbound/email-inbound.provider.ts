import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notification/email.service';
import { ContactService } from '../contact/contact.service';
import { GmailApiService } from './gmail-api.service';
import { IGmailMessage, IGmailPubSubNotification } from './interfaces';

/**
 * Interface cho unlock token data từ Redis
 */
interface IUnlockTokenData {
    code: string;
    ip: string;
    createdAt: number;
}

/**
 * Email Inbound Provider
 * Sử dụng Gmail API để lắng nghe inbox và xử lý email
 * Hỗ trợ cả Push Notifications (Pub/Sub) và Polling mode
 */
@Injectable()
export class EmailInboundProvider implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EmailInboundProvider.name);
    private readonly UNLOCK_CODE_PATTERN = /UNLOCK\s+(\d{6})/i;
    // Subject format: [UNLOCK] email@domain.com
    private readonly UNLOCK_SUBJECT_PATTERN = /^\[UNLOCK\]\s+([^\s-]+@[^\s-]+)/i;
    // Subject format: [#TICKET-20260101-001]
    private readonly TICKET_SUBJECT_PATTERN = /\[#([A-Z]+-\d{8}-\d{3})\]/i;

    private isProcessing = false;
    private pollInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService,
        private readonly emailService: EmailService,
        private readonly contactService: ContactService,
        private readonly gmailApiService: GmailApiService,
    ) { }

    async onModuleInit() {
        this.logger.log('📧 EmailInboundProvider initializing...');

        // Chờ Gmail API service sẵn sàng
        if (!this.gmailApiService.isReady()) {
            this.logger.warn('⚠️ Gmail API chưa sẵn sàng, email inbound sẽ không hoạt động');
            return;
        }

        // Kiểm tra mode: Push (Pub/Sub) hoặc Polling
        if (this.gmailApiService.isPollingMode()) {
            this.logger.log('📧 Starting in POLLING mode');
            this.startPolling();
        } else {
            this.logger.log('📧 Starting in PUSH mode (Pub/Sub)');
            await this.gmailApiService.watchMailbox();
        }

        // Xử lý các email chưa đọc khi khởi động
        await this.processUnreadEmails();
    }

    async onModuleDestroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Bắt đầu polling mode
     */
    private startPolling(): void {
        const interval = this.gmailApiService.getPollInterval();
        this.logger.log(`⏱️ Polling every ${interval / 1000}s`);

        this.pollInterval = setInterval(async () => {
            await this.processUnreadEmails();
        }, interval);
    }

    /**
     * Xử lý push notification từ Pub/Sub
     * Được gọi từ webhook controller
     */
    async handlePubSubNotification(notification: IGmailPubSubNotification): Promise<void> {
        this.logger.log(`📬 Received Pub/Sub notification: historyId=${notification.historyId}`);

        const currentHistoryId = this.gmailApiService.getCurrentHistoryId();
        if (!currentHistoryId) {
            // Không có historyId trước đó, xử lý unread messages
            await this.processUnreadEmails();
            this.gmailApiService.setCurrentHistoryId(notification.historyId);
            return;
        }

        // Lấy history changes
        const history = await this.gmailApiService.getHistory(currentHistoryId);

        for (const item of history) {
            if (item.messagesAdded) {
                for (const added of item.messagesAdded) {
                    // Chỉ xử lý email trong INBOX và UNREAD
                    if (
                        added.message.labelIds?.includes('INBOX') &&
                        added.message.labelIds?.includes('UNREAD')
                    ) {
                        await this.processMessageById(added.message.id);
                    }
                }
            }
        }

        this.gmailApiService.setCurrentHistoryId(notification.historyId);
    }

    /**
     * Xử lý các email chưa đọc
     */
    async processUnreadEmails(): Promise<void> {
        if (this.isProcessing) {
            this.logger.debug('Already processing, skip...');
            return;
        }

        this.isProcessing = true;
        try {
            const unreadMessages = await this.gmailApiService.getUnreadMessages(10);

            if (unreadMessages.length === 0) {
                this.logger.debug('📭 No unread emails');
                return;
            }

            this.logger.log(`📬 Found ${unreadMessages.length} unread email(s)`);

            for (const msg of unreadMessages) {
                await this.processMessageById(msg.id);
            }
        } catch (error) {
            this.logger.error('Error processing unread emails:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Xử lý một message theo ID
     */
    private async processMessageById(messageId: string): Promise<void> {
        const message = await this.gmailApiService.getMessage(messageId);
        if (!message) {
            this.logger.warn(`Message ${messageId} not found or error fetching`);
            return;
        }

        await this.processMessage(message);
    }

    /**
     * Xử lý một email
     */
    private async processMessage(message: IGmailMessage): Promise<void> {
        try {
            const fromHeader = message.headers.from || '';
            const senderEmail = this.gmailApiService.extractEmailFromHeader(fromHeader);
            const senderName = this.gmailApiService.extractNameFromHeader(fromHeader);
            const subject = message.headers.subject || '';

            // Bỏ qua emails từ hệ thống
            const systemEmails = ['no-reply@', 'noreply@', 'support@gen-hub', 'mailer-daemon@'];
            const isSystemEmail = systemEmails.some(se => senderEmail.includes(se));
            if (isSystemEmail) {
                this.logger.debug(`Skipping system email from ${senderEmail}`);
                await this.gmailApiService.markAsRead(message.id);
                return;
            }

            // Kiểm tra subject patterns
            const isUnlockEmail = this.UNLOCK_SUBJECT_PATTERN.test(subject);
            const isTicketReply = this.TICKET_SUBJECT_PATTERN.test(subject);

            if (!isUnlockEmail && !isTicketReply) {
                this.logger.debug(`Skipping irrelevant email: ${subject.substring(0, 50)}...`);
                await this.gmailApiService.markAsRead(message.id);
                return;
            }

            // Lấy nội dung email
            const bodyText = this.extractNewReplyContent(message.body.text || message.body.html || '');

            this.logger.debug(`Processing email from ${senderEmail}: ${subject}`);

            // Xử lý unlock email
            if (isUnlockEmail) {
                await this.handleUnlockEmail(message, senderEmail, subject, bodyText);
                return;
            }

            // Xử lý contact ticket reply
            if (isTicketReply) {
                await this.handleTicketReply(message, senderEmail, senderName, subject, bodyText);
                return;
            }
        } catch (error) {
            this.logger.error('Error processing email:', error);
        }
    }

    /**
     * Xử lý unlock email
     */
    private async handleUnlockEmail(
        message: IGmailMessage,
        senderEmail: string,
        subject: string,
        bodyText: string,
    ): Promise<void> {
        const subjectMatch = subject.match(this.UNLOCK_SUBJECT_PATTERN);
        if (!subjectMatch) {
            await this.gmailApiService.markAsRead(message.id);
            return;
        }

        const claimedEmail = subjectMatch[1].toLowerCase().trim();

        // Kiểm tra email match
        if (claimedEmail !== senderEmail) {
            this.logger.warn(`Subject email mismatch: claimed=${claimedEmail}, sender=${senderEmail}`);
            await this.gmailApiService.markAsRead(message.id);
            return;
        }

        // Tìm unlock code
        let unlockCode: string | null = null;

        const subjectCodeMatch = subject.match(this.UNLOCK_CODE_PATTERN);
        if (subjectCodeMatch) {
            unlockCode = subjectCodeMatch[1];
        } else {
            const bodyMatch = bodyText.match(this.UNLOCK_CODE_PATTERN);
            if (bodyMatch) {
                unlockCode = bodyMatch[1];
            }
        }

        if (!unlockCode) {
            this.logger.warn(`No unlock code found from ${senderEmail}`);
            await this.gmailApiService.markAsRead(message.id);
            return;
        }

        this.logger.log(`🔓 Unlock request from ${senderEmail} with code ${unlockCode}`);

        // Xác thực và unlock
        const success = await this.verifyAndUnlock(senderEmail, unlockCode);

        // Đánh dấu đã đọc
        await this.gmailApiService.markAsRead(message.id);

        // Gửi email phản hồi
        if (success) {
            const user = await this.prismaService.user.findFirst({
                where: { email: senderEmail },
                select: { name: true, language: true },
            });

            if (user) {
                await this.emailService.sendUnlockSuccessEmail(
                    senderEmail,
                    user.name,
                    user.language || 'vi',
                );
            }
        }
    }

    /**
     * Xử lý contact ticket reply
     */
    private async handleTicketReply(
        message: IGmailMessage,
        senderEmail: string,
        senderName: string,
        subject: string,
        bodyText: string,
    ): Promise<void> {
        this.logger.log(`📩 Contact ticket reply detected: ${subject}`);

        try {
            const processed = await this.contactService.processInboundEmail(
                senderEmail,
                senderName,
                subject,
                bodyText,
                message.headers.messageId || `inbound-${Date.now()}`,
                message.headers.inReplyTo,
                message.headers.references,
            );

            if (processed) {
                const ticketMatch = subject.match(this.TICKET_SUBJECT_PATTERN);
                this.logger.log(`✅ Contact ticket reply processed: ${ticketMatch?.[1]}`);
            } else {
                this.logger.warn(`⚠️ Contact ticket not found for: ${subject}`);
            }
        } catch (error) {
            this.logger.error('Error processing contact ticket reply:', error);
        }

        // Luôn đánh dấu đã đọc
        await this.gmailApiService.markAsRead(message.id);
    }

    /**
     * Trích xuất nội dung reply mới, bỏ quoted text
     */
    private extractNewReplyContent(fullContent: string): string {
        let content = fullContent;

        // Remove HTML tags if present
        content = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

        // Patterns để tìm điểm bắt đầu của quoted text
        const quoteMarkers = [
            /Vào[\s\S]+?đã viết:/i,           // Gmail Vietnamese
            /On[\s\S]+?wrote:/i,               // Gmail/Outlook English
            /^>+\s*/m,                         // Classic quote marker
            /-{5,}\s*(Forwarded|Original)\s+message/i,
            /From:\s*[\s\S]+?Sent:\s*/i,       // Outlook format
            /^\s*_{5,}\s*$/m,                  // Underscore separator
        ];

        let cutIndex = content.length;

        for (const marker of quoteMarkers) {
            const match = content.match(marker);
            if (match && match.index !== undefined && match.index < cutIndex) {
                cutIndex = match.index;
            }
        }

        content = content.substring(0, cutIndex);

        return content
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s+$/, '');
    }

    /**
     * Xác thực và mở khóa tài khoản
     */
    private async verifyAndUnlock(email: string, code: string): Promise<boolean> {
        const unlockKey = `unlock_token:${email}`;
        const tokenData = await this.redisService.get(unlockKey);

        if (!tokenData) {
            this.logger.warn(`No unlock token found for ${email}`);
            return false;
        }

        try {
            const parsed: IUnlockTokenData = JSON.parse(tokenData);

            if (parsed.code !== code) {
                this.logger.warn(`Invalid unlock code for ${email}`);
                return false;
            }

            // Kiểm tra user có bị brute force ban không
            const user = await this.prismaService.user.findFirst({
                where: { email },
                select: {
                    id: true,
                    name: true,
                    language: true,
                    is_brute_force_banned: true,
                },
            });

            if (!user) {
                this.logger.warn(`User not found for ${email}`);
                return false;
            }

            if (!user.is_brute_force_banned) {
                this.logger.warn(`Cannot unlock ${email} via email - not a brute force ban`);
                return false;
            }

            // Mở khóa tài khoản
            await this.prismaService.user.updateMany({
                where: { email },
                data: {
                    is_banned: false,
                    is_brute_force_banned: false,
                    banned_end: null,
                },
            });

            // Xóa Redis data
            await this.redisService.del(`lock_status:${email}`);
            await this.redisService.del(unlockKey);
            await this.redisService.delByPattern(`rate_limit:${email}:*`);

            this.logger.log(`✅ Account unlocked successfully for ${email}`);

            // Gửi email thông báo
            try {
                await this.emailService.sendUnlockSuccessEmail(
                    email,
                    user.name,
                    user.language || 'vi',
                );
            } catch (emailError) {
                this.logger.warn(`Failed to send unlock success email to ${email}:`, emailError);
            }

            return true;
        } catch (error) {
            this.logger.error(`Error verifying unlock code for ${email}:`, error);
            return false;
        }
    }
}
