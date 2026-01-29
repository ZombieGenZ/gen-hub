import { Injectable, NotFoundException } from '@nestjs/common';
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
    ) { }

    async createBooking(dto: CreateWarehouseVisitBookingDto, userId: string | null): Promise<WarehouseVisitBooking> {
        // Generate code
        const code = `VISIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const data: Prisma.WarehouseVisitBookingUncheckedCreateInput = {
            ...dto,
            visit_date: new Date(dto.visit_date),
            code,
            user_id: userId,
            created_by: userId || 'SYSTEM',
        };

        return this.warehouseVisitRepository.createBooking(data);
    }

    async findAllBookings(query: any): Promise<IPaginatedResponse<WarehouseVisitBooking>> {
        return this.warehouseVisitRepository.findAllBookings(query);
    }

    async findBookingById(id: string, lang: string): Promise<WarehouseVisitBooking> {
        const booking = await this.warehouseVisitRepository.findBookingById(id);
        if (!booking) {
            throw new NotFoundException(await this.i18n.translate('warehouse_visit.errors.booking_not_found', { lang }));
        }
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

        return this.warehouseVisitRepository.updateBooking(id, updateData);
    }

    async rescheduleBooking(id: string, newDate: string, newTimeStart: string, newTimeEnd: string | undefined, userId: string, lang: string, reason?: string): Promise<WarehouseVisitBooking> {
        const oldBooking = await this.findBookingById(id, lang);

        if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(oldBooking.status)) {
            // Cannot reschedule finalized bookings? Or maybe allowed? assuming only PENDING/CONFIRMED can be rescheduled
            // Let's assume flexibly for now unless spec says otherwise.
        }

        // Create new booking
        const code = `VISIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

        return newBooking;
    }

    async softDeleteBooking(id: string, userId: string, lang: string): Promise<void> {
        const booking = await this.findBookingById(id, lang);
        await this.warehouseVisitRepository.softDeleteBooking(id, userId);
    }
}
