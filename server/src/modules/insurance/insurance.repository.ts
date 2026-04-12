import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository cho Insurance - Bảo hiểm
 */
@Injectable()
export class InsuranceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo mới insurance
   */
  async create(data: Prisma.InsuranceCreateInput) {
    return this.prisma.insurance.create({ data });
  }

  /**
   * Lấy danh sách insurance với phân trang và filter
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.InsuranceWhereInput;
    orderBy?: Prisma.InsuranceOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return this.prisma.insurance.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  /**
   * Đếm số lượng insurance
   */
  async count(where?: Prisma.InsuranceWhereInput) {
    return this.prisma.insurance.count({ where });
  }

  /**
   * Tìm insurance theo ID
   */
  async findById(id: string, userId?: string, hasReadAllPermission?: boolean) {
    const where: any = { id, is_deleted: false };

    // Nếu không có quyền read.all, chỉ lấy item của chính user
    if (!hasReadAllPermission && userId) {
      where.created_by = userId;
    }

    return this.prisma.insurance.findFirst({
      where,
    });
  }

  /**
   * Tìm insurance theo tên (để check trùng)
   */
  async findByName(name: string, excludeId?: string) {
    return this.prisma.insurance.findFirst({
      where: {
        name,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  /**
   * Tìm nhiều insurance theo IDs
   */
  async findByIds(
    ids: string[],
    userId?: string,
    hasDeleteAllPermission?: boolean,
  ) {
    const where: any = { id: { in: ids }, is_deleted: false };

    // Nếu không có quyền delete.all, chỉ lấy items của chính user
    if (!hasDeleteAllPermission && userId) {
      where.created_by = userId;
    }

    return this.prisma.insurance.findMany({
      where,
    });
  }

  /**
   * Lấy tất cả insurance active (có phân trang)
   */
  async findAllActive(params?: { skip?: number; take?: number }) {
    const { skip, take } = params || {};
    const where: any = { is_active: true, is_deleted: false };

    return this.prisma.insurance.findMany({
      skip,
      take,
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Đếm số lượng insurance active
   */
  async countActive() {
    return this.prisma.insurance.count({
      where: { is_active: true, is_deleted: false },
    });
  }

  /**
   * Cập nhật insurance
   */
  async update(id: string, data: Prisma.InsuranceUpdateInput) {
    return this.prisma.insurance.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete insurance
   */
  async softDelete(id: string, userId: string) {
    return this.prisma.insurance.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  /**
   * Soft delete nhiều insurance
   */
  async softDeleteMany(ids: string[], userId: string) {
    return this.prisma.insurance.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  /**
   * Cập nhật trạng thái mapping TierInsuranceGift khi insurance thay đổi is_active
   */
  async updateTierGiftStatus(insuranceId: string, isActive: boolean) {
    return this.prisma.tierInsuranceGift.updateMany({
      where: { insurance_id: insuranceId },
      data: { is_active: isActive },
    });
  }

  /**
   * Soft delete các TierInsuranceGift khi insurance bị xóa
   */
  async softDeleteTierGifts(insuranceId: string, userId: string) {
    return this.prisma.tierInsuranceGift.updateMany({
      where: { insurance_id: insuranceId },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  /**
   * Cập nhật trạng thái mapping WarehouseInsuranceGift
   */
  async updateWarehouseGiftStatus(insuranceId: string, isActive: boolean) {
    return this.prisma.warehouseInsuranceGift.updateMany({
      where: { insurance_id: insuranceId },
      data: { is_active: isActive },
    });
  }

  /**
   * Soft delete các WarehouseInsuranceGift
   */
  async softDeleteWarehouseGifts(insuranceId: string, userId: string) {
    return this.prisma.warehouseInsuranceGift.updateMany({
      where: { insurance_id: insuranceId },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  /**
   * Cập nhật trạng thái mapping RowInsuranceGift
   */
  async updateRowGiftStatus(insuranceId: string, isActive: boolean) {
    return this.prisma.rowInsuranceGift.updateMany({
      where: { insurance_id: insuranceId },
      data: { is_active: isActive },
    });
  }

  /**
   * Soft delete các RowInsuranceGift
   */
  async softDeleteRowGifts(insuranceId: string, userId: string) {
    return this.prisma.rowInsuranceGift.updateMany({
      where: { insurance_id: insuranceId },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }
}
