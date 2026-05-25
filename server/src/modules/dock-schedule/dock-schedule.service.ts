import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DockScheduleStatus } from '@prisma/client';
import { DockScheduleRepository } from './dock-schedule.repository';
import { CreateDockScheduleDto } from './dto/create-dock-schedule.dto';
import { QueryDockScheduleDto } from './dto/query-dock-schedule.dto';
import { CancelDockScheduleDto } from './dto/cancel-dock-schedule.dto';
import { VehicleLogService } from '../warehouse-vehicle-log/warehouse-vehicle-log.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DockScheduleService {
  private readonly logger = new Logger(DockScheduleService.name);

  constructor(
    private readonly repo: DockScheduleRepository,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly websocket: WebsocketGateway,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => VehicleLogService))
    private readonly vehicleLogService: VehicleLogService,
  ) {}

  async create(dto: CreateDockScheduleDto, userId: string) {
    const template = await this.prisma.warehouseTemplate.findFirst({
      where: { id: dto.warehouse_template_id, is_deleted: false },
      select: { id: true, dock_count: true },
    });
    if (!template) throw new NotFoundException('Không tìm thấy kho');

    if (dto.dock_number > template.dock_count) {
      throw new BadRequestException(
        `Kho chỉ có ${template.dock_count} dock. Dock ${dto.dock_number} không tồn tại.`,
      );
    }

    const conflict = await this.repo.findConflict({
      warehouseTemplateId: dto.warehouse_template_id,
      dockNumber: dto.dock_number,
      date: dto.scheduled_date,
      timeStart: dto.scheduled_time_start,
      timeEnd: dto.scheduled_time_end,
    });
    if (conflict) {
      throw new ConflictException(
        `Dock ${dto.dock_number} đã có lịch từ ${conflict.scheduled_time_start}–${conflict.scheduled_time_end}. Vui lòng chọn khung giờ khác.`,
      );
    }

    const prefix = this.config.get<string>('DOCK_SCHEDULE_CODE_PREFIX', 'DS');
    const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const schedule = await this.repo.create({
      warehouse_template_id: dto.warehouse_template_id,
      organization_id: dto.organization_id,
      code,
      dock_number: dto.dock_number,
      scheduled_date: new Date(dto.scheduled_date),
      scheduled_time_start: dto.scheduled_time_start,
      scheduled_time_end: dto.scheduled_time_end,
      license_plate: dto.license_plate.toUpperCase().replace(/\s+/g, ''),
      vehicle_type: dto.vehicle_type,
      driver_name: dto.driver_name,
      driver_phone: dto.driver_phone,
      carrier_name: dto.carrier_name,
      purpose: dto.purpose,
      linked_receipt_id: dto.linked_receipt_id,
      linked_export_id: dto.linked_export_id,
      notes: dto.notes,
      created_by: userId,
    });

    await this.invalidateCache(dto.warehouse_template_id, dto.scheduled_date);

    this.websocket.server.emit(
      `warehouse:${dto.warehouse_template_id}:dock-schedule-created`,
      { schedule_id: schedule.id, code: schedule.code, dock_number: schedule.dock_number },
    );

    this.logger.log(`Tạo lịch dock ${schedule.code} — Dock ${schedule.dock_number}`);
    return schedule;
  }

  async list(query: QueryDockScheduleDto) {
    return this.repo.findAll({
      warehouseTemplateId: query.warehouse_template_id,
      organizationId: query.organization_id,
      date: query.date,
      dockNumber: query.dock_number,
      status: query.status,
      licensePlate: query.license_plate,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }

  async findById(id: string) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    return schedule;
  }

  async getSlots(warehouseTemplateId: string, date: string) {
    const template = await this.prisma.warehouseTemplate.findFirst({
      where: { id: warehouseTemplateId, is_deleted: false },
      select: { dock_count: true },
    });
    if (!template) throw new NotFoundException('Không tìm thấy kho');

    const schedules = await this.repo.findSlotsByDate(warehouseTemplateId, date);

    const slots: Record<number, typeof schedules> = {};
    for (let d = 1; d <= template.dock_count; d++) {
      slots[d] = schedules.filter((s) => s.dock_number === d);
    }

    return { dock_count: template.dock_count, date, slots };
  }

  async confirm(id: string, userId: string) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    if (schedule.status !== DockScheduleStatus.PENDING) {
      throw new BadRequestException(`Lịch đang ở trạng thái ${schedule.status}, không thể xác nhận.`);
    }

    const updated = await this.repo.update(id, {
      status: DockScheduleStatus.CONFIRMED,
      confirmed_by: userId,
      confirmed_at: new Date(),
      updated_by: userId,
    });

    await this.invalidateCache(schedule.warehouse_template_id, schedule.scheduled_date.toISOString().slice(0, 10));
    this.websocket.server.emit(
      `warehouse:${schedule.warehouse_template_id}:dock-schedule-confirmed`,
      { schedule_id: id },
    );

    this.logger.log(`Xác nhận lịch dock ${schedule.code}`);
    return updated;
  }

  async cancel(id: string, userId: string, dto: CancelDockScheduleDto) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    const nonCancellable: DockScheduleStatus[] = [DockScheduleStatus.ARRIVED, DockScheduleStatus.COMPLETED];
    if (nonCancellable.includes(schedule.status)) {
      throw new BadRequestException(`Không thể huỷ lịch đang ở trạng thái ${schedule.status}.`);
    }

    const updated = await this.repo.update(id, {
      status: DockScheduleStatus.CANCELLED,
      cancelled_by: userId,
      cancellation_reason: dto.cancellation_reason,
      updated_by: userId,
    });

    await this.invalidateCache(schedule.warehouse_template_id, schedule.scheduled_date.toISOString().slice(0, 10));
    this.websocket.server.emit(
      `warehouse:${schedule.warehouse_template_id}:dock-schedule-cancelled`,
      { schedule_id: id },
    );

    this.logger.log(`Huỷ lịch dock ${schedule.code}`);
    return updated;
  }

  async markArrived(id: string, userId: string) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    if (schedule.status !== DockScheduleStatus.CONFIRMED) {
      throw new BadRequestException(`Lịch phải ở trạng thái CONFIRMED để ghi nhận xe đến.`);
    }

    // Tạo VehicleLog tự động, lấy thông tin từ DockSchedule
    const vehicleLog = await this.vehicleLogService.create(
      {
        warehouse_template_id: schedule.warehouse_template_id,
        license_plate: schedule.license_plate,
        vehicle_type: schedule.vehicle_type,
        driver_name: schedule.driver_name ?? undefined,
        driver_phone: schedule.driver_phone ?? undefined,
        carrier_name: schedule.carrier_name ?? undefined,
        purpose: schedule.purpose,
        linked_receipt_id: schedule.linked_receipt_id ?? undefined,
        linked_export_id: schedule.linked_export_id ?? undefined,
        notes: `[Dock ${schedule.dock_number}] ${schedule.notes ?? ''}`.trim(),
      },
      userId,
    );

    const updated = await this.repo.update(id, {
      status: DockScheduleStatus.ARRIVED,
      vehicle_log_id: vehicleLog.id,
      updated_by: userId,
    });

    await this.invalidateCache(schedule.warehouse_template_id, schedule.scheduled_date.toISOString().slice(0, 10));
    this.websocket.server.emit(
      `warehouse:${schedule.warehouse_template_id}:dock-arrived`,
      { schedule_id: id, vehicle_log_id: vehicleLog.id, dock_number: schedule.dock_number },
    );

    this.logger.log(`Xe ${schedule.license_plate} đến dock ${schedule.dock_number} — lịch ${schedule.code}`);
    return { schedule: updated, vehicle_log: vehicleLog };
  }

  async markCompleted(id: string, userId: string) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    if (schedule.status !== DockScheduleStatus.ARRIVED) {
      throw new BadRequestException(`Lịch phải ở trạng thái ARRIVED để hoàn thành.`);
    }

    // Ghi nhận exit nếu có vehicle_log_id
    if (schedule.vehicle_log_id) {
      await this.vehicleLogService.recordExit(schedule.vehicle_log_id, userId);
    }

    const updated = await this.repo.update(id, {
      status: DockScheduleStatus.COMPLETED,
      updated_by: userId,
    });

    await this.invalidateCache(schedule.warehouse_template_id, schedule.scheduled_date.toISOString().slice(0, 10));
    this.websocket.server.emit(
      `warehouse:${schedule.warehouse_template_id}:dock-completed`,
      { schedule_id: id },
    );

    this.logger.log(`Hoàn thành lịch dock ${schedule.code}`);
    return updated;
  }

  async markNoShow(id: string, userId: string) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    if (schedule.status !== DockScheduleStatus.CONFIRMED) {
      throw new BadRequestException(`Chỉ có thể đánh dấu no-show lịch đã xác nhận.`);
    }

    const updated = await this.repo.update(id, {
      status: DockScheduleStatus.NO_SHOW,
      updated_by: userId,
    });

    await this.invalidateCache(schedule.warehouse_template_id, schedule.scheduled_date.toISOString().slice(0, 10));
    this.logger.log(`No-show lịch dock ${schedule.code}`);
    return updated;
  }

  async linkFromVehicleLog(licensePlate: string, warehouseTemplateId: string, vehicleLogId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const schedule = await this.repo.findConfirmedByPlateAndDate(licensePlate, warehouseTemplateId, today);
    if (!schedule) return null;

    await this.repo.update(schedule.id, {
      status: DockScheduleStatus.ARRIVED,
      vehicle_log_id: vehicleLogId,
    });

    this.logger.log(`Auto-link VehicleLog ${vehicleLogId} → lịch dock ${schedule.code}`);
    return schedule;
  }

  async delete(id: string, userId: string) {
    const schedule = await this.repo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch dock');
    await this.repo.softDelete(id, userId);
    await this.invalidateCache(schedule.warehouse_template_id, schedule.scheduled_date.toISOString().slice(0, 10));
    return { success: true };
  }

  private async invalidateCache(warehouseTemplateId: string, date: string) {
    await this.redis.delByPattern(`dock-schedule:${warehouseTemplateId}:${date}:*`);
  }
}
