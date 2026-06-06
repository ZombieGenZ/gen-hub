import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RoutePlanningAiService,
  type RoutePlanAiResponse,
  type RouteStop,
  type DeadlineWarning,
} from './route-planning-ai.service';

export interface RoutePlanResult {
  fleet_vehicle_id: string;
  vehicle_name: string;
  vehicle_license_plate: string;
  warehouse_name: string;
  loading_time_minutes: number;
  departure_time: string;
  departure_after_loading: string;
  route: RouteStop[];
  total_route_time_minutes: number;
  deadline_warnings: DeadlineWarning[];
  delivery_sequence: string[];
  algorithm_used: string;
  ai_available: boolean;
}

@Injectable()
export class RoutePlanningService {
  private readonly logger = new Logger(RoutePlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: RoutePlanningAiService,
  ) {}

  async plan(params: {
    fleet_vehicle_id: string;
    export_ids?: string[];
    departure_time?: string;
  }): Promise<RoutePlanResult> {
    // ── Load vehicle + warehouse ────────────────────────────────────────────
    const vehicle = await this.prisma.fleetVehicle.findFirst({
      where: { id: params.fleet_vehicle_id, is_deleted: false },
      include: {
        warehouse: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
    });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');

    // ── Guard: block planning khi xe đang giao hàng ─────────────────────────
    const shippedExports = await this.prisma.export.findMany({
      where: {
        fleet_vehicle_id: vehicle.id,
        status: 'SHIPPED',
        is_deleted: false,
      },
      select: { id: true, code: true },
    });
    if (shippedExports.length > 0) {
      const codes = shippedExports.map((e) => e.code).join(', ');
      throw new BadRequestException(
        `Xe ${vehicle.license_plate} đang giao hàng (${shippedExports.length} phiếu xuất SHIPPED: ${codes}). ` +
          `Không thể tính lộ trình mới khi xe chưa về kho.`,
      );
    }

    // ── Resolve export IDs ──────────────────────────────────────────────────
    let exportIds = params.export_ids ?? [];
    if (exportIds.length === 0) {
      // Auto: all non-cancelled, non-deleted exports on this vehicle
      const assigned = await this.prisma.export.findMany({
        where: {
          fleet_vehicle_id: params.fleet_vehicle_id,
          is_deleted: false,
          status: { not: 'CANCELLED' },
        },
        select: { id: true },
      });
      exportIds = assigned.map((e) => e.id);
    }

    if (exportIds.length === 0) {
      throw new BadRequestException(
        'Xe này chưa có phiếu xuất nào. Vui lòng gán phiếu xuất vào xe trước.',
      );
    }

    // ── Load exports with details ───────────────────────────────────────────
    const exports = await this.prisma.export.findMany({
      where: { id: { in: exportIds }, is_deleted: false },
      include: {
        partner: { select: { id: true, name: true } },
        details: {
          where: { is_deleted: false },
          include: {
            product: {
              select: {
                weight: true,
                length: true,
                width: true,
                height: true,
                packaging_method: true,
              },
            },
          },
        },
      },
    });

    if (exports.length === 0) {
      throw new NotFoundException('Không tìm thấy phiếu xuất nào');
    }

    // ── Build AI request ────────────────────────────────────────────────────
    const wh = vehicle.warehouse;
    const aiExports = exports.map((exp) => {
      let item_count = 0;
      let total_weight_kg = 0;
      let fragile_count = 0;
      let oversized_count = 0;
      let liquid_count = 0;
      let total_vol = 0;

      for (const d of exp.details) {
        const qty = Math.ceil(Number(d.quantity));
        const p = d.product;
        item_count += qty;
        total_weight_kg += Number(p.weight ?? 1) * qty;
        const vol = Number(p.length ?? 30) * Number(p.width ?? 30) * Number(p.height ?? 30);
        total_vol += vol * qty;
        const method = p.packaging_method ?? 'STANDARD';
        if (method === 'FRAGILE') fragile_count += qty;
        if (method === 'OVERSIZED') oversized_count += qty;
        if (method === 'LIQUID') liquid_count += qty;
      }

      return {
        id: exp.id,
        code: exp.code,
        delivery_address: exp.delivery_address ?? '',
        required_date: exp.required_date?.toISOString() ?? undefined,
        partner_name: exp.partner?.name ?? '',
        items: {
          item_count,
          total_weight_kg: Math.round(total_weight_kg * 100) / 100,
          fragile_count,
          oversized_count,
          liquid_count,
          avg_volume_cm3: item_count > 0 ? Math.round(total_vol / item_count) : 1000,
        },
      };
    });

    const departure = params.departure_time ?? new Date().toISOString();
    const aiReq = {
      warehouse: {
        name: wh.name,
        lat: wh.latitude ? Number(wh.latitude) : undefined,
        lng: wh.longitude ? Number(wh.longitude) : undefined,
      },
      exports: aiExports,
      departure_time: departure,
    };

    // ── Call AI ─────────────────────────────────────────────────────────────
    const aiResult = await this.ai.planRoute(aiReq);

    if (aiResult) {
      return {
        fleet_vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        vehicle_license_plate: vehicle.license_plate,
        warehouse_name: wh.name,
        loading_time_minutes: aiResult.loading_time_minutes,
        departure_time: departure,
        departure_after_loading: aiResult.departure_after_loading,
        route: aiResult.route,
        total_route_time_minutes: aiResult.total_route_time_minutes,
        deadline_warnings: aiResult.deadline_warnings,
        delivery_sequence: aiResult.delivery_sequence,
        algorithm_used: aiResult.algorithm_used,
        ai_available: true,
      };
    }

    // ── Rule-based fallback (AI unavailable) ────────────────────────────────
    this.logger.warn('RoutePlannerAI unavailable — using EDF fallback');
    return this._fallbackPlan(vehicle, exports, departure);
  }

  private _fallbackPlan(vehicle: any, exports: any[], departureIso: string): RoutePlanResult {
    // Sort by required_date ascending (EDF), nulls last
    const sorted = [...exports].sort((a, b) => {
      if (!a.required_date && !b.required_date) return 0;
      if (!a.required_date) return 1;
      if (!b.required_date) return -1;
      return new Date(a.required_date).getTime() - new Date(b.required_date).getTime();
    });

    const dep = new Date(departureIso);
    const loadingMin = 10 + sorted.reduce(
      (s, e) => s + e.details.reduce((ds: number, d: any) => ds + Math.ceil(Number(d.quantity)) * 1.5, 0),
      0,
    );
    const depAfterLoading = new Date(dep.getTime() + loadingMin * 60_000);
    const TRAVEL_ESTIMATE = 20; // minutes per stop (fallback)
    const SERVICE_TIME = 15;

    const route = sorted.map((exp, idx) => {
      const departFrom = idx === 0
        ? depAfterLoading
        : new Date(depAfterLoading.getTime() + idx * (TRAVEL_ESTIMATE + SERVICE_TIME) * 60_000);
      const arrival = new Date(departFrom.getTime() + TRAVEL_ESTIMATE * 60_000);
      const reqDt = exp.required_date ? new Date(exp.required_date) : null;
      const bufferMin = reqDt ? (reqDt.getTime() - arrival.getTime()) / 60_000 : null;
      const risk = !reqDt ? 'LOW' : bufferMin! < 0 ? 'MISSED' : bufferMin! < 30 ? 'HIGH' : bufferMin! < 90 ? 'MEDIUM' : 'LOW';

      return {
        sequence: idx + 1,
        export_id: exp.id,
        export_code: exp.code,
        partner_name: exp.partner?.name ?? '',
        delivery_address: exp.delivery_address ?? '',
        estimated_arrival: arrival.toISOString(),
        estimated_departure: departFrom.toISOString(),
        travel_time_minutes: TRAVEL_ESTIMATE,
        distance_km: 0,
        required_date: exp.required_date?.toISOString() ?? undefined,
        deadline_risk: risk as any,
        deadline_buffer_minutes: bufferMin != null ? Math.round(bufferMin) : undefined,
        delivery_sequence_rank: sorted.length > 1 ? idx / (sorted.length - 1) : 0.5,
      };
    });

    const warnings = route
      .filter((r) => r.deadline_risk === 'HIGH' || r.deadline_risk === 'MISSED')
      .map((r) => ({
        export_id: r.export_id,
        export_code: r.export_code,
        required_date: r.required_date ?? '',
        estimated_arrival: r.estimated_arrival,
        deadline_risk: r.deadline_risk,
        message: r.deadline_risk === 'MISSED'
          ? `Phiếu ${r.export_code} (${r.partner_name}): ước tính TRỄ hạn.`
          : `Phiếu ${r.export_code} (${r.partner_name}): còn rất ít thời gian — cần xuất phát đúng giờ.`,
      }));

    return {
      fleet_vehicle_id: vehicle.id,
      vehicle_name: vehicle.name,
      vehicle_license_plate: vehicle.license_plate,
      warehouse_name: vehicle.warehouse.name,
      loading_time_minutes: Math.round(loadingMin),
      departure_time: departureIso,
      departure_after_loading: depAfterLoading.toISOString(),
      route,
      total_route_time_minutes: route.length * (TRAVEL_ESTIMATE + SERVICE_TIME),
      deadline_warnings: warnings,
      delivery_sequence: sorted.map((e) => e.id),
      algorithm_used: 'edf-fallback',
      ai_available: false,
    };
  }
}
