import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notification/email.service';

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
 * IMAP worker lắng nghe inbox và xử lý email unlock
 */
@Injectable()
export class EmailInboundProvider implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EmailInboundProvider.name);
    private client: ImapFlow | null = null;
    private oAuth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;
    private isConnected = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private readonly UNLOCK_BODY_PATTERN = /UNLOCK\s+(\d{6})/i;
    private readonly UNLOCK_SUBJECT_PATTERN = /^\[UNLOCK\]\s+(.+@.+)$/i;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    async onModuleInit() {
        // Chỉ khởi động nếu có đầy đủ config
        const imapHost = this.configService.get<string>('IMAP_HOST');
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

        if (!imapHost || !clientId || !clientSecret || !refreshToken) {
            this.logger.warn('IMAP configuration incomplete, skipping email inbound worker');
            return;
        }

        this.initializeOAuth2Client();
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    /**
     * Khởi tạo OAuth2 client
     */
    private initializeOAuth2Client(): void {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

        if (clientId && clientSecret && refreshToken) {
            this.oAuth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                'https://developers.google.com/oauthplayground',
            );

            this.oAuth2Client.setCredentials({
                refresh_token: refreshToken,
            });
        }
    }

    /**
     * Lấy access token từ OAuth2
     */
    private async getAccessToken(): Promise<string | null> {
        if (!this.oAuth2Client) {
            return null;
        }

        try {
            const { token } = await this.oAuth2Client.getAccessToken();
            return token || null;
        } catch (error) {
            this.logger.error('Failed to get OAuth2 access token:', error);
            return null;
        }
    }

    /**
     * Kết nối IMAP
     */
    private async connect(): Promise<void> {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.logger.error('Cannot connect IMAP: no access token');
            this.scheduleReconnect();
            return;
        }

        const host = this.configService.get<string>('IMAP_HOST') || 'imap.gmail.com';
        const port = Number(this.configService.get<number>('IMAP_PORT')) || 993;
        const email = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

        try {
            this.client = new ImapFlow({
                host,
                port,
                secure: true,
                auth: {
                    user: email!,
                    accessToken,
                },
                logger: false,
            });

            this.client.on('error', (err) => {
                this.logger.error('IMAP client error:', err);
                this.isConnected = false;
                this.scheduleReconnect();
            });

            this.client.on('close', () => {
                this.logger.warn('IMAP connection closed');
                this.isConnected = false;
                this.scheduleReconnect();
            });

            await this.client.connect();
            this.isConnected = true;
            this.logger.log('IMAP connected successfully');

            // Bắt đầu lắng nghe inbox
            this.startListening();
        } catch (error) {
            this.logger.error('Failed to connect IMAP:', error);
            this.isConnected = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Ngắt kết nối IMAP
     */
    private async disconnect(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.client) {
            try {
                await this.client.logout();
            } catch {
                // Ignore logout errors
            }
            this.client = null;
        }
        this.isConnected = false;
    }

    /**
     * Lên lịch reconnect
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            return;
        }

        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            this.logger.log('Attempting to reconnect IMAP...');
            await this.connect();
        }, 30000); // Reconnect sau 30 giây
    }

    /**
     * Bắt đầu lắng nghe inbox
     */
    private async startListening(): Promise<void> {
        if (!this.client || !this.isConnected) {
            return;
        }

        try {
            // Chọn INBOX
            await this.client.mailboxOpen('INBOX');

            // Sử dụng IDLE để lắng nghe email mới
            this.client.on('exists', async (data) => {
                this.logger.debug(`New email notification: ${JSON.stringify(data)}`);
                await this.processNewEmails();
            });

            // Xử lý email hiện có (unseen)
            await this.processNewEmails();

            // Bắt đầu IDLE
            await this.idle();
        } catch (error) {
            this.logger.error('Error starting IMAP listener:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * IDLE loop để lắng nghe email mới
     */
    private async idle(): Promise<void> {
        if (!this.client || !this.isConnected) {
            return;
        }

        try {
            // IDLE sẽ chờ đến khi có email mới
            await this.client.idle();
        } catch (error) {
            if (this.isConnected) {
                this.logger.error('IDLE error:', error);
            }
        }

        // Tiếp tục IDLE nếu vẫn connected
        if (this.isConnected) {
            setImmediate(() => this.idle());
        }
    }

    /**
     * Xử lý email mới
     */
    private async processNewEmails(): Promise<void> {
        if (!this.client || !this.isConnected) {
            return;
        }

        try {
            // Tìm email chưa đọc
            const messages = this.client.fetch('1:*', {
                envelope: true,
                source: true,
                flags: true,
            }, { uid: true });

            for await (const message of messages) {
                // Bỏ qua email đã đọc
                if (message.flags?.has('\\Seen')) {
                    continue;
                }

                await this.processEmail(message);
            }
        } catch (error) {
            this.logger.error('Error processing emails:', error);
        }
    }

    /**
     * Xử lý một email
     */
    private async processEmail(message: any): Promise<void> {
        try {
            const envelope = message.envelope;
            const from = envelope.from?.[0];

            if (!from?.address) {
                return;
            }

            const senderEmail = from.address.toLowerCase();
            const subject = envelope.subject || '';

            // Parse body từ source
            const source = message.source.toString();
            const bodyText = this.extractTextBody(source);

            this.logger.debug(`Processing email from ${senderEmail}: ${subject}`);

            // Kiểm tra subject pattern [UNLOCK] email
            const subjectMatch = subject.match(this.UNLOCK_SUBJECT_PATTERN);
            if (!subjectMatch) {
                // Không phải unlock email (subject không đúng format), đánh dấu đã đọc
                this.logger.debug(`Subject doesn't match unlock pattern: ${subject}`);
                await this.markAsRead(message.uid);
                return;
            }

            this.logger.log(`📩 Unlock email detected! Subject: ${subject}`);

            const claimedEmail = subjectMatch[1].toLowerCase().trim();

            // Kiểm tra email trong subject có khớp với sender không
            if (claimedEmail !== senderEmail) {
                this.logger.warn(`Subject email mismatch: claimed=${claimedEmail}, sender=${senderEmail}`);
                await this.markAsRead(message.uid);
                return;
            }

            // Kiểm tra body pattern UNLOCK [CODE]
            this.logger.debug(`Body text: ${bodyText.substring(0, 100)}...`);
            const bodyMatch = bodyText.match(this.UNLOCK_BODY_PATTERN);
            if (!bodyMatch) {
                this.logger.warn(`Invalid unlock body format from ${senderEmail}. Body: ${bodyText.substring(0, 50)}`);
                await this.markAsRead(message.uid);
                return;
            }

            const unlockCode = bodyMatch[1];
            this.logger.log(`Unlock request from ${senderEmail} with code ${unlockCode}`);

            // Xác thực mã unlock
            const success = await this.verifyAndUnlock(senderEmail, unlockCode);

            // Đánh dấu email đã đọc
            await this.markAsRead(message.uid);

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
        } catch (error) {
            this.logger.error('Error processing email:', error);
        }
    }

    /**
     * Extract text body từ email source
     */
    private extractTextBody(source: string): string {
        // Đơn giản hóa: tìm nội dung text trong email
        // Với email reply, nội dung thường nằm trước quote
        const lines = source.split('\n');
        const bodyLines: string[] = [];
        let inBody = false;
        let foundBoundary = false;

        for (const line of lines) {
            // Bỏ qua header
            if (!inBody) {
                if (line.trim() === '') {
                    inBody = true;
                }
                continue;
            }

            // Dừng khi gặp quote hoặc signature
            if (line.startsWith('>') || line.startsWith('--')) {
                break;
            }

            // Bỏ qua boundary của multipart
            if (line.includes('Content-Type:') || line.includes('boundary=')) {
                foundBoundary = true;
                continue;
            }

            if (foundBoundary && line.startsWith('--')) {
                continue;
            }

            bodyLines.push(line.trim());
        }

        return bodyLines.join(' ').trim();
    }

    /**
     * Đánh dấu email đã đọc
     */
    private async markAsRead(uid: number): Promise<void> {
        if (!this.client || !this.isConnected) {
            return;
        }

        try {
            await this.client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
        } catch (error) {
            this.logger.error('Error marking email as read:', error);
        }
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

            // Mã đúng - mở khóa tài khoản
            await this.prismaService.user.updateMany({
                where: { email },
                data: {
                    is_banned: false,
                    banned_end: null,
                },
            });

            // Xóa dữ liệu Redis
            await this.redisService.del(`lock_status:${email}`);
            await this.redisService.del(unlockKey);
            await this.redisService.delByPattern(`rate_limit:${email}:*`);

            this.logger.log(`Account unlocked successfully for ${email}`);
            return true;
        } catch (error) {
            this.logger.error(`Error verifying unlock code for ${email}:`, error);
            return false;
        }
    }
}
