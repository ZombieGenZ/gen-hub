import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { CouponScheduleRepository } from './coupon-schedule.repository';
import { CouponScheduleRunnerService } from './coupon-schedule-runner.service';
import { CouponRepository } from '../coupon/coupon.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateCouponScheduleDto, UpdateCouponScheduleDto, QueryCouponScheduleDto } from './dto';
import { CouponSchedulePeriod } from '@prisma/client';

@Injectable()
export class CouponScheduleService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;
    private readonly weekPrefix: string;
    private readonly monthPrefix: string;
    private readonly quarterPrefix: string;

    constructor(
        private readonly repository: CouponScheduleRepository,
        private readonly couponRepository: CouponRepository,
        @Inject(forwardRef(() => CouponScheduleRunnerService))
        private readonly runnerService: CouponScheduleRunnerService,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_COUPON_SCHEDULE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_COUPON_SCHEDULE_LIST_CACHE_TTL', 60);
        this.weekPrefix = this.configService.get<string>('CODE_WEEK_PREFIX', 'W');
        this.monthPrefix = this.configService.get<string>('CODE_MONTH_PREFIX', 'M');
        this.quarterPrefix = this.configService.get<string>('CODE_QUARTER_PREFIX', 'P');
    }

    private getCacheKey(id: string): string {
        return `coupon-schedule:${id}`;
    }

    private getListCacheKey(query: QueryCouponScheduleDto): string {
        return `coupon-schedule:list:${JSON.stringify(query)}`;
    }

    /**
     * Tính toán next_run_at dựa vào period và các thông số
     */
    private calculateNextRunAt(dto: CreateCouponScheduleDto | UpdateCouponScheduleDto, fromDate?: Date): Date {
        const now = fromDate || new Date();
        const nextRun = new Date(now);

        const hour = dto.scheduled_hour ?? 8;
        const minute = dto.scheduled_minute ?? 0;

        switch (dto.period) {
            case CouponSchedulePeriod.YEARLY:
                // Đặt đến ngày/tháng được chỉ định của năm tới
                nextRun.setMonth((dto.scheduled_month ?? 1) - 1);
                nextRun.setDate(this.adjustDay(dto.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                nextRun.setHours(hour, minute, 0, 0);
                if (nextRun <= now) {
                    nextRun.setFullYear(nextRun.getFullYear() + 1);
                    nextRun.setDate(this.adjustDay(dto.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                }
                break;

            case CouponSchedulePeriod.QUARTERLY:
                // Tính quý tiếp theo
                const currentQuarter = Math.floor(now.getMonth() / 3);
                let nextQuarterMonth = (currentQuarter + 1) * 3;
                if (nextQuarterMonth >= 12) {
                    nextQuarterMonth = 0;
                    nextRun.setFullYear(nextRun.getFullYear() + 1);
                }
                nextRun.setMonth(nextQuarterMonth);
                nextRun.setDate(this.adjustDay(dto.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                nextRun.setHours(hour, minute, 0, 0);
                if (nextRun <= now) {
                    nextRun.setMonth(nextRun.getMonth() + 3);
                    nextRun.setDate(this.adjustDay(dto.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                }
                break;

            case CouponSchedulePeriod.MONTHLY:
                nextRun.setDate(this.adjustDay(dto.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                nextRun.setHours(hour, minute, 0, 0);
                if (nextRun <= now) {
                    nextRun.setMonth(nextRun.getMonth() + 1);
                    nextRun.setDate(this.adjustDay(dto.scheduled_day ?? 1, nextRun.getMonth(), nextRun.getFullYear()));
                }
                break;

            case CouponSchedulePeriod.WEEKLY:
                // Tính thứ tiếp theo
                const targetWeekday = dto.scheduled_weekday ?? 1;
                const currentWeekday = now.getDay();
                let daysUntil = targetWeekday - currentWeekday;
                if (daysUntil <= 0) daysUntil += 7;
                nextRun.setDate(now.getDate() + daysUntil);
                nextRun.setHours(hour, minute, 0, 0);
                break;

            case CouponSchedulePeriod.DAILY:
                nextRun.setHours(hour, minute, 0, 0);
                if (nextRun <= now) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
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
     * Sinh code dựa vào cấu hình
     */
    generateCode(schedule: {
        is_random_code: boolean;
        is_fixed_code: boolean;
        fixed_code_value?: string | null;
        use_suffix: boolean;
        use_prefix: boolean;
        period: CouponSchedulePeriod;
    }): string {
        const now = new Date();
        let affix = '';

        // Tạo affix dựa theo period
        switch (schedule.period) {
            case CouponSchedulePeriod.YEARLY:
                affix = now.getFullYear().toString();
                break;
            case CouponSchedulePeriod.QUARTERLY:
                affix = `${this.quarterPrefix}${Math.floor(now.getMonth() / 3) + 1}`;
                break;
            case CouponSchedulePeriod.MONTHLY:
                affix = `${this.monthPrefix}${now.getMonth() + 1}`;
                break;
            case CouponSchedulePeriod.WEEKLY:
                const weekNumber = this.getWeekNumber(now);
                affix = `${this.weekPrefix}${weekNumber}`;
                break;
            case CouponSchedulePeriod.DAILY:
                const day = now.getDate().toString().padStart(2, '0');
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const year = now.getFullYear();
                affix = `${day}${month}${year}`;
                break;
        }

        if (schedule.is_fixed_code && schedule.fixed_code_value) {
            let code = schedule.fixed_code_value;
            if (schedule.use_prefix) {
                code = affix + code;
            } else if (schedule.use_suffix) {
                code = code + affix;
            }
            return code;
        }

        // Code ngẫu nhiên
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        if (schedule.use_prefix) {
            return affix + randomPart;
        } else if (schedule.use_suffix) {
            return randomPart + affix;
        }
        return randomPart;
    }

    private getWeekNumber(date: Date): number {
        const firstDay = new Date(date.getFullYear(), 0, 1);
        const pastDays = (date.getTime() - firstDay.getTime()) / 86400000;
        return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
    }

    async create(dto: CreateCouponScheduleDto, userId: string, lang: string) {
        // Validate fixed_code nếu sử dụng
        if (dto.is_fixed_code && dto.fixed_code_value) {
            // Kiểm tra xem có Schedule khác đang active với fixed_code này không
            const existingSchedule = await this.repository.findActiveByFixedCode(dto.fixed_code_value);
            if (existingSchedule) {
                throw new ConflictException(
                    this.i18n.t('coupon-schedule.errors.fixed_code_exists', { lang }),
                );
            }

            // Kiểm tra xem có Coupon đang active với code này không
            // Lưu ý: Coupon được tạo từ Schedule này sẽ có starts_at = next_run_at
            // và ends_at tính từ duration
            const existingCoupon = await this.couponRepository.findByCode(dto.fixed_code_value);
            if (existingCoupon && existingCoupon.is_active) {
                throw new ConflictException(
                    this.i18n.t('coupon-schedule.errors.fixed_code_conflicts_with_coupon', { lang }),
                );
            }
        }

        // Validate thời gian áp dụng
        if (!dto.is_permanent_coupon && (!dto.coupon_duration_value || !dto.coupon_duration_unit)) {
            throw new BadRequestException(
                this.i18n.t('coupon-schedule.errors.duration_required', { lang }),
            );
        }

        const nextRunAt = this.calculateNextRunAt(dto);

        // Tách các trường target_*_ids ra khỏi dto để xử lý riêng
        const {
            target_user_ids,
            target_warehouse_ids,
            target_row_ids,
            target_addon_ids,
            ...restDto
        } = dto;

        // Xây dựng data cho Prisma với nested relation
        const createData: any = {
            ...restDto,
            next_run_at: nextRunAt,
            created_by: userId,
        };

        // Chuyển đổi target_user_ids thành nested target_users
        if (target_user_ids && target_user_ids.length > 0) {
            createData.target_users = {
                create: target_user_ids.map(user_id => ({ user_id })),
            };
        }

        // Chuyển đổi target_warehouse_ids thành nested target_warehouses
        if (target_warehouse_ids && target_warehouse_ids.length > 0) {
            createData.target_warehouses = {
                create: target_warehouse_ids.map(warehouse_template_id => ({ warehouse_template_id })),
            };
        }

        // Chuyển đổi target_row_ids thành nested target_rows
        if (target_row_ids && target_row_ids.length > 0) {
            createData.target_rows = {
                create: target_row_ids.map(row_template_id => ({ row_template_id })),
            };
        }

        // Chuyển đổi target_addon_ids thành nested target_addons
        if (target_addon_ids && target_addon_ids.length > 0) {
            createData.target_addons = {
                create: target_addon_ids.map(addon_id => ({ addon_id })),
            };
        }

        const schedule = await this.repository.create(createData);

        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('CouponSchedule', 'CREATE', `Tạo lịch coupon mới: ${schedule.name}`, {
            userId,
            metaData: { scheduleId: schedule.id, name: schedule.name, period: schedule.period },
        });

        // Emit socket event
        this.websocketGateway.server.emit('couponSchedule:created', {
            scheduleId: schedule.id,
            name: schedule.name,
            period: schedule.period,
            nextRunAt: schedule.next_run_at,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Lên lịch cho schedule mới
        this.runnerService.scheduleNextRun(schedule);

        return schedule;
    }

    async findAll(query: QueryCouponScheduleDto) {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const cacheKey = this.getListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = { is_deleted: false };

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
                { fixed_code_value: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.repository.findAll({
                skip: offset,
                take: limit,
                where,
                orderBy: { created_at: 'desc' },
            }),
            this.repository.count(where),
        ]);

        const hasMore = offset + data.length < total;
        const result = { items: data, total, limit, offset, hasMore };

        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async findById(id: string, lang: string) {
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const schedule = await this.repository.findById(id);
        if (!schedule) {
            throw new NotFoundException(
                this.i18n.t('coupon-schedule.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(schedule), this.cacheTTL);

        return schedule;
    }

    async update(id: string, dto: UpdateCouponScheduleDto, userId: string, lang: string) {
        const schedule = await this.repository.findById(id);
        if (!schedule) {
            throw new NotFoundException(
                this.i18n.t('coupon-schedule.errors.not_found', { lang }),
            );
        }

        // Validate fixed_code nếu đang cập nhật
        if (dto.is_fixed_code && dto.fixed_code_value && dto.fixed_code_value !== schedule.fixed_code_value) {
            // Kiểm tra với CouponSchedule khác
            const existingSchedule = await this.repository.findActiveByFixedCode(dto.fixed_code_value, id);
            if (existingSchedule) {
                throw new ConflictException(
                    this.i18n.t('coupon-schedule.errors.fixed_code_exists', { lang }),
                );
            }

            // Kiểm tra với Coupon đang active
            const existingCoupon = await this.couponRepository.findByCode(dto.fixed_code_value);
            if (existingCoupon && existingCoupon.is_active) {
                throw new ConflictException(
                    this.i18n.t('coupon-schedule.errors.fixed_code_conflicts_with_coupon', { lang }),
                );
            }
        }

        // Tính lại next_run_at nếu thay đổi period hoặc schedule config
        let nextRunAt = schedule.next_run_at;
        if (dto.period || dto.scheduled_day !== undefined || dto.scheduled_month !== undefined ||
            dto.scheduled_weekday !== undefined || dto.scheduled_hour !== undefined || dto.scheduled_minute !== undefined) {
            const mergedDto = { ...schedule, ...dto } as CreateCouponScheduleDto;
            nextRunAt = this.calculateNextRunAt(mergedDto);
        }

        const updated = await this.repository.update(id, {
            ...dto,
            next_run_at: nextRunAt,
            updated_by: userId,
        });

        await this.invalidateCache(id);
        await this.invalidateListCache();

        this.systemLogService.info('CouponSchedule', 'UPDATE', `Cập nhật lịch coupon: ${updated.name}`, {
            userId,
            metaData: { scheduleId: id, updatedFields: Object.keys(dto) },
        });

        this.websocketGateway.server.emit('couponSchedule:updated', {
            scheduleId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Cập nhật lịch
        this.runnerService.scheduleNextRun(updated);

        return updated;
    }

    async delete(id: string, userId: string, lang: string) {
        const schedule = await this.repository.findById(id);
        if (!schedule) {
            throw new NotFoundException(
                this.i18n.t('coupon-schedule.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        await this.invalidateCache(id);
        await this.invalidateListCache();

        this.systemLogService.info('CouponSchedule', 'DELETE', `Xóa lịch coupon: ${schedule.name}`, {
            userId,
            metaData: { scheduleId: id, name: schedule.name },
        });

        this.websocketGateway.server.emit('couponSchedule:deleted', {
            scheduleId: id,
            name: schedule.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Hủy lịch
        this.runnerService.cancelSchedule(id);
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const schedules = await this.repository.findByIds(ids);
        if (schedules.length === 0) {
            throw new NotFoundException(
                this.i18n.t('coupon-schedule.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        this.websocketGateway.server.emit('couponSchedule:deletedMany', {
            scheduleIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        schedules.forEach(s => {
            this.systemLogService.info('CouponSchedule', 'DELETE', `Xóa lịch coupon: ${s.name}`, {
                userId,
                metaData: { scheduleId: s.id, name: s.name },
            });
            // Hủy lịch
            this.runnerService.cancelSchedule(s.id);
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('coupon-schedule:list:*');
    }
}
