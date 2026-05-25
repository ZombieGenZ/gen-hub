import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleLogRepository } from './warehouse-vehicle-log.repository';
import { CreateVehicleLogDto } from './dto/create-vehicle-log.dto';
import { QueryVehicleLogDto } from './dto/query-vehicle-log.dto';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { GeminiService } from '../ai-hub/services/gemini.service';
import { ImageUploadService } from '../../common/services/image-upload.service';
import { DockScheduleService } from '../dock-schedule/dock-schedule.service';

@Injectable()
export class VehicleLogService {
  private readonly logger = new Logger(VehicleLogService.name);

  constructor(
    private readonly repo: VehicleLogRepository,
    private readonly redis: RedisService,
    private readonly websocket: WebsocketGateway,
    private readonly config: ConfigService,
    private readonly gemini: GeminiService,
    private readonly imageUpload: ImageUploadService,
    @Inject(forwardRef(() => DockScheduleService))
    private readonly dockScheduleService: DockScheduleService,
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
      plate_image_url: dto.plate_image_url,
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

    this.logger.log(
      `Xe ${log.license_plate} vào kho ${dto.warehouse_template_id}`,
    );

    // Auto-link với DockSchedule nếu có lịch đặt trước khớp biển số hôm nay
    this.dockScheduleService
      .linkFromVehicleLog(log.license_plate, dto.warehouse_template_id, log.id)
      .catch(() => {
        // Silent — xe không hẹn trước vẫn được vào bình thường
      });

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

    this.logger.log(
      `Xe ${updated.license_plate} ra khỏi kho ${log.warehouse_template_id}`,
    );
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

  async findActiveByPlate(licensePlate: string, warehouseTemplateId: string) {
    return this.repo.findActiveByPlate(licensePlate, warehouseTemplateId);
  }

  async getDashboardStats(warehouseTemplateId?: string) {
    const insideCount = await this.repo.countInsideToday(warehouseTemplateId);
    return { inside_count: insideCount };
  }

  async ocrPlate(file: Express.Multer.File): Promise<{
    license_plate: string;
    confidence: number;
    image_url: string;
    vehicle_type?: string;
    vehicle_color?: string;
    plate_format?: string;
    condition_flags?: string[];
  }> {
    const base64 = file.buffer.toString('base64');

    const [uploadResult, analysis] = await Promise.all([
      this.imageUpload.processAndUpload(
        file.buffer,
        file.originalname,
        '/vehicle-log/plates',
      ),
      this.gemini.analyzeVehicle(base64, file.mimetype),
    ]);

    return {
      license_plate: analysis.license_plate.toUpperCase().replace(/\s+/g, ''),
      confidence: analysis.plate_confidence,
      image_url: uploadResult.url,
      vehicle_type: analysis.vehicle_type,
      vehicle_color: analysis.vehicle_color,
      plate_format: analysis.plate_format,
      condition_flags: analysis.condition_flags,
    };
  }

  async ocrPlateQuick(
    file: Express.Multer.File,
  ): Promise<{ license_plate: string; confidence: number }> {
    const base64 = file.buffer.toString('base64');
    const analysis = await this.gemini.analyzeVehicle(base64, file.mimetype);
    return {
      license_plate: analysis.license_plate.toUpperCase().replace(/\s+/g, ''),
      confidence: analysis.plate_confidence,
    };
  }

  private async invalidateCache(warehouseTemplateId: string) {
    await this.redis.delByPattern(`vehicle-log:${warehouseTemplateId}:*`);
  }
}
