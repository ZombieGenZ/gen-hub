import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { BatchRepository } from './batch.repository';
import { CreateBatchDto, UpdateBatchDto, QueryBatchDto } from './dto';
import { IBatch, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';

@Injectable()
export class BatchService {
    private readonly BATCH_LIST_TTL: number;
    private readonly BATCH_DETAIL_TTL: number;
    private readonly BATCH_KEY_PREFIX: string;
    private readonly BATCH_LIST_KEY_PREFIX: string;

    constructor(
        private readonly repository: BatchRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) {
        this.BATCH_LIST_TTL = this.configService.get<number>('REDIS_BATCH_LIST_TTL') || 300;
        this.BATCH_DETAIL_TTL = this.configService.get<number>('REDIS_BATCH_DETAIL_TTL') || 600;
        this.BATCH_KEY_PREFIX = this.configService.get<string>('REDIS_BATCH_KEY_PREFIX') || 'batch:detail';
        this.BATCH_LIST_KEY_PREFIX = this.configService.get<string>('REDIS_BATCH_LIST_KEY_PREFIX') || 'batch:list';
    }

    private getListCacheKey(productId: string, query: QueryBatchDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryBatchDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryBatchDto]}`)
            .join('&');
        return `${this.BATCH_LIST_KEY_PREFIX}:${productId}:${sortedParams}`;
    }

    private getDetailCacheKey(id: string): string {
        return `${this.BATCH_KEY_PREFIX}:${id}`;
    }

    async create(
        orgId: string,
        dto: CreateBatchDto,
        actorId: string,
        lang: string,
    ): Promise<IBatch> {
        // Kiểm tra product thuộc org
        const productExists = await this.repository.productExistsInOrg(dto.product_id, orgId);
        if (!productExists) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.product_not_found', { lang }),
            );
        }

        // Kiểm tra code trùng
        const codeExists = await this.repository.codeExistsInProduct(dto.code, dto.product_id);
        if (codeExists) {
            throw new ConflictException(
                await this.i18n.translate('batch.errors.code_exists', { lang }),
            );
        }

        const batch = await this.repository.create({
            code: dto.code,
            manufacturing_date: dto.manufacturing_date ? new Date(dto.manufacturing_date) : null,
            expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
            import_price: dto.import_price ?? 0,
            is_active: dto.is_active ?? true,
            created_by: actorId,
            product: { connect: { id: dto.product_id } },
        });

        // Invalidate cache
        await this.redisService.delByPattern(`${this.BATCH_LIST_KEY_PREFIX}:${dto.product_id}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'batch:created', {
            id: batch.id,
            code: batch.code,
            productId: dto.product_id,
            actorId,
        });

        // Audit log
        this.auditLogService.logCreate(
            orgId,
            'Batch',
            batch.id,
            batch as unknown as Record<string, unknown>,
            { userId: actorId, description: `Created batch: ${batch.code}` },
        );

        return batch;
    }

    async findByProductId(
        orgId: string,
        productId: string,
        query: QueryBatchDto,
        lang: string,
    ): Promise<IPaginatedResponse<IBatch>> {
        // Kiểm tra product thuộc org
        const productExists = await this.repository.productExistsInOrg(productId, orgId);
        if (!productExists) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.product_not_found', { lang }),
            );
        }

        const cacheKey = this.getListCacheKey(productId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findByProductId(productId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.BATCH_LIST_TTL);

        return result;
    }

    async findById(orgId: string, id: string, lang: string): Promise<IBatch> {
        const cacheKey = this.getDetailCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const batch = JSON.parse(cached) as IBatch;
            if (batch.product?.organization_id === orgId) {
                return batch;
            }
        }

        const batch = await this.repository.findByIdAndOrg(id, orgId);
        if (!batch) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(batch), this.BATCH_DETAIL_TTL);

        return batch;
    }

    async update(
        orgId: string,
        id: string,
        dto: UpdateBatchDto,
        actorId: string,
        lang: string,
    ): Promise<IBatch> {
        const existing = await this.repository.findByIdAndOrg(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.not_found', { lang }),
            );
        }

        // Kiểm tra code trùng nếu thay đổi
        if (dto.code && dto.code !== existing.code) {
            const codeExists = await this.repository.codeExistsInProduct(dto.code, existing.product_id, id);
            if (codeExists) {
                throw new ConflictException(
                    await this.i18n.translate('batch.errors.code_exists', { lang }),
                );
            }
        }

        const batch = await this.repository.update(id, {
            ...dto,
            manufacturing_date: dto.manufacturing_date !== undefined
                ? (dto.manufacturing_date ? new Date(dto.manufacturing_date) : null)
                : undefined,
            expiry_date: dto.expiry_date !== undefined
                ? (dto.expiry_date ? new Date(dto.expiry_date) : null)
                : undefined,
            updated_by: actorId,
        });

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`${this.BATCH_LIST_KEY_PREFIX}:${existing.product_id}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'batch:updated', {
            id: batch.id,
            code: batch.code,
            changedFields: Object.keys(dto),
            actorId,
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Batch',
            batch.id,
            existing as unknown as Record<string, unknown>,
            batch as unknown as Record<string, unknown>,
            { userId: actorId, description: `Updated batch: ${batch.code}` },
        );

        return batch;
    }

    async delete(orgId: string, id: string, actorId: string, lang: string): Promise<void> {
        const existing = await this.repository.findByIdAndOrg(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, actorId);

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`${this.BATCH_LIST_KEY_PREFIX}:${existing.product_id}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'batch:deleted', {
            id,
            code: existing.code,
            actorId,
        });

        // Audit log
        this.auditLogService.logDelete(
            orgId,
            'Batch',
            id,
            existing as unknown as Record<string, unknown>,
            { userId: actorId, description: `Deleted batch: ${existing.code}` },
        );
    }

    async deleteMany(orgId: string, ids: string[], actorId: string, lang: string): Promise<void> {
        const batches = await this.repository.findByIds(ids);
        if (batches.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.not_found', { lang }),
            );
        }

        const invalidBatch = batches.find(b => b.product?.organization_id !== orgId);
        if (invalidBatch) {
            throw new NotFoundException(
                await this.i18n.translate('batch.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, actorId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.redisService.del(this.getDetailCacheKey(id))));
        const productIds = new Set(batches.map(b => b.product_id));
        await Promise.all(Array.from(productIds).map(pid => this.redisService.delByPattern(`${this.BATCH_LIST_KEY_PREFIX}:${pid}:*`)));

        // Emit realtime events
        this.websocketGateway.emitToOrganization(orgId, 'batch:deletedMany', {
            ids,
            actorId
        });

        batches.forEach(b => {
            this.auditLogService.logDelete(
                orgId,
                'Batch',
                b.id,
                b as unknown as Record<string, unknown>,
                { userId: actorId, description: `Deleted batch: ${b.code}` },
            );
        });
    }
}
