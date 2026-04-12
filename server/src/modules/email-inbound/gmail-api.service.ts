import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import {
  IGmailMessage,
  IGmailWatchResponse,
  IGmailHistoryItem,
  IGmailApiConfig,
} from './interfaces';

/**
 * Gmail API Service
 * Wrapper cho Gmail API operations, thay thế IMAP client
 */
@Injectable()
export class GmailApiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailApiService.name);
  private oAuth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private config: IGmailApiConfig | null = null;
  private watchRenewTimeout: NodeJS.Timeout | null = null;
  private currentHistoryId: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.initializeConfig();
    if (this.config) {
      await this.initializeClient();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.watchRenewTimeout) {
      clearTimeout(this.watchRenewTimeout);
      this.watchRenewTimeout = null;
    }
  }

  /**
   * Khởi tạo config từ environment
   */
  private initializeConfig(): void {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    const primaryEmail = this.configService.get<string>(
      'EMAIL_PRIMARY_ADDRESS',
    );

    if (!clientId || !clientSecret || !refreshToken || !primaryEmail) {
      this.logger.warn(
        '⚠️ Gmail API config không đầy đủ, service sẽ không hoạt động',
      );
      return;
    }

    this.config = {
      clientId,
      clientSecret,
      refreshToken,
      primaryEmail,
      pubsubTopic: this.configService.get<string>('GMAIL_PUBSUB_TOPIC'),
      watchLabelIds: (
        this.configService.get<string>('GMAIL_WATCH_LABEL_IDS') || 'INBOX'
      ).split(','),
      usePolling:
        this.configService.get<string>('GMAIL_USE_POLLING') === 'true',
      pollIntervalSeconds: parseInt(
        this.configService.get<string>('GMAIL_POLL_INTERVAL_SECONDS') || '30',
        10,
      ),
    };

    this.logger.log(`📧 Gmail API config loaded for ${primaryEmail}`);
  }

  /**
   * Khởi tạo OAuth2 client và Gmail API
   */
  private async initializeClient(): Promise<void> {
    if (!this.config) return;

    this.oAuth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      'https://developers.google.com/oauthplayground',
    );

    this.oAuth2Client.setCredentials({
      refresh_token: this.config.refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    // Test connection
    try {
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      this.currentHistoryId = profile.data.historyId || null;
      this.logger.log(
        `✅ Gmail API connected: ${profile.data.emailAddress}, historyId: ${this.currentHistoryId}`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to connect Gmail API:', error);
      this.gmail = null;
    }
  }

  /**
   * Kiểm tra service đã sẵn sàng chưa
   */
  isReady(): boolean {
    return this.gmail !== null;
  }

  /**
   * Lấy access token hiện tại
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.oAuth2Client) return null;

    try {
      const { token } = await this.oAuth2Client.getAccessToken();
      return token || null;
    } catch (error) {
      this.logger.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Đăng ký watch cho mailbox (push notifications)
   */
  async watchMailbox(): Promise<IGmailWatchResponse | null> {
    if (!this.gmail || !this.config?.pubsubTopic) {
      this.logger.warn(
        'Gmail API hoặc Pub/Sub topic chưa configured, không thể watch',
      );
      return null;
    }

    try {
      const response = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: this.config.pubsubTopic,
          labelIds: this.config.watchLabelIds,
        },
      });

      const result: IGmailWatchResponse = {
        historyId: response.data.historyId || '',
        expiration: response.data.expiration || '',
      };

      this.currentHistoryId = result.historyId;

      // Lên lịch renew watch (mỗi 24 giờ hoặc theo config)
      const renewHours = parseInt(
        this.configService.get<string>('GMAIL_WATCH_RENEW_INTERVAL_HOURS') ||
          '24',
        10,
      );
      this.scheduleWatchRenewal(renewHours);

      this.logger.log(
        `📧 Gmail watch registered, expires: ${new Date(parseInt(result.expiration)).toISOString()}`,
      );
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to watch mailbox:', error);
      return null;
    }
  }

  /**
   * Lên lịch renew watch
   */
  private scheduleWatchRenewal(hours: number): void {
    if (this.watchRenewTimeout) {
      clearTimeout(this.watchRenewTimeout);
    }

    const renewMs = (hours - 1) * 60 * 60 * 1000; // Renew 1 giờ trước khi hết hạn
    this.watchRenewTimeout = setTimeout(async () => {
      this.logger.log('🔄 Renewing Gmail watch...');
      await this.watchMailbox();
    }, renewMs);
  }

  /**
   * Dừng watch
   */
  async stopWatch(): Promise<void> {
    if (!this.gmail) return;

    try {
      await this.gmail.users.stop({ userId: 'me' });
      this.logger.log('Gmail watch stopped');
    } catch (error) {
      this.logger.warn('Failed to stop Gmail watch:', error);
    }
  }

  /**
   * Lấy lịch sử thay đổi từ historyId
   */
  async getHistory(startHistoryId: string): Promise<IGmailHistoryItem[]> {
    if (!this.gmail) return [];

    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX',
      });

      const history = response.data.history || [];
      this.currentHistoryId = response.data.historyId || startHistoryId;

      return history as IGmailHistoryItem[];
    } catch (error: any) {
      // 404 = historyId quá cũ, cần full sync
      if (error?.code === 404) {
        this.logger.warn('HistoryId expired, need full sync');
        return [];
      }
      this.logger.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * Lấy danh sách messages chưa đọc
   */
  async getUnreadMessages(
    maxResults: number = 10,
  ): Promise<Array<{ id: string; threadId: string }>> {
    if (!this.gmail) return [];

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX', 'UNREAD'],
        maxResults,
      });

      return (response.data.messages || []).map((msg) => ({
        id: msg.id || '',
        threadId: msg.threadId || '',
      }));
    } catch (error) {
      this.logger.error('Failed to list unread messages:', error);
      return [];
    }
  }

  /**
   * Lấy chi tiết một message
   */
  async getMessage(messageId: string): Promise<IGmailMessage | null> {
    if (!this.gmail) return null;

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const msg = response.data;
      const headers = this.parseHeaders(msg.payload?.headers || []);
      const body = this.parseBody(msg.payload);

      return {
        id: msg.id || '',
        threadId: msg.threadId || '',
        labelIds: msg.labelIds || [],
        historyId: msg.historyId || '',
        internalDate: msg.internalDate || '',
        headers,
        body,
      };
    } catch (error) {
      this.logger.error(`Failed to get message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Parse headers từ Gmail message
   */
  private parseHeaders(
    headers: gmail_v1.Schema$MessagePartHeader[],
  ): IGmailMessage['headers'] {
    const result: IGmailMessage['headers'] = {};

    for (const header of headers) {
      const name = header.name?.toLowerCase();
      const value = header.value || '';

      switch (name) {
        case 'from':
          result.from = value;
          break;
        case 'to':
          result.to = value;
          break;
        case 'subject':
          result.subject = value;
          break;
        case 'message-id':
          // Loại bỏ dấu < > nếu có
          result.messageId = value.replace(/^<|>$/g, '');
          break;
        case 'in-reply-to':
          result.inReplyTo = value.replace(/^<|>$/g, '');
          break;
        case 'references':
          result.references = value
            .split(/\s+/)
            .map((ref) => ref.replace(/^<|>$/g, ''));
          break;
      }
    }

    return result;
  }

  /**
   * Parse body từ Gmail message payload
   */
  private parseBody(
    payload: gmail_v1.Schema$MessagePart | undefined,
  ): IGmailMessage['body'] {
    const result: IGmailMessage['body'] = {};

    if (!payload) return result;

    // Trường hợp single part
    if (payload.body?.data) {
      const decoded = this.decodeBase64(payload.body.data);
      if (payload.mimeType === 'text/plain') {
        result.text = decoded;
      } else if (payload.mimeType === 'text/html') {
        result.html = decoded;
      }
    }

    // Trường hợp multipart
    if (payload.parts) {
      for (const part of payload.parts) {
        const partBody = this.parseBody(part);
        if (partBody.text && !result.text) result.text = partBody.text;
        if (partBody.html && !result.html) result.html = partBody.html;
      }
    }

    return result;
  }

  /**
   * Decode Base64 URL-safe
   */
  private decodeBase64(data: string): string {
    try {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Đánh dấu message đã đọc
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.gmail) return false;

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
      this.logger.debug(`Marked message ${messageId} as read`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark message ${messageId} as read:`, error);
      return false;
    }
  }

  /**
   * Lấy current history ID
   */
  getCurrentHistoryId(): string | null {
    return this.currentHistoryId;
  }

  /**
   * Cập nhật current history ID
   */
  setCurrentHistoryId(historyId: string): void {
    this.currentHistoryId = historyId;
  }

  /**
   * Kiểm tra có sử dụng polling mode không
   */
  isPollingMode(): boolean {
    return this.config?.usePolling === true || !this.config?.pubsubTopic;
  }

  /**
   * Lấy poll interval
   */
  getPollInterval(): number {
    return (this.config?.pollIntervalSeconds || 30) * 1000;
  }

  /**
   * Trích xuất email address từ header "From"
   * VD: "John Doe <john@example.com>" => "john@example.com"
   */
  extractEmailFromHeader(from: string): string {
    const match = from.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase();
    return from.toLowerCase().trim();
  }

  /**
   * Trích xuất tên từ header "From"
   * VD: "John Doe <john@example.com>" => "John Doe"
   */
  extractNameFromHeader(from: string): string {
    const match = from.match(/^(.+?)\s*<[^>]+>/);
    if (match) return match[1].replace(/"/g, '').trim();
    return from.split('@')[0];
  }
}
