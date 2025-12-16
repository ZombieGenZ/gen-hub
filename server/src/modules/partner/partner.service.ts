import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PartnerRepository } from './partner.repository';
import { CreatePartnerDto, UpdatePartnerDto, QueryPartnerDto } from './dto';
import { IPartner, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';

@Injectable()
export class PartnerService {
    private readonly PARTNER_LIST_TTL: number;
    private readonly PARTNER_DETAIL_TTL: number;

    constructor(
        private readonly repository: PartnerRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly i18n: I18nService,
    ) {
        this.PARTNER_LIST_TTL = this.configService.get<number>('REDIS_PARTNER_LIST_TTL') || 300;
        this.PARTNER_DETAIL_TTL = this.configService.get<number>('REDIS_PARTNER_DETAIL_TTL') || 600;
    }

    private getListCacheKey(orgId: string, query: QueryPartnerDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryPartnerDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryPartnerDto]}`)
            .join('&');
        return `partner:list:${orgId}:${sortedParams}`;
    }

    private getDetailCacheKey(id: string): string {
        return `partner:detail:${id}`;
    }

    /**
     * Tạo mới Partner
     */
    async create(
        orgId: string,
        dto: CreatePartnerDto,
        actorId: string,
        lang: string,
    ): Promise<IPartner> {
        // Kiểm tra organization tồn tại
        const orgExists = await this.repository.orgExists(orgId);
        if (!orgExists) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.organization_not_found', { lang }),
            );
        }

        // Kiểm tra code trùng
        const codeExists = await this.repository.codeExistsInOrg(dto.code, orgId);
        if (codeExists) {
            throw new ConflictException(
                await this.i18n.translate('partner.errors.code_exists', { lang }),
            );
        }

        // Kiểm tra ward nếu có
        if (dto.ward_id) {
            const wardExists = await this.repository.wardExists(dto.ward_id);
            if (!wardExists) {
                throw new BadRequestException(
                    await this.i18n.translate('partner.errors.ward_not_found', { lang }),
                );
            }
        }

        const partner = await this.repository.create({
            name: dto.name,
            code: dto.code,
            type: dto.type,
            phone: dto.phone,
            email: dto.email,
            tax_code: dto.tax_code,
            address_detail: dto.address_detail,
            is_active: dto.is_active ?? true,
            organization: { connect: { id: orgId } },
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
        });

        // Invalidate cache
        await this.redisService.delByPattern(`partner:list:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'partner:created', {
            id: partner.id,
            name: partner.name,
            code: partner.code,
            type: partner.type,
            actorId,
        });

        // Audit log
        this.auditLogService.logCreate(
            orgId,
            'Partner',
            partner.id,
            partner as unknown as Record<string, unknown>,
            { userId: actorId, description: `Created partner: ${partner.name}` },
        );

        return partner;
    }

    /**
     * Lấy danh sách Partner
     */
    async findMany(
        orgId: string,
        query: QueryPartnerDto,
        lang: string,
    ): Promise<IPaginatedResponse<IPartner>> {
        const orgExists = await this.repository.orgExists(orgId);
        if (!orgExists) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.organization_not_found', { lang }),
            );
        }

        const cacheKey = this.getListCacheKey(orgId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findByOrgId(orgId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.PARTNER_LIST_TTL);

        return result;
    }

    /**
     * Lấy chi tiết Partner
     */
    async findById(orgId: string, id: string, lang: string): Promise<IPartner> {
        const cacheKey = this.getDetailCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const partner = JSON.parse(cached) as IPartner;
            if (partner.organization_id === orgId) {
                return partner;
            }
        }

        const partner = await this.repository.findByIdAndOrgId(id, orgId);
        if (!partner) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(partner), this.PARTNER_DETAIL_TTL);

        return partner;
    }

    /**
     * Cập nhật Partner
     */
    async update(
        orgId: string,
        id: string,
        dto: UpdatePartnerDto,
        actorId: string,
        lang: string,
    ): Promise<IPartner> {
        const existing = await this.repository.findByIdAndOrgId(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.not_found', { lang }),
            );
        }

        // Kiểm tra code trùng nếu thay đổi
        if (dto.code && dto.code !== existing.code) {
            const codeExists = await this.repository.codeExistsInOrg(dto.code, orgId, id);
            if (codeExists) {
                throw new ConflictException(
                    await this.i18n.translate('partner.errors.code_exists', { lang }),
                );
            }
        }

        // Kiểm tra ward nếu có
        if (dto.ward_id) {
            const wardExists = await this.repository.wardExists(dto.ward_id);
            if (!wardExists) {
                throw new BadRequestException(
                    await this.i18n.translate('partner.errors.ward_not_found', { lang }),
                );
            }
        }

        const partner = await this.repository.update(id, {
            ...dto,
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
        });

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`partner:list:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'partner:updated', {
            id: partner.id,
            name: partner.name,
            changedFields: Object.keys(dto),
            actorId,
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Partner',
            partner.id,
            existing as unknown as Record<string, unknown>,
            partner as unknown as Record<string, unknown>,
            { userId: actorId, description: `Updated partner: ${partner.name}` },
        );

        return partner;
    }

    /**
     * Xóa Partner
     */
    async delete(orgId: string, id: string, actorId: string, lang: string): Promise<void> {
        const existing = await this.repository.findByIdAndOrgId(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id);

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`partner:list:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'partner:deleted', {
            id,
            name: existing.name,
            actorId,
        });

        // Audit log
        this.auditLogService.logDelete(
            orgId,
            'Partner',
            id,
            existing as unknown as Record<string, unknown>,
            { userId: actorId, description: `Deleted partner: ${existing.name}` },
        );
    }

    async deleteMany(orgId: string, ids: string[], actorId: string, lang: string): Promise<void> {
        const partners = await this.repository.findByIds(ids);
        if (partners.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.not_found', { lang }),
            );
        }

        const invalidOrg = partners.find(p => p.organization_id !== orgId);
        if (invalidOrg) {
            throw new NotFoundException(
                await this.i18n.translate('partner.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids);

        // Invalidate cache
        await Promise.all(ids.map(id => this.redisService.del(this.getDetailCacheKey(id))));
        await this.redisService.delByPattern(`partner:list:${orgId}:*`);

        // Emit realtime events
        this.websocketGateway.emitToOrganization(orgId, 'partner:deletedMany', {
            ids,
            actorId
        });

        partners.forEach(p => {
            this.auditLogService.logDelete(
                orgId,
                'Partner',
                p.id,
                { name: p.name } as Record<string, unknown>,
                { userId: actorId, description: `Deleted partner: ${p.name}` },
            );
        });
    }
}
