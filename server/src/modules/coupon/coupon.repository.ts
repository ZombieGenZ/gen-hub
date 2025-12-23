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
}
