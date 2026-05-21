import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleLogRepository } from './warehouse-vehicle-log.repository';
import { CreateVehicleLogDto } from './dto/create-vehicle-log.dto';
import { QueryVehicleLogDto } from './dto/query-vehicle-log.dto';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class VehicleLogService {
  private readonly logger = new Logger(VehicleLogService.name);

  constructor(
    private readonly repo: VehicleLogRepository,
    private readonly redis: RedisService,
    private readonly websocket: WebsocketGateway,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateVehicleLogDto, userId: string) {
    const prefix = this.config.get<string>('VEHICLE_LOG_CODE_PREFIX', 'VHC');
    const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const log = await this.repo.create({
      warehouse_template_id: dto.warehouse_template_id,
      code,
      license_plate: dto.license_plate.toUpperCase().replace(/\s+/g, ''),
      vehicle_type: dto.vehicle_type,
      driver_name: dto.driver_name,
      driver_phone: dto.driver_phone,
      carrier_name: dto.carrier_name,
      purpose: dto.purpose,
      linked_receipt_id: dto.linked_receipt_id,
      linked_export_id: dto.linked_export_id,
      entry_time: dto.entry_time ? new Date(dto.entry_time) : new Date(),
      notes: dto.notes,
      created_by: userId,
    });

    await this.invalidateCache(dto.warehouse_template_id);

    this.websocket.server.emit(
      `warehouse:${dto.warehouse_template_id}:vehicle-entered`,
      {
        log_id: log.id,
        license_plate: log.license_plate,
        vehicle_type: log.vehicle_type,
        purpose: log.purpose,
        entry_time: log.entry_time,
      },
    );

    this.logger.log(`Xe ${log.license_plate} vào kho ${dto.warehouse_template_id}`);
    return log;
  }

  async list(query: QueryVehicleLogDto) {
    return this.repo.findAll({
      warehouseTemplateId: query.warehouse_template_id,
      licensePlate: query.license_plate,
      status: query.status,
      purpose: query.purpose,
      date: query.date,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }

  async findById(id: string) {
    const log = await this.repo.findById(id);
    if (!log) throw new NotFoundException('Không tìm thấy nhật ký xe');
    return log;
  }

  async listActive(warehouseTemplateId?: string) {
    return this.repo.findActive(warehouseTemplateId);
  }

  async recordExit(id: string, userId: string) {
    const log = await this.repo.findById(id);
    if (!log) throw new NotFoundException('Không tìm thấy nhật ký xe');

    const updated = await this.repo.exit(id, userId);
    await this.invalidateCache(log.warehouse_template_id);

    this.websocket.server.emit(
      `warehouse:${log.warehouse_template_id}:vehicle-exited`,
      {
        log_id: updated.id,
        license_plate: updated.license_plate,
        exit_time: updated.exit_time,
      },
    );

    this.logger.log(`Xe ${updated.license_plate} ra khỏi kho ${log.warehouse_template_id}`);
    return updated;
  }

  async lookup(licensePlate: string, warehouseTemplateId: string) {
    const normalized = licensePlate.toUpperCase().replace(/\s+/g, '');
    return this.repo.lookupByLicensePlate(normalized, warehouseTemplateId);
  }

  async delete(id: string, userId: string) {
    const log = await this.repo.findById(id);
    if (!log) throw new NotFoundException('Không tìm thấy nhật ký xe');
    await this.repo.softDelete(id, userId);
    await this.invalidateCache(log.warehouse_template_id);
    return { success: true };
  }

  async getDashboardStats(warehouseTemplateId?: string) {
    const insideCount = await this.repo.countInsideToday(warehouseTemplateId);
    return { inside_count: insideCount };
  }

  private async invalidateCache(warehouseTemplateId: string) {
    await this.redis.delByPattern(`vehicle-log:${warehouseTemplateId}:*`);
  }
}
