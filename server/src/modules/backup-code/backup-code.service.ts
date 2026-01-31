import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BackupCode } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';

/**
 * Repository cho BackupCode
 * Cung cấp các phương thức CRUD cho backup codes
 */
@Injectable()
export class BackupCodeRepository {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Tạo backup codes cho user
   * @param userId - ID của user
   * @param codes - Mảng các backup code đã hash
   */
  async createMany(userId: string, codes: string[]): Promise<void> {
    await this.prisma.backupCode.createMany({
      data: codes.map((code) => ({
        user_id: userId,
        code,
      })),
    });
  }

  /**
   * Lấy tất cả backup codes của user
   * @param userId - ID của user
   */
  async findAllByUserId(userId: string): Promise<BackupCode[]> {
    return this.prisma.backupCode.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Tìm backup code chưa sử dụng
   * @param userId - ID của user
   * @param hashedCode - Backup code đã hash
   */
  async findUnusedCode(
    userId: string,
    hashedCode: string,
  ): Promise<BackupCode | null> {
    return this.prisma.backupCode.findFirst({
      where: {
        user_id: userId,
        code: hashedCode,
        is_used: false,
      },
    });
  }

  /**
   * Đánh dấu backup code đã sử dụng
   * @param codeId - ID của backup code
   */
  async markAsUsed(codeId: string): Promise<BackupCode> {
    return this.prisma.backupCode.update({
      where: { id: codeId },
      data: {
        is_used: true,
        used_at: new Date(),
      },
    });
  }

  /**
   * Xóa tất cả backup codes của user
   * @param userId - ID của user
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.backupCode.deleteMany({
      where: { user_id: userId },
    });
  }

  /**
   * Đếm số backup codes còn lại (chưa sử dụng)
   * @param userId - ID của user
   */
  async countRemainingCodes(userId: string): Promise<number> {
    return this.prisma.backupCode.count({
      where: {
        user_id: userId,
        is_used: false,
      },
    });
  }

  /**
   * Đếm số backup codes đã sử dụng
   * @param userId - ID của user
   */
  async countUsedCodes(userId: string): Promise<number> {
    return this.prisma.backupCode.count({
      where: {
        user_id: userId,
        is_used: true,
      },
    });
  }
}

/**
 * Service xử lý logic cho BackupCode
 */
@Injectable()
export class BackupCodeService {
  /** Số lượng backup codes được tạo */
  private get CODES_COUNT(): number {
    return this.configService.get<number>('BACKUP_CODE_COUNT') || 10;
  }
  /** Độ dài của mỗi backup code */
  private get CODE_LENGTH(): number {
    return this.configService.get<number>('BACKUP_CODE_LENGTH') || 8;
  }
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

  constructor(
    private readonly backupCodeRepository: BackupCodeRepository,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Tạo mảng backup codes ngẫu nhiên
   * @returns Mảng các backup codes (chưa hash)
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.CODES_COUNT; i++) {
      const code = crypto
        .randomBytes(this.CODE_LENGTH)
        .toString('hex')
        .substring(0, this.CODE_LENGTH)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup code
   * @param code - Backup code gốc
   * @returns Backup code đã hash
   */
  async hashCode(code: string): Promise<string> {
    return argon2.hash(code, {
      memoryCost: this.ARGON2_MEMORY_COST,
      timeCost: this.ARGON2_TIME_COST,
      parallelism: this.ARGON2_PARALLELISM,
    });
  }

  /**
   * Tạo và lưu backup codes cho user
   * @param userId - ID của user
   * @returns Mảng các backup codes (chưa hash, chỉ hiển thị 1 lần)
   */
  async generateAndSaveBackupCodes(userId: string): Promise<string[]> {
    await this.backupCodeRepository.deleteAllByUserId(userId);

    const plainCodes = this.generateBackupCodes();

    const hashedCodes = await Promise.all(
      plainCodes.map((code) => this.hashCode(code)),
    );
    await this.backupCodeRepository.createMany(userId, hashedCodes);

    return plainCodes;
  }

  /**
   * Xác thực backup code
   * @param userId - ID của user
   * @param code - Backup code cần xác thực
   * @returns true nếu code hợp lệ và chưa sử dụng
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const codes = await this.backupCodeRepository.findAllByUserId(userId);

    for (const storedCode of codes) {
      if (storedCode.is_used) continue;

      try {
        const isMatch = await argon2.verify(storedCode.code, code);
        if (isMatch) {
          await this.backupCodeRepository.markAsUsed(storedCode.id);
          return true;
        }
      } catch {
        // Skip codes with invalid hash format (e.g., old unhashed codes)
        continue;
      }
    }

    return false;
  }

  /**
   * Lấy danh sách backup codes với thông tin hiển thị
   * @param userId - ID của user
   * @returns Danh sách backup codes với metadata
   */
  async getBackupCodesList(userId: string) {
    const codes = await this.backupCodeRepository.findAllByUserId(userId);
    const total = codes.length;
    const used = codes.filter((c) => c.is_used).length;
    const remaining = total - used;

    return {
      total,
      used,
      remaining,
      codes: codes.map((code) => ({
        id: code.id,
        code: `****${code.code.substring(code.code.length - 4)}`,
        is_used: code.is_used,
        used_at: code.used_at,
      })),
    };
  }

  /**
   * Xóa tất cả backup codes của user
   * @param userId - ID của user
   */
  async deleteAllBackupCodes(userId: string): Promise<void> {
    await this.backupCodeRepository.deleteAllByUserId(userId);
  }
}
