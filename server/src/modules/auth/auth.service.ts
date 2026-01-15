import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from '@node-rs/argon2';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { I18nService } from 'nestjs-i18n';

import { UserRepository } from '../user/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { BackupCodeService } from '../backup-code/backup-code.service';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { AppConfigService } from '../../common/config/app-config.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RedisService } from '../redis/redis.service';
import { TurnstileService } from '../../common/services/turnstile.service';
import { HunterService } from '../../common/services/hunter.service';
import { BruteForceService } from '../brute-force/brute-force.service';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeLanguage } from '../../common/validators';
import {
  RegisterDto,
  LoginDto,
  VerifyAccessDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyForgotPasswordTokenDto,
  LogoutDto,
} from './dto';
import { IDeviceInfo } from '../../common/interfaces';

/**
 * Auth Service
 * Xử lý logic nghiệp vụ liên quan đến authentication
 */
@Injectable()
export class AuthService {
  /** Argon2id configuration */
  private get ARGON2_MEMORY_COST(): number {
    return Number(this.configService.get<number>('ARGON2_MEMORY_COST')) || 65536;
  }
  private get ARGON2_TIME_COST(): number {
    return Number(this.configService.get<number>('ARGON2_TIME_COST')) || 3;
  }
  private get ARGON2_PARALLELISM(): number {
    return Number(this.configService.get<number>('ARGON2_PARALLELISM')) || 1;
  }
  /** Thời gian hết hạn token xác thực email (mặc định 24 giờ = 86400000ms) */
  private get EMAIL_VERIFY_EXPIRATION(): number {
    return (
      Number(this.configService.get<number>('EMAIL_VERIFY_EXPIRATION')) ||
      24 * 60 * 60 * 1000
    );
  }
  /** Thời gian hết hạn forgot password token (mặc định 15 phút = 900000ms) */
  private get FORGOT_PASSWORD_EXPIRATION(): number {
    return (
      Number(this.configService.get<number>('FORGOT_PASSWORD_EXPIRATION')) ||
      15 * 60 * 1000
    );
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly backupCodeService: BackupCodeService,
    private readonly emailService: EmailService,
    private readonly systemLogService: SystemLogService,
    private readonly appConfigService: AppConfigService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly redisService: RedisService,
    private readonly turnstileService: TurnstileService,
    private readonly hunterService: HunterService,
    private readonly bruteForceService: BruteForceService,
    private readonly prismaService: PrismaService,
  ) { }

  /**
   * Đăng ký tài khoản mới bằng email
   */
  async register(dto: RegisterDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
    // Verify captcha token
    await this.turnstileService.verifyToken(dto.turnstileToken, deviceInfo?.ip, lang);

    // Verify email with Hunter.io
    await this.hunterService.verifyEmail(dto.email, lang);

    const existingEmail = await this.userRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(
        await this.i18n.t('auth.register.email_exists', { lang }),
      );
    }

    const hashedPassword = await argon2.hash(dto.password, {
      memoryCost: this.ARGON2_MEMORY_COST,
      timeCost: this.ARGON2_TIME_COST,
      parallelism: this.ARGON2_PARALLELISM,
    });

    const emailVerifyToken = this.generateToken();
    const emailVerifyExpired = new Date(
      Date.now() + this.EMAIL_VERIFY_EXPIRATION,
    );

