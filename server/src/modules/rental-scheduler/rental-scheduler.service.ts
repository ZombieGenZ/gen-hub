import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractStatus } from '@prisma/client';

import { RentalContractRepository } from '../rental-contract-shared/rental-contract.repository';
import { SystemLogService } from '../system-log/system-log.service';
import { OrgNotificationRepository } from '../org-notification/org-notification.repository';

/**
 * Scheduler service xử lý:
 * - Thông báo hợp đồng sắp hết hạn
 * - Cập nhật status overdue
 * - Xử lý niêm phong và thanh lý
 *
 * Logic:
 * - Khi server khởi động: kiểm tra và xử lý ngay nếu chưa chạy hôm nay
 * - Chạy hàng ngày theo lịch cron
 */
@Injectable()
export class RentalSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RentalSchedulerService.name);

  private readonly EXPIRY_WARNING_DAYS: number;
  private readonly OVERDUE_LEVEL_1_DAYS: number;
  private readonly OVERDUE_LEVEL_2_DAYS: number;
  private readonly OVERDUE_LEVEL_3_DAYS: number;
  private readonly OVERDUE_SEALED_DAYS: number;

  constructor(
    private readonly contractRepository: RentalContractRepository,
    private readonly orgNotificationRepository: OrgNotificationRepository,
    private readonly systemLogService: SystemLogService,
    private readonly configService: ConfigService,
  ) {
    this.EXPIRY_WARNING_DAYS =
      this.configService.get<number>('RENTAL_EXPIRY_WARNING_DAYS') || 7;
    this.OVERDUE_LEVEL_1_DAYS =
      this.configService.get<number>('OVERDUE_LEVEL_1_DAYS') || 15;
    this.OVERDUE_LEVEL_2_DAYS =
      this.configService.get<number>('OVERDUE_LEVEL_2_DAYS') || 30;
    this.OVERDUE_LEVEL_3_DAYS =
      this.configService.get<number>('OVERDUE_LEVEL_3_DAYS') || 45;
    this.OVERDUE_SEALED_DAYS =
      this.configService.get<number>('OVERDUE_SEALED_DAYS') || 60;
  }

  /**
   * Khi server khởi động, kiểm tra và xử lý ngay các hợp đồng cần cập nhật
   */
  async onModuleInit() {
    this.logger.log('🚀 Khởi tạo Rental Scheduler...');

    try {
      // Chạy kiểm tra expiry notifications ngay
      await this.handleExpiryNotifications();

      // Chạy cập nhật overdue ngay
      await this.handleOverdueUpdates();

      this.logger.log('✅ Rental Scheduler đã sẵn sàng');
    } catch (error) {
      this.logger.error(`❌ Lỗi khởi tạo Rental Scheduler: ${error}`);
    }
  }

  /**
   * Chạy mỗi ngày lúc 0h
   * - Gửi thông báo hợp đồng sắp hết hạn
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiryNotifications(): Promise<void> {
    this.logger.log('Starting expiry notification job...');

    try {
      const expiringContracts =
        await this.contractRepository.findExpiringContracts(
          this.EXPIRY_WARNING_DAYS,
        );

      for (const contract of expiringContracts) {
        await this.sendExpiryWarning(contract);
      }

      this.logger.log(
        `Sent expiry warnings for ${expiringContracts.length} contracts`,
      );
      this.systemLogService.info(
        'rental-scheduler',
        'expiry-notification',
        `Sent expiry warnings for ${expiringContracts.length} contracts`,
        {},
      );
    } catch (error: any) {
      this.logger.error('Error in expiry notification job:', error);
      this.systemLogService.error(
        'rental-scheduler',
        'expiry-notification',
        `Error in expiry notification job: ${error.message}`,
        {},
      );
    }
  }

  /**
   * Chạy mỗi ngày lúc 1h
   * - Cập nhật status overdue
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleOverdueUpdates(): Promise<void> {
    this.logger.log('Starting overdue update job...');

    try {
      const overdueContracts =
        await this.contractRepository.findOverdueContracts();
      const now = new Date();

      const level1Ids: string[] = [];
      const level2Ids: string[] = [];
      const level3Ids: string[] = [];
      const sealedIds: string[] = [];
      const liquidatedIds: string[] = [];

      for (const contract of overdueContracts) {
        if (!contract.expired_at) continue;

        const expiredAt = new Date(contract.expired_at);
        const overdueDays = Math.floor(
          (now.getTime() - expiredAt.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (overdueDays >= this.OVERDUE_SEALED_DAYS) {
          if (contract.is_sealed) {
            liquidatedIds.push(contract.id);
          } else {
            sealedIds.push(contract.id);
          }
        } else if (overdueDays >= this.OVERDUE_LEVEL_3_DAYS) {
          if (contract.status !== ContractStatus.OVERDUE_LEVEL_3) {
            level3Ids.push(contract.id);
          }
        } else if (overdueDays >= this.OVERDUE_LEVEL_2_DAYS) {
          if (contract.status !== ContractStatus.OVERDUE_LEVEL_2) {
            level2Ids.push(contract.id);
          }
        } else if (overdueDays >= this.OVERDUE_LEVEL_1_DAYS) {
          if (contract.status !== ContractStatus.OVERDUE_LEVEL_1) {
            level1Ids.push(contract.id);
          }
        }
      }

      // Batch update by level
      if (level1Ids.length > 0) {
        await this.contractRepository.updateOverdueStatus(
          level1Ids,
          ContractStatus.OVERDUE_LEVEL_1,
          {
            overdue_level_1_at: now,
          },
        );
        await this.sendOverdueNotifications(level1Ids, 1);
      }

      if (level2Ids.length > 0) {
        await this.contractRepository.updateOverdueStatus(
          level2Ids,
          ContractStatus.OVERDUE_LEVEL_2,
          {
            overdue_level_2_at: now,
          },
        );
        await this.sendOverdueNotifications(level2Ids, 2);
      }

      if (level3Ids.length > 0) {
        await this.contractRepository.updateOverdueStatus(
          level3Ids,
          ContractStatus.OVERDUE_LEVEL_3,
          {
            overdue_level_3_at: now,
          },
        );
        await this.sendOverdueNotifications(level3Ids, 3);
      }

      if (sealedIds.length > 0) {
        await this.contractRepository.updateOverdueStatus(
          sealedIds,
          ContractStatus.SEALED,
          {
            is_sealed: true,
          },
        );
        await this.sendSealedNotifications(sealedIds);
      }

      if (liquidatedIds.length > 0) {
        await this.contractRepository.updateOverdueStatus(
          liquidatedIds,
          ContractStatus.LIQUIDATED,
          {
            is_liquidated: true,
          },
        );
        await this.sendLiquidatedNotifications(liquidatedIds);
      }

      const totalUpdated =
        level1Ids.length +
        level2Ids.length +
        level3Ids.length +
        sealedIds.length +
        liquidatedIds.length;
      this.logger.log(`Updated overdue status for ${totalUpdated} contracts`);
      this.systemLogService.info(
        'rental-scheduler',
        'overdue-update',
        `Updated: L1=${level1Ids.length}, L2=${level2Ids.length}, L3=${level3Ids.length}, Sealed=${sealedIds.length}, Liquidated=${liquidatedIds.length}`,
        {},
      );
    } catch (error: any) {
      this.logger.error('Error in overdue update job:', error);
      this.systemLogService.error(
        'rental-scheduler',
        'overdue-update',
        `Error in overdue update job: ${error.message}`,
        {},
      );
    }
  }

  private async sendExpiryWarning(contract: any): Promise<void> {
    const expiredAt = new Date(contract.expired_at);
    const formattedDate = expiredAt.toLocaleDateString('vi-VN');

    // Tạo notification trong org-notification
    try {
      await this.orgNotificationRepository.create({
        title: 'Hợp đồng sắp hết hạn',
        content: `Hợp đồng ${contract.code} sẽ hết hạn vào ngày ${formattedDate}. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.`,
        type: 'WARNING',
        is_active: true,
        organization: { connect: { id: contract.organization_id } },
        created_by: 'SYSTEM',
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to create expiry notification for contract ${contract.id}: ${error.message}`,
      );
    }
  }

  private async sendOverdueNotifications(
    contractIds: string[],
    level: number,
  ): Promise<void> {
    const levelDays =
      level === 1
        ? this.OVERDUE_LEVEL_1_DAYS
        : level === 2
          ? this.OVERDUE_LEVEL_2_DAYS
          : this.OVERDUE_LEVEL_3_DAYS;

    for (const contractId of contractIds) {
      const contract = await this.contractRepository.findById(contractId);
      if (!contract) continue;

      try {
        await this.orgNotificationRepository.create({
          title: 'Hợp đồng quá hạn',
          content: `Hợp đồng ${contract.code} đã quá hạn ${levelDays} ngày. Vui lòng thanh toán để tránh bị niêm phong kho.`,
          type: 'WARNING',
          is_active: true,
          organization: { connect: { id: contract.organization_id } },
          created_by: 'SYSTEM',
        });
      } catch (error: any) {
        this.logger.warn(
          `Failed to create overdue notification for contract ${contract.id}: ${error.message}`,
        );
      }
    }
  }

  private async sendSealedNotifications(contractIds: string[]): Promise<void> {
    for (const contractId of contractIds) {
      const contract = await this.contractRepository.findById(contractId);
      if (!contract) continue;

      try {
        await this.orgNotificationRepository.create({
          title: 'Kho đã bị niêm phong',
          content: `Kho của hợp đồng ${contract.code} đã bị niêm phong do quá hạn thanh toán. Vui lòng liên hệ hỗ trợ.`,
          type: 'ERROR',
          is_active: true,
          organization: { connect: { id: contract.organization_id } },
          created_by: 'SYSTEM',
        });
      } catch (error: any) {
        this.logger.warn(
          `Failed to create sealed notification for contract ${contract.id}: ${error.message}`,
        );
      }
    }
  }

  private async sendLiquidatedNotifications(
    contractIds: string[],
  ): Promise<void> {
    for (const contractId of contractIds) {
      const contract = await this.contractRepository.findById(contractId);
      if (!contract) continue;

      try {
        await this.orgNotificationRepository.create({
          title: 'Kho đã bị thanh lý',
          content: `Kho của hợp đồng ${contract.code} đã bị thanh lý do không thanh toán trong thời gian quy định.`,
          type: 'ERROR',
          is_active: true,
          organization: { connect: { id: contract.organization_id } },
          created_by: 'SYSTEM',
        });
      } catch (error: any) {
        this.logger.warn(
          `Failed to create liquidated notification for contract ${contract.id}: ${error.message}`,
        );
      }
    }
  }
}
