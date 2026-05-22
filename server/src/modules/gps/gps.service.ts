import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GpsSession, VehiclePurpose, VehicleType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { GpsRepository } from './gps.repository';
import { CreateGpsSessionDto } from './dto/create-gps-session.dto';
import { PostLocationDto } from './dto/post-location.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RedisService } from '../redis/redis.service';
import { VehicleLogService } from '../warehouse-vehicle-log/warehouse-vehicle-log.service';
import { CreateVehicleLogDto } from '../warehouse-vehicle-log/dto/create-vehicle-log.dto';

const GPS_SESSION_HOURS = 24;
const APPROACHING_DISTANCE_M = 500;
const ARRIVED_DISTANCE_M = 100;
const RATE_LIMIT_TTL_S = 30;

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);

  constructor(
    private readonly repo: GpsRepository,
    private readonly websocket: WebsocketGateway,
    private readonly redis: RedisService,
    private readonly vehicleLogService: VehicleLogService,
  ) {}

  async createSession(dto: CreateGpsSessionDto, userId: string) {
    const token = randomBytes(12).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + GPS_SESSION_HOURS);

    const session = await this.repo.createSession({
      token,
      license_plate: dto.license_plate.toUpperCase().replace(/\s+/g, ''),
      warehouse_template_id: dto.warehouse_template_id,
      receipt_id: dto.receipt_id,
      export_id: dto.export_id,
      driver_phone: dto.driver_phone,
      expires_at: expiresAt,
      created_by: userId,
    });

    const trackingUrl = `${process.env.FRONTEND_URL ?? 'https://gen-hub.dev'}/track/${token}`;
    this.logger.log(`GPS session created: ${token} → ${session.license_plate}`);

    return { ...session, tracking_url: trackingUrl };
  }

  async getSessionInfo(token: string) {
    const session = await this.repo.findSessionByToken(token);
    if (!session) throw new NotFoundException('Phiên GPS không tồn tại');

    if (session.status === 'EXPIRED' || new Date() > session.expires_at) {
      throw new BadRequestException('Phiên GPS đã hết hạn');
    }

    return {
      license_plate: session.license_plate,
      status: session.status,
      expires_at: session.expires_at,
      warehouse: session.warehouse_template
        ? {
            name: session.warehouse_template.name,
            address: session.warehouse_template.address_detail,
            latitude: session.warehouse_template.latitude
              ? Number(session.warehouse_template.latitude)
              : null,
            longitude: session.warehouse_template.longitude
              ? Number(session.warehouse_template.longitude)
              : null,
          }
        : null,
    };
  }

  async postLocation(dto: PostLocationDto) {
    // Rate limit: 1 request per 30s per token
    const rateKey = `gps-rate:${dto.token}`;
    const rateLimited = await this.redis.get(rateKey);
    if (rateLimited) {
      throw new HttpException(
        'Vui lòng chờ 30 giây trước khi gửi vị trí tiếp theo',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const session = await this.repo.findSessionByToken(dto.token);
    if (!session) throw new NotFoundException('Phiên GPS không tồn tại');
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Phiên GPS không còn hoạt động');
    }
    if (new Date() > session.expires_at) {
      await this.repo.expireSession(session.id);
      throw new BadRequestException('Phiên GPS đã hết hạn');
    }

    await this.repo.addTrack({
      session_id: session.id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      speed: dto.speed,
    });

    // Set rate limit AFTER successful track insertion
    await this.redis.set(rateKey, '1', RATE_LIMIT_TTL_S);

    const wt = session.warehouse_template;
    const result: Record<string, unknown> = { recorded: true };

    if (wt?.latitude && wt?.longitude) {
      const distanceM = haversineMeters(
        dto.latitude,
        dto.longitude,
        Number(wt.latitude),
        Number(wt.longitude),
      );
      result.distance_to_warehouse_m = Math.round(distanceM);

      if (distanceM <= ARRIVED_DISTANCE_M) {
        result.geofence = 'ARRIVED';
        await this.handleArrived(session, dto.latitude, dto.longitude, distanceM, dto.speed);
      } else if (distanceM <= APPROACHING_DISTANCE_M) {
        result.geofence = 'APPROACHING';
        this.websocket.server.emit(
          `warehouse:${session.warehouse_template_id}:vehicle-approaching`,
          {
            session_id: session.id,
            token: session.token,
            license_plate: session.license_plate,
            latitude: dto.latitude,
            longitude: dto.longitude,
            distance_m: Math.round(distanceM),
            speed_kmh: dto.speed != null ? Math.round(dto.speed * 3.6) : null,
            event: 'APPROACHING',
          },
        );
      }
    }

    return result;
  }

  private async handleArrived(
    session: GpsSession,
    latitude: number,
    longitude: number,
    distanceM: number,
    speed?: number,
  ) {
    const existing = await this.vehicleLogService.findActiveByPlate(
      session.license_plate,
      session.warehouse_template_id,
    );

    if (!existing) {
      const purpose = session.receipt_id
        ? VehiclePurpose.INBOUND
        : session.export_id
        ? VehiclePurpose.OUTBOUND
        : VehiclePurpose.VISIT;

      await this.vehicleLogService.create(
        {
          warehouse_template_id: session.warehouse_template_id,
          license_plate: session.license_plate,
          vehicle_type: VehicleType.OTHER,
          purpose,
          linked_receipt_id: session.receipt_id ?? undefined,
          linked_export_id: session.export_id ?? undefined,
          driver_phone: session.driver_phone ?? undefined,
          notes: 'Tự động ghi nhận qua GPS tracking',
        } as CreateVehicleLogDto,
        session.created_by ?? 'system',
      );

      await this.repo.completeSession(session.id);
      this.logger.log(
        `Auto VehicleLog: ${session.license_plate} → ${session.warehouse_template_id}`,
      );
    }

    this.websocket.server.emit(
      `warehouse:${session.warehouse_template_id}:vehicle-approaching`,
      {
        session_id: session.id,
        token: session.token,
        license_plate: session.license_plate,
        latitude,
        longitude,
        distance_m: Math.round(distanceM),
        speed_kmh: speed != null ? Math.round(speed * 3.6) : null,
        event: 'ARRIVED',
      },
    );
  }

  async listActiveSessions(warehouseTemplateId: string) {
    return this.repo.listSessionsByWarehouse(warehouseTemplateId);
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
