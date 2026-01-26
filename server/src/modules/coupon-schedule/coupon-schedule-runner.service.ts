import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CouponScheduleRepository } from './repositories/coupon-schedule.repository';
import { CouponScheduleService } from './coupon-schedule.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CouponSchedulePeriod, CouponDurationUnit } from '@prisma/client';

/**
 * Service tự động tạo Coupon theo lịch
 * - Khi server khởi động: kiểm tra và thực hiện các schedule đã quá hạn
 * - Lên lịch động cho các schedule tiếp theo thay vì polling
 */
@Injectable()
export class CouponScheduleRunnerService implements OnModuleInit {
    private readonly logger = new Logger(CouponScheduleRunnerService.name);

    constructor(
        private readonly repository: CouponScheduleRepository,
        @Inject(forwardRef(() => CouponScheduleService))
        private readonly scheduleService: CouponScheduleService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) { }

    /**
     * Khi module khởi động: kiểm tra ngay các schedule quá hạn và lên lịch cho các schedule tiếp theo
     */
    async onModuleInit() {
        this.logger.log('🚀 Khởi tạo CouponSchedule Runner...');

        try {
            // Kiểm tra và thực hiện các schedule đã quá hạn
            await this.processDueSchedules();

            // Lên lịch cho tất cả các schedule active
            await this.scheduleAllActive();

            this.logger.log('✅ CouponSchedule Runner đã sẵn sàng');
        } catch (error) {
            this.logger.error(`❌ Lỗi khởi tạo CouponSchedule Runner: ${error}`);
        }
    }

    /**
     * Xử lý các schedule đã quá hạn (next_run_at <= now)
     */
    private async processDueSchedules() {
        const dueSchedules = await this.repository.findDueSchedules();

        if (dueSchedules.length === 0) {
            this.logger.log('Không có schedule nào quá hạn cần xử lý');
            return;
        }

        this.logger.log(`Tìm thấy ${dueSchedules.length} schedule quá hạn, đang xử lý...`);

        for (const schedule of dueSchedules) {
            try {
                await this.executeSchedule(schedule);
                // Sau khi thực hiện, lên lịch cho lần tiếp theo
                this.scheduleNextRun(schedule);
            } catch (error) {
                this.logger.error(`Lỗi khi thực thi schedule ${schedule.id}: ${error}`);
                this.systemLogService.error('CouponScheduleRunner', 'EXECUTE_FAILED', `Lỗi thực thi schedule: ${schedule.name}`, {
                    metaData: { scheduleId: schedule.id, error: String(error) },
                });
            }
        }
    }

    /**
     * Lên lịch cho tất cả các schedule active
     */
    private async scheduleAllActive() {
        const schedules = await this.repository.findAll({
            where: { is_active: true, is_deleted: false },
        });

        for (const schedule of schedules) {
            if (schedule.next_run_at && schedule.next_run_at > new Date()) {
                this.scheduleNextRun(schedule);
            }
        }

        this.logger.log(`Đã lên lịch cho ${schedules.length} schedule`);
    }

    /**
     * Lên lịch động cho một schedule
     */
    scheduleNextRun(schedule: any) {
        const timeoutName = `coupon-schedule-${schedule.id}`;

        // Xóa timeout cũ nếu có
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại, bỏ qua
        }

        if (!schedule.next_run_at || !schedule.is_active) {
            return;
        }

        const now = new Date();
        const delay = schedule.next_run_at.getTime() - now.getTime();

        if (delay <= 0) {
            // Đã quá hạn, thực hiện ngay
            this.executeSchedule(schedule).then(() => {
                this.scheduleNextRun(schedule);
            });
            return;
        }

        // Giới hạn delay tối đa (setTimeout có giới hạn ~24.8 ngày)
        const maxDelay = 2147483647; // ~24.8 ngày
        const actualDelay = Math.min(delay, maxDelay);

        const timeout = setTimeout(async () => {
            if (delay > maxDelay) {
                // Nếu delay vượt quá giới hạn, lên lịch lại
                this.scheduleNextRun(schedule);
            } else {
                // Thực hiện schedule
                try {
                    await this.executeSchedule(schedule);
                    // Lấy thông tin schedule mới nhất và lên lịch tiếp
                    const updatedSchedule = await this.repository.findById(schedule.id);
                    if (updatedSchedule && updatedSchedule.is_active) {
                        this.scheduleNextRun(updatedSchedule);
                    }
                } catch (error) {
                    this.logger.error(`Lỗi khi thực thi scheduled job ${schedule.id}: ${error}`);
                }
            }
        }, actualDelay);

        this.schedulerRegistry.addTimeout(timeoutName, timeout);

