import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CouponScheduleRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.CouponScheduleCreateInput) {
        return this.prisma.couponSchedule.create({ data });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.CouponScheduleWhereInput;
        orderBy?: Prisma.CouponScheduleOrderByWithRelationInput;
    }) {
        const { skip, take, where, orderBy } = params;
        return this.prisma.couponSchedule.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }

    async count(where?: Prisma.CouponScheduleWhereInput) {
        return this.prisma.couponSchedule.count({ where });
    }

    async findById(id: string) {
        return this.prisma.couponSchedule.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findByName(name: string, excludeId?: string) {
        return this.prisma.couponSchedule.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.couponSchedule.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    /**
     * Tìm các schedule có fixed_code trùng và đang active
     */
    async findActiveByFixedCode(fixedCode: string, excludeId?: string) {
        return this.prisma.couponSchedule.findFirst({
            where: {
                fixed_code_value: fixedCode,
                is_fixed_code: true,
                is_active: true,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    /**
     * Lấy các schedule cần chạy (next_run_at <= now và is_active)
     */
    async findDueSchedules() {
        return this.prisma.couponSchedule.findMany({
            where: {
                is_active: true,
                is_deleted: false,
                next_run_at: {
                    lte: new Date(),
                },
            },
        });
    }

    async update(id: string, data: Prisma.CouponScheduleUpdateInput) {
        return this.prisma.couponSchedule.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string, userId: string) {
        return this.prisma.couponSchedule.update({
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
        return this.prisma.couponSchedule.updateMany({
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
     * Tạo Coupon từ schedule
     */
    async createCouponFromSchedule(scheduleId: string, data: Prisma.CouponCreateInput) {
        return this.prisma.coupon.create({
            data: {
                ...data,
                schedule: {
                    connect: { id: scheduleId },
                },
            },
        });
    }

    // Gift Addon operations
    async createGiftAddons(scheduleId: string, addonIds: string[]) {
        const data = addonIds.map(addonId => ({
            coupon_schedule_id: scheduleId,
            addon_id: addonId,
        }));
        return this.prisma.couponScheduleGiftAddon.createMany({ data });
    }

    async deleteGiftAddons(scheduleId: string) {
        return this.prisma.couponScheduleGiftAddon.deleteMany({
            where: { coupon_schedule_id: scheduleId },
        });
    }

    async getGiftAddons(scheduleId: string) {
        return this.prisma.couponScheduleGiftAddon.findMany({
            where: { coupon_schedule_id: scheduleId, is_active: true },
            include: { addon: true },
        });
    }

    // Gift Insurance operations
    async createGiftInsurances(scheduleId: string, insuranceIds: string[]) {
        const data = insuranceIds.map(insuranceId => ({
            coupon_schedule_id: scheduleId,
            insurance_id: insuranceId,
        }));
        return this.prisma.couponScheduleGiftInsurance.createMany({ data });
    }

    async deleteGiftInsurances(scheduleId: string) {
        return this.prisma.couponScheduleGiftInsurance.deleteMany({
            where: { coupon_schedule_id: scheduleId },
        });
    }

    async getGiftInsurances(scheduleId: string) {
        return this.prisma.couponScheduleGiftInsurance.findMany({
            where: { coupon_schedule_id: scheduleId, is_active: true },
            include: { insurance: true },
        });
    }

    /**
     * Lấy schedule kèm thông tin targets và gifts
     */
    async getScheduleWithTargetsAndGifts(id: string) {
        return this.prisma.couponSchedule.findFirst({
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
