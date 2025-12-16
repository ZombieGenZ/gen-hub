import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';

import { UserRepository } from '../user/user.repository';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { RefreshTokenRepository } from '../auth/repositories/refresh-token.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto';
import { normalizeLanguage } from '../../common/validators';


/**
 * Interface cho device info từ request
 */
interface IDeviceInfo {
  ip?: string;
  location?: string;
  device?: string;
  os?: string;
}

/**
 * Account Service
 * Xử lý logic nghiệp vụ liên quan đến quản lý tài khoản
 */
@Injectable()
export class AccountService {
  /** Số vòng hash bcrypt (mặc định 12) */
  private get SALT_ROUNDS(): number {
    return Number(this.configService.get<number>('SALT_ROUNDS')) || 12;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly systemLogService: SystemLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
  ) { }

  /**
   * Lấy thông tin profile
   */
  async getProfile(userId: string, lang = 'vi') {
    // Try to get from Redis cache first
    const cachedProfile = await this.redisService.getUserCache<{
      user: Record<string, unknown>;
      roles: Array<Record<string, unknown>>;
      permissions: Array<Record<string, unknown>>;
    }>(userId);

    if (cachedProfile) {
      return {
        message: await this.i18n.t('account.profile.get_success', { lang }),
        ...cachedProfile,
      };
    }

    const user =
      await this.userRepository.getUserWithRolesAndPermissions(userId);
    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    const roles = user.system_roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    }));

    // Gom các roles có cùng permission vào mảng roles
    const rolePermissionsMap = new Map<string, any>();
    for (const ur of user.system_roles) {
      for (const rp of ur.role.permissions) {
        const permissionId = rp.permission.id;
        if (rolePermissionsMap.has(permissionId)) {
          // Thêm role vào danh sách roles của permission đã tồn tại
          rolePermissionsMap.get(permissionId).roles.push({
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
      roles: [],
    }));

    // Merge permission + role permissions, ưu tiên permission nếu trùng
    const allPermissions = [...directPermissions, ...rolePermissions];
    const uniquePermissions = allPermissions.filter(
      (p, index, self) => index === self.findIndex((t) => t.id === p.id),
    );

    const profileData = {
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

    // Cache the profile data (5 minutes TTL)
    await this.redisService.setUserCache(userId, profileData);

    return {
      message: await this.i18n.t('account.profile.get_success', { lang }),
      ...profileData,
    };
  }

  /**
   * Cập nhật thông tin tài khoản (name, language)
   */
  async updateProfile(userId: string, dto: UpdateProfileDto, lang = 'vi') {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException('User không tồn tại');

    // Normalize language trước khi lưu (lowercase)
    const normalizedLanguage = dto.language ? normalizeLanguage(dto.language) : undefined;

    await this.userRepository.updateProfile(userId, {
      name: dto.name,
      language: normalizedLanguage,
    });

    // Invalidate user cache
    await this.redisService.invalidateUserCache(userId);

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

    return {
      message: await this.i18n.t('auth.update_profile.success', { lang }),
    };
  }

  /**
   * Thay đổi mật khẩu (chỉ cho tài khoản đăng ký bằng email)
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    deviceInfo?: IDeviceInfo,
    lang = 'vi',
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException('User không tồn tại');

    if (!user.password) {
      throw new BadRequestException('Tài khoản không có mật khẩu');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(
        dto.current_password,
        user.password,
      );
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

    const hashedPassword = await bcrypt.hash(
      dto.new_password,
      this.SALT_ROUNDS,
    );
    await this.userRepository.updatePassword(userId, hashedPassword);

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

    return {
      message: await this.i18n.t('auth.change_password.success', { lang }),
    };
  }
}
