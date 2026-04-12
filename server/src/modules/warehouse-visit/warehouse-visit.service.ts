import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { WarehouseVisitRepository } from './warehouse-visit.repository';
import { CreateWarehouseVisitBookingDto } from './dto/create-warehouse-visit-booking.dto';
import { UpdateWarehouseVisitBookingDto } from './dto/update-warehouse-visit-booking.dto';
import {
  ApproveWarehouseVisitBookingDto,
  WarehouseVisitApprovalAction,
} from './dto/approve-warehouse-visit-booking.dto';
import {
  ContactChannel,
  MessageSender,
  MessageType,
  WarehouseVisitBooking,
  Prisma,
} from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { I18nService } from 'nestjs-i18n';
import { EmailService } from '../notification/email.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WarehouseVisitService {
  private readonly logger = new Logger(WarehouseVisitService.name);

  constructor(
    private readonly warehouseVisitRepository: WarehouseVisitRepository,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly prisma: PrismaService,
  ) {}

  async createBooking(
    dto: CreateWarehouseVisitBookingDto,
    userId: string | null,
  ): Promise<WarehouseVisitBooking> {
    const normalizedStart = this.normalizeTime(dto.visit_time_start);
    const normalizedEnd = this.normalizeTime(
      dto.visit_time_end || this.buildVisitEndTime(normalizedStart),
    );

    await this.ensureVisitSlotAvailable({
      warehouseTemplateId: dto.warehouse_template_id,
      visitDate: dto.visit_date,
      visitTimeStart: normalizedStart,
      visitTimeEnd: normalizedEnd,
    });

    // Generate code
    const prefix = this.configService.get<string>(
      'WAREHOUSE_VISIT_CODE_PREFIX',
      'VISIT',
    );
    const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const data: Prisma.WarehouseVisitBookingUncheckedCreateInput = {
      ...dto,
      visit_date: new Date(dto.visit_date),
      visit_time_start: normalizedStart,
      visit_time_end: normalizedEnd,
      code,
      user_id: userId,
      created_by: userId || 'SYSTEM',
    };

    const newBooking = await this.warehouseVisitRepository.createBooking(data);

    // Invalidate list cache
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX',
      'warehouse:visit:list',
    );
    await this.redisService.delByPattern(`${listPrefix}:*`);

    // Emit websocket event
    this.websocketGateway.emitWarehouseVisitCreated(
      newBooking.id,
      newBooking.warehouse_template_id,
      userId || 'SYSTEM',
    );

    return newBooking;
  }

  async findAllBookings(
    query: Record<string, unknown>,
    ownerId?: string,
  ): Promise<IPaginatedResponse<WarehouseVisitBooking>> {
    const cacheKey =
      this.redisService.getWarehouseVisitListCacheKey(query) +
      (ownerId ? `:user:${ownerId}` : ':all');
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as IPaginatedResponse<WarehouseVisitBooking>;
    }

    const result = await this.warehouseVisitRepository.findAllBookings({
      ...query,
      createdBy: ownerId,
    });

    // Set cache
    const ttl = this.configService.get<number>(
      'REDIS_WAREHOUSE_VISIT_LIST_CACHE_TTL',
      60,
    );
    await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

    return result;
  }

  async findBookingById(
    id: string,
    lang: string,
    ownerId?: string,
  ): Promise<WarehouseVisitBooking> {
    // Cache check
    const cached =
      await this.redisService.getWarehouseVisitCache<WarehouseVisitBooking>(id);
    if (cached) {
      // Check ownership if ownerId is provided
      if (ownerId && cached.created_by !== ownerId) {
        throw new NotFoundException(
          this.i18n.translate('warehouse_visit.errors.booking_not_found', {
            lang,
          }),
        );
      }
      return cached;
    }

    const booking = await this.warehouseVisitRepository.findBookingById(id);
    if (!booking) {
      throw new NotFoundException(
        this.i18n.translate('warehouse_visit.errors.booking_not_found', {
          lang,
        }),
      );
    }

    // Check ownership if ownerId is provided
    if (ownerId && booking.created_by !== ownerId) {
      throw new NotFoundException(
        this.i18n.translate('warehouse_visit.errors.booking_not_found', {
          lang,
        }),
      );
    }

    // Set cache
    await this.redisService.setWarehouseVisitCache(id, booking);

    return booking;
  }

  async updateBooking(
    id: string,
    dto: UpdateWarehouseVisitBookingDto,
    userId: string,
    lang: string,
    ownerId?: string,
  ): Promise<WarehouseVisitBooking> {
    const booking = await this.findBookingById(id, lang, ownerId);

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

    const updated = await this.warehouseVisitRepository.updateBooking(
      id,
      updateData,
    );

    // Invalidate cache
    await this.redisService.invalidateWarehouseVisitCache(id);

    if (dto.status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
      await this.sendVisitConfirmedMessage(updated);
    }

    return updated;
  }

  async approveBooking(
    id: string,
    dto: ApproveWarehouseVisitBookingDto,
    userId: string,
    lang: string,
  ): Promise<WarehouseVisitBooking> {
    const booking = await this.findBookingById(id, lang);
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        this.i18n.translate('warehouse_visit.errors.booking_must_be_pending', {
          lang,
        }),
      );
    }

    let updated: WarehouseVisitBooking;
    if (dto.action === WarehouseVisitApprovalAction.APPROVE) {
      updated = await this.warehouseVisitRepository.updateBooking(id, {
        status: 'CONFIRMED',
        confirmed_at: new Date(),
        confirmed_by: userId,
        confirmation_notes: dto.confirmation_notes,
        updated_by: userId,
      });

      if (updated.visitor_email) {
        await this.emailService.sendVisitBookingApprovedEmail(
          updated.visitor_email,
          updated.visitor_name,
          updated.code,
          '',
          updated.visit_date,
          updated.visit_time_start,
          lang,
        );
      }

      await this.sendVisitConfirmedMessage(updated);
    } else {
      updated = await this.warehouseVisitRepository.updateBooking(id, {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancel_reason: dto.rejection_reason,
        updated_by: userId,
      });

      if (updated.visitor_email) {
        await this.emailService.sendVisitBookingRejectedEmail(
          updated.visitor_email,
          updated.visitor_name,
          updated.code,
          dto.rejection_reason,
          lang,
        );
      }
    }

    await this.redisService.invalidateWarehouseVisitCache(id);
    return updated;
  }

  async rescheduleBooking(
    id: string,
    newDate: string,
    newTimeStart: string,
    newTimeEnd: string | undefined,
    userId: string,
    lang: string,
    reason?: string,
    ownerId?: string,
  ): Promise<WarehouseVisitBooking> {
    const oldBooking = await this.findBookingById(id, lang, ownerId);
    const normalizedStart = this.normalizeTime(newTimeStart);
    const normalizedEnd = this.normalizeTime(
      newTimeEnd || this.buildVisitEndTime(normalizedStart),
    );

    await this.ensureVisitSlotAvailable({
      warehouseTemplateId: oldBooking.warehouse_template_id,
      visitDate: newDate,
      visitTimeStart: normalizedStart,
      visitTimeEnd: normalizedEnd,
      excludeBookingId: oldBooking.id,
    });

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(oldBooking.status)) {
      // Cannot reschedule finalized bookings? Or maybe allowed? assuming only PENDING/CONFIRMED can be rescheduled
      // Let's assume flexibly for now unless spec says otherwise.
    }

    // Create new booking
    const prefix = this.configService.get<string>(
      'WAREHOUSE_VISIT_CODE_PREFIX',
      'VISIT',
    );
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
      visit_time_start: normalizedStart,
      visit_time_end: normalizedEnd,

      created_by: userId,
      user_id: oldBooking.user_id,
      code,

      rescheduled_from_id: oldBooking.id,
      status: 'PENDING', // New booking starts as PENDING? or CONFIRMED? Let's say PENDING
    };

    const newBooking =
      await this.warehouseVisitRepository.createBooking(newBookingData);

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
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX',
      'warehouse:visit:list',
    );
    await this.redisService.delByPattern(`${listPrefix}:*`);

    return newBooking;
  }

  @Cron('0 7-11 * * *')
  async sendMorningVisitReminders(): Promise<void> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.warehouseVisitBooking.findMany({
      where: {
        is_deleted: false,
        status: 'CONFIRMED',
        reminder_sent_at: null,
        visit_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        warehouse_template: {
          include: {
            ward: {
              include: {
                province: true,
              },
            },
          },
        },
      },
    });

    for (const booking of bookings) {
      try {
        await this.sendMorningDirectionMessage(booking);

        await this.prisma.warehouseVisitBooking.update({
          where: { id: booking.id },
          data: {
            reminder_sent_at: new Date(),
            updated_by: 'SYSTEM',
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send morning reminder for booking ${booking.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  async softDeleteBooking(
    id: string,
    userId: string,
    lang: string,
    ownerId?: string,
  ): Promise<void> {
    await this.findBookingById(id, lang, ownerId);
    await this.warehouseVisitRepository.softDeleteBooking(id, userId);

    // Invalidate cache
    await this.redisService.invalidateWarehouseVisitCache(id);
    // Invalidate list cache
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX',
      'warehouse:visit:list',
    );
    await this.redisService.delByPattern(`${listPrefix}:*`);
  }

  private normalizeTime(value: string): string {
    const [hourRaw, minuteRaw] = (value || '').split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return value;
    }

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private buildVisitEndTime(
    startTime: string,
    durationMinutes: number = 60,
  ): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return startTime;
    }

    const date = new Date();
    date.setHours(hours, minutes + durationMinutes, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = this.normalizeTime(time).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return 0;
    }
    return hours * 60 + minutes;
  }

  private hasTimeOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    const aStart = this.toMinutes(startA);
    const aEnd = this.toMinutes(endA);
    const bStart = this.toMinutes(startB);
    const bEnd = this.toMinutes(endB);

    return aStart < bEnd && bStart < aEnd;
  }

  private getUtcDateRange(dateStr: string): { start: Date; end: Date } {
    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return { start, end };
  }

  private formatDateVi(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) {
      return dateStr;
    }
    return `${day}/${month}/${year}`;
  }

  private async ensureVisitSlotAvailable(params: {
    warehouseTemplateId: string;
    visitDate: string;
    visitTimeStart: string;
    visitTimeEnd: string;
    excludeBookingId?: string;
  }): Promise<void> {
    const { start, end } = this.getUtcDateRange(params.visitDate);

    const existingBookings = await this.prisma.warehouseVisitBooking.findMany({
      where: {
        is_deleted: false,
        warehouse_template_id: params.warehouseTemplateId,
        visit_date: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        ...(params.excludeBookingId
          ? {
              id: {
                not: params.excludeBookingId,
              },
            }
          : {}),
      },
      select: {
        visit_time_start: true,
        visit_time_end: true,
      },
    });

    const conflict = existingBookings.find((booking) => {
      const existingStart = this.normalizeTime(booking.visit_time_start);
      const existingEnd = this.normalizeTime(
        booking.visit_time_end || this.buildVisitEndTime(existingStart),
      );

      return this.hasTimeOverlap(
        this.normalizeTime(params.visitTimeStart),
        this.normalizeTime(params.visitTimeEnd),
        existingStart,
        existingEnd,
      );
    });

    if (!conflict) {
      return;
    }

    const duration = Math.max(
      30,
      this.toMinutes(params.visitTimeEnd) -
        this.toMinutes(params.visitTimeStart),
    );
    const baseSlots = ['09:00', '10:30', '14:00', '15:30'];

    const suggestions = baseSlots
      .filter((slot) => slot !== this.normalizeTime(params.visitTimeStart))
      .filter((slot) => {
        const slotEnd = this.buildVisitEndTime(slot, duration);
        return !existingBookings.some((booking) => {
          const existingStart = this.normalizeTime(booking.visit_time_start);
          const existingEnd = this.normalizeTime(
            booking.visit_time_end || this.buildVisitEndTime(existingStart),
          );
          return this.hasTimeOverlap(slot, slotEnd, existingStart, existingEnd);
        });
      })
      .slice(0, 3);

    const suggestionText =
      suggestions.length >= 2
        ? `${suggestions[0]} hoặc ${suggestions[1]}`
        : suggestions.length === 1
          ? suggestions[0]
          : 'khung giờ khác';

    throw new ConflictException({
      code: 'warehouse_visit.slot_conflict',
      message: `Ôi tiếc quá, khung giờ ${this.normalizeTime(params.visitTimeStart)} ngày ${this.formatDateVi(params.visitDate)} vừa có khách khác đặt rồi. Bạn chuyển sang ${suggestionText} được không?`,
      conflict: {
        visit_date: params.visitDate,
        visit_time_start: this.normalizeTime(params.visitTimeStart),
        visit_time_end: this.normalizeTime(params.visitTimeEnd),
      },
      suggestions,
    });
  }

  private async sendVisitConfirmedMessage(
    booking: WarehouseVisitBooking,
  ): Promise<void> {
    if (!booking.visitor_email && !booking.visitor_phone) {
      return;
    }

    const visitDateText =
      booking.visit_date instanceof Date
        ? booking.visit_date.toLocaleDateString('vi-VN')
        : this.formatDateVi(String(booking.visit_date).slice(0, 10));

    const content = `Ting ting! Lịch hẹn thăm kho của bạn đã được xác nhận. Hẹn gặp bạn vào lúc ${this.normalizeTime(booking.visit_time_start)} ngày ${visitDateText}.`;

    await this.pushLiveChatMessage(
      booking.visitor_email,
      booking.visitor_phone,
      content,
    );
  }

  private async sendMorningDirectionMessage(
    booking: WarehouseVisitBooking & {
      warehouse_template?: {
        name?: string | null;
        address_detail?: string | null;
        latitude?: Prisma.Decimal | null;
        longitude?: Prisma.Decimal | null;
        ward?: {
          name?: string | null;
          province?: {
            name?: string | null;
          } | null;
        } | null;
      } | null;
    },
  ): Promise<void> {
    if (!booking.visitor_email && !booking.visitor_phone) {
      return;
    }

    const mapUrl = this.buildGoogleMapsUrl(booking);
    const content = `Chào buổi sáng! Hôm nay là lịch tham quan kho của bạn lúc ${this.normalizeTime(booking.visit_time_start)}. Đây là link Google Maps chỉ đường đến kho: ${mapUrl}`;

    await this.pushLiveChatMessage(
      booking.visitor_email,
      booking.visitor_phone,
      content,
    );
  }

  private buildGoogleMapsUrl(
    booking: WarehouseVisitBooking & {
      warehouse_template?: {
        name?: string | null;
        address_detail?: string | null;
        latitude?: Prisma.Decimal | null;
        longitude?: Prisma.Decimal | null;
        ward?: {
          name?: string | null;
          province?: {
            name?: string | null;
          } | null;
        } | null;
      } | null;
    },
  ): string {
    const lat = booking.warehouse_template?.latitude;
    const lng = booking.warehouse_template?.longitude;

    if (lat && lng) {
      return `https://www.google.com/maps/search/?api=1&query=${lat.toString()},${lng.toString()}`;
    }

    const query = [
      booking.warehouse_template?.name,
      booking.warehouse_template?.address_detail,
      booking.warehouse_template?.ward?.name,
      booking.warehouse_template?.ward?.province?.name,
    ]
      .filter(Boolean)
      .join(', ');

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'kho GEN-HUB')}`;
  }

  private async pushLiveChatMessage(
    email: string | null | undefined,
    phone: string | null | undefined,
    content: string,
  ): Promise<void> {
    try {
      if (!email && !phone) return;

      let conversation: any = null;

      if (email) {
        conversation = await this.prisma.contactConversation.findFirst({
          where: {
            is_deleted: false,
            channel: ContactChannel.LIVE_CHAT,
            customer_email: email.toLowerCase(),
            session_id: {
              not: null,
            },
          },
          orderBy: {
            last_activity_at: 'desc',
          },
        });
      }

      if (!conversation && phone) {
        conversation = await this.prisma.contactConversation.findFirst({
          where: {
            is_deleted: false,
            channel: ContactChannel.LIVE_CHAT,
            customer_phone: phone,
            session_id: {
              not: null,
            },
          },
          orderBy: {
            last_activity_at: 'desc',
          },
        });
      }

      if (!conversation?.session_id) {
        return;
      }

      const message = await this.prisma.contactMessage.create({
        data: {
          conversation_id: conversation.id,
          sender_type: MessageSender.AI,
          sender_name: 'GEN-HUB AI',
          message_type: MessageType.TEXT,
          content,
          is_ai_response: true,
          is_internal: false,
          created_by: 'SYSTEM',
        },
      });

      this.websocketGateway.emitContactMessageCreated(
        conversation.id,
        {
          id: message.id,
          sender_type: MessageSender.AI,
          sender_name: 'GEN-HUB AI',
          content: message.content,
          is_internal: false,
          created_at: message.created_at,
        },
        conversation.session_id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to push live chat message for visitor email ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
