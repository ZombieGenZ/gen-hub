import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { WarehouseVisitRepository } from './warehouse-visit.repository';
import { CreateWarehouseVisitBookingDto } from './dto/create-warehouse-visit-booking.dto';
import { UpdateWarehouseVisitBookingDto } from './dto/update-warehouse-visit-booking.dto';
import { WarehouseVisitBooking, Prisma } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class WarehouseVisitService {
    constructor(
        private readonly warehouseVisitRepository: WarehouseVisitRepository,
        private readonly i18n: I18nService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) { }

    async createBooking(dto: CreateWarehouseVisitBookingDto, userId: string | null): Promise<WarehouseVisitBooking> {
        // Generate code
        const prefix = this.configService.get<string>('WAREHOUSE_VISIT_CODE_PREFIX', 'VISIT');
        const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const data: Prisma.WarehouseVisitBookingUncheckedCreateInput = {
            ...dto,
            visit_date: new Date(dto.visit_date),
            code,
            user_id: userId,
            created_by: userId || 'SYSTEM',
        };

        const newBooking = await this.warehouseVisitRepository.createBooking(data);

        // Invalidate list cache
        const listPrefix = this.configService.get<string>('REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX', 'warehouse:visit:list');
        await this.redisService.delByPattern(`${listPrefix}:*`);

        return newBooking;
    }

    async findAllBookings(query: any): Promise<IPaginatedResponse<WarehouseVisitBooking>> {
        const cacheKey = this.redisService.getWarehouseVisitListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.warehouseVisitRepository.findAllBookings(query);

        // Set cache
        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_VISIT_LIST_CACHE_TTL', 60);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return result;
    }

    async findBookingById(id: string, lang: string): Promise<WarehouseVisitBooking> {
        // Cache check
        const cached = await this.redisService.getWarehouseVisitCache<WarehouseVisitBooking>(id);
        if (cached) return cached;

        const booking = await this.warehouseVisitRepository.findBookingById(id);
        if (!booking) {
            throw new NotFoundException(await this.i18n.translate('warehouse_visit.errors.booking_not_found', { lang }));
        }

        // Set cache
        await this.redisService.setWarehouseVisitCache(id, booking);

        return booking;
    }

    async updateBooking(id: string, dto: UpdateWarehouseVisitBookingDto, userId: string, lang: string): Promise<WarehouseVisitBooking> {
        const booking = await this.findBookingById(id, lang);

        const updateData: Prisma.WarehouseVisitBookingUpdateInput = {
            ...dto,
            ...(dto.visit_date && { visit_date: new Date(dto.visit_date) }),
            updated_by: userId,
        };

        // Handle Status Transitions
        if (dto.status) {
            if (dto.status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
                updateData.confirmed_at = new Date();
                updateData.confirmed_by = userId;
            } else if (dto.status === 'CANCELLED' && booking.status !== 'CANCELLED') {
                updateData.cancelled_at = new Date();
                updateData.cancelled_by = userId;
            } else if (dto.status === 'COMPLETED' && booking.status !== 'COMPLETED') {
                updateData.completed_at = new Date();
                updateData.completed_by = userId;
            }
        }

        const updated = await this.warehouseVisitRepository.updateBooking(id, updateData);

        // Invalidate cache
        await this.redisService.invalidateWarehouseVisitCache(id);

        return updated;
    }

    async rescheduleBooking(id: string, newDate: string, newTimeStart: string, newTimeEnd: string | undefined, userId: string, lang: string, reason?: string): Promise<WarehouseVisitBooking> {
        const oldBooking = await this.findBookingById(id, lang);

        if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(oldBooking.status)) {
            // Cannot reschedule finalized bookings? Or maybe allowed? assuming only PENDING/CONFIRMED can be rescheduled
            // Let's assume flexibly for now unless spec says otherwise.
        }

        // Create new booking
        const prefix = this.configService.get<string>('WAREHOUSE_VISIT_CODE_PREFIX', 'VISIT');
        const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newBookingData: Prisma.WarehouseVisitBookingUncheckedCreateInput = {
            warehouse_template_id: oldBooking.warehouse_template_id,
            organization_id: oldBooking.organization_id,
            visitor_name: oldBooking.visitor_name,
            visitor_email: oldBooking.visitor_email,
            visitor_phone: oldBooking.visitor_phone,
            visitor_company: oldBooking.visitor_company,
            visitor_position: oldBooking.visitor_position,
            purpose: oldBooking.purpose,
            purpose_details: oldBooking.purpose_details,
            number_of_visitors: oldBooking.number_of_visitors,

            visit_date: new Date(newDate), // ISO Date string
            visit_time_start: newTimeStart,
            visit_time_end: newTimeEnd,

            created_by: userId,
            user_id: oldBooking.user_id,
            code,

            rescheduled_from_id: oldBooking.id,
            status: 'PENDING', // New booking starts as PENDING? or CONFIRMED? Let's say PENDING
        };

        const newBooking = await this.warehouseVisitRepository.createBooking(newBookingData);

        // Update old booking
        await this.warehouseVisitRepository.updateBooking(oldBooking.id, {
            status: 'RESCHEDULED',
            rescheduled_at: new Date(),
            rescheduled_by: userId,
            reschedule_reason: reason,
        });

        // Invalidate cache
        await this.redisService.invalidateWarehouseVisitCache(oldBooking.id);
        await this.redisService.invalidateWarehouseVisitCache(newBooking.id); // Probably redundant but safe

        // Invalidate list cache
        const listPrefix = this.configService.get<string>('REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX', 'warehouse:visit:list');
        await this.redisService.delByPattern(`${listPrefix}:*`);

        return newBooking;
    }

    async softDeleteBooking(id: string, userId: string, lang: string): Promise<void> {
        const booking = await this.findBookingById(id, lang);
        await this.warehouseVisitRepository.softDeleteBooking(id, userId);

        // Invalidate cache
        await this.redisService.invalidateWarehouseVisitCache(id);
        // Invalidate list cache
        const listPrefix = this.configService.get<string>('REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX', 'warehouse:visit:list');
        await this.redisService.delByPattern(`${listPrefix}:*`);
    }
}
