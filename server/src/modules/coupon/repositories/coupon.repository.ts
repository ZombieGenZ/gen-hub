import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  couponBasicSelect,
  couponFullSelect,
  couponWithRelationsSelect,
} from '../selects/coupon.select';

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CouponCreateInput) {
    return this.prisma.coupon.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CouponWhereInput;
    orderBy?: Prisma.CouponOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return this.prisma.coupon.findMany({
      skip,
      take,
      where,
      orderBy,
      select: couponBasicSelect,
    });
  }

  async count(where?: Prisma.CouponWhereInput) {
    return this.prisma.coupon.count({ where });
  }

  async findById(id: string) {
    return this.prisma.coupon.findFirst({
      where: { id, is_deleted: false },
      select: couponFullSelect,
    });
  }

  async findByCode(code: string, excludeId?: string) {
    return this.prisma.coupon.findFirst({
      where: {
        code,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: couponBasicSelect,
    });
  }

  /**
   * Tìm coupon có code trùng và thời gian hiệu lực chồng chéo
   * Overlap xảy ra khi: starts_at_A < ends_at_B AND starts_at_B < ends_at_A
   */
  async findByCodeWithOverlap(
    code: string,
    startsAt?: Date | null,
    endsAt?: Date | null,
    excludeId?: string,
  ) {
    return this.prisma.coupon.findFirst({
      where: {
        code,
        is_deleted: false,
        is_active: true,
        ...(excludeId && { id: { not: excludeId } }),
        // Kiểm tra overlap: (starts_at_A < ends_at_B) AND (starts_at_B < ends_at_A)
        // Nếu coupon mới không có ends_at (is_permanent), coi như ends_at = vô cực
        // Nếu coupon cũ không có ends_at, coi như ends_at = vô cực
        OR: [
          // Coupon cũ là permanent (không có ends_at) - luôn overlap nếu starts_at mới < vô cực
          { ends_at: null },
          // Coupon cũ có ends_at và chưa hết hạn
          ...(endsAt ? [{ starts_at: { lt: endsAt } }] : [{}]), // Nếu coupon mới là permanent, luôn overlap với các coupon có starts_at
        ],
        // Coupon cũ phải chưa kết thúc hoặc kết thúc sau starts_at mới
        ...(startsAt && {
          OR: [{ ends_at: null }, { ends_at: { gt: startsAt } }],
        }),
      },
      select: couponBasicSelect,
    });
  }

  async findByName(name: string, excludeId?: string) {
    return this.prisma.coupon.findFirst({
      where: {
        name,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: couponBasicSelect,
    });
  }

  async findByIds(ids: string[]) {
    return this.prisma.coupon.findMany({
      where: { id: { in: ids }, is_deleted: false },
      select: couponBasicSelect,
    });
  }

  async update(id: string, data: Prisma.CouponUpdateInput) {
    return this.prisma.coupon.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, userId: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async softDeleteMany(ids: string[], userId: string) {
    return this.prisma.coupon.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  // Increment usage count
  async incrementUsage(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        current_usage: { increment: 1 },
      },
    });
  }

  /**
   * Lấy coupon kèm thông tin targets
   */
  async getCouponWithTargets(id: string) {
    return this.prisma.coupon.findFirst({
      where: { id, is_deleted: false },
      select: {
        ...couponFullSelect,
        target_users: {
          where: { is_active: true },
          select: {
            id: true,
            user_id: true,
            is_active: true,
          },
        },
        target_warehouses: {
          where: { is_active: true },
          select: {
            id: true,
            warehouse_template_id: true,
            is_active: true,
          },
        },
        target_rows: {
          where: { is_active: true },
          select: {
            id: true,
            row_template_id: true,
            is_active: true,
          },
        },
        target_addons: {
          where: { is_active: true },
          select: {
            id: true,
            addon_id: true,
            is_active: true,
          },
        },
      },
    });
  }

  // Gift Addon operations
  async createGiftAddons(couponId: string, addonIds: string[]) {
    const data = addonIds.map((addonId) => ({
      coupon_id: couponId,
      addon_id: addonId,
    }));
    return this.prisma.couponGiftAddon.createMany({ data });
  }

  async deleteGiftAddons(couponId: string) {
    return this.prisma.couponGiftAddon.deleteMany({
      where: { coupon_id: couponId },
    });
  }

  async getGiftAddons(couponId: string) {
    return this.prisma.couponGiftAddon.findMany({
      where: { coupon_id: couponId, is_active: true },
      select: {
        id: true,
        addon_id: true,
        is_active: true,
        addon: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  // Gift Insurance operations
  async createGiftInsurances(couponId: string, insuranceIds: string[]) {
    const data = insuranceIds.map((insuranceId) => ({
      coupon_id: couponId,
      insurance_id: insuranceId,
    }));
    return this.prisma.couponGiftInsurance.createMany({ data });
  }

  async deleteGiftInsurances(couponId: string) {
    return this.prisma.couponGiftInsurance.deleteMany({
      where: { coupon_id: couponId },
    });
  }

  async getGiftInsurances(couponId: string) {
    return this.prisma.couponGiftInsurance.findMany({
      where: { coupon_id: couponId, is_active: true },
      select: {
        id: true,
        insurance_id: true,
        is_active: true,
        insurance: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  /**
   * Lấy coupon kèm thông tin targets và gifts
   */
  async getCouponWithTargetsAndGifts(id: string) {
    return this.prisma.coupon.findFirst({
      where: { id, is_deleted: false },
      select: couponWithRelationsSelect,
    });
  }

  /**
   * Lấy danh sách user đã sử dụng coupon (thông qua rental contract)
   */
  async getCouponUsages(couponId: string, skip = 0, take = 20) {
    const [items, total] = await Promise.all([
      this.prisma.rentalContractCoupon.findMany({
        where: { coupon_id: couponId },
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          discount_value: true,
          discount_amount: true,
          created_at: true,
          rental_contract: {
            select: {
              id: true,
              code: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  owner: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatar_url: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.rentalContractCoupon.count({
        where: { coupon_id: couponId },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        contract_id: item.rental_contract.id,
        contract_code: item.rental_contract.code,
        discount_value: Number(item.discount_value),
        discount_amount: Number(item.discount_amount),
        used_at: item.created_at,
        organization: {
          id: item.rental_contract.organization.id,
          name: item.rental_contract.organization.name,
        },
        user: {
          id: item.rental_contract.organization.owner.id,
          name: item.rental_contract.organization.owner.name,
          email: item.rental_contract.organization.owner.email,
          avatar_url: item.rental_contract.organization.owner.avatar_url,
        },
      })),
      total,
      skip,
      take,
      hasMore: skip + items.length < total,
    };
  }
}
