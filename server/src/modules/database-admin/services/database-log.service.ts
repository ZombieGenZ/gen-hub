import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class DatabaseLogService {
  private readonly logger = new Logger(DatabaseLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ghi log khi tạo record mới
   */
  async logCreate(
    tableName: string,
    recordId: string,
    newData: any,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    try {
      await this.prisma.databaseLog.create({
        data: {
          user_id: context.userId,
          action: AuditAction.CREATE,
          table_name: tableName,
          record_id: recordId,
          new_data: newData,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log CREATE for ${tableName}`, error);
    }
  }

  /**
   * Ghi log khi cập nhật record
   */
  async logUpdate(
    tableName: string,
    recordId: string,
    oldData: any,
    newData: any,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    try {
      await this.prisma.databaseLog.create({
        data: {
          user_id: context.userId,
          action: AuditAction.UPDATE,
          table_name: tableName,
          record_id: recordId,
          old_data: oldData,
          new_data: newData,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log UPDATE for ${tableName}`, error);
    }
  }

  /**
   * Ghi log khi xóa record
   */
  async logDelete(
    tableName: string,
    recordId: string,
    oldData: any,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    try {
      await this.prisma.databaseLog.create({
        data: {
          user_id: context.userId,
          action: AuditAction.DELETE,
          table_name: tableName,
          record_id: recordId,
          old_data: oldData,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log DELETE for ${tableName}`, error);
    }
  }
}
