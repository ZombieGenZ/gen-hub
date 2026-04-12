import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LogRotationService {
  private readonly logger = new Logger(LogRotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Chạy log rotation hàng ngày lúc 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleLogRotation() {
    this.logger.log('🔄 Starting log rotation...');

    try {
      await Promise.all([
        this.cleanSystemLogs(),
        this.cleanDatabaseLogs(),
        this.cleanApiKeyLogs(),
        this.cleanOrganizationAuditLogs(),
        this.cleanFeatureFlagLogs(),
      ]);

      this.logger.log('✅ Log rotation completed');
    } catch (error) {
      this.logger.error('❌ Log rotation failed', error);
    }
  }

  /**
   * Xóa SystemLog cũ nếu được cấu hình
   */
  private async cleanSystemLogs() {
    const autoDelete =
      this.configService.get<string>('AUTO_DELETE_SYSTEM_LOGS') === 'true';

    if (!autoDelete) {
      this.logger.debug('SystemLog auto-delete is disabled');
      return;
    }

    const retentionMs = parseInt(
      this.configService.get<string>('SYSTEM_LOGS_RETENTION_MS') ||
        '2592000000',
      10,
    );
    const cutoffDate = new Date(Date.now() - retentionMs);

    try {
      const result = await this.prisma.systemLog.deleteMany({
        where: { created_at: { lt: cutoffDate } },
      });

      this.logger.log(`🗑️ Deleted ${result.count} old SystemLog records`);
    } catch (error) {
      this.logger.error('Failed to clean SystemLog', error);
    }
  }

  /**
   * Xóa DatabaseLog cũ nếu được cấu hình
   */
  private async cleanDatabaseLogs() {
    const autoDelete =
      this.configService.get<string>('AUTO_DELETE_DATABASE_LOGS') === 'true';

    if (!autoDelete) {
      this.logger.debug('DatabaseLog auto-delete is disabled');
      return;
    }

    const retentionMs = parseInt(
      this.configService.get<string>('DATABASE_LOGS_RETENTION_MS') ||
        '2592000000',
      10,
    );
    const cutoffDate = new Date(Date.now() - retentionMs);

    try {
      const result = await this.prisma.databaseLog.deleteMany({
        where: { created_at: { lt: cutoffDate } },
      });

      this.logger.log(`🗑️ Deleted ${result.count} old DatabaseLog records`);
    } catch (error) {
      this.logger.error('Failed to clean DatabaseLog', error);
    }
  }

  /**
   * Xóa ApiKeyLog cũ theo cấu hình của từng Organization
   */
  private async cleanApiKeyLogs() {
    try {
      // Lấy tất cả organizations có bật auto-delete
      const orgs = await this.prisma.organization.findMany({
        where: {
          auto_delete_api_key_logs: true,
          api_key_logs_retention_ms: { not: null },
        },
        select: {
          id: true,
          name: true,
          api_key_logs_retention_ms: true,
        },
      });

      if (orgs.length === 0) {
        this.logger.debug(
          'No organizations with ApiKeyLog auto-delete enabled',
        );
        return;
      }

      for (const org of orgs) {
        if (!org.api_key_logs_retention_ms) continue;

        const cutoffDate = new Date(
          Date.now() - Number(org.api_key_logs_retention_ms),
        );

        const result = await this.prisma.apiKeyLog.deleteMany({
          where: {
            organization_id: org.id,
            created_at: { lt: cutoffDate },
          },
        });

        if (result.count > 0) {
          this.logger.log(
            `🗑️ Deleted ${result.count} old ApiKeyLog records for org "${org.name}"`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to clean ApiKeyLog', error);
    }
  }

  /**
   * Xóa OrganizationAuditLog cũ theo cấu hình của từng Organization
   */
  private async cleanOrganizationAuditLogs() {
    try {
      const orgs = await this.prisma.organization.findMany({
        where: {
          auto_delete_org_audit_logs: true,
          org_audit_logs_retention_ms: { not: null },
        },
        select: {
          id: true,
          name: true,
          org_audit_logs_retention_ms: true,
        },
      });

      if (orgs.length === 0) {
        this.logger.debug(
          'No organizations with OrganizationAuditLog auto-delete enabled',
        );
        return;
      }

      for (const org of orgs) {
        if (!org.org_audit_logs_retention_ms) continue;

        const cutoffDate = new Date(
          Date.now() - Number(org.org_audit_logs_retention_ms),
        );

        const result = await this.prisma.organizationAuditLog.deleteMany({
          where: {
            organization_id: org.id,
            created_at: { lt: cutoffDate },
          },
        });

        if (result.count > 0) {
          this.logger.log(
            `🗑️ Deleted ${result.count} old OrganizationAuditLog records for org "${org.name}"`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to clean OrganizationAuditLog', error);
    }
  }

  /**
   * Xóa FeatureFlagLog cũ theo cấu hình env
   */
  private async cleanFeatureFlagLogs() {
    const autoDelete =
      this.configService.get<string>('AUTO_DELETE_FEATURE_FLAG_LOGS') ===
      'true';

    if (!autoDelete) {
      this.logger.debug('FeatureFlagLog auto-delete is disabled');
      return;
    }

    const retentionMs = parseInt(
      this.configService.get<string>('FEATURE_FLAG_LOGS_RETENTION_MS') ||
        '2592000000',
      10,
    );
    const cutoffDate = new Date(Date.now() - retentionMs);

    try {
      const result = await this.prisma.featureFlagLog.deleteMany({
        where: { created_at: { lt: cutoffDate } },
      });

      if (result.count > 0) {
        this.logger.log(
          `🗑️ Deleted ${result.count} old FeatureFlagLog records`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to clean FeatureFlagLog', error);
    }
  }

  /**
   * Manual trigger để test hoặc force cleanup
   */
  async triggerLogRotation() {
    this.logger.log('🔄 Manual log rotation triggered');
    await this.handleLogRotation();
  }
}
