import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from '@node-rs/argon2';
import { I18nService } from 'nestjs-i18n';

import { AccountRepository } from './account.repository';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto';
import { normalizeLanguage } from '../../common/validators';
import { IDeviceInfo } from '../../common/interfaces';
import { IAccountProfile } from './interfaces';
import {
  VALID_DELETE_CONFIRMATIONS,
  DEFAULT_LANGUAGE,
  ARGON2_DEFAULTS,
} from './constants/account.constant';

/**
 * Account Service
 * Xử lý logic nghiệp vụ liên quan đến quản lý tài khoản
 * Sử dụng Repository pattern cho data access
 * Cache-aside pattern với TTL từ môi trường
 */
@Injectable()
export class AccountService {
  /** Argon2id configuration từ môi trường */
  private get ARGON2_MEMORY_COST(): number {
    return (
      Number(this.configService.get<number>('ARGON2_MEMORY_COST')) ||
      ARGON2_DEFAULTS.MEMORY_COST
    );
  }
  private get ARGON2_TIME_COST(): number {
    return (
      Number(this.configService.get<number>('ARGON2_TIME_COST')) ||
      ARGON2_DEFAULTS.TIME_COST
    );
  }
  private get ARGON2_PARALLELISM(): number {
    return (
      Number(this.configService.get<number>('ARGON2_PARALLELISM')) ||
      ARGON2_DEFAULTS.PARALLELISM
    );
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly accountRepository: AccountRepository,
    private readonly emailService: EmailService,
    private readonly systemLogService: SystemLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
  ) { }

