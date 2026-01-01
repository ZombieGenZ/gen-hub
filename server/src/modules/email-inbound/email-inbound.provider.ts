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
import { ContactService } from '../contact/contact.service';

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
    private idleTimeout: NodeJS.Timeout | null = null;
    private readonly IDLE_TIMEOUT = 20 * 60 * 1000; // 20 phút - restart IDLE trước Gmail timeout (~30 phút)
    private readonly UNLOCK_CODE_PATTERN = /UNLOCK\s+(\d{6})/i;
    // Subject format: [UNLOCK] email@domain.com hoặc [UNLOCK] email@domain.com - UNLOCK 123456
    private readonly UNLOCK_SUBJECT_PATTERN = /^\[UNLOCK\]\s+([^\s-]+@[^\s-]+)/i;
    // Subject format for contact tickets: [#TICKET-20260101-001] hoặc Re: [#TICKET-20260101-001]
    private readonly TICKET_SUBJECT_PATTERN = /\[#([A-Z]+-\d{8}-\d{3})\]/i;

    // Configurable timeout and retry
    private readonly FETCH_TIMEOUT: number;
    private readonly FETCH_MAX_RETRIES: number;
    private fetchRetryCount = 0;
    private lastMailboxCount = 0; // Track mailbox count to detect new emails

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService,
        private readonly emailService: EmailService,
        private readonly contactService: ContactService,
    ) {
        // Get configurable values from env
        this.FETCH_TIMEOUT = this.configService.get<number>('IMAP_FETCH_TIMEOUT_MS') || 60000;
        this.FETCH_MAX_RETRIES = this.configService.get<number>('IMAP_FETCH_MAX_RETRIES') || 3;
    }

    async onModuleInit() {
        this.logger.log('📧 EmailInboundProvider initializing...');

        // Chỉ khởi động nếu có đầy đủ config
        const imapHost = this.configService.get<string>('IMAP_HOST');
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
        const email = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

        // Log config status (masked for security) - dùng log thay vì debug
        this.logger.log(`Config check: IMAP_HOST=${imapHost ? '✓' : '✗'}, EMAIL_PRIMARY_ADDRESS=${email ? '✓' : '✗'}`);
        this.logger.log(`Config check: GOOGLE_CLIENT_ID=${clientId ? '✓' : '✗'}, GOOGLE_CLIENT_SECRET=${clientSecret ? '✓' : '✗'}, GOOGLE_REFRESH_TOKEN=${refreshToken ? '✓' : '✗'}`);

        if (!imapHost || !clientId || !clientSecret || !refreshToken) {
            this.logger.error('⚠️ IMAP configuration incomplete, skipping email inbound worker');
            this.logger.error(`Missing: ${[
                !imapHost && 'IMAP_HOST',
                !clientId && 'GOOGLE_CLIENT_ID',
                !clientSecret && 'GOOGLE_CLIENT_SECRET',
                !refreshToken && 'GOOGLE_REFRESH_TOKEN'
            ].filter(Boolean).join(', ')}`);
            return;
        }

        this.logger.log(`📧 Starting IMAP worker for email: ${email}`);
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
        this.logger.log('🔌 Connecting to IMAP server...');

        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.logger.error('❌ Cannot connect IMAP: no access token (OAuth2 failed)');
            this.scheduleReconnect();
            return;
        }
        this.logger.debug('✓ OAuth2 access token obtained');

        const host = this.configService.get<string>('IMAP_HOST') || 'imap.gmail.com';
        const port = Number(this.configService.get<number>('IMAP_PORT')) || 993;
        const email = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

        this.logger.log(`🔌 Connecting to ${host}:${port} as ${email}`);

        try {
            this.client = new ImapFlow({
                host,
                port,
                secure: true,
                auth: {
                    user: email!,
                    accessToken,
                },
                // Enable logging để debug
                logger: {
                    debug: (msg: any) => this.logger.debug(`[IMAP] ${JSON.stringify(msg)}`),
                    info: (msg: any) => this.logger.log(`[IMAP] ${JSON.stringify(msg)}`),
                    warn: (msg: any) => this.logger.warn(`[IMAP] ${JSON.stringify(msg)}`),
                    error: (msg: any) => this.logger.error(`[IMAP] ${JSON.stringify(msg)}`),
                },
            });

            this.client.on('error', (err) => {
                this.logger.error('❌ IMAP client error:', err);
                this.isConnected = false;
                this.scheduleReconnect();
            });

            this.client.on('close', () => {
                this.logger.warn('⚠️ IMAP connection closed');
                this.isConnected = false;
                this.scheduleReconnect();
            });

            // Thêm timeout 60 giây cho connection (Gmail thường throttle)
            this.logger.log('⏳ Waiting for IMAP connection (60s timeout - Gmail may throttle)...');
            const connectionPromise = this.client.connect();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('IMAP connection timeout after 60s')), 60000)
            );

            await Promise.race([connectionPromise, timeoutPromise]);

            this.isConnected = true;
            this.logger.log('✅ IMAP connected successfully');

            // Bắt đầu lắng nghe inbox
            this.startListening();
        } catch (error) {
            this.logger.error('❌ Failed to connect IMAP:', error);
            this.isConnected = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Ngắt kết nối IMAP
     */
    private async disconnect(): Promise<void> {
        // Clear IDLE timeout
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }

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
            this.logger.log('📥 Opening INBOX...');
            // Chọn INBOX
            await this.client.mailboxOpen('INBOX');
            this.logger.log('📥 INBOX opened successfully');

            // Sử dụng IDLE để lắng nghe email mới
            // CHÚ Ý: KHÔNG gọi processNewEmails() ở đây - idle() method sẽ xử lý
            // để tránh race condition khi cả 2 cùng gọi IMAP commands
            this.client.on('exists', (data) => {
                this.logger.log(`📧 New email notification received! Data: ${JSON.stringify(data)}`);
                // Break IDLE để idle() method có thể xử lý email
                // imapflow sẽ tự động gửi DONE command khi gọi noop()
                if (this.client && this.isConnected) {
                    this.client.noop().catch(() => {
                        // Ignore errors - IDLE sẽ tự break
                    });
                }
            });
            this.logger.log('👂 Registered exists event handler');

            // SKIP initial processing - Gmail throttle quá nặng
            // Chỉ lắng nghe email MỚI từ bây giờ
            this.logger.log('⚡ Skipping initial email scan (Gmail throttle), listening for NEW emails only...');

            // Bắt đầu IDLE ngay
            this.logger.log('⏳ Starting IDLE mode...');
            await this.idle();
        } catch (error) {
            this.logger.error('Error starting IMAP listener:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * IDLE loop để lắng nghe email mới
     * Gmail có IDLE timeout ~30 phút, nên cần restart IDLE định kỳ
     */
    private async idle(): Promise<void> {
        if (!this.client || !this.isConnected) {
            return;
        }

        // Clear any existing IDLE timeout
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }

        try {
            // Set timeout để break IDLE trước Gmail timeout (~30 phút)
            this.idleTimeout = setTimeout(async () => {
                this.logger.log('⏰ IDLE timeout reached (20 min), restarting IDLE...');
                if (this.client && this.isConnected) {
                    try {
                        // Sử dụng NOOP để break IDLE gracefully
                        await this.client.noop();
                    } catch (e) {
                        this.logger.debug('NOOP during IDLE break:', e);
                    }
                }
            }, this.IDLE_TIMEOUT);

            this.logger.log('🔄 IDLE command started, waiting for new emails...');

            // IDLE sẽ chờ đến khi có email mới hoặc timeout
            await this.client.idle();

            this.logger.log('🔔 IDLE ended, checking for new emails...');
        } catch (error) {
            if (this.isConnected) {
                this.logger.error('IDLE error:', error);
            }
        } finally {
            // Clear timeout khi IDLE kết thúc
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = null;
            }
        }

        // Xử lý email mới sau mỗi IDLE cycle và tiếp tục IDLE
        if (this.isConnected) {
            await this.processNewEmails();
            setImmediate(() => this.idle());
        }
    }

    /**
     * Xử lý email mới
     * CHỈ xử lý 1 email MỚI NHẤT để tránh bị block bởi Gmail throttle
     * Có timeout configurable (default 60s) để đảm bảo IDLE luôn được restart
     */
    private async processNewEmails(): Promise<void> {
        if (!this.client || !this.isConnected) {
            return;
        }

        // Check if mailbox has new emails by comparing count
        try {
            const mailbox = this.client.mailbox;
            if (mailbox && typeof mailbox.exists === 'number') {
                if (this.lastMailboxCount === 0) {
                    // First check, just record the count
                    this.lastMailboxCount = mailbox.exists;
                    this.logger.debug(`📬 Mailbox has ${mailbox.exists} emails, tracking for changes...`);
                } else if (mailbox.exists <= this.lastMailboxCount) {
                    // No new emails, skip processing
                    this.logger.debug(`📭 No new emails (count: ${mailbox.exists}, last: ${this.lastMailboxCount})`);
                    this.fetchRetryCount = 0; // Reset retry count on success
                    return;
                } else {
                    this.logger.log(`📧 New email detected! Count: ${mailbox.exists}, was: ${this.lastMailboxCount}`);
                    this.lastMailboxCount = mailbox.exists;
                }
            }
        } catch {
            // Ignore mailbox check errors, proceed with fetch
        }

        const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(
                () => reject(new Error(`Fetch timeout after ${this.FETCH_TIMEOUT / 1000}s`)),
                this.FETCH_TIMEOUT
            )
        );

        try {
            await Promise.race([
                this.doProcessNewEmails(),
                timeoutPromise,
            ]);
            // Success - reset retry count
            this.fetchRetryCount = 0;
        } catch (error) {
            this.fetchRetryCount++;

            // Only log warning if we haven't exceeded max retries
            if (this.fetchRetryCount <= this.FETCH_MAX_RETRIES) {
                this.logger.debug(`⏳ Email processing attempt ${this.fetchRetryCount}/${this.FETCH_MAX_RETRIES} timed out (this is often normal)`);
            } else {
                // Log warning after max retries exceeded
                this.logger.warn(`⚠️ Email processing failed after ${this.fetchRetryCount} attempts (IDLE will restart):`, error);
                this.fetchRetryCount = 0; // Reset for next cycle
            }
        }
    }


    /**
     * Thực hiện xử lý email
     */
    private async doProcessNewEmails(): Promise<void> {
        this.logger.log('🔍 Searching for UNSEEN emails...');

        // Tìm email chưa đọc sử dụng SEARCH
        const allUnseenUids = await this.client!.search({ seen: false }, { uid: true });

        if (!allUnseenUids || allUnseenUids.length === 0) {
            this.logger.log('📭 No unseen emails found');
            return;
        }

        // Sort UIDs giảm dần (mới nhất trước) và lấy tối đa 10 emails
        const sortedUids = [...allUnseenUids].sort((a, b) => b - a);
        const uidsToProcess = sortedUids.slice(0, 10);

        this.logger.log(`📬 Found ${allUnseenUids.length} unseen email(s), processing up to 10 most recent...`);

        // Xử lý TỪNG EMAIL MỘT theo thứ tự UID giảm dần (mới nhất trước!)
        let processed = 0;
        for (const uid of uidsToProcess) {
            try {
                this.logger.debug(`Fetching UID: ${uid}...`);
                const messages = this.client!.fetch([uid], {
                    envelope: true,
                    source: true,
                    flags: true,
                }, { uid: true });

                for await (const message of messages) {
                    await this.processEmail(message);
                    processed++;
                }
            } catch (error) {
                this.logger.warn(`Error processing UID ${uid}:`, error);
            }
        }

        this.logger.log(`✅ Processed ${processed} email(s)`);
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

            // Bỏ qua emails từ hệ thống (no-reply, noreply, support của chính mình)
            const systemEmails = ['no-reply@', 'noreply@', 'support@gen-hub', 'mailer-daemon@'];
            const isSystemEmail = systemEmails.some(se => senderEmail.includes(se));
            if (isSystemEmail) {
                this.logger.debug(`Skipping system email from ${senderEmail}: ${subject}`);
                await this.markAsRead(message.uid);
                return;
            }

            // Quick subject filter - skip emails không liên quan (spam, newsletters, etc.)
            // Chỉ xử lý: [UNLOCK] emails hoặc [#TICKET-...] replies
            const isUnlockEmail = this.UNLOCK_SUBJECT_PATTERN.test(subject);
            const isTicketReply = this.TICKET_SUBJECT_PATTERN.test(subject);

            if (!isUnlockEmail && !isTicketReply) {
                this.logger.debug(`Skipping irrelevant email: ${subject.substring(0, 50)}...`);
                await this.markAsRead(message.uid);
                return;
            }

            // Parse body từ source (chỉ khi cần thiết)
            const source = message.source.toString();
            const bodyText = this.extractTextBody(source);

            this.logger.debug(`Processing email from ${senderEmail}: ${subject}`);

            // Kiểm tra subject pattern [UNLOCK] email
            const subjectMatch = subject.match(this.UNLOCK_SUBJECT_PATTERN);
            if (!subjectMatch) {
                // Không phải unlock email, thử xử lý như contact ticket reply
                this.logger.debug(`Subject doesn't match unlock pattern: ${subject}`);

                // Kiểm tra có phải là reply cho contact ticket không
                const ticketMatch = subject.match(this.TICKET_SUBJECT_PATTERN);
                if (ticketMatch) {
                    this.logger.log(`📩 Contact ticket reply detected! Subject: ${subject}`);

                    // Parse email headers
                    const inReplyTo = this.extractHeader(source, 'In-Reply-To');
                    const references = this.extractHeader(source, 'References')?.split(/\s+/).filter(Boolean) || [];
                    const msgId = this.extractHeader(source, 'Message-ID');

                    try {
                        const processed = await this.contactService.processInboundEmail(
                            senderEmail,
                            from.name || senderEmail,
                            subject,
                            bodyText,
                            msgId || `inbound-${Date.now()}`,
                            inReplyTo || undefined,
                            references,
                        );

                        if (processed) {
                            this.logger.log(`✅ Contact ticket reply processed: ${ticketMatch[1]}`);
                        } else {
                            this.logger.warn(`⚠️ Contact ticket not found for: ${ticketMatch[1]}`);
                        }
                    } catch (error) {
                        this.logger.error(`Error processing contact ticket reply:`, error);
                    }
                }

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

            // Tìm UNLOCK code trong subject hoặc body
            // Format 1: Subject có code: [UNLOCK] email@domain.com - UNLOCK 123456
            // Format 2: Code trong body: UNLOCK 123456
            let unlockCode: string | null = null;

            // Thử tìm trong subject trước
            const subjectCodeMatch = subject.match(this.UNLOCK_CODE_PATTERN);
            if (subjectCodeMatch) {
                unlockCode = subjectCodeMatch[1];
                this.logger.debug(`Found unlock code in subject: ${unlockCode}`);
            } else {
                // Thử tìm trong body
                this.logger.debug(`Body text: ${bodyText.substring(0, 100)}...`);
                const bodyMatch = bodyText.match(this.UNLOCK_CODE_PATTERN);
                if (bodyMatch) {
                    unlockCode = bodyMatch[1];
                    this.logger.debug(`Found unlock code in body: ${unlockCode}`);
                }
            }

            if (!unlockCode) {
                this.logger.warn(`No unlock code found in subject or body from ${senderEmail}. Subject: ${subject}, Body: ${bodyText.substring(0, 50)}`);
                await this.markAsRead(message.uid);
                return;
            }

            this.logger.log(`🔓 Unlock request from ${senderEmail} with code ${unlockCode}`);

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
     * Gmail emails thường là multipart với text/plain và text/html
     */
    private extractTextBody(source: string): string {
        // Bước 1: Tìm và decode phần text/plain (thường là base64 trong Gmail)
        const textPlainMatch = source.match(
            /Content-Type:\s*text\/plain[^\r\n]*\r?\n(?:Content-Transfer-Encoding:\s*(base64|quoted-printable|7bit|8bit)[^\r\n]*)?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\r?\n--)/i
        );

        let textContent = '';

        if (textPlainMatch) {
            const encoding = textPlainMatch[1]?.toLowerCase();
            const rawContent = textPlainMatch[2] || '';

            if (encoding === 'base64') {
                // Decode base64
                try {
                    const cleanBase64 = rawContent.replace(/\s/g, '');
                    textContent = Buffer.from(cleanBase64, 'base64').toString('utf-8');
                    this.logger.debug(`Decoded base64 text/plain: ${textContent.substring(0, 100)}...`);
                } catch (e) {
                    this.logger.warn('Failed to decode base64:', e);
                    textContent = rawContent;
                }
            } else if (encoding === 'quoted-printable') {
                // Decode quoted-printable
                textContent = rawContent
                    .replace(/=\r?\n/g, '')
                    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            } else {
                textContent = rawContent;
            }
        }

        // Bước 2: Nếu không tìm thấy text/plain, thử fallback
        if (!textContent) {
            // Tìm UNLOCK pattern trực tiếp trong source (cho unlock emails)
            const unlockMatch = source.match(/UNLOCK\s+\d{6}/i);
            if (unlockMatch) {
                return unlockMatch[0];
            }

            // Fallback: lấy raw body
            const bodyMatch = source.match(/\r?\n\r?\n([\s\S]+)/);
            if (bodyMatch) {
                textContent = bodyMatch[1];
            }
        }

        if (!textContent) {
            return '';
        }

        // Bước 3: Loại bỏ quoted text (chỉ giữ phần reply mới của user)
        const newReply = this.extractNewReplyOnly(textContent);

        this.logger.debug(`Extracted new reply content: ${newReply.substring(0, 100)}...`);
        return newReply;
    }

    /**
     * Trích xuất chỉ nội dung reply mới, bỏ quoted text
     * Gmail thường có format:
     * - quoted lines bắt đầu bằng ">"
     * - hoặc có dòng "On ... wrote:" trước các quote
     * - hoặc có "Vào ... đã viết:" (Gmail Vietnamese)
     */
    private extractNewReplyOnly(fullContent: string): string {
        // Phương pháp 1: Tìm và cắt tại các markers phổ biến
        // Gmail Vietnamese: "Vào ... đã viết:"
        // Gmail English: "On ... wrote:"
        // Outlook: "From: ... Sent:"

        let content = fullContent;

        // Patterns để tìm điểm bắt đầu của quoted text
        // Dùng [\s\S] thay vì . để match cả newlines
        const quoteMarkers = [
            /Vào[\s\S]+?đã viết:/i,            // Gmail Vietnamese (với line breaks)
            /On[\s\S]+?wrote:/i,                // Gmail/Outlook English (với line breaks)  
            /^>+\s*/m,                          // Classic quote marker
            /-{5,}\s*(Forwarded|Original)\s+message/i,  // Forwarded messages
            /From:\s*[\s\S]+?Sent:\s*/i,        // Outlook format
            /^\s*_{5,}\s*$/m,                   // Underscore separator
        ];

        let cutIndex = content.length;

        for (const marker of quoteMarkers) {
            const match = content.match(marker);
            if (match && match.index !== undefined && match.index < cutIndex) {
                cutIndex = match.index;
            }
        }

        // Cắt content tại điểm quote bắt đầu
        content = content.substring(0, cutIndex);

        // Cleanup: loại bỏ trailing whitespace và multiple newlines
        return content
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s+$/, '');
    }

    /**
     * Extract header value từ email source
     */
    private extractHeader(source: string, headerName: string): string | null {
        const regex = new RegExp(`^${headerName}:\\s*(.+)$`, 'im');
        const match = source.match(regex);
        if (match && match[1]) {
            // Clean up angle brackets từ Message-ID và In-Reply-To
            return match[1].trim().replace(/^<|>$/g, '');
        }
        return null;
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

            // Kiểm tra user có bị ban do brute force không
            const user = await this.prismaService.user.findFirst({
                where: { email },
                select: {
                    id: true,
                    name: true,
                    language: true,
                    is_brute_force_banned: true
                },
            });

            if (!user) {
                this.logger.warn(`User not found for ${email}`);
                return false;
            }

            // Chỉ cho unlock nếu là brute force ban
            if (!user.is_brute_force_banned) {
                this.logger.warn(`Cannot unlock ${email} via email - not a brute force ban (admin banned)`);
                return false;
            }

            // Mã đúng - mở khóa tài khoản
            await this.prismaService.user.updateMany({
                where: { email },
                data: {
                    is_banned: false,
                    is_brute_force_banned: false, // Reset flag
                    banned_end: null,
                },
            });

            // Xóa dữ liệu Redis
            await this.redisService.del(`lock_status:${email}`);
            await this.redisService.del(unlockKey);
            await this.redisService.delByPattern(`rate_limit:${email}:*`);

            this.logger.log(`Account unlocked successfully for ${email}`);

            // Gửi email thông báo unlock thành công
            try {
                await this.emailService.sendUnlockSuccessEmail(
                    email,
                    user.name,
                    user.language || 'vi',
                );
                this.logger.log(`Unlock success email sent to ${email}`);
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
