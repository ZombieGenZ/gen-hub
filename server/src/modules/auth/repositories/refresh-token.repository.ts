import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefreshToken } from '@prisma/client';

/**
 * Interface cho thông tin device
 */
interface IDeviceInfo {
  ip?: string;
  location?: string;
  device?: string;
  os?: string;
}

/**
 * Repository cho RefreshToken
 * Quản lý refresh tokens trong database
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo refresh token mới
   * @param userId - ID của user
   * @param token - Token đã hash
   * @param deviceInfo - Thông tin device
   */
  async create(
    userId: string,
    token: string,
    deviceInfo?: IDeviceInfo,
  ): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token,
        ip: deviceInfo?.ip,
        location: deviceInfo?.location,
        device: deviceInfo?.device,
        os: deviceInfo?.os,
      },
    });
  }

  /**
   * Tìm refresh token theo token string
   * @param token - Token string
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        token,
        is_deleted: false,
      },
    });
  }

  /**
   * Soft delete refresh token (đánh dấu đã xóa)
   * @param id - ID của refresh token
   */
  async softDelete(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  /**
   * Hard delete refresh token
   * @param id - ID của refresh token
   */
  async delete(id: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { id },
    });
  }

  /**
   * Xóa tất cả refresh tokens của user (logout all devices)
   * @param userId - ID của user
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        is_deleted: false,
      },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  /**
   * Lấy tất cả refresh tokens của user
   * @param userId - ID của user
   */
  async findAllByUserId(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        user_id: userId,
        is_deleted: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}
