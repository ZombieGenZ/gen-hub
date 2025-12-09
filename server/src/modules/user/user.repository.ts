import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma, PlatformProvider } from '@prisma/client';

/**
 * Repository cho User
 * Cung cấp các phương thức CRUD và truy vấn User
 * Chỉ hỗ trợ email, không hỗ trợ phone
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm user theo ID
   * @param id - ID của user
   * @returns User hoặc null
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Tìm user theo email
   * @param email - Email của user
   * @returns User hoặc null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  /**
   * Tạo user mới
   * Tự động gán các Role có is_default = true cho user mới
   * @param data - Dữ liệu tạo user
   * @returns User đã tạo
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    language?: string;
    provider?: PlatformProvider;
    email_verify_token?: string;
    email_verify_expired?: Date;
  }): Promise<User> {
    const defaultRoles = await this.prisma.role.findMany({
      where: {
        is_default: true,
        is_active: true,
        is_deleted: false,
      },
      select: { id: true },
    });

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        language: data.language || 'vi',
        provider: data.provider || PlatformProvider.DEFAULT,
        email_verify_token: data.email_verify_token,
        email_verify_expired: data.email_verify_expired,
        system_roles: {
          create: defaultRoles.map((role) => ({
            role_id: role.id,
          })),
        },
      },
    });
  }

  /**
   * Cập nhật user
   * @param id - ID của user
   * @param data - Dữ liệu cập nhật
   * @returns User đã cập nhật
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Lấy user với đầy đủ thông tin roles và permissions
   * @param id - ID của user
   * @returns User với roles và permissions
   */
  async getUserWithRolesAndPermissions(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        system_roles: {
          where: { is_deleted: false, is_active: true },
          include: {
            role: {
              include: {
                permissions: {
                  where: { is_deleted: false, is_active: true },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        system_permissions: {
          where: { is_deleted: false, is_active: true },
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Xác thực email
   * @param userId - ID của user
   */
  async verifyEmail(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email_confirmed: true,
        email_verify_token: null,
        email_verify_expired: null,
        is_verified: true,
      },
    });
  }

  /**
   * Cập nhật token xác thực email
   * @param userId - ID của user
   * @param token - Token xác thực
   * @param expiredAt - Thời gian hết hạn
   */
  async updateEmailVerifyToken(
    userId: string,
    token: string,
    expiredAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email_verify_token: token,
        email_verify_expired: expiredAt,
      },
    });
  }

  /**
   * Cập nhật forgot password token
   * @param userId - ID của user
   * @param token - Token quên mật khẩu
   * @param expiredAt - Thời gian hết hạn (15 phút)
   */
  async updateForgotPasswordToken(
    userId: string,
    token: string,
    expiredAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        forgot_password_token: token,
        forgot_password_expired: expiredAt,
      },
    });
  }

  /**
   * Đặt lại mật khẩu
   * @param userId - ID của user
   * @param hashedPassword - Mật khẩu đã hash
   */
  async resetPassword(userId: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forgot_password_token: null,
        forgot_password_expired: null,
      },
    });
  }

  /**
   * Cập nhật 2FA secret
   * @param userId - ID của user
   * @param secret - 2FA secret
   */
  async updateTwoFactorSecret(userId: string, secret: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_token: secret,
      },
    });
  }

  /**
   * Bật 2FA
   * @param userId - ID của user
   */
  async enableTwoFactor(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: true,
      },
    });
  }

  /**
   * Tắt 2FA
   * @param userId - ID của user
   */
  async disableTwoFactor(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: false,
        two_factor_token: null,
      },
    });
  }

  /**
   * Tìm user theo forgot password token
   * @param token - Token quên mật khẩu
   * @returns User hoặc null
   */
  async findByForgotPasswordToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        forgot_password_token: token,
        forgot_password_expired: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * Tìm user theo email verify token
   * @param token - Token xác thực email
   * @returns User hoặc null
   */
  async findByEmailVerifyToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email_verify_token: token,
        email_verify_expired: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * Cập nhật mật khẩu
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Cập nhật thông tin profile
   */
  async updateProfile(
    userId: string,
    data: { name?: string; language?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