        const runAt = new Date(now.getTime() + actualDelay);
        this.logger.log(`📅 Đã lên lịch: ${schedule.name} - chạy lúc ${runAt.toLocaleString()}`);
    }

    /**
     * Hủy lịch của một schedule (khi bị xóa hoặc deactivate)
     */
    cancelSchedule(scheduleId: string) {
        const timeoutName = `coupon-schedule-${scheduleId}`;
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
            this.logger.log(`Đã hủy lịch cho schedule ${scheduleId}`);
        } catch {
            // Timeout không tồn tại
        }
    }

    /**
     * Thực thi một schedule: tạo Coupon và cập nhật next_run_at
     */
    private async executeSchedule(schedule: any) {
        // Sinh code cho Coupon
        const code = this.scheduleService.generateCode(schedule);

        // Tính thời gian hiệu lực
        const now = new Date();
        let startsAt = now;
        let endsAt: Date | null = null;

        if (!schedule.is_permanent_coupon && schedule.coupon_duration_value && schedule.coupon_duration_unit) {
            endsAt = this.calculateEndDate(now, schedule.coupon_duration_value, schedule.coupon_duration_unit);
        }

        // Tạo Coupon mới
        const couponData = {
            name: `${schedule.name} - ${this.formatDate(now)}`,
            description: schedule.description,
            code,
            discount_value: schedule.discount_value,
            discount_type: schedule.discount_type,
            require_min_warehouses: schedule.require_min_warehouses,
            min_warehouses: schedule.min_warehouses,
            require_min_rows: schedule.require_min_rows,
            min_rows: schedule.min_rows,
            require_min_order_amount: schedule.require_min_order_amount,
            min_order_amount: schedule.min_order_amount,
            require_min_rental_duration: schedule.require_min_rental_duration,
            min_rental_duration_value: schedule.min_rental_duration_value,
            min_rental_duration_unit: schedule.min_rental_duration_unit,
            is_unlimited_discount: schedule.is_unlimited_discount,
            max_discount_amount: schedule.max_discount_amount,
            is_permanent: schedule.is_permanent_coupon,
            starts_at: startsAt,
            ends_at: endsAt,
            max_usage: schedule.max_usage,
            is_public: schedule.is_public,
            apply_for_first_rental: schedule.apply_for_first_rental,
            apply_for_renewal: schedule.apply_for_renewal,
            // Kế thừa stackability từ schedule
            is_unlimited_stack: schedule.is_unlimited_stack ?? false,
            max_stack_count: schedule.max_stack_count,
            is_active: true,
            created_by: schedule.created_by,
        };

        const createdCoupon = await this.repository.createCouponFromSchedule(schedule.id, couponData);

        // Tính next_run_at mới
        const nextRunAt = this.calculateNextRunAt(schedule);

        // Cập nhật schedule
        await this.repository.update(schedule.id, {
            last_run_at: now,
            next_run_at: nextRunAt,
        });

        // Cập nhật schedule object để dùng cho lần lên lịch tiếp theo
        schedule.next_run_at = nextRunAt;
        schedule.last_run_at = now;

        this.logger.log(`✅ Đã tạo Coupon ${createdCoupon.code} từ schedule ${schedule.name}`);

        // Ghi log
        this.systemLogService.info('CouponScheduleRunner', 'EXECUTED', `Đã tạo Coupon từ schedule: ${schedule.name}`, {
            metaData: {
                scheduleId: schedule.id,
                couponId: createdCoupon.id,
                couponCode: createdCoupon.code,
                nextRunAt,
            },
        });

        // Emit socket event
        this.websocketGateway.server.emit('couponSchedule:executed', {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            couponId: createdCoupon.id,
            couponCode: createdCoupon.code,
            nextRunAt: nextRunAt?.toISOString(),
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Tính ngày kết thúc dựa vào duration
     */
    private calculateEndDate(startDate: Date, value: number, unit: CouponDurationUnit): Date {
        const endDate = new Date(startDate);

        switch (unit) {
            case CouponDurationUnit.HOUR:
                endDate.setHours(endDate.getHours() + value);
                break;
            case CouponDurationUnit.DAY:
                endDate.setDate(endDate.getDate() + value);
                break;
            case CouponDurationUnit.WEEK:
                endDate.setDate(endDate.getDate() + value * 7);
                break;
            case CouponDurationUnit.MONTH:
                endDate.setMonth(endDate.getMonth() + value);
                break;
            case CouponDurationUnit.YEAR:
                endDate.setFullYear(endDate.getFullYear() + value);
                break;
        }

        return endDate;
    }

    /**
     * Tính next_run_at dựa vào period
     */
    private calculateNextRunAt(schedule: any): Date {
        const now = new Date();
        const nextRun = new Date(now);

        const hour = schedule.scheduled_hour ?? 8;
        const minute = schedule.scheduled_minute ?? 0;

        switch (schedule.period) {
            case CouponSchedulePeriod.YEARLY:
                nextRun.setFullYear(nextRun.getFullYear() + 1);
                nextRun.setMonth((schedule.scheduled_month ?? 1) - 1);
                nextRun.setDate(this.adjustDay(schedule.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                nextRun.setHours(hour, minute, 0, 0);
                break;

            case CouponSchedulePeriod.QUARTERLY:
                nextRun.setMonth(nextRun.getMonth() + 3);
                nextRun.setDate(this.adjustDay(schedule.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                nextRun.setHours(hour, minute, 0, 0);
                break;

            case CouponSchedulePeriod.MONTHLY:
                nextRun.setMonth(nextRun.getMonth() + 1);
                nextRun.setDate(this.adjustDay(schedule.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                nextRun.setHours(hour, minute, 0, 0);
                break;

            case CouponSchedulePeriod.WEEKLY:
                nextRun.setDate(nextRun.getDate() + 7);
                nextRun.setHours(hour, minute, 0, 0);
                break;

            case CouponSchedulePeriod.DAILY:
                nextRun.setDate(nextRun.getDate() + 1);
                nextRun.setHours(hour, minute, 0, 0);
                break;
        }

        return nextRun;
    }

    /**
     * Điều chỉnh ngày cho trường hợp đặc biệt (29/2, ngày 31)
     */
    private adjustDay(day: number, month: number, year: number): number {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Math.min(day, daysInMonth);
    }

    /**
     * Format ngày thành chuỗi ngắn gọn
     */
    private formatDate(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}
