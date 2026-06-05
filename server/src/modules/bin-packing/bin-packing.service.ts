import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PackingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  runExtremePointPacking,
  type Container,
  type PackItem,
} from './engines/extreme-point.engine';
import { BinPackingAiService } from './bin-packing-ai.service';

@Injectable()
export class BinPackingService {
  private readonly logger = new Logger(BinPackingService.name);
  private readonly useAi: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: BinPackingAiService,
  ) {
    this.useAi = process.env.USE_BIN_PACKING_AI === 'true';
  }

  async compute(exportId: string, fleetVehicleId?: string) {
    const exportRecord = await this.prisma.export.findFirst({
      where: { id: exportId, is_deleted: false },
      include: {
        details: { where: { is_deleted: false }, include: { product: true } },
        fleet_vehicle: true,
      },
    });
    if (!exportRecord) throw new NotFoundException('Không tìm thấy phiếu xuất');

    const packItems: PackItem[] = exportRecord.details.map((detail) => {
      const p = detail.product;
      return {
        id: detail.id,
        product_id: p.id,
        length: p.length ? Number(p.length) : 30,
        width: p.width ? Number(p.width) : 30,
        height: p.height ? Number(p.height) : 30,
        weight: p.weight ? Number(p.weight) : 1,
        quantity: Math.ceil(Number(detail.quantity)),
        stackable: p.is_stackable ?? true,
        stack_limit: p.stack_limit ?? undefined,
        packaging_method: p.packaging_method ?? 'STANDARD',
      };
    });

    // ── Resolve vehicle ────────────────────────────────────────────────────
    let vehicleId =
      fleetVehicleId ?? exportRecord.fleet_vehicle_id ?? undefined;
    let algorithmUsed = 'extreme-point';
    let orderedItems: PackItem[] = packItems;

    if (this.useAi) {
      // Ask AI: suggest vehicle type + priority scores for items
      const aiResult = await this.aiService.optimize({
        items: packItems.map((i) => ({
          id: i.id,
          product_id: i.product_id,
          length: i.length,
          width: i.width,
          height: i.height,
          weight: i.weight,
          quantity: i.quantity,
          stackable: i.stackable,
          packaging_method: i.packaging_method,
        })),
        preferred_vehicle_type: vehicleId ? undefined : undefined,
      });

      if (aiResult) {
        algorithmUsed = `extreme-point+ai(${aiResult.model_used_vehicle}/${aiResult.model_used_packing})`;

        // If no vehicle specified, find one matching AI suggestion in DB
        if (!vehicleId) {
          const suggestedType = aiResult.suggested_vehicle_type;
          const aiVehicle = await this.prisma.fleetVehicle.findFirst({
            where: {
              warehouse_id: exportRecord.warehouse_id,
              status: 'AVAILABLE',
              is_deleted: false,
              is_active: true,
              vehicle_type: suggestedType as any,
            },
            orderBy: { max_weight_kg: 'asc' },
          });
          if (aiVehicle) {
            vehicleId = aiVehicle.id;
            this.logger.log(
              `AI selected vehicle type=${suggestedType} id=${vehicleId}`,
            );
          }
        }

        // Sort items by AI priority score (highest first)
        const scoreMap = new Map(
          aiResult.items_with_priority.map((r) => [r.id, r.priority_score]),
        );
        orderedItems = [...packItems].sort(
          (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
        );
        this.logger.log(
          `AI packing order applied: conf_vehicle=${aiResult.confidence_vehicle.toFixed(2)}`,
        );
      } else {
        this.logger.warn(
          'BinPackingAI unavailable — falling back to deterministic engine',
        );
      }
    }

    // Fallback: weight-based vehicle auto-select if still no vehicle
    if (!vehicleId) {
      const vehicle = await this.autoSelectVehicle(
        exportRecord.warehouse_id,
        exportRecord.details,
      );
      if (!vehicle)
        throw new BadRequestException(
          'Không tìm thấy xe phù hợp. Vui lòng chọn xe thủ công.',
        );
      vehicleId = vehicle.id;
    }

    const vehicle = await this.prisma.fleetVehicle.findFirst({
      where: { id: vehicleId, is_deleted: false },
    });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');

    const container: Container = {
      length: Number(vehicle.cargo_length),
      width: Number(vehicle.cargo_width),
      height: Number(vehicle.cargo_height),
      max_weight: Number(vehicle.max_weight_kg),
    };

    // ── Run Extreme Point engine with (possibly AI-sorted) items ──────────
    const result = runExtremePointPacking(container, orderedItems);

    const layoutJson = JSON.parse(
      JSON.stringify({
        container: {
          length: container.length,
          width: container.width,
          height: container.height,
        },
        placed: result.packed,
        unpacked: result.unpacked,
      }),
    ) as object;

    const existing = await this.prisma.binPackingResult.findUnique({
      where: { export_id: exportId },
    });

    const totalItems = packItems.reduce((s, i) => s + i.quantity, 0);

    const record = existing
      ? await this.prisma.binPackingResult.update({
          where: { export_id: exportId },
          data: {
            fleet_vehicle_id: vehicleId,
            status: PackingStatus.COMPUTED,
            total_items: totalItems,
            packed_items: result.packed_count,
            unpacked_items: result.unpacked_count,
            space_utilization: result.space_utilization,
            total_weight_kg: result.total_weight,
            layout_json: layoutJson,
            algorithm_used: algorithmUsed,
            computed_at: new Date(),
            updated_at: new Date(),
          },
        })
      : await this.prisma.binPackingResult.create({
          data: {
            export_id: exportId,
            fleet_vehicle_id: vehicleId,
            status: PackingStatus.COMPUTED,
            total_items: totalItems,
            packed_items: result.packed_count,
            unpacked_items: result.unpacked_count,
            space_utilization: result.space_utilization,
            total_weight_kg: result.total_weight,
            layout_json: layoutJson,
            algorithm_used: algorithmUsed,
            computed_at: new Date(),
          },
        });

    if (!exportRecord.fleet_vehicle_id) {
      await this.prisma.export.update({
        where: { id: exportId },
        data: { fleet_vehicle_id: vehicleId },
      });
    }

    return {
      ...record,
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        license_plate: vehicle.license_plate,
      },
    };
  }

  async getByExportId(exportId: string) {
    const record = await this.prisma.binPackingResult.findUnique({
      where: { export_id: exportId },
      include: {
        fleet_vehicle: {
          select: {
            id: true,
            name: true,
            license_plate: true,
            cargo_length: true,
            cargo_width: true,
            cargo_height: true,
            max_weight_kg: true,
          },
        },
      },
    });
    if (!record)
      throw new NotFoundException(
        'Chưa có kết quả tính toán xếp hàng cho phiếu xuất này',
      );
    return record;
  }

  async apply(exportId: string) {
    const record = await this.prisma.binPackingResult.findUnique({
      where: { export_id: exportId },
    });
    if (!record) throw new NotFoundException('Không tìm thấy kết quả xếp hàng');
    return this.prisma.binPackingResult.update({
      where: { export_id: exportId },
      data: { status: PackingStatus.APPLIED, updated_at: new Date() },
    });
  }

  // ── Multi-order: tính xếp hàng tổng hợp nhiều phiếu vào 1 xe ─────────────

  async computeVehicle(fleetVehicleId: string, exportIds: string[]) {
    const vehicle = await this.prisma.fleetVehicle.findFirst({
      where: { id: fleetVehicleId, is_deleted: false },
    });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');

    if (!exportIds || exportIds.length === 0)
      throw new BadRequestException('Cần ít nhất 1 phiếu xuất');

    // Load tất cả exports với product details
    const exports = await this.prisma.export.findMany({
      where: { id: { in: exportIds }, is_deleted: false },
      include: {
        details: { where: { is_deleted: false }, include: { product: true } },
      },
    });
    if (exports.length === 0)
      throw new NotFoundException('Không tìm thấy phiếu xuất');

    const container: Container = {
      length: Number(vehicle.cargo_length),
      width: Number(vehicle.cargo_width),
      height: Number(vehicle.cargo_height),
      max_weight: Number(vehicle.max_weight_kg),
    };

    // Gộp tất cả items, gắn export_id + export_code cho mỗi item
    const allItems: (PackItem & { export_id: string; export_code: string })[] =
      [];
    for (const exp of exports) {
      for (const detail of exp.details) {
        const p = detail.product;
        allItems.push({
          id: detail.id,
          product_id: p.id,
          length: p.length ? Number(p.length) : 30,
          width: p.width ? Number(p.width) : 30,
          height: p.height ? Number(p.height) : 30,
          weight: p.weight ? Number(p.weight) : 1,
          quantity: Math.ceil(Number(detail.quantity)),
          stackable: p.is_stackable ?? true,
          packaging_method: p.packaging_method ?? 'STANDARD',
          export_id: exp.id,
          export_code: exp.code,
        });
      }
    }

    const result = runExtremePointPacking(container, allItems);

    // Gắn export_id + export_code vào từng placed item
    const idToExport = new Map(
      allItems.map((i) => [
        i.id,
        { export_id: i.export_id, export_code: i.export_code },
      ]),
    );
    const placedWithExport = result.packed.map((p) => ({
      ...p,
      ...(idToExport.get(p.item_id) ?? {}),
    }));

    const exportSummary = exports.map((exp) => {
      const packed = result.packed.filter(
        (p) => idToExport.get(p.item_id)?.export_id === exp.id,
      ).length;
      const unpacked = result.unpacked.filter(
        (itemId) => idToExport.get(itemId)?.export_id === exp.id,
      ).length;
      return { export_id: exp.id, export_code: exp.code, packed, unpacked };
    });

    const layoutJson = JSON.parse(
      JSON.stringify({
        container: {
          length: container.length,
          width: container.width,
          height: container.height,
        },
        placed: placedWithExport,
        unpacked: result.unpacked,
        export_summary: exportSummary,
      }),
    ) as object;

    const existing = await this.prisma.vehiclePackingResult.findFirst({
      where: { fleet_vehicle_id: fleetVehicleId, is_deleted: false },
    });

    const record = existing
      ? await this.prisma.vehiclePackingResult.update({
          where: { id: existing.id },
          data: {
            status: PackingStatus.COMPUTED,
            export_ids: exportIds,
            total_items: allItems.reduce((s, i) => s + i.quantity, 0),
            packed_items: result.packed_count,
            unpacked_items: result.unpacked_count,
            space_utilization: result.space_utilization,
            total_weight_kg: result.total_weight,
            layout_json: layoutJson,
            algorithm_used: this.useAi ? 'extreme-point+ai' : 'extreme-point',
            computed_at: new Date(),
            updated_at: new Date(),
          },
        })
      : await this.prisma.vehiclePackingResult.create({
          data: {
            fleet_vehicle_id: fleetVehicleId,
            status: PackingStatus.COMPUTED,
            export_ids: exportIds,
            total_items: allItems.reduce((s, i) => s + i.quantity, 0),
            packed_items: result.packed_count,
            unpacked_items: result.unpacked_count,
            space_utilization: result.space_utilization,
            total_weight_kg: result.total_weight,
            layout_json: layoutJson,
            algorithm_used: this.useAi ? 'extreme-point+ai' : 'extreme-point',
            computed_at: new Date(),
          },
        });

    return {
      ...record,
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        license_plate: vehicle.license_plate,
      },
    };
  }

  async getByVehicleId(fleetVehicleId: string) {
    const record = await this.prisma.vehiclePackingResult.findFirst({
      where: { fleet_vehicle_id: fleetVehicleId, is_deleted: false },
      include: {
        fleet_vehicle: {
          select: {
            id: true,
            name: true,
            license_plate: true,
            cargo_length: true,
            cargo_width: true,
            cargo_height: true,
            max_weight_kg: true,
          },
        },
      },
      orderBy: { computed_at: 'desc' },
    });
    if (!record)
      throw new NotFoundException(
        'Chưa có kết quả xếp hàng tổng hợp cho xe này',
      );
    return record;
  }

  private async autoSelectVehicle(
    warehouseId: string,
    details: Array<{
      product: { weight: any; length: any; width: any; height: any };
      quantity: any;
    }>,
  ) {
    const totalWeight = details.reduce(
      (sum, d) => sum + Number(d.product.weight ?? 1) * Number(d.quantity),
      0,
    );
    const vehicles = await this.prisma.fleetVehicle.findMany({
      where: {
        warehouse_id: warehouseId,
        status: 'AVAILABLE',
        is_deleted: false,
        is_active: true,
        max_weight_kg: { gte: totalWeight },
      },
      orderBy: { max_weight_kg: 'asc' },
    });
    return vehicles[0] ?? null;
  }
}