  /**
   * Lấy thông tin profile
   * Sử dụng cache-aside pattern với dedicated account cache methods
   */
  async getProfile(userId: string, lang = DEFAULT_LANGUAGE) {
    // 1. Check cache first - sử dụng dedicated account cache methods
    const cachedProfile =
      await this.redisService.getAccountProfileCache<IAccountProfile>(userId);

    if (cachedProfile) {
      return {
        message: await this.i18n.t('account.profile.get_success', { lang }),
        ...cachedProfile,
      };
    }

    // 2. Cache miss - query database với optimized selects
    const user =
      await this.accountRepository.getUserWithRolesAndPermissions(userId);

    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('common.error.user_not_found', { lang }),
      );
    }

    // 3. Transform data
    const roles = user.system_roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    }));

    // Gom các roles có cùng permission vào mảng roles
    const rolePermissionsMap = new Map<
      string,
      {
        id: string;
        name: string;
        key: string;
        description: string | null;
        source: 'role' | 'permission';
        roles: Array<{ id: string; name: string }>;
      }
    >();

    for (const ur of user.system_roles) {
      for (const rp of ur.role.permissions) {
        const permissionId = rp.permission.id;
        if (rolePermissionsMap.has(permissionId)) {
          // Thêm role vào danh sách roles của permission đã tồn tại
          rolePermissionsMap.get(permissionId)!.roles.push({
            id: ur.role.id,
            name: ur.role.name,
          });
        } else {
          // Tạo permission mới với role đầu tiên
          rolePermissionsMap.set(permissionId, {
            id: rp.permission.id,
            name: rp.permission.name,
            key: rp.permission.key,
            description: rp.permission.description,
            source: 'role' as const,
            roles: [{ id: ur.role.id, name: ur.role.name }],
          });
        }
      }
    }
    const rolePermissions = Array.from(rolePermissionsMap.values());

    const directPermissions = user.system_permissions.map((up) => ({
      id: up.permission.id,
      name: up.permission.name,
      key: up.permission.key,
      description: up.permission.description,
      source: 'permission' as const,
      roles: [] as Array<{ id: string; name: string }>,
    }));

    // Merge permission + role permissions, ưu tiên permission nếu trùng
    const allPermissions = [...directPermissions, ...rolePermissions];
    const uniquePermissions = allPermissions.filter(
      (p, index, self) => index === self.findIndex((t) => t.id === p.id),
    );

    const profileData: IAccountProfile = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_confirmed: user.email_confirmed,
        is_verified: user.is_verified,
        two_factor_enabled: user.two_factor_enabled,
        language: user.language,
        created_at: user.created_at,
      },
      roles,
      permissions: uniquePermissions,
    };

    // 4. Set cache - TTL từ môi trường thông qua RedisService
    await this.redisService.setAccountProfileCache(userId, profileData);

    return {
      message: await this.i18n.t('account.profile.get_success', { lang }),
      ...profileData,
    };
  }

  /**
   * Cập nhật thông tin tài khoản (name, language, avatar)
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    lang = DEFAULT_LANGUAGE,
  ) {
    const user = await this.accountRepository.findById(userId);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('common.error.user_not_found', { lang }),
      );
    }

    // Normalize language trước khi lưu (lowercase)
    const normalizedLanguage = dto.language
      ? normalizeLanguage(dto.language)
      : undefined;

    const updatedUser = await this.accountRepository.updateProfile(userId, {
      name: dto.name,
      language: normalizedLanguage,
    });

    // Invalidate caches song song
    await Promise.all([
      this.redisService.invalidateAccountProfileCache(userId),
      this.redisService.invalidateUserCache(userId),
    ]);

    // Get updated fields list
    const updatedFields: string[] = [];
    if (dto.name) updatedFields.push('name');
    if (dto.language) updatedFields.push('language');

    // Emit realtime profile updated event
    this.websocketGateway.emitProfileUpdated(userId, updatedFields, {
      id: user.id,
      name: dto.name || user.name,
      email: user.email,
      language: dto.language || user.language || undefined,
    });

    this.systemLogService.info(
      'account',
      'update_profile',
      `Profile updated: ${user.email}`,
      {
        userId: user.id,
        metaData: { name: dto.name, language: dto.language },
      },
    );

    // Get updated profile to return and recache
    const { message: _ignore, ...profileData } = await this.getProfile(
      userId,
      lang,
    );

    return {
      message: await this.i18n.t('auth.update_profile.success', { lang }),
      ...profileData,
    };
  }

  /**
   * Thay đổi mật khẩu (chỉ cho tài khoản đăng ký bằng email)
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    deviceInfo?: IDeviceInfo,
    lang = DEFAULT_LANGUAGE,
  ) {
    const user = await this.accountRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('common.error.user_not_found', { lang }),
      );
    }

    if (!user.password) {
      throw new BadRequestException(
        await this.i18n.t('auth.change_password.no_password', { lang }),
      );
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.password, dto.current_password);
    } catch {
      throw new UnauthorizedException(
        await this.i18n.t('auth.change_password.incorrect_current_password', {
          lang,
        }),
      );
    }
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        await this.i18n.t('auth.change_password.incorrect_current_password', {
          lang,
        }),
      );
    }

    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException(
        await this.i18n.t('auth.change_password.password_mismatch', { lang }),
      );
    }

    const hashedPassword = await argon2.hash(dto.new_password, {
      memoryCost: this.ARGON2_MEMORY_COST,
      timeCost: this.ARGON2_TIME_COST,
      parallelism: this.ARGON2_PARALLELISM,
    });
    await this.accountRepository.updatePassword(userId, hashedPassword);

    if (dto.logout_all_devices) {
      await this.refreshTokenRepository.deleteAllByUserId(userId);

      // Emit realtime token revoked event
      const message = await this.i18n.t(
        'auth.change_password.session_revoked',
        { lang },
      );
      this.websocketGateway.emitTokenRevoked(
        userId,
        'password_changed',
        message,
      );
    }

    if (user.email) {
      this.emailService
        .sendPasswordChangedEmail(user.email, user.name, user.language)
        .catch((error) => {
          this.systemLogService.error(
            'account',
            'send_email_failed',
            `Failed to send password changed email: ${user.email}`,
            {
              userId: user.id,
              metaData: { error: error.message },
            },
          );
        });
    }

    this.systemLogService.info(
      'account',
      'change_password',
      `Password changed: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
      },
    );

    const message = await this.i18n.t('auth.change_password.success', { lang });

    // Emit socket event
    this.websocketGateway.emitPasswordChanged(userId, message);

    return { message };
  }

  /**
   * Tải xuống dữ liệu cá nhân
   * Trả về toàn bộ dữ liệu của user dưới dạng JSON
   * Sử dụng cache để tránh query nặng lặp lại
   */
  async downloadPersonalData(
    userId: string,
    deviceInfo?: IDeviceInfo,
    lang = DEFAULT_LANGUAGE,
  ) {
    // Check user exists first
    const user = await this.accountRepository.findById(userId);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('common.error.user_not_found', { lang }),
      );
    }

    // Check cache for full data
    const cachedData =
      await this.redisService.getAccountFullDataCache<Record<string, unknown>>(
        userId,
      );

    let userData: Record<string, unknown>;
    if (cachedData) {
      userData = cachedData;
    } else {
      // Lấy toàn bộ dữ liệu của user từ repository (đã optimize với Promise.all)
      const fetchedData =
        await this.accountRepository.getUserFullDataForExport(userId);
      if (!fetchedData) {
        throw new BadRequestException(
          await this.i18n.t('common.error.user_not_found', { lang }),
        );
      }
      userData = fetchedData as unknown as Record<string, unknown>;

      // Cache for subsequent requests
      await this.redisService.setAccountFullDataCache(userId, userData);
    }

    // Ghi log
    this.systemLogService.info(
      'account',
      'download_data',
      `User downloaded personal data: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
      },
    );

    // Emit socket event
    this.websocketGateway.emitUserDataDownloaded(userId);

    return {
      message: await this.i18n.t('account.download_data.success', { lang }),
      data: userData,
      filename: `user-data-${user.id}-${new Date().toISOString().split('T')[0]}.json`,
    };
  }

  /**
   * Xóa tài khoản (soft delete)
   * Yêu cầu xác nhận bằng cách gõ "XÓA TÀI KHOẢN" hoặc "DELETE ACCOUNT"
   */
  async deleteAccount(
    userId: string,
    confirmation: string,
    reason?: string,
    deviceInfo?: IDeviceInfo,
    lang = DEFAULT_LANGUAGE,
  ) {
    const user = await this.accountRepository.findByIdForDelete(userId);
    if (!user) {
      throw new BadRequestException(
        await this.i18n.t('common.error.user_not_found', { lang }),
      );
    }

    // Kiểm tra xác nhận
    const normalizedConfirmation = confirmation.toUpperCase();
    if (
      !VALID_DELETE_CONFIRMATIONS.some(
        (valid) => valid === normalizedConfirmation,
      )
    ) {
      throw new BadRequestException(
        await this.i18n.t('account.delete_account.invalid_confirmation', {
          lang,
        }),
      );
    }

    // Soft delete user
    await this.accountRepository.softDelete(userId, userId);

    // Xóa tất cả refresh tokens
    await this.refreshTokenRepository.deleteAllByUserId(userId);

    // Invalidate all caches song song
    await Promise.all([
      this.redisService.invalidateAllAccountCache(userId),
      this.redisService.invalidateUserCache(userId),
      this.redisService.invalidateUserPermissionsCache(userId),
    ]);

    // Ghi log
    this.systemLogService.warn(
      'account',
      'delete_account',
      `User deleted their account: ${user.email}`,
      {
        userId: user.id,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.device,
        metaData: { reason },
      },
    );

    // TODO: Gửi email thông báo khi có method sendAccountDeletedEmail

    // Emit socket event để force logout
    this.websocketGateway.emitUserAccountDeleted(userId);

    return {
      message: await this.i18n.t('account.delete_account.success', { lang }),
    };
  }
}
