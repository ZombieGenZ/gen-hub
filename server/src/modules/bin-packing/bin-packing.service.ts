import {
  Injectable,
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

@Injectable()
export class BinPackingService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(exportId: string, fleetVehicleId?: string) {
    // Load export with details & products
    const exportRecord = await this.prisma.export.findFirst({
      where: { id: exportId, is_deleted: false },
      include: {
        details: {
          where: { is_deleted: false },
          include: {
            product: true,
          },
        },
        fleet_vehicle: true,
      },
    });

    if (!exportRecord) throw new NotFoundException('Không tìm thấy phiếu xuất');

    // Determine vehicle
    let vehicleId =
      fleetVehicleId ?? exportRecord.fleet_vehicle_id ?? undefined;
    if (!vehicleId) {
      // Auto-select best available vehicle
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

    // Build pack items
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

    const result = runExtremePointPacking(container, packItems);

    // Upsert BinPackingResult
    // JSON.parse/stringify strips typed array signatures so Prisma accepts it as InputJsonValue
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

    const record = existing
      ? await this.prisma.binPackingResult.update({
          where: { export_id: exportId },
          data: {
            fleet_vehicle_id: vehicleId,
            status: PackingStatus.COMPUTED,
            total_items: packItems.reduce((s, i) => s + i.quantity, 0),
            packed_items: result.packed_count,
            unpacked_items: result.unpacked_count,
            space_utilization: result.space_utilization,
            total_weight_kg: result.total_weight,
            layout_json: layoutJson,
            algorithm_used: 'extreme-point',
            computed_at: new Date(),
            updated_at: new Date(),
          },
        })
      : await this.prisma.binPackingResult.create({
          data: {
            export_id: exportId,
            fleet_vehicle_id: vehicleId,
            status: PackingStatus.COMPUTED,
            total_items: packItems.reduce((s, i) => s + i.quantity, 0),
            packed_items: result.packed_count,
            unpacked_items: result.unpacked_count,
            space_utilization: result.space_utilization,
            total_weight_kg: result.total_weight,
            layout_json: layoutJson,
            algorithm_used: 'extreme-point',
            computed_at: new Date(),
          },
        });

    // Update export's fleet_vehicle_id if not set
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

    // Get all available vehicles sorted by capacity (smallest that fits)
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
