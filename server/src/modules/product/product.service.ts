import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ProductRepository } from './product.repository';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { IProduct, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';

@Injectable()
export class ProductService {
    private readonly PRODUCT_LIST_TTL: number;
    private readonly PRODUCT_DETAIL_TTL: number;

    constructor(
        private readonly repository: ProductRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) {
        this.PRODUCT_LIST_TTL = this.configService.get<number>('REDIS_PRODUCT_LIST_TTL') || 300;
        this.PRODUCT_DETAIL_TTL = this.configService.get<number>('REDIS_PRODUCT_DETAIL_TTL') || 600;
    }

    private getListCacheKey(orgId: string, query: QueryProductDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryProductDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryProductDto]}`)
            .join('&');
        return `product:list:${orgId}:${sortedParams}`;
    }

    private getDetailCacheKey(id: string): string {
        return `product:detail:${id}`;
    }

    async create(
        orgId: string,
        dto: CreateProductDto,
        actorId: string,
        lang: string,
    ): Promise<IProduct> {
        const orgExists = await this.repository.orgExists(orgId);
        if (!orgExists) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.organization_not_found', { lang }),
            );
        }

        // Kiểm tra SKU trùng
        const skuExists = await this.repository.skuExistsInOrg(dto.sku, orgId);
        if (skuExists) {
            throw new ConflictException(
                await this.i18n.translate('product.errors.sku_exists', { lang }),
            );
        }

        // Kiểm tra base_unit tồn tại
        const baseUnitExists = await this.repository.unitExists(dto.base_unit_id, orgId);
        if (!baseUnitExists) {
            throw new BadRequestException(
                await this.i18n.translate('product.errors.base_unit_not_found', { lang }),
            );
        }

        // Kiểm tra các unit trong units array
        if (dto.units && dto.units.length > 0) {
            for (const unit of dto.units) {
                const unitExists = await this.repository.unitExists(unit.unit_id, orgId);
                if (!unitExists) {
                    throw new BadRequestException(
                        await this.i18n.translate('product.errors.unit_not_found', { lang }),
                    );
                }
            }
        }

        const product = await this.repository.create(
            {
                name: dto.name,
                sku: dto.sku,
                description: dto.description,
                image_url: dto.image_url,
                barcode: dto.barcode,
                weight: dto.weight,
                length: dto.length,
                width: dto.width,
                height: dto.height,
                max_weight_capacity: dto.max_weight_capacity,
                cost_price: dto.cost_price ?? 0,
                is_active: dto.is_active ?? true,
                created_by: actorId,
                organization: { connect: { id: orgId } },
                base_unit: { connect: { id: dto.base_unit_id } },
            },
            dto.units,
            actorId,
        );

        // Invalidate cache
        await this.redisService.delByPattern(`product:list:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'product:created', {
            id: product.id,
            name: product.name,
            sku: product.sku,
            actorId,
        });

        // Audit log
        this.auditLogService.logCreate(
            orgId,
            'Product',
            product.id,
            product as unknown as Record<string, unknown>,
            { userId: actorId, description: `Created product: ${product.name}` },
        );

        return product;
    }

    async findMany(
        orgId: string,
        query: QueryProductDto,
        lang: string,
    ): Promise<IPaginatedResponse<IProduct>> {
        const orgExists = await this.repository.orgExists(orgId);
        if (!orgExists) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.organization_not_found', { lang }),
            );
        }

        const cacheKey = this.getListCacheKey(orgId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findByOrgId(orgId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.PRODUCT_LIST_TTL);

        return result;
    }

    async findById(orgId: string, id: string, lang: string): Promise<IProduct> {
        const cacheKey = this.getDetailCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const product = JSON.parse(cached) as IProduct;
            if (product.organization_id === orgId) {
                return product;
            }
        }

        const product = await this.repository.findByIdAndOrgId(id, orgId);
        if (!product) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(product), this.PRODUCT_DETAIL_TTL);

        return product;
    }

    async update(
        orgId: string,
        id: string,
        dto: UpdateProductDto,
        actorId: string,
        lang: string,
    ): Promise<IProduct> {
        const existing = await this.repository.findByIdAndOrgId(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        // Kiểm tra SKU trùng nếu thay đổi
        if (dto.sku && dto.sku !== existing.sku) {
            const skuExists = await this.repository.skuExistsInOrg(dto.sku, orgId, id);
            if (skuExists) {
                throw new ConflictException(
                    await this.i18n.translate('product.errors.sku_exists', { lang }),
                );
            }
        }

        // Kiểm tra base_unit nếu thay đổi
        if (dto.base_unit_id && dto.base_unit_id !== existing.base_unit_id) {
            const baseUnitExists = await this.repository.unitExists(dto.base_unit_id, orgId);
            if (!baseUnitExists) {
                throw new BadRequestException(
                    await this.i18n.translate('product.errors.base_unit_not_found', { lang }),
                );
            }
        }

        // Kiểm tra units nếu có
        if (dto.units && dto.units.length > 0) {
            for (const unit of dto.units) {
                const unitExists = await this.repository.unitExists(unit.unit_id, orgId);
                if (!unitExists) {
                    throw new BadRequestException(
                        await this.i18n.translate('product.errors.unit_not_found', { lang }),
                    );
                }
            }
        }

        const { units, base_unit_id, ...updateData } = dto;

        const product = await this.repository.update(
            id,
            {
                ...updateData,
                updated_by: actorId,
                ...(base_unit_id && { base_unit: { connect: { id: base_unit_id } } }),
            },
            units,
            actorId,
        );

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`product:list:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'product:updated', {
            id: product.id,
            name: product.name,
            changedFields: Object.keys(dto),
            actorId,
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Product',
            product.id,
            existing as unknown as Record<string, unknown>,
            product as unknown as Record<string, unknown>,
            { userId: actorId, description: `Updated product: ${product.name}` },
        );

        return product;
    }

    async delete(orgId: string, id: string, actorId: string, lang: string): Promise<void> {
        const existing = await this.repository.findByIdAndOrgId(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, actorId);

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`product:list:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'product:deleted', {
            id,
            name: existing.name,
            actorId,
        });

        // Audit log
        this.auditLogService.logDelete(
            orgId,
            'Product',
            id,
            existing as unknown as Record<string, unknown>,
            { userId: actorId, description: `Deleted product: ${existing.name}` },
        );
    }
}
