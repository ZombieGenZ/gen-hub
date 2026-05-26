import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DockScheduleStatus, GpsSessionStatus, VehicleLogStatus } from '@prisma/client';

@Injectable()
export class WarehouseOpsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(warehouseTemplateId: string) {
    const today = new Date();
    const todayStart = new Date(today.toISOString().slice(0, 10));
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const [
      vehicleInside,
      vehicleEnteredToday,
      vehicleExitedToday,
      dockStatusCounts,
      gpsActiveSessions,
    ] = await Promise.all([
      this.prisma.vehicleLog.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          status: VehicleLogStatus.INSIDE,
          is_deleted: false,
        },
      }),
      this.prisma.vehicleLog.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          entry_time: { gte: todayStart, lt: todayEnd },
          is_deleted: false,
        },
      }),
      this.prisma.vehicleLog.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          exit_time: { gte: todayStart, lt: todayEnd },
          is_deleted: false,
        },
      }),
      this.prisma.dockSchedule.groupBy({
        by: ['status'],
        where: {
          warehouse_template_id: warehouseTemplateId,
          scheduled_date: todayStart,
          is_deleted: false,
        },
        _count: { status: true },
      }),
      this.prisma.gpsSession.count({
        where: {
          warehouse_template_id: warehouseTemplateId,
          status: GpsSessionStatus.ACTIVE,
        },
      }),
    ]);

    const dockStats: Record<string, number> = {};
    for (const row of dockStatusCounts) {
      dockStats[row.status] = row._count.status;
    }
    const totalScheduled = Object.values(dockStats).reduce((s, v) => s + v, 0);
    const completed = dockStats[DockScheduleStatus.COMPLETED] ?? 0;
    const noShow = dockStats[DockScheduleStatus.NO_SHOW] ?? 0;
    const completionRate = totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0;
    const noShowRate = totalScheduled > 0 ? Math.round((noShow / totalScheduled) * 100) : 0;

    return {
      vehicle: {
        inside: vehicleInside,
        entered_today: vehicleEnteredToday,
        exited_today: vehicleExitedToday,
      },
      dock: {
        total_scheduled: totalScheduled,
        by_status: dockStats,
        completion_rate: completionRate,
        no_show_rate: noShowRate,
      },
      gps: {
        active_sessions: gpsActiveSessions,
      },
    };
  }

  async getVehicleTrend(warehouseTemplateId: string, days: number) {
    const result: { date: string; entered: number; exited: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const nextDay = new Date(d.getTime() + 86_400_000);
      const dateStr = d.toISOString().slice(0, 10);

      const [entered, exited] = await Promise.all([
        this.prisma.vehicleLog.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            entry_time: { gte: d, lt: nextDay },
            is_deleted: false,
          },
        }),
        this.prisma.vehicleLog.count({
          where: {
            warehouse_template_id: warehouseTemplateId,
            exit_time: { gte: d, lt: nextDay },
            is_deleted: false,
          },
        }),
      ]);

      result.push({ date: dateStr, entered, exited });
    }

    return result;
  }

  async getDockStats(warehouseTemplateId: string, date: string) {
    const warehouse = await this.prisma.warehouseTemplate.findFirst({
      where: { id: warehouseTemplateId, is_deleted: false },
      select: { dock_count: true, name: true },
    });
    if (!warehouse) return { docks: [] };

    const schedules = await this.prisma.dockSchedule.findMany({
      where: {
        warehouse_template_id: warehouseTemplateId,
        scheduled_date: new Date(date),
        is_deleted: false,
      },
      select: {
        dock_number: true,
        status: true,
        scheduled_time_start: true,
        scheduled_time_end: true,
        license_plate: true,
      },
      orderBy: [{ dock_number: 'asc' }, { scheduled_time_start: 'asc' }],
    });

    const docks: {
      dock_number: number;
      total: number;
      completed: number;
      no_show: number;
      slots: typeof schedules;
    }[] = [];

    for (let n = 1; n <= warehouse.dock_count; n++) {
      const slots = schedules.filter((s) => s.dock_number === n);
      docks.push({
        dock_number: n,
        total: slots.length,
        completed: slots.filter((s) => s.status === DockScheduleStatus.COMPLETED).length,
        no_show: slots.filter((s) => s.status === DockScheduleStatus.NO_SHOW).length,
        slots,
      });
    }

    return { warehouse_name: warehouse.name, date, docks };
  }
}
