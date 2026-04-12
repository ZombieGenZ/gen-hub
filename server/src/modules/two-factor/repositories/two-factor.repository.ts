import { Injectable } from '@nestjs/common';
import { twoFactorUserSelect } from '../selects/two-factor-user.select';
import { ITwoFactorUser } from '../types';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Two-Factor Repository
 * Xử lý các thao tác database liên quan đến 2FA
 */
@Injectable()
export class TwoFactorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm user để thực hiện 2FA (chỉ lấy các trường cần thiết)
   * Sử dụng select để tối ưu hiệu suất
   */
  async findUserForTwoFactor(userId: string): Promise<ITwoFactorUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: twoFactorUserSelect,
    });

    return user as ITwoFactorUser | null;
  }

  /**
   * Cập nhật 2FA secret (Lưu tạm thời hoặc chính thức)
   * Trong flow này, secret thường được lưu vào cache trước khi verify,
   * nhưng implement này hỗ trợ lưu thẳng vào DB nếu cần thiết kế cũ.
   * Tuy nhiên, theo luồng tối ưu, ta sẽ chỉ update khi enable.
   * Method này giữ lại để tương thích nếu cần update secret mà chưa enable.
   */
  async updateTwoFactorSecret(userId: string, secret: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { two_factor_token: secret },
      select: twoFactorUserSelect,
    });
  }

  /**
   * Cập nhật 2FA secret và bật 2FA (Chạy chung 1 lần để tránh lock DB)
   */
  async confirmTwoFactorSetup(userId: string, secret: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_token: secret,
        two_factor_enabled: true,
      },
      select: twoFactorUserSelect,
    });
  }

  /**
   * Kích hoạt 2FA
   */
  async enableTwoFactor(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { two_factor_enabled: true },
      select: twoFactorUserSelect,
    });
  }

  /**
   * Vô hiệu hóa 2FA
   */
  async disableTwoFactor(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: false,
        two_factor_token: null,
      },
      select: twoFactorUserSelect,
    });
  }
}
