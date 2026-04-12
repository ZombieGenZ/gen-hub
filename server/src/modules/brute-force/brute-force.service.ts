import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notification/email.service';
import { IUnlockTokenData, IPenaltyRules } from './interfaces';
import { BruteForceCacheHelper } from './constants/brute-force-cache.helper';

/**
 * Brute Force Service
 * Xử lý logic rate limiting và chống brute force attacks
 */
@Injectable()
export class BruteForceService {
  private readonly logger = new Logger(BruteForceService.name);
  private readonly penaltyRules: IPenaltyRules;
  private readonly ipWhitelist: string[];
  private readonly unlockCodeTTL: number;
  private readonly permanentBanThreshold: number;
  private readonly rateLimitTTL: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly i18n: I18nService,
    private readonly cacheHelper: BruteForceCacheHelper,
  ) {
    // Parse penalty rules từ env
    const rulesStr =
      this.configService.get<string>('PENALTY_RULES') ||
      '{"5":10,"6":15,"7":30,"8":60,"16":-1}';
    try {
      this.penaltyRules = JSON.parse(rulesStr);
    } catch {
      this.logger.warn('Invalid PENALTY_RULES format, using defaults');
      this.penaltyRules = { '5': 10, '6': 15, '7': 30, '8': 60, '16': -1 };
    }

    // Parse IP whitelist
    const whitelistStr =
      this.configService.get<string>('IP_WHITELIST') || '127.0.0.1,::1';
    this.ipWhitelist = whitelistStr.split(',').map((ip) => ip.trim());

    // Unlock code TTL (default 15 minutes)
    this.unlockCodeTTL =
      Number(this.configService.get<number>('BRUTE_FORCE_UNLOCK_CODE_TTL')) ||
      900;

    // Permanent ban threshold
    this.permanentBanThreshold =
      Number(
        this.configService.get<number>('BRUTE_FORCE_PERMANENT_BAN_THRESHOLD'),
      ) || 16;

    // Rate limit TTL
    this.rateLimitTTL =
      Number(
        this.configService.get<number>('REDIS_BRUTE_FORCE_RATE_LIMIT_TTL'),
      ) || 3600;
  }

  /**
   * Kiểm tra IP có trong whitelist không
   */
  isIPWhitelisted(ip: string): boolean {
    return this.ipWhitelist.includes(ip);
  }

  /**
   * Ghi nhận một lần đăng nhập thất bại
   * @returns Số lần thất bại hiện tại
   */
  async recordFailedAttempt(email: string, ip: string): Promise<number> {
    const key = this.cacheHelper.rateLimit(email, ip);

    // Increment counter
    const attempts = await this.redisService.incr(key);

    // Set TTL cho counter nếu chưa có
    if (attempts === 1) {
      await this.redisService.expire(key, this.rateLimitTTL);
    }

    // Kiểm tra có cần áp dụng penalty không
    await this.applyPenaltyIfNeeded(email, ip, attempts);

    return attempts;
  }

  /**
   * Áp dụng penalty nếu đạt ngưỡng
   */
  private async applyPenaltyIfNeeded(
    email: string,
    ip: string,
    attempts: number,
  ): Promise<void> {
    const penaltyMinutes = this.penaltyRules[attempts.toString()];

    if (penaltyMinutes === undefined) {
      return; // Chưa đến ngưỡng phạt
    }

    if (penaltyMinutes === -1) {
      // Khóa vĩnh viễn
      await this.applyPermanentBan(email);
    } else {
      // Khóa tạm thời
      await this.applyTemporaryLock(email, ip, penaltyMinutes, attempts);
    }
  }

  /**
   * Áp dụng khóa vĩnh viễn
   */
  private async applyPermanentBan(email: string): Promise<void> {
    // Cập nhật database
    await this.prismaService.user.updateMany({
      where: { email: email.toLowerCase() },
      data: {
        is_banned: true,
        is_brute_force_banned: true, // Đánh dấu là do brute force, không thể unlock bằng email
      },
    });

    // Set lock status trong Redis
    const lockKey = this.cacheHelper.lockStatus(email);
    await this.redisService.set(
      lockKey,
      JSON.stringify({
        type: 'permanent',
        since: Date.now(),
      }),
    );
  }

  /**
   * Áp dụng khóa tạm thời
   */
  private async applyTemporaryLock(
    email: string,
    ip: string,
    minutes: number,
    attempts: number,
  ): Promise<void> {
    const lockKey = this.cacheHelper.lockStatus(email);
    const unlockAt = Date.now() + minutes * 60 * 1000;

    // Set lock status trong Redis
    await this.redisService.set(
      lockKey,
      JSON.stringify({
        type: 'temporary',
        unlockAt,
        attempts,
      }),
      minutes * 60,
    );

    // Cập nhật banned_end trong database nếu cần
    await this.prismaService.user.updateMany({
      where: { email: email.toLowerCase() },
      data: {
        banned_end: new Date(unlockAt),
        is_brute_force_banned: true, // Đánh dấu là do brute force, có thể unlock bằng email
      },
    });

    // Tạo mã unlock và gửi email
    await this.generateAndSendUnlockCode(email, ip);
  }

  /**
   * Tạo mã unlock và gửi email
   */
  async generateAndSendUnlockCode(email: string, ip: string): Promise<string> {
    // Tạo mã 6 số ngẫu nhiên
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu vào Redis
    const unlockKey = this.cacheHelper.unlockToken(email);
    const data: IUnlockTokenData = {
      code,
      ip,
      createdAt: Date.now(),
    };
    await this.redisService.set(
      unlockKey,
      JSON.stringify(data),
      this.unlockCodeTTL,
    );

    // Lấy thông tin user để gửi email
    const user = await this.prismaService.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { name: true, language: true },
    });

    if (user) {
      // Gửi email cảnh báo với mã unlock (Async - Fire and forget)
      // Use setImmediate to ensure no blocking of the main thread
      setImmediate(() => {
        this.emailService
          .sendSecurityAlertEmail(
            email,
            user.name,
            code,
            ip,
            user.language || 'vi',
          )
          .catch((err) => {
            this.logger.error(
              `Failed to send security alert email to ${email}: ${err.message}`,
            );
          });
      });
    }

    return code;
  }

  /**
   * Kiểm tra email có bị khóa không
   */
  async isLocked(
    email: string,
    ip: string,
  ): Promise<{
    locked: boolean;
    type?: 'temporary' | 'permanent';
    unlockAt?: number;
    remainingSeconds?: number;
  }> {
    // Bỏ qua nếu IP trong whitelist
    if (this.isIPWhitelisted(ip)) {
      return { locked: false };
    }

    const lockKey = this.cacheHelper.lockStatus(email);
    const lockData = await this.redisService.get(lockKey);

    if (!lockData) {
      return { locked: false };
    }

    try {
      const parsed = JSON.parse(lockData);

      if (parsed.type === 'permanent') {
        return { locked: true, type: 'permanent' };
      }

      if (parsed.type === 'temporary') {
        const now = Date.now();
        if (now < parsed.unlockAt) {
          return {
            locked: true,
            type: 'temporary',
            unlockAt: parsed.unlockAt,
            remainingSeconds: Math.ceil((parsed.unlockAt - now) / 1000),
          };
        } else {
          // Lock đã hết hạn, xóa key
          await this.redisService.del(lockKey);
          return { locked: false };
        }
      }
    } catch {
      this.logger.error(`Invalid lock data format for ${email}`);
    }

    return { locked: false };
  }

  /**
   * Xác thực mã unlock
   */
  async verifyUnlockCode(
    email: string,
    code: string,
    fromEmail: string,
  ): Promise<boolean> {
    // Kiểm tra email khớp
    if (email.toLowerCase() !== fromEmail.toLowerCase()) {
      return false;
    }

    const unlockKey = this.cacheHelper.unlockToken(email);
    const tokenData = await this.redisService.get(unlockKey);

    if (!tokenData) {
      return false;
    }

    try {
      const parsed: IUnlockTokenData = JSON.parse(tokenData);

      if (parsed.code !== code) {
        return false;
      }

      // Mã đúng - mở khóa tài khoản
      await this.unlockAccount(email);

      return true;
    } catch {
      this.logger.error(`Invalid unlock token format for ${email}`);
      return false;
    }
  }

  /**
   * Mở khóa tài khoản
   */
  async unlockAccount(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // Cập nhật database
    await this.prismaService.user.updateMany({
      where: { email: normalizedEmail },
      data: {
        is_banned: false,
        is_brute_force_banned: false, // Reset flag
        banned_end: null,
      },
    });

    // Xóa tất cả dữ liệu Redis liên quan
    await this.clearUserData(normalizedEmail);
  }

  /**
   * Xóa tất cả dữ liệu brute force của user
   */
  async clearUserData(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // Xóa lock status
    await this.redisService.del(this.cacheHelper.lockStatus(normalizedEmail));

    // Xóa unlock token
    await this.redisService.del(this.cacheHelper.unlockToken(normalizedEmail));

    // Xóa tất cả rate limit keys
    await this.redisService.delByPattern(
      this.cacheHelper.rateLimitPattern(normalizedEmail),
    );
  }

  /**
   * Xử lý khi đăng nhập thành công - reset counter
   */
  async onSuccessfulLogin(email: string, ip: string): Promise<void> {
    const key = this.cacheHelper.rateLimit(email, ip);
    await this.redisService.del(key);
  }

  /**
   * Lấy thông báo lỗi khi bị khóa
   */
  async getLockedMessage(
    lockInfo: {
      type?: 'temporary' | 'permanent';
      remainingSeconds?: number;
    },
    lang: string = 'vi',
  ): Promise<string> {
    const minutes = Math.ceil((lockInfo.remainingSeconds || 0) / 60);

    if (lockInfo.type === 'permanent') {
      // Try i18n first
      try {
        const translated = await this.i18n.translate(
          'bruteForce.permanentlyLocked',
          { lang },
        );
        if (translated) return translated;
      } catch (e) {
        this.logger.warn('i18n translation failed for permanentlyLocked');
      }
      return 'Account permanently locked due to failed login attempts.';
    }

    // Try i18n first
    try {
      const translated = await this.i18n.translate(
        'bruteForce.temporarilyLocked',
        {
          lang,
          args: { minutes },
        },
      );
      if (translated) return translated;
    } catch (e) {
      this.logger.warn('i18n translation failed for temporarilyLocked');
    }

    return `Account temporarily locked. Please try again in ${minutes} minutes.`;
  }

  /**
   * Kiểm tra xem có thể tạo mã unlock mới không
   * (Khi mã cũ hết hạn nhưng vẫn trong thời gian banned_end)
   */
  async canRegenerateUnlockCode(email: string): Promise<boolean> {
    const unlockKey = this.cacheHelper.unlockToken(email);
    const exists = await this.redisService.exists(unlockKey);

    // Nếu unlock code đã hết hạn và user vẫn bị khóa, cho phép tạo mới
    if (!exists) {
      const lockInfo = await this.isLocked(email, '');
      return lockInfo.locked && lockInfo.type === 'temporary';
    }

    return false;
  }
}
