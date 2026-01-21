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

import { UserRepository } from '../user/user.repository';
import { BackupCodeService } from '../backup-code/backup-code.service';
import { SystemLogService } from '../system-log/system-log.service';
import { EmailService } from '../notification/email.service';
import { AppConfigService } from '../../common/config/app-config.service';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { BruteForceService } from '../brute-force/brute-force.service';
import { RedisService } from '../redis/redis.service';
import { VerifyTwoFactorSetupDto, VerifyTwoFactorLoginDto } from '../auth/dto';
import { IDeviceInfo } from '../../common/interfaces';

/**
 * Two-Factor Service
 * Xử lý logic nghiệp vụ liên quan đến xác thực 2 yếu tố
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly userRepository: UserRepository,
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
   */
  async setupTwoFactor(userId: string, lang = 'vi') {
    const user = await this.userRepository.findById(userId);
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

    await this.userRepository.updateTwoFactorSecret(userId, secret.base32);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    this.systemLogService.info(
      'two-factor',
      'setup_2fa',
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
    const user = await this.userRepository.findById(userId);
    if (!user || !user.two_factor_token) {
      throw new BadRequestException(
        await this.i18n.t('two-factor.setup_not_started', { lang }),
      );
    }

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_token,
      encoding: 'base32',
      token: dto.two_factor_code,
    });

    if (!isValid) {
      throw new BadRequestException(
        await this.i18n.t('auth.two_factor.verify_failed', { lang }),
      );
    }

    await this.userRepository.enableTwoFactor(userId);

    // Generate backup codes after successful verification
    const backupCodes =
      await this.backupCodeService.generateAndSaveBackupCodes(userId);

    const message = await this.i18n.t('auth.two_factor.setup_success', {
      lang,
    });

    // Clear cache profile của user
    await this.redisService.invalidateUserCache(userId);

    // Emit socket event
    this.websocketGateway.emit2FAStatusChanged(userId, true, message);

    this.systemLogService.info(
      'two-factor',
      'enable_2fa',
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
    const user = await this.userRepository.findById(userId);
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

    await this.userRepository.disableTwoFactor(userId);

    await this.backupCodeService.deleteAllBackupCodes(userId);

    const message = await this.i18n.t('auth.two_factor.disabled_success', {
      lang,
    });

    // Clear cache profile của user
    await this.redisService.invalidateUserCache(userId);

    // Emit socket event
    this.websocketGateway.emit2FAStatusChanged(userId, false, message);

    this.systemLogService.info(
      'two-factor',
      'disable_2fa',
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
   * Bao gồm kiểm tra tài khoản bị khóa và ghi nhận failed attempts
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

    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.two_factor_token) {
      throw new UnauthorizedException(
        await this.i18n.t('two-factor.user_not_found', { lang }),
      );
    }

    // Kiểm tra tài khoản bị khóa (giống như login)
    if (user.is_banned) {
      if (!user.banned_end || new Date(user.banned_end) > new Date()) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.login.account_banned', { lang }),
        );
      }
    }

    let isValid = false;

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
      // Ghi nhận lần đăng nhập thất bại
      if (user.email) {
        await this.bruteForceService.recordFailedAttempt(
          user.email,
          deviceInfo?.ip || 'unknown',
        );
      }
      this.systemLogService.warn(
        'two-factor',
        'verify_2fa_failed',
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

    // Chạy song song: reset brute force + tạo tokens
    const [, tokens] = await Promise.all([
      user.email
        ? this.bruteForceService.onSuccessfulLogin(
            user.email,
            deviceInfo?.ip || 'unknown',
          )
        : Promise.resolve(),
      this.generateTokens(user.id, deviceInfo),
    ]);

    // Gửi email thông báo (fire-and-forget)
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
            'two-factor',
            'send_email_failed',
            `Failed to send login notification email: ${user.email}`,
            {
              userId: user.id,
              metaData: { error: error.message },
            },
          );
        });
    }

    this.systemLogService.info(
      'two-factor',
      'verify_2fa_login',
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
    const user = await this.userRepository.findById(userId);
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

  // /**
  //  * Lấy danh sách backup codes
  //  */
  // async getBackupCodes(userId: string, lang = 'vi') {
  //     const codesList = await this.backupCodeService.getBackupCodesList(userId);

  //     return {
  //         message: await this.i18n.t('auth.backup_codes.list_success', { lang }),
  //         ...codesList,
  //     };
  // }

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

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    await this.refreshTokenRepository.create(userId, refreshToken, deviceInfo);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Loại bỏ các field nhạy cảm từ user object
   */
  private sanitizeUser(user: {
    id: string;
    name: string;
    email?: string | null;
    email_confirmed: boolean;
    is_verified?: boolean | null;
    two_factor_enabled: boolean;
    language: string;
    created_at: Date;
  }) {
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
