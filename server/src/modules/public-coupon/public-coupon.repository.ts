import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PublicCouponRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách coupon công khai còn hiệu lực
     */
    async findAllPublic(params: {
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

    async countPublic(where?: Prisma.CouponWhereInput) {
        return this.prisma.coupon.count({ where });
    }

    /**
     * Tìm coupon theo ID (cho public APIs)
     */
    async findById(id: string) {
        return this.prisma.coupon.findFirst({
            where: { id, is_deleted: false, is_active: true },
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
                target_insurances: { where: { is_active: true } },
            },
        });
    }

    /**
     * Lấy coupon kèm thông tin targets và gifts
     */
    async getCouponWithTargetsAndGifts(id: string) {
        return this.prisma.coupon.findFirst({
            where: { id, is_deleted: false, is_active: true },
            include: {
                target_users: { where: { is_active: true } },
                target_warehouses: { where: { is_active: true } },
                target_rows: { where: { is_active: true } },
                target_addons: { where: { is_active: true } },
                target_insurances: { where: { is_active: true } },
                gift_addons: { where: { is_active: true }, include: { addon: true } },
                gift_insurances: { where: { is_active: true }, include: { insurance: true } },
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
                        // Lưu ý: Prisma không hỗ trợ so sánh trực tiếp giữa 2 fields trong where clause
                        // Sẽ filter trong service nếu max_usage > 0
                        {
                            OR: [
                                { max_usage: 0 }, // Unlimited
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
                        target_insurances: { where: { is_active: true } },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
}
