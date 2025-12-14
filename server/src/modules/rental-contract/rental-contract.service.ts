import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { ContractStatus, Prisma } from '@prisma/client';

import { RentalContractRepository } from './rental-contract.repository';
import { CreateRentalContractDto, UpdateRentalContractDto, QueryRentalContractDto } from './dto';
import { IRentalContractWithRelations, IPaginatedResponse, ICreateContractResult, IRentalPriceCalculation } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { WarehouseTemplateRepository } from '../warehouse-template/warehouse-template.repository';

/**
 * Service xử lý business logic cho RentalContract
 */
@Injectable()
export class RentalContractService {
    private readonly CONTRACT_CACHE_TTL: number;
    private readonly CONTRACT_LIST_CACHE_TTL: number;
    private readonly LOCK_DURATION_HOURS: number;
    private readonly MAX_PENDING_PER_USER: number;
    private readonly CONTRACT_PREFIX: string;

    constructor(
        private readonly repository: RentalContractRepository,
        private readonly templateRepository: WarehouseTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.CONTRACT_CACHE_TTL = this.configService.get<number>('REDIS_RENTAL_CONTRACT_CACHE_TTL') || 300;
        this.CONTRACT_LIST_CACHE_TTL = this.configService.get<number>('REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL') || 60;
        this.LOCK_DURATION_HOURS = this.configService.get<number>('RENTAL_LOCK_DURATION_HOURS') || 1;
        this.MAX_PENDING_PER_USER = this.configService.get<number>('RENTAL_MAX_PENDING_PER_USER') || 3;
        this.CONTRACT_PREFIX = this.configService.get<string>('RENTAL_CONTRACT_PREFIX') || 'GENHUB';
    }

