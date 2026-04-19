import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { Model } from 'mongoose';
import { ServiceStatus } from '../schemas/service-status.schema';
import { DiscordService } from '../discord/discord.service';

interface TrackerTarget {
  type: string;
  url: string;
}

@Injectable()
export class TrackerService implements OnModuleInit {
  private readonly logger = new Logger(TrackerService.name);
  private targets: TrackerTarget[] = [];
  private downStates: Map<string, boolean> = new Map();

  constructor(
    private configService: ConfigService,
    private discordService: DiscordService,
    @InjectModel(ServiceStatus.name) private statusModel: Model<ServiceStatus>,
  ) {
    const targetsStr = this.configService.get<string>('TRACKER_TARGETS', '[]');
    try {
      this.targets = JSON.parse(targetsStr);
    } catch (e) {
      this.logger.error(`Lỗi parse TRACKER_TARGETS: ${e.message}`);
    }
  }

  onModuleInit() {
    this.logger.log(`Khởi tạo Tracker với ${this.targets.length} targets`);
  }

  /**
   * Cron job ping các target định kỳ (mặc định mỗi phút)
   */
  @Cron(process.env.TRACKER_INTERVAL || CronExpression.EVERY_MINUTE)
  async handlePing() {
    for (const target of this.targets) {
      await this.pingTarget(target);
    }
  }

  /**
   * Logic ping một target cụ thể
   */
  private async pingTarget(target: TrackerTarget) {
    const startTime = Date.now();
    let status = 0; // 0 = up
    let pingMs = 0;
    let errorMsg = '';

    try {
      const response = await axios.get(target.url, { timeout: 10000 });
      pingMs = Date.now() - startTime;
      if (response.status >= 400) {
        status = 1; // down
        errorMsg = `HTTP Status ${response.status}`;
      }
    } catch (error) {
      status = 1; // down
      pingMs = Date.now() - startTime;
      errorMsg = error.message;
    }

    // Lưu dữ liệu vào MongoDB
    await this.saveStatus(target.type, status, pingMs);

    // Xử lý thông báo Discord
    await this.handleDiscordNotification(target, status, errorMsg);
  }

  /**
   * Lưu dữ liệu ping vào MongoDB dùng findOneAndUpdate với $push
   */
  private async saveStatus(type: string, status: number, pingMs: number) {
    const now = new Date();
    const day = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const uid = `${type}_${day}_${hour}`;

    try {
      await this.statusModel.findOneAndUpdate(
        { uid },
        {
          $set: { type, day, hour },
          $push: {
            data: {
              t: Date.now(),
              p: pingMs,
              s: status,
            },
          },
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      this.logger.error(`Lỗi lưu status cho ${type}: ${error.message}`);
    }
  }

  /**
   * Quản lý trạng thái down để tránh spam thông báo
   */
  private async handleDiscordNotification(
    target: TrackerTarget,
    currentStatus: number,
    errorMsg: string,
  ) {
    const isCurrentlyDown = currentStatus === 1;
    const wasDown = this.downStates.get(target.type) || false;

    if (isCurrentlyDown && !wasDown) {
      // Mới bị down
      this.downStates.set(target.type, true);
      this.logger.warn(`Service ${target.type} is DOWN!`);
      await this.discordService.notifyDown(target.type, target.url, errorMsg);
    } else if (!isCurrentlyDown && wasDown) {
      // Phục hồi
      this.downStates.set(target.type, false);
      this.logger.log(`Service ${target.type} has RECOVERED.`);
      await this.discordService.notifyRecovery(target.type, target.url);
    }
  }

  /**
   * API lấy dữ liệu theo range
   */
  async getStatusHistory(type: string, range: string) {
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '3d':
        startDate.setDate(now.getDate() - 3);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      default:
        startDate.setHours(now.getHours() - 24);
    }

    const startDay = startDate.toISOString().split('T')[0];

    return this.statusModel
      .find({
        type,
        day: { $gte: startDay },
      })
      .sort({ day: 1, hour: 1 })
      .exec();
  }

  /**
   * Cron job xóa dữ liệu cũ
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearOldData() {
    const retentionDays = parseInt(
      this.configService.get<string>('DATA_RETENTION_DAYS', '7'),
    );
    const deleteBeforeDate = new Date();
    deleteBeforeDate.setDate(deleteBeforeDate.getDate() - retentionDays);
    const deleteBeforeDay = deleteBeforeDate.toISOString().split('T')[0];

    try {
      const result = await this.statusModel.deleteMany({
        day: { $lt: deleteBeforeDay },
      });
      this.logger.log(
        `Đã xóa ${result.deletedCount} bản ghi cũ hơn ${retentionDays} ngày`,
      );
    } catch (error) {
      this.logger.error(`Lỗi khi xóa dữ liệu cũ: ${error.message}`);
    }
  }

  /**
   * Logic self-ping
   */
  @Cron(process.env.SELF_PING_INTERVAL || '*/5 * * * *')
  async handleSelfPing() {
    const enabled =
      this.configService.get<string>('SELF_PING_ENABLED') === 'true';
    const url = this.configService.get<string>('SELF_PING_URL');

    if (enabled && url) {
      try {
        await axios.get(url);
        this.logger.debug('Self-ping thành công');
      } catch (error) {
        this.logger.error(`Self-ping thất bại: ${error.message}`);
      }
    }
  }
}
