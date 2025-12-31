import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CouponRepository {
    constructor(private readonly prisma: PrismaService) { }

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
        });
    }

    async count(where?: Prisma.CouponWhereInput) {
        return this.prisma.coupon.count({ where });
    }

    async findById(id: string) {
        return this.prisma.coupon.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findByCode(code: string, excludeId?: string) {
        return this.prisma.coupon.findFirst({
            where: {
                code,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
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
        const now = new Date();
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
                    ...(endsAt
                        ? [{ starts_at: { lt: endsAt } }]
                        : [{}]), // Nếu coupon mới là permanent, luôn overlap với các coupon có starts_at
                ],
                // Coupon cũ phải chưa kết thúc hoặc kết thúc sau starts_at mới
                ...(startsAt && {
                    OR: [
                        { ends_at: null },
                        { ends_at: { gt: startsAt } },
                    ],
                }),
            },
        });
    }

    async findByName(name: string, excludeId?: string) {
        return this.prisma.coupon.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.coupon.findMany({
            where: { id: { in: ids }, is_deleted: false },
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

    // UserSavedCoupon operations
    async saveCouponForUser(userId: string, couponId: string, createdBy: string) {
        return this.prisma.userSavedCoupon.create({
            data: {
                user_id: userId,
                coupon_id: couponId,
                created_by: createdBy,
            },
        });
    }

    async unsaveCouponForUser(userId: string, couponId: string, deletedBy: string) {
        return this.prisma.userSavedCoupon.updateMany({
            where: {
                user_id: userId,
                coupon_id: couponId,
                is_deleted: false,
            },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findSavedCouponByUser(userId: string, couponId: string) {
        return this.prisma.userSavedCoupon.findFirst({
            where: {
                user_id: userId,
                coupon_id: couponId,
                is_deleted: false,
            },
        });
    }

    async getSavedCoupons(userId: string, skip?: number, take?: number) {
        return this.prisma.userSavedCoupon.findMany({
            where: { user_id: userId, is_deleted: false },
            include: {
                coupon: true,
            },
            skip,
            take,
            orderBy: { created_at: 'desc' },
        });
    }

    async countSavedCoupons(userId: string) {
        return this.prisma.userSavedCoupon.count({
            where: { user_id: userId, is_deleted: false },
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
     * Tìm coupon theo code còn hiệu lực
     */
    async findCouponByCodeActive(code: string) {
        const now = new Date();
        return this.prisma.coupon.findFirst({
            where: {
                code,
                is_deleted: false,
                is_active: true,
                OR: [
                    { is_permanent: true },
                    {
                        AND: [
                            { starts_at: { lte: now } },
                            { ends_at: { gte: now } },
                        ],
                    },
                ],
            },
            include: {
                target_users: { where: { is_active: true } },
                target_warehouses: { where: { is_active: true } },
                target_rows: { where: { is_active: true } },
                target_addons: { where: { is_active: true } },
            },
        });
    }

    /**
     * Lấy coupon kèm thông tin targets
     */
    async getCouponWithTargets(id: string) {
        return this.prisma.coupon.findFirst({
            where: { id, is_deleted: false },
            include: {
                target_users: { where: { is_active: true } },
                target_warehouses: { where: { is_active: true } },
                target_rows: { where: { is_active: true } },
                target_addons: { where: { is_active: true } },
            },
        });
    }

    /**
     * Lấy danh sách coupon đã lưu của user có thể áp dụng
     */
    async findApplicableSavedCoupons(userId: string) {
        const now = new Date();
        return this.prisma.userSavedCoupon.findMany({
            where: {
                user_id: userId,
                is_deleted: false,
                is_active: true,
                coupon: {
                    is_deleted: false,
                    is_active: true,
                    AND: [
                        // Điều kiện thời gian hiệu lực
                        {
                            OR: [
                                { is_permanent: true },
                                {
                                    AND: [
                                        { starts_at: { lte: now } },
                                        { ends_at: { gte: now } },
                                    ],
                                },
                            ],
                        },
                        // Điều kiện chưa đạt giới hạn sử dụng
                        {
                            OR: [
                                { max_usage: 0 },
                            ],
                        },
                    ],
                },
            },
            include: {
                coupon: {
                    include: {
                        target_users: { where: { is_active: true } },
                        target_warehouses: { where: { is_active: true } },
                        target_rows: { where: { is_active: true } },
                        target_addons: { where: { is_active: true } },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    // Gift Addon operations
    async createGiftAddons(couponId: string, addonIds: string[]) {
        const data = addonIds.map(addonId => ({
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
            include: { addon: true },
        });
    }

    // Gift Insurance operations
    async createGiftInsurances(couponId: string, insuranceIds: string[]) {
        const data = insuranceIds.map(insuranceId => ({
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
            include: { insurance: true },
        });
    }

    /**
     * Lấy coupon kèm thông tin targets và gifts
     */
    async getCouponWithTargetsAndGifts(id: string) {
        return this.prisma.coupon.findFirst({
            where: { id, is_deleted: false },
            include: {
                target_users: { where: { is_active: true } },
                target_warehouses: { where: { is_active: true } },
                target_rows: { where: { is_active: true } },
                target_addons: { where: { is_active: true } },
                gift_addons: { where: { is_active: true }, include: { addon: true } },
                gift_insurances: { where: { is_active: true }, include: { insurance: true } },
            },
        });
    }
}
