import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { I18nService } from 'nestjs-i18n';

import { TwoFactorRepository } from './repositories/two-factor.repository';
import { BackupCodeService } from '../backup-code/backup-code.service';
import { SystemLogService } from '../system-log/system-log.service';
import { EmailService } from '../notification/email.service';
import { AppConfigService } from '../../common/config/app-config.service';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { BruteForceService } from '../brute-force/brute-force.service';
import { RedisService } from '../redis/redis.service';
import { VerifyTwoFactorSetupDto, VerifyTwoFactorLoginDto } from './dto';
import { IDeviceInfo } from '../../common/interfaces';
import {
  TWO_FACTOR_ACTIONS,
  TWO_FACTOR_MODULE,
} from './constants/two-factor.constant';
import { ISanitizedUser } from './types';

/**
 * Two-Factor Service
 * Xử lý logic nghiệp vụ liên quan đến xác thực 2 yếu tố
 * Đã tối ưu hóa: sử dụng Repository pattern và Redis caching
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly twoFactorRepository: TwoFactorRepository,
    private readonly backupCodeService: BackupCodeService,
    private readonly systemLogService: SystemLogService,
    private readonly emailService: EmailService,
    private readonly appConfigService: AppConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly websocketGateway: WebsocketGateway,
    private readonly bruteForceService: BruteForceService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Thiết lập 2FA (bước 1)
   * Tối ưu: Lưu secret vào Redis thay vì DB
   */
  async setupTwoFactor(userId: string, lang = 'vi') {
    const user = await this.twoFactorRepository.findUserForTwoFactor(userId);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('two-factor.user_not_found', { lang }),
      );
    }

    if (user.two_factor_enabled) {
      throw new BadRequestException(
        await this.i18n.t('auth.two_factor.already_enabled', { lang }),
      );
    }

    const brandName = this.appConfigService.get('brandName');
    const secret = speakeasy.generateSecret({
      name: `${brandName}:${user.email}`,
      issuer: brandName,
    });

    // Tối ưu: Lưu secret vào Redis (cache) thay vì DB
    // Giúp tránh việc lưu rác vào DB nếu user không hoàn tất setup
    await this.redisService.setTwoFactorSetupCache(userId, secret.base32);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    this.systemLogService.info(
      TWO_FACTOR_MODULE,
      TWO_FACTOR_ACTIONS.SETUP_2FA,
      `2FA setup initiated: ${user.email}`,
      {
        userId: user.id,
        metaData: { email: user.email },
      },
    );

    return {
      message: await this.i18n.t('auth.two_factor.setup_in_progress', { lang }),
      secret: secret.base32,
      qr_code_url: qrCodeUrl,
    };
  }

  /**
   * Xác minh thiết lập 2FA (bước 2)
   */
  async verifyTwoFactorSetup(
    userId: string,
    dto: VerifyTwoFactorSetupDto,
    lang = 'vi',
  ) {
    // 1. Lấy secret từ Redis cache
    const secret =
      await this.redisService.getTwoFactorSetupCache<string>(userId);

    // Nếu không tìm thấy trong cache, kiểm tra DB (fallback cho trường hợp cũ hoặc redis mất data)
    let userSecret = secret;
    const user = await this.twoFactorRepository.findUserForTwoFactor(userId);

    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('two-factor.user_not_found', { lang }),
      );
    }

    if (!userSecret) {
      // Fallback: Check if secret is already in DB (from legacy flow)
      if (user.two_factor_token && !user.two_factor_enabled) {
        userSecret = user.two_factor_token;
      } else {
        throw new BadRequestException(
          await this.i18n.t('two-factor.setup_not_started', { lang }),
        );
      }
    }

    // 2. Verify token
    const isValid = speakeasy.totp.verify({
      secret: userSecret,
      encoding: 'base32',
      token: dto.two_factor_code,
      window: 1,
    });

    if (!isValid) {
      throw new BadRequestException(
        await this.i18n.t('auth.two_factor.verify_failed', { lang }),
      );
    }

    // 3. Nếu valid, cập nhật DB (Transaction-like via Promise.all if possible, but sequential dependence here)
    // Cập nhật secret và enable 2FA
    await this.twoFactorRepository.confirmTwoFactorSetup(userId, userSecret);

    // 4. Generate backup codes
    const backupCodes =
      await this.backupCodeService.generateAndSaveBackupCodes(userId);

    // 5. Cleanup cache
    await Promise.all([
      this.redisService.invalidateTwoFactorSetupCache(userId),
      this.redisService.invalidateUserCache(userId),
    ]);

    const message = await this.i18n.t('auth.two_factor.setup_success', {
      lang,
    });

    // Emit socket event
    this.websocketGateway.emit2FAStatusChanged(userId, true, message);

    this.systemLogService.info(
      TWO_FACTOR_MODULE,
      TWO_FACTOR_ACTIONS.ENABLE_2FA,
      `2FA enabled: ${user.email}`,
      {
        userId: user.id,
        metaData: { email: user.email },
      },
    );

    return { message, backup_codes: backupCodes };
  }

  /**
   * Vô hiệu hóa 2FA
   */
  async disableTwoFactor(userId: string, lang = 'vi') {
    const user = await this.twoFactorRepository.findUserForTwoFactor(userId);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('two-factor.user_not_found', { lang }),
      );
    }

    if (!user.two_factor_enabled) {
      throw new BadRequestException(
        await this.i18n.t('auth.two_factor.not_enabled', { lang }),
      );
    }

    await this.twoFactorRepository.disableTwoFactor(userId);
    await this.backupCodeService.deleteAllBackupCodes(userId);

    const message = await this.i18n.t('auth.two_factor.disabled_success', {
      lang,
    });

    // Clear cache
    await this.redisService.invalidateUserCache(userId);

    // Emit socket event
    this.websocketGateway.emit2FAStatusChanged(userId, false, message);

    this.systemLogService.info(
      TWO_FACTOR_MODULE,
      TWO_FACTOR_ACTIONS.DISABLE_2FA,
      `2FA disabled: ${user.email}`,
      {
        userId: user.id,
        metaData: { email: user.email },
      },
    );

    return { message };
  }

  /**
   * Xác minh 2FA khi đăng nhập
   */
  async verifyTwoFactorLogin(
    dto: VerifyTwoFactorLoginDto,
    deviceInfo?: IDeviceInfo,
    lang = 'vi',
  ) {
    let payload: { userId: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.temp_token, {
        secret: this.configService.get<string>('TEMP_2FA_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        await this.i18n.t('two-factor.temp_token_invalid', { lang }),
      );
    }

    // Tối ưu: sử dụng phương thức findUserForTwoFactor chỉ lấy fields cần thiết
    const user = await this.twoFactorRepository.findUserForTwoFactor(
      payload.userId,
    );
    if (!user || !user.two_factor_token) {
      throw new UnauthorizedException(
        await this.i18n.t('two-factor.user_not_found', { lang }),
      );
    }

    // Kiểm tra tài khoản bị khóa
    if (user.is_banned) {
      if (!user.banned_end || new Date(user.banned_end) > new Date()) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.login.account_banned', { lang }),
        );
      }
    }

    let isValid = false;

    // Use Promise.all for parallel verification check if needed,
    // but here strict conditional logic applies.
    if (dto.two_factor_code) {
      isValid = speakeasy.totp.verify({
        secret: user.two_factor_token,
        encoding: 'base32',
        token: dto.two_factor_code,
      });
    } else if (dto.backup_code) {
      isValid = await this.backupCodeService.verifyBackupCode(
        user.id,
        dto.backup_code,
      );
    }

    if (!isValid) {
      // Record failed attempt
      if (user.email) {
        await this.bruteForceService.recordFailedAttempt(
          user.email,
          deviceInfo?.ip || 'unknown',
        );
      }
      this.systemLogService.warn(
        TWO_FACTOR_MODULE,
        TWO_FACTOR_ACTIONS.VERIFY_FAILED,
        `2FA verification failed: ${user.email}`,
        {
          userId: user.id,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: user.email, reason: 'invalid_code' },
        },
      );
      throw new UnauthorizedException(
        await this.i18n.t('auth.two_factor.verify_failed', { lang }),
      );
    }

    // Parallel execution: reset brute force + generate tokens
    const [, tokens] = await Promise.all([
      user.email
        ? this.bruteForceService.onSuccessfulLogin(
            user.email,
            deviceInfo?.ip || 'unknown',
          )
        : Promise.resolve(),
      this.generateTokens(user.id, deviceInfo),
    ]);

    // Fire-and-forget email notification
    if (user.email) {
      this.emailService
        .sendLoginNotificationEmail(
          user.email,
          user.name,
          { device: deviceInfo?.device, ip: deviceInfo?.ip },
          user.language,
        )
        .catch((error) => {
          this.systemLogService.error(
            TWO_FACTOR_MODULE,
            TWO_FACTOR_ACTIONS.SEND_EMAIL_FAILED,
            `Failed to send login notification email: ${user.email}`,
            {
              userId: user.id,
              metaData: { error: error.message },
            },
          );
        });
    }

    this.systemLogService.info(
      TWO_FACTOR_MODULE,
      TWO_FACTOR_ACTIONS.VERIFY_LOGIN,
      `2FA login verified: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
        metaData: { email: user.email },
      },
    );

    return {
      message: await this.i18n.t('auth.two_factor.verify_success', { lang }),
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Tạo mới backup codes
   */
  async regenerateBackupCodes(userId: string, lang = 'vi') {
    const user = await this.twoFactorRepository.findUserForTwoFactor(userId);
    if (!user || !user.two_factor_enabled) {
      throw new BadRequestException(
        await this.i18n.t('auth.two_factor.not_enabled', { lang }),
      );
    }

    const backupCodes =
      await this.backupCodeService.generateAndSaveBackupCodes(userId);

    return {
      message: await this.i18n.t('auth.two_factor.backup_codes_generated', {
        lang,
      }),
      backup_codes: backupCodes,
    };
  }

  /**
   * Tạo access và refresh tokens
   */
  private async generateTokens(userId: string, deviceInfo?: IDeviceInfo) {
    const brandName = this.appConfigService.get('brandName');
    const payload = {
      userId,
      is_primary_auth: true,
      project: brandName,
      team: 'TANK ZENITH GEN Development Team',
      copyright: `© ${new Date().getFullYear()} TANK ZENITH GEN. All rights reserved.`,
    };

    // Parallelize token generation
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    await this.refreshTokenRepository.create(userId, refreshToken, deviceInfo);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Loại bỏ các field nhạy cảm từ user object
   */
  private sanitizeUser(user: any): ISanitizedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      email_confirmed: user.email_confirmed,
      is_verified: user.is_verified,
      two_factor_enabled: user.two_factor_enabled,
      language: user.language,
      created_at: user.created_at,
    };
  }
}