    // Normalize language: sử dụng dto.language, nếu không có dùng lang từ header
    const normalizedLanguage = normalizeLanguage(dto.language || lang);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      language: normalizedLanguage,
      email_verify_token: emailVerifyToken,
      email_verify_expired: emailVerifyExpired,
    });

    Promise.all([
      this.emailService.sendVerificationEmail(
        dto.email,
        emailVerifyToken,
        dto.name,
        lang,
      ),
      this.emailService.sendWelcomeEmail(dto.email, dto.name, lang),
    ]).catch((error) => {
      this.systemLogService.error(
        'auth',
        'send_email_failed',
        `Failed to send registration emails: ${dto.email}`,
        {
          metaData: { email: dto.email, error: error.message },
        },
      );
    });

    const tokens = await this.generateTokens(user.id, deviceInfo, true);

    this.systemLogService.info(
      'auth',
      'register',
      `User registered: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
        metaData: { email: user.email, name: user.name },
      },
    );

    return {
      message: await this.i18n.t('auth.register.success', { lang }),
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Đăng nhập bằng email
   */
  async login(dto: LoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
    // Verify captcha token
    await this.turnstileService.verifyToken(dto.turnstileToken, deviceInfo?.ip, lang);

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.password) {
      // Ghi nhận lần đăng nhập thất bại
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      this.systemLogService.warn(
        'auth',
        'login_failed',
        `Login failed: user not found - ${dto.email}`,
        {
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: dto.email, reason: 'user_not_found' },
        },
      );
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.password, dto.password);
    } catch {
      // Ghi nhận lần đăng nhập thất bại
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      // Password hash is invalid format
      this.systemLogService.warn(
        'auth',
        'login_failed',
        `Login failed: invalid password hash format - ${dto.email}`,
        {
          userId: user.id,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: dto.email, reason: 'invalid_password_hash' },
        },
      );
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }
    if (!isPasswordValid) {
      // Ghi nhận lần đăng nhập thất bại
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      this.systemLogService.warn(
        'auth',
        'login_failed',
        `Login failed: invalid password - ${dto.email}`,
        {
          userId: user.id,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: dto.email, reason: 'invalid_password' },
        },
      );
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }

    if (user.is_banned) {
      if (!user.banned_end || new Date(user.banned_end) > new Date()) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.login.account_banned', { lang }),
        );
      }
    }

    if (user.two_factor_enabled) {
      const tempToken = await this.generateTempToken(user.id);
      return {
        message: await this.i18n.t('auth.login.two_factor_required', { lang }),
        requires_2fa: true,
        temp_token: tempToken,
      };
    }

    const tokens = await this.generateTokens(user.id, deviceInfo);

    // Reset brute force counter khi đăng nhập thành công
    await this.bruteForceService.onSuccessfulLogin(dto.email, deviceInfo?.ip || 'unknown');

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
            'auth',
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
      'auth',
      'login',
      `User logged in: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
        metaData: { email: user.email },
      },
    );

    return {
      message: await this.i18n.t('auth.login.success', { lang }),
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Đăng nhập cho Database Panel - yêu cầu quyền database.admin
   */
  async loginDatabasePanel(dto: LoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
    const result = await this.loginWithPermissionCheck(
      dto,
      deviceInfo,
      'database.admin',
      'auth.panel_login.database_permission_denied',
      'auth.panel_login.database_success',
      lang,
    );
    return result;
  }

  /**
   * Đăng nhập cho Feature Flag Panel - yêu cầu quyền featureflag.admin
   */
  async loginFeatureFlagPanel(dto: LoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
    const result = await this.loginWithPermissionCheck(
      dto,
      deviceInfo,
      'featureflag.admin',
      'auth.panel_login.feature_flag_permission_denied',
      'auth.panel_login.feature_flag_success',
      lang,
    );
    return result;
  }

  /**
   * Đăng nhập cho Resources Panel - yêu cầu quyền resources.admin
   */
  async loginResourcesPanel(dto: LoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
    const result = await this.loginWithPermissionCheck(
      dto,
      deviceInfo,
      'resources.admin',
      'auth.panel_login.resources_permission_denied',
      'auth.panel_login.resources_success',
      lang,
    );
    return result;
  }

  /**
   * Đăng nhập cho Admin Panel - yêu cầu 1 trong các quyền: database.admin, featureflag.admin, resources.admin, systemlogs.admin
   */
  async loginAdminPanel(dto: LoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
    const result = await this.loginWithAnyPermissionCheck(
      dto,
      deviceInfo,
      ['database.admin', 'featureflag.admin', 'resources.admin', 'systemlogs.admin', 'backup.admin', 'backup.list', 'backup.trigger'],
      'auth.panel_login.admin_permission_denied',
      'auth.panel_login.admin_success',
      lang,
    );
    return result;
  }

  /**
   * Login với kiểm tra permission - Helper method
   */
  private async loginWithPermissionCheck(
    dto: LoginDto,
    deviceInfo: IDeviceInfo | undefined,
    requiredPermission: string,
    permissionDeniedKey: string,
    successMessageKey: string,
    lang: string,
  ) {
    // Verify captcha token - panel logins also require captcha
    await this.turnstileService.verifyToken(dto.turnstileToken, deviceInfo?.ip, lang);

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.password) {
      // Ghi nhận lần đăng nhập thất bại
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      this.systemLogService.warn(
        'auth',
        'panel_login_failed',
        `Panel login failed: user not found - ${dto.email}`,
        {
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: dto.email, reason: 'user_not_found' },
        },
      );
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.password, dto.password);
    } catch {
      // Ghi nhận lần đăng nhập thất bại
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }
    if (!isPasswordValid) {
      // Ghi nhận lần đăng nhập thất bại
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }

    if (user.is_banned) {
      if (!user.banned_end || new Date(user.banned_end) > new Date()) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.login.account_banned', { lang }),
        );
      }
    }

    // Kiểm tra permission TRƯỚC khi tạo token
    const hasPermission = await this.checkUserPermission(user.id, requiredPermission);
    if (!hasPermission) {
      this.systemLogService.warn(
        'auth',
        'panel_login_permission_denied',
        `Panel login denied: missing ${requiredPermission} - ${user.email}`,
        {
          userId: user.id,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: user.email, requiredPermission },
        },
      );
      throw new ForbiddenException(
        await this.i18n.t(permissionDeniedKey, { lang }),
      );
    }

    if (user.two_factor_enabled) {
      const tempToken = await this.generateTempToken(user.id);
      return {
        message: await this.i18n.t('auth.login.two_factor_required', { lang }),
        requires_2fa: true,
        temp_token: tempToken,
      };
    }

    const tokens = await this.generateTokens(user.id, deviceInfo);

    // Reset brute force counter khi đăng nhập thành công
    await this.bruteForceService.onSuccessfulLogin(dto.email, deviceInfo?.ip || 'unknown');

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
            'auth',
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
      'auth',
      'panel_login',
      `User logged in to panel: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
        metaData: { email: user.email, permission: requiredPermission },
      },
    );

    return {
      message: await this.i18n.t(successMessageKey, { lang }),
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Kiểm tra user có permission cụ thể không
   */
  private async checkUserPermission(userId: string, permissionKey: string): Promise<boolean> {
    // Check direct permissions
    const directPermission = await this.redisService.getUserPermissionsCache(userId);
    if (directPermission !== null && directPermission.includes(permissionKey)) {
      return true;
    }

    // If not in cache, need to query (this logic mirrors PermissionGuard)
    const userWithPermissions = await this.userRepository.findById(userId);
    if (!userWithPermissions) return false;

    // Get permissions from database via raw query (simpler approach)
    // Using injected PrismaService instead of manual instantiation to ensure correct configuration
    const prisma = this.prismaService;

    // Check direct user permissions
    const directPerms = await prisma.userPermission.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
        permission: {
          key: permissionKey,
          is_active: true,
          is_deleted: false,
        },
      },
    });

    if (directPerms) return true;

    // Check role-based permissions
    const rolePerms = await prisma.userRole.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
        role: {
          is_active: true,
          is_deleted: false,
          permissions: {
            some: {
              is_active: true,
              is_deleted: false,
              permission: {
                key: permissionKey,
                is_active: true,
                is_deleted: false,
              },
            },
          },
        },
      },
    });

    return !!rolePerms;
  }

  /**
   * Login với kiểm tra ANY permission - Helper method cho Admin Panel
   */
  private async loginWithAnyPermissionCheck(
    dto: LoginDto,
    deviceInfo: IDeviceInfo | undefined,
    requiredPermissions: string[],
    permissionDeniedKey: string,
    successMessageKey: string,
    lang: string,
  ) {
    // Verify captcha token
    await this.turnstileService.verifyToken(dto.turnstileToken, deviceInfo?.ip, lang);

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.password) {
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      this.systemLogService.warn(
        'auth',
        'panel_login_failed',
        `Admin panel login failed: user not found - ${dto.email}`,
        {
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: dto.email, reason: 'user_not_found' },
        },
      );
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.password, dto.password);
    } catch {
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }
    if (!isPasswordValid) {
      await this.bruteForceService.recordFailedAttempt(dto.email, deviceInfo?.ip || 'unknown');
      throw new UnauthorizedException(
        await this.i18n.t('auth.login.invalid_credentials', { lang }),
      );
    }

    if (user.is_banned) {
      if (!user.banned_end || new Date(user.banned_end) > new Date()) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.login.account_banned', { lang }),
        );
      }
    }

    // Kiểm tra có BẤT KỲ permission nào
    let hasAnyPermission = false;
    for (const permission of requiredPermissions) {
      if (await this.checkUserPermission(user.id, permission)) {
        hasAnyPermission = true;
        break;
      }
    }

    if (!hasAnyPermission) {
      this.systemLogService.warn(
        'auth',
        'admin_panel_login_permission_denied',
        `Admin panel login denied: missing all required permissions - ${user.email}`,
        {
          userId: user.id,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
          metaData: { email: user.email, requiredPermissions },
        },
      );
      throw new ForbiddenException(
        await this.i18n.t(permissionDeniedKey, { lang }),
      );
    }

    if (user.two_factor_enabled) {
      const tempToken = await this.generateTempToken(user.id);
      return {
        message: await this.i18n.t('auth.login.two_factor_required', { lang }),
        requires_2fa: true,
        temp_token: tempToken,
      };
    }

    const tokens = await this.generateTokens(user.id, deviceInfo);

    await this.bruteForceService.onSuccessfulLogin(dto.email, deviceInfo?.ip || 'unknown');

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
            'auth',
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
      'auth',
      'admin_panel_login',
      `User logged in to admin panel: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
        metaData: { email: user.email },
      },
    );

    return {
      message: await this.i18n.t(successMessageKey, { lang }),
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }


  /**
   * Xác thực email
   */
  async verifyEmail(dto: VerifyEmailDto, lang = 'vi') {
    const user = await this.userRepository.findByEmailVerifyToken(dto.token);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('auth.verification.invalid_token', { lang }),
      );
    }

    await this.userRepository.verifyEmail(user.id);

    // Invalidate user cache để đảm bảo dữ liệu mới được cập nhật
    await this.redisService.invalidateUserCache(user.id);

    const message = await this.i18n.t('auth.verification.email_verified', { lang });

    // Emit socket event
    this.websocketGateway.emitEmailVerified(user.id, user.email || '', message);

    this.systemLogService.info(
      'auth',
      'verify_email',
      `Email verified: ${user.email}`,
      {
        userId: user.id,
        metaData: { email: user.email },
      },
    );

    return { message };
  }

  /**
   * Gửi lại email xác thực
   */
  async resendVerificationEmail(userId: string, lang = 'vi') {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    if (!user.email) {
      throw new BadRequestException('User không có email');
    }
    if (user.email_confirmed) {
      throw new BadRequestException(
        await this.i18n.t('auth.verification.already_verified', { lang }),
      );
    }

    const token = this.generateToken();
    const expiredAt = new Date(Date.now() + this.EMAIL_VERIFY_EXPIRATION);

    await this.userRepository.updateEmailVerifyToken(user.id, token, expiredAt);
    await this.emailService.sendVerificationEmail(
      user.email,
      token,
      user.name,
      lang,
    );

    return {
      message: await this.i18n.t('auth.verification.email_sent', { lang }),
    };
  }

  /**
   * Xác thực quyền truy cập trước khi thực hiện thao tác nhạy cảm
   */
  async verifyAccess(userId: string, dto: VerifyAccessDto, lang = 'vi') {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    if (!user.two_factor_enabled) {
      if (!dto.password) {
        throw new BadRequestException('Password là bắt buộc');
      }

      if (!user.password) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.access_verification.invalid_password', {
            lang,
          }),
        );
      }

      let isPasswordValid = false;
      try {
        isPasswordValid = await argon2.verify(user.password, dto.password);
      } catch {
        throw new UnauthorizedException(
          await this.i18n.t('auth.access_verification.invalid_password', {
            lang,
          }),
        );
      }
      if (!isPasswordValid) {
        throw new UnauthorizedException(
          await this.i18n.t('auth.access_verification.invalid_password', {
            lang,
          }),
        );
      }
    } else {
      if (dto.two_factor_code) {
        const isValid = speakeasy.totp.verify({
          secret: user.two_factor_token || '',
          encoding: 'base32',
          token: dto.two_factor_code,
        });

        if (!isValid) {
          throw new UnauthorizedException(
            await this.i18n.t('auth.access_verification.invalid_2fa_code', {
              lang,
            }),
          );
        }
      } else if (dto.backup_code) {
        const isValid = await this.backupCodeService.verifyBackupCode(
          userId,
          dto.backup_code,
        );
        if (!isValid) {
          throw new UnauthorizedException(
            await this.i18n.t('auth.access_verification.invalid_backup_code', {
              lang,
            }),
          );
        }
      } else {
        throw new BadRequestException('2FA code hoặc backup code là bắt buộc');
      }
    }

    const accessVerificationToken = await this.jwtService.signAsync(
      { userId, purpose: 'access_verification' },
      {
        secret: this.configService.get<string>(
          'ACCESS_VERIFICATION_TOKEN_SECRET',
        ),
        expiresIn:
          this.configService.get('ACCESS_VERIFICATION_TOKEN_EXPIRATION') ||
          '5m',
      },
    );

    return {
      message: await this.i18n.t('auth.access_verification.success', { lang }),
      access_verification_token: accessVerificationToken,
    };
  }

  /**
   * Yêu cầu đặt lại mật khẩu qua email
   */
  async forgotPassword(dto: ForgotPasswordDto, lang = 'vi') {
    // Verify captcha token
    await this.turnstileService.verifyToken(dto.turnstileToken, undefined, lang);

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      return {
        message: await this.i18n.t('auth.forgot_password.email_sent', { lang }),
      };
    }

    const token = this.generateToken();
    const expiredAt = new Date(Date.now() + this.FORGOT_PASSWORD_EXPIRATION);

    await this.userRepository.updateForgotPasswordToken(
      user.id,
      token,
      expiredAt,
    );
    await this.emailService.sendForgotPasswordEmail(
      user.email!,
      token,
      user.name,
      lang,
    );

    this.systemLogService.info(
      'auth',
      'forgot_password',
      `Password reset requested: ${user.email}`,
      {
        userId: user.id,
        metaData: { email: user.email },
      },
    );

    return {
      message: await this.i18n.t('auth.forgot_password.email_sent', { lang }),
    };
  }

  /**
   * Xác thực token quên mật khẩu
   */
  async verifyForgotPasswordToken(
    dto: VerifyForgotPasswordTokenDto,
    lang = 'vi',
  ) {
    const user = await this.userRepository.findByForgotPasswordToken(dto.token);

    return {
      valid: !!user,
      message: user
        ? await this.i18n.t('auth.forgot_password.token_valid', { lang })
        : await this.i18n.t('auth.forgot_password.invalid_token', { lang }),
    };
  }

  /**
   * Đặt lại mật khẩu
   */
  async resetPassword(dto: ResetPasswordDto, lang = 'vi') {
    const user = await this.userRepository.findByForgotPasswordToken(dto.token);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('auth.forgot_password.invalid_token', { lang }),
      );
    }

    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException(
        await this.i18n.t('auth.reset_password.password_mismatch', { lang }),
      );
    }

    const hashedPassword = await argon2.hash(
      dto.new_password,
      {
        memoryCost: this.ARGON2_MEMORY_COST,
        timeCost: this.ARGON2_TIME_COST,
        parallelism: this.ARGON2_PARALLELISM,
      },
    );

    await this.userRepository.resetPassword(user.id, hashedPassword);

    if (dto.logout_all_devices) {
      await this.refreshTokenRepository.deleteAllByUserId(user.id);
    }

    this.systemLogService.info(
      'auth',
      'reset_password',
      `Password reset completed: ${user.email}`,
      {
        userId: user.id,
        metaData: {
          email: user.email,
          logoutAllDevices: dto.logout_all_devices,
        },
      },
    );

    return {
      message: await this.i18n.t('auth.reset_password.success', { lang }),
    };
  }

  /**
   * Đăng xuất
   */
  async logout(dto: LogoutDto, lang = 'vi') {
    const refreshToken = await this.refreshTokenRepository.findByToken(
      dto.refresh_token,
    );
    const message = await this.i18n.t('auth.logout.success', { lang });

    if (refreshToken) {
      await this.refreshTokenRepository.softDelete(refreshToken.id);

      // Emit realtime logout event
      this.websocketGateway.emitUserLogout(
        refreshToken.user_id,
        refreshToken.id,
        message,
      );

      this.systemLogService.info('auth', 'logout', `User logged out`, {
        userId: refreshToken.user_id,
      });
    }

    return { message };
  }

  /**
   * Đăng xuất tất cả thiết bị
   */
  async logoutAll(userId: string, lang = 'vi') {
    await this.refreshTokenRepository.deleteAllByUserId(userId);
    const message = await this.i18n.t('auth.logout.all_devices', { lang });

    // Emit realtime logout all event
    this.websocketGateway.emitUserLogoutAll(userId, message);

    this.systemLogService.info(
      'auth',
      'logout_all',
      `User logged out from all devices`,
      {
        userId: userId,
      },
    );

    return { message };
  }

  /**
   * Refresh token - Cấp lại access token mới từ refresh token
   */
  async refreshToken(
    refreshTokenValue: string,
    deviceInfo?: IDeviceInfo,
    lang = 'vi',
  ) {
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshTokenValue);

    if (!storedToken) {
      throw new UnauthorizedException(
        await this.i18n.t('auth.refresh_token.invalid', { lang }),
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenValue, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        await this.refreshTokenRepository.softDelete(storedToken.id);
        throw new UnauthorizedException(
          await this.i18n.t('auth.refresh_token.invalid', { lang }),
        );
      }

      if (user.is_banned) {
        if (!user.banned_end || new Date(user.banned_end) > new Date()) {
          await this.refreshTokenRepository.softDelete(storedToken.id);
          throw new UnauthorizedException(
            await this.i18n.t('auth.login.account_banned', { lang }),
          );
        }
      }

      await this.refreshTokenRepository.softDelete(storedToken.id);

      const tokens = await this.generateTokens(
        user.id,
        deviceInfo,
        payload.is_primary_auth ?? true,
      );

      this.systemLogService.info(
        'auth',
        'refresh_token',
        `Token refreshed for user: ${user.email}`,
        {
          userId: user.id,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.device,
        },
      );

      return {
        message: await this.i18n.t('auth.refresh_token.success', { lang }),
        ...tokens,
      };
    } catch (error) {
      await this.refreshTokenRepository.softDelete(storedToken.id);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        await this.i18n.t('auth.refresh_token.expired', { lang }),
      );
    }
  }

  /**
   * Tạo access và refresh tokens
   * @param isPrimaryAuth - true nếu đăng nhập bằng liên kết chính
   */
  private async generateTokens(
    userId: string,
    deviceInfo?: IDeviceInfo,
    isPrimaryAuth: boolean = true,
  ) {
    const brandName = this.appConfigService.get('brandName');
    const payload = {
      userId,
      is_primary_auth: isPrimaryAuth,
      project: brandName,
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
   * Tạo temp token cho 2FA
   */
  private async generateTempToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { userId, purpose: 'temp_2fa' },
      {
        secret: this.configService.get<string>('TEMP_2FA_TOKEN_SECRET'),
        expiresIn: this.configService.get('TEMP_2FA_TOKEN_EXPIRATION') || '5m',
      },
    );
  }

  /**
   * Tạo token ngẫu nhiên (cho email verification, forgot password)
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
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
