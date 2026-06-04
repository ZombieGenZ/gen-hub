import { Injectable, NotFoundException } from '@nestjs/common';
import { FleetVehicleStatus } from '@prisma/client';
import { FleetRepository } from './fleet.repository';
import { CreateFleetVehicleDto } from './dto/create-fleet-vehicle.dto';
import { UpdateFleetVehicleDto } from './dto/update-fleet-vehicle.dto';

@Injectable()
export class FleetService {
  constructor(private readonly repo: FleetRepository) {}

  async create(dto: CreateFleetVehicleDto, userId: string) {
    return this.repo.create({
      warehouse_id: dto.warehouse_id,
      name: dto.name,
      license_plate: dto.license_plate.toUpperCase().replace(/\s+/g, ''),
      vehicle_type: dto.vehicle_type,
      status: dto.status,
      cargo_length: dto.cargo_length,
      cargo_width: dto.cargo_width,
      cargo_height: dto.cargo_height,
      max_weight_kg: dto.max_weight_kg,
      notes: dto.notes,
      created_by: userId,
    });
  }

  async list(params: {
    warehouse_id?: string;
    status?: FleetVehicleStatus;
    limit?: number;
    offset?: number;
  }) {
    return this.repo.findAll({
      warehouseId: params.warehouse_id,
      status: params.status,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }

  async findById(id: string) {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');
    return vehicle;
  }

  async findAvailable(warehouseId: string) {
    return this.repo.findAvailable(warehouseId);
  }

  async update(id: string, dto: UpdateFleetVehicleDto, userId: string) {
    await this.findById(id);
    return this.repo.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.license_plate && {
        license_plate: dto.license_plate.toUpperCase().replace(/\s+/g, ''),
      }),
      ...(dto.vehicle_type && { vehicle_type: dto.vehicle_type }),
      ...(dto.status && { status: dto.status }),
      ...(dto.cargo_length != null && { cargo_length: dto.cargo_length }),
      ...(dto.cargo_width != null && { cargo_width: dto.cargo_width }),
      ...(dto.cargo_height != null && { cargo_height: dto.cargo_height }),
      ...(dto.max_weight_kg != null && { max_weight_kg: dto.max_weight_kg }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      updated_by: userId,
      updated_at: new Date(),
    });
  }

  async updateStatus(id: string, status: FleetVehicleStatus, userId: string) {
    await this.findById(id);
    return this.repo.update(id, {
      status,
      updated_by: userId,
      updated_at: new Date(),
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id);
    await this.repo.softDelete(id, userId);
    return { success: true };
  }
}
