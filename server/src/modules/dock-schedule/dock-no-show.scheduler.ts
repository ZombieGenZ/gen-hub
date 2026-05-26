import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DockScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class DockNoShowScheduler {
  private readonly logger = new Logger(DockNoShowScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly websocket: WebsocketGateway,
  ) {}

  @Cron('*/5 * * * *')
  async markOverdueAsNoShow() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const overdue = await this.prisma.dockSchedule.findMany({
      where: {
        status: DockScheduleStatus.CONFIRMED,
        is_deleted: false,
        scheduled_date: new Date(todayStr),
        scheduled_time_end: { lt: currentTime },
      },
      select: { id: true, code: true, warehouse_template_id: true, scheduled_date: true },
    });

    if (overdue.length === 0) return;

    const ids = overdue.map((s) => s.id);

    await this.prisma.dockSchedule.updateMany({
      where: { id: { in: ids } },
      data: { status: DockScheduleStatus.NO_SHOW },
    });

    const uniqueDates = new Map<string, string>();
    for (const s of overdue) {
      const dateKey = s.scheduled_date.toISOString().slice(0, 10);
      uniqueDates.set(`${s.warehouse_template_id}::${dateKey}`, s.warehouse_template_id);
      this.websocket.server.emit(
        `warehouse:${s.warehouse_template_id}:dock-no-show`,
        { schedule_id: s.id },
      );
    }

    for (const [key] of uniqueDates) {
      const [warehouseId, date] = key.split('::');
      await this.redis.delByPattern(`dock-schedule:${warehouseId}:${date}:*`);
    }

    this.logger.log(`Auto no-show: ${ids.length} lịch dock quá hạn.`);
  }
}
