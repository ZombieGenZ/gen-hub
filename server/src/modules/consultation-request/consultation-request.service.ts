import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsultationRequest,
  ConsultationRequestStatus,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

import { RedisService } from '../redis/redis.service';
import { ConsultationRequestRepository } from './consultation-request.repository';
import { CreateConsultationRequestDto } from './dto/create-consultation-request.dto';
import { QueryConsultationRequestDto } from './dto/query-consultation-request.dto';
import { UpdateConsultationRequestDto } from './dto/update-consultation-request.dto';

@Injectable()
export class ConsultationRequestService {
  constructor(
    private readonly repository: ConsultationRequestRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async createRequest(
    dto: CreateConsultationRequestDto,
    userId?: string | null,
  ): Promise<ConsultationRequest> {
    const prefix = this.configService.get<string>(
      'CONSULTATION_REQUEST_CODE_PREFIX',
      'CR',
    );
    const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const created = await this.repository.create({
      ...dto,
      code,
      created_by: userId || 'SYSTEM',
    });

    await this.redisService.invalidateConsultationRequestListCache();
    return created;
  }

  async findAllRequests(query: QueryConsultationRequestDto, ownerId?: string) {
    const cacheKey =
      this.redisService.getConsultationRequestListCacheKey(
        query as unknown as Record<string, unknown>,
      ) + (ownerId ? `:owner:${ownerId}` : ':all');
    const cached =
      await this.redisService.getConsultationRequestListCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAll({
      ...query,
      createdBy: ownerId,
    });
    await this.redisService.setConsultationRequestListCache(cacheKey, result);
    return result;
  }

  async findRequestById(
    id: string,
    lang: string,
    ownerId?: string,
  ): Promise<ConsultationRequest> {
    const cached =
      await this.redisService.getConsultationRequestCache<ConsultationRequest>(
        id,
      );
    if (cached) {
      if (ownerId && cached.created_by !== ownerId) {
        throw new NotFoundException(
          await this.i18n.translate('consultation-request.errors.not_found', {
            lang,
          }),
        );
      }
      return cached;
    }

    const item = await this.repository.findById(id);
    if (!item || (ownerId && item.created_by !== ownerId)) {
      throw new NotFoundException(
        await this.i18n.translate('consultation-request.errors.not_found', {
          lang,
        }),
      );
    }

    await this.redisService.setConsultationRequestCache(id, item);
    return item;
  }

  async updateRequest(
    id: string,
    dto: UpdateConsultationRequestDto,
    userId: string,
    lang: string,
    ownerId?: string,
  ) {
    const item = await this.findRequestById(id, lang, ownerId);
    const updateData: Prisma.ConsultationRequestUncheckedUpdateInput = {
      ...dto,
      updated_by: userId,
    };

    if (
      dto.status === ConsultationRequestStatus.CONTACTED &&
      item.status !== ConsultationRequestStatus.CONTACTED
    ) {
      updateData.contacted_at = new Date();
    }
    if (
      dto.status === ConsultationRequestStatus.COMPLETED &&
      item.status !== ConsultationRequestStatus.COMPLETED
    ) {
      updateData.completed_at = new Date();
    }
    if (dto.assigned_to && dto.assigned_to !== item.assigned_to) {
      updateData.assigned_at = new Date();
    }

    const updated = await this.repository.update(id, updateData);
    await this.redisService.invalidateConsultationRequestCache(id);
    return updated;
  }

  async assignRequest(
    id: string,
    staffUserId: string,
    userId: string,
    lang: string,
  ) {
    if (!staffUserId) {
      throw new BadRequestException(
        await this.i18n.translate(
          'consultation-request.errors.assigned_to_required',
          { lang },
        ),
      );
    }
    return this.updateRequest(id, { assigned_to: staffUserId }, userId, lang);
  }

  async softDeleteRequest(
    id: string,
    userId: string,
    lang: string,
    ownerId?: string,
  ) {
    await this.findRequestById(id, lang, ownerId);
    await this.repository.softDelete(id, userId);
    await this.redisService.invalidateConsultationRequestCache(id);
  }
}
