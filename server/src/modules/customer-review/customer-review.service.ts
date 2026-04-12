import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { CustomerReviewRepository } from './customer-review.repository';
import {
  CreateCustomerReviewDto,
  QueryCustomerReviewDto,
  UpdateCustomerReviewDto,
} from './dto';
import {
  ICustomerReview,
  ICustomerReviewPaginatedResponse,
} from './interfaces';

@Injectable()
export class CustomerReviewService {
  constructor(
    private readonly repository: CustomerReviewRepository,
    private readonly i18n: I18nService,
  ) {}

  async create(
    dto: CreateCustomerReviewDto,
    userId: string,
  ): Promise<ICustomerReview> {
    const hasReply = dto.reply !== undefined && dto.reply.trim().length > 0;

    return (await this.repository.create({
      customer_name: dto.customer_name,
      customer_email: dto.customer_email,
      customer_phone: dto.customer_phone,
      customer_company: dto.customer_company,
      customer_position: dto.customer_position,
      customer_avatar: dto.customer_avatar,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
      reply: dto.reply,
      replied_at: hasReply ? new Date() : null,
      replied_by: hasReply ? userId : null,
      status: dto.status ?? ReviewStatus.PENDING,
      is_featured: dto.is_featured ?? false,
      display_order: dto.display_order ?? 0,
      is_active: dto.is_active ?? true,
      created_by: userId,
      updated_by: userId,
    })) as ICustomerReview;
  }

  async findAll(
    query: QueryCustomerReviewDto,
    userId: string,
    hasListAllPermission: boolean,
  ): Promise<ICustomerReviewPaginatedResponse> {
    const {
      limit = 10,
      offset = 0,
      keywords,
      status,
      rating,
      is_featured,
      is_active,
    } = query;

    const where: Prisma.CustomerReviewWhereInput = {
      is_deleted: false,
      ...(!hasListAllPermission && { created_by: userId }),
    };

    if (keywords) {
      where.OR = [
        { customer_name: { contains: keywords, mode: 'insensitive' } },
        { customer_email: { contains: keywords, mode: 'insensitive' } },
        { customer_company: { contains: keywords, mode: 'insensitive' } },
        { title: { contains: keywords, mode: 'insensitive' } },
        { content: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (rating !== undefined) {
      where.rating = rating;
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [items, total] = await Promise.all([
      this.repository.findMany({
        skip: offset,
        take: limit,
        where,
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      }),
      this.repository.count(where),
    ]);

    return {
      items: items as ICustomerReview[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async findById(
    id: string,
    userId: string,
    hasReadAllPermission: boolean,
    lang: string,
  ): Promise<ICustomerReview> {
    const review = await this.repository.findFirst({
      id,
      is_deleted: false,
      ...(!hasReadAllPermission && { created_by: userId }),
    });

    if (!review) {
      throw new NotFoundException(
        await this.i18n.translate('customer-review.errors.not_found', { lang }),
      );
    }

    return review as ICustomerReview;
  }

  async update(
    id: string,
    dto: UpdateCustomerReviewDto,
    userId: string,
    hasUpdateAllPermission: boolean,
    lang: string,
  ): Promise<ICustomerReview> {
    const existing = await this.repository.findFirst({
      id,
      is_deleted: false,
      ...(!hasUpdateAllPermission && { created_by: userId }),
    });

    if (!existing) {
      throw new NotFoundException(
        await this.i18n.translate('customer-review.errors.not_found', { lang }),
      );
    }

    let reply: string | null | undefined = undefined;
    let replied_at: Date | null | undefined = undefined;
    let replied_by: string | null | undefined = undefined;

    if (dto.reply !== undefined) {
      const hasReply = dto.reply.trim().length > 0;
      reply = dto.reply;
      replied_at = hasReply ? new Date() : null;
      replied_by = hasReply ? userId : null;
    }

    const updated = await this.repository.update(id, {
      customer_name: dto.customer_name,
      customer_email: dto.customer_email,
      customer_phone: dto.customer_phone,
      customer_company: dto.customer_company,
      customer_position: dto.customer_position,
      customer_avatar: dto.customer_avatar,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
      reply,
      replied_at,
      replied_by,
      status: dto.status,
      is_featured: dto.is_featured,
      display_order: dto.display_order,
      is_active: dto.is_active,
      updated_by: userId,
    });

    return updated as ICustomerReview;
  }

  async delete(
    id: string,
    userId: string,
    hasDeleteAllPermission: boolean,
    lang: string,
  ): Promise<void> {
    const review = await this.repository.findFirst({
      id,
      is_deleted: false,
      ...(!hasDeleteAllPermission && { created_by: userId }),
    });

    if (!review) {
      throw new NotFoundException(
        await this.i18n.translate('customer-review.errors.not_found', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);
  }

  async deleteMany(
    ids: string[],
    userId: string,
    hasDeleteAllPermission: boolean,
    lang: string,
  ): Promise<void> {
    const where: Prisma.CustomerReviewWhereInput = {
      id: { in: ids },
      is_deleted: false,
      ...(!hasDeleteAllPermission && { created_by: userId }),
    };

    const reviews = await this.repository.findByIds(where);
    if (reviews.length !== ids.length) {
      throw new NotFoundException(
        await this.i18n.translate('customer-review.errors.not_found', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);
  }
}