    /**
     * Tạo hợp đồng thuê mới
     */
    async create(
        dto: CreateRentalContractDto,
        userId: string,
        lang: string,
    ): Promise<ICreateContractResult> {
        // Kiểm tra giới hạn pending contracts
        const pendingCount = await this.repository.countPendingByUser(userId);
        if (pendingCount >= this.MAX_PENDING_PER_USER) {
            throw new BadRequestException(
                this.i18n.t('rental-contract.errors.max_pending_reached', { lang }),
            );
        }

        // Lấy template
        const template = await this.templateRepository.findById(dto.template_id);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse.errors.template_not_found', { lang }),
            );
        }

        // Validate và lock kho/rows
        const isWholeWarehouse = !dto.row_ids || dto.row_ids.length === 0;

        if (!isWholeWarehouse && !template.is_shared_warehouse) {
            throw new BadRequestException(
                this.i18n.t('warehouse.errors.not_shared_warehouse', { lang }),
            );
        }

        // Kiểm tra và khóa trong Redis
        const lockKey = isWholeWarehouse
            ? `rental:lock:template:${dto.template_id}`
            : dto.row_ids!.map(id => `rental:lock:row:${id}`);

        const lockResult = await this.acquireLock(lockKey);
        if (!lockResult.success) {
            throw new ConflictException(
                isWholeWarehouse
                    ? this.i18n.t('warehouse.errors.template_locked', { lang })
                    : this.i18n.t('warehouse.errors.row_locked', { lang }),
            );
        }

        try {
            // Tính giá thuê
            const rentalDays = dto.rental_months * 30;
            const { totalPrice, discountRate, details } = await this.calculateRentalPrice(
                template,
                dto.row_ids,
                dto.rental_months,
                isWholeWarehouse,
            );

            // Generate contract code
            const code = this.generateContractCode();

            // Tạo contract
            const startedAt = new Date();
            const expiredAt = new Date(startedAt.getTime() + rentalDays * 24 * 60 * 60 * 1000);

            const contractData: Prisma.RentalContractCreateInput = {
                code,
                name: dto.name || `Hợp đồng thuê kho ${template.name}`,
                status: ContractStatus.PENDING,
                started_at: startedAt,
                expired_at: expiredAt,
                total_price: new Decimal(totalPrice),
                discount_rate: new Decimal(discountRate),
                final_price: new Decimal(totalPrice * (1 - discountRate / 100)),
                notes: dto.notes,
                created_by: userId,
                organization: { connect: { id: dto.organization_id } },
            };

            const detailsData = details.map(d => ({
                rental_contract_id: '', // Placeholder, sẽ được set trong createWithDetails
                price_per_month: new Decimal(d.pricePerMonth),
                discount_rate: new Decimal(d.discountRate),
                rental_days: d.rentalDays,
                subtotal: new Decimal(d.subtotal),
                created_by: userId,
            }));

            const contract = await this.repository.createWithDetails(contractData, detailsData);

            // Log
            this.systemLogService.info('rental-contract', 'create', `Created rental contract: ${code}`, {
                userId,
                metaData: { contractId: contract.id, templateId: dto.template_id, code },
            });

            // Audit log
            this.auditLogService.logCreate(
                dto.organization_id,
                'rental_contract',
                contract.id,
                { ...dto, code } as unknown as Record<string, unknown>,
                { userId, description: `Created rental contract: ${code}` },
            );

            // Invalidate list cache
            await this.invalidateContractListCache();

            return {
                contract,
                // paymentUrl sẽ được tạo từ PayOS service
            };
        } catch (error) {
            // Release lock nếu có lỗi
            await this.releaseLock(lockKey);
            throw error;
        }
    }

    /**
     * Lấy danh sách hợp đồng
     */
    async findMany(
        query: QueryRentalContractDto,
        userId: string,
    ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
        const queryParams: Record<string, unknown> = {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
            status: query.status,
            organization_id: query.organization_id,
        };
        const cacheKey = this.getContractListCacheKey(queryParams);

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const result = await this.repository.findMany(query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.CONTRACT_LIST_CACHE_TTL);

        return result;
    }

    /**
     * Lấy chi tiết hợp đồng
     */
    async findById(id: string, lang: string): Promise<IRentalContractWithRelations> {
        const cacheKey = this.getContractCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const contract = await this.repository.findById(id);
        if (!contract) {
            throw new NotFoundException(
                this.i18n.t('rental-contract.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(contract), this.CONTRACT_CACHE_TTL);

        return contract;
    }

    /**
     * Cập nhật/gia hạn hợp đồng
     */
    async update(
        id: string,
        dto: UpdateRentalContractDto,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<IRentalContractWithRelations> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('rental-contract.errors.not_found', { lang }),
            );
        }

        if (existing.organization_id !== organizationId) {
            throw new ForbiddenException(
                this.i18n.t('rental-contract.errors.no_permission', { lang }),
            );
        }

        // Chỉ cho phép gia hạn hợp đồng ACTIVE
        if (dto.additional_months && existing.status !== ContractStatus.ACTIVE) {
            throw new BadRequestException(
                this.i18n.t('rental-contract.errors.cannot_renew', { lang }),
            );
        }

        const updateData: Prisma.RentalContractUpdateInput = {
            updated_by: userId,
        };

        if (dto.name) updateData.name = dto.name;
        if (dto.notes) updateData.notes = dto.notes;

        // Gia hạn hợp đồng
        if (dto.additional_months && existing.expired_at) {
            const newExpiredAt = new Date(existing.expired_at);
            newExpiredAt.setDate(newExpiredAt.getDate() + dto.additional_months * 30);
            updateData.expired_at = newExpiredAt;
        }

        const contract = await this.repository.update(id, updateData);

        // Invalidate caches
        await Promise.all([
            this.invalidateContractCache(id),
            this.invalidateContractListCache(),
        ]);

        // Log
        const action = dto.additional_months ? 'renew' : 'update';
        this.systemLogService.info('rental-contract', action, `${action === 'renew' ? 'Renewed' : 'Updated'} rental contract: ${contract.code}`, {
            userId,
            metaData: { contractId: id, additionalMonths: dto.additional_months },
        });

        // Audit log
        this.auditLogService.logUpdate(
            organizationId,
            'rental_contract',
            id,
            { name: existing.name, expired_at: existing.expired_at } as unknown as Record<string, unknown>,
            dto as unknown as Record<string, unknown>,
            { userId, description: `${action === 'renew' ? 'Renewed' : 'Updated'} rental contract: ${contract.code}` },
        );

        return contract;
    }

    /**
     * Hủy hợp đồng (soft delete)
     */
    async delete(
        id: string,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('rental-contract.errors.not_found', { lang }),
            );
        }

        if (existing.organization_id !== organizationId) {
            throw new ForbiddenException(
                this.i18n.t('rental-contract.errors.no_permission', { lang }),
            );
        }

        // Không cho hủy hợp đồng đã COMPLETED hoặc LIQUIDATED
        const nonCancellableStatuses: ContractStatus[] = [ContractStatus.COMPLETED, ContractStatus.LIQUIDATED];
        if (nonCancellableStatuses.includes(existing.status as ContractStatus)) {
            throw new BadRequestException(
                this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Release lock nếu còn
        const lockKey = `rental:lock:contract:${id}`;
        await this.releaseLock([lockKey]);

        // Invalidate caches
        await Promise.all([
            this.invalidateContractCache(id),
            this.invalidateContractListCache(),
        ]);

        // Log
        this.systemLogService.info('rental-contract', 'delete', `Cancelled rental contract: ${existing.code}`, {
            userId,
            metaData: { contractId: id, code: existing.code },
        });

        // Audit log
        this.auditLogService.logDelete(
            organizationId,
            'rental_contract',
            id,
            { status: existing.status, code: existing.code } as unknown as Record<string, unknown>,
            { userId, description: `Cancelled rental contract: ${existing.code}` },
        );
    }

    // Private helper methods

    private generateContractCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${this.CONTRACT_PREFIX}-${result}`;
    }

    private async calculateRentalPrice(
        template: any,
        rowIds: string[] | undefined,
        months: number,
        isWholeWarehouse: boolean,
    ): Promise<{
        totalPrice: number;
        discountRate: number;
        details: IRentalPriceCalculation[];
    }> {
        const discountRate = this.getDiscountRate(months, isWholeWarehouse, template);
        const rentalDays = months * 30;
        const details: IRentalPriceCalculation[] = [];

        let totalPrice = 0;

        if (isWholeWarehouse) {
            const pricePerMonth = Number(template.price_per_month);
            const subtotal = pricePerMonth * months * (1 - discountRate / 100);
            totalPrice = subtotal;
            details.push({
                pricePerMonth,
                discountRate,
                rentalDays,
                subtotal,
            });
        } else if (rowIds && rowIds.length > 0) {
            for (const rowId of rowIds) {
                const row = template.rows?.find((r: any) => r.id === rowId);
                if (row) {
                    const pricePerMonth = Number(row.price_per_month);
                    const subtotal = pricePerMonth * months * (1 - discountRate / 100);
                    totalPrice += subtotal;
                    details.push({
                        pricePerMonth,
                        discountRate,
                        rentalDays,
                        subtotal,
                    });
                }
            }
        }

        return { totalPrice, discountRate, details };
    }

    private getDiscountRate(months: number, isWholeWarehouse: boolean, template: any): number {
        let baseDiscount = 0;

        if (months >= 36) {
            baseDiscount = Number(template.discount_3_years_plus);
        } else if (months >= 24) {
            baseDiscount = Number(template.discount_2_years);
        } else if (months >= 12) {
            baseDiscount = Number(template.discount_1_year);
        } else if (months >= 6) {
            baseDiscount = Number(template.discount_6_months);
        } else if (months >= 3) {
            baseDiscount = Number(template.discount_3_months);
        } else {
            baseDiscount = Number(template.discount_1_month);
        }

        // Thêm giảm giá cho thuê cả kho
        if (isWholeWarehouse) {
            baseDiscount += Number(template.whole_warehouse_discount);
        }

        return Math.min(baseDiscount, 100);
    }

    private async acquireLock(keys: string | string[]): Promise<{ success: boolean }> {
        const lockKeys = Array.isArray(keys) ? keys : [keys];
        const ttl = this.LOCK_DURATION_HOURS * 3600;

        for (const key of lockKeys) {
            const exists = await this.redisService.exists(key);
            if (exists) {
                return { success: false };
            }
        }

        for (const key of lockKeys) {
            await this.redisService.set(key, 'locked', ttl);
        }

        return { success: true };
    }

    private async releaseLock(keys: string | string[]): Promise<void> {
        const lockKeys = Array.isArray(keys) ? keys : [keys];
        for (const key of lockKeys) {
            await this.redisService.del(key);
        }
    }

    private getContractCacheKey(id: string): string {
        return `rental-contract:${id}`;
    }

    private getContractListCacheKey(query: Record<string, unknown>): string {
        const sortedParams = Object.keys(query)
            .sort()
            .map((key) => `${key}=${query[key]}`)
            .join('&');
        return `rental-contract:list:${sortedParams}`;
    }

    private async invalidateContractCache(id: string): Promise<void> {
        await this.redisService.del(this.getContractCacheKey(id));
    }

    private async invalidateContractListCache(): Promise<void> {
        await this.redisService.delByPattern('rental-contract:list:*');
    }
}
