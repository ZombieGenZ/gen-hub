import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { ContractStatus, Prisma, ContractCancelType } from '@prisma/client';
import { RentalContractRepository } from '../rental-contract-shared/rental-contract.repository';
import { SignatureService } from '../rental-contract-shared/signature.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
    OrgCreateRentalContractDto,
    RenewRentalContractDto,
    OrgCancelContractDto,
    OrgDeleteManyItemDto,
    QueryRentalContractDto,
    RentalTemplateItemDto,
} from './dto';
import {
    IRentalContractWithRelations,
    IPaginatedResponse,
    ICreateContractResult,
    IRentalPriceCalculation,
    IRenewContractResult,
    IContractTimeChangedEmail,
} from '../rental-contract-shared/interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { WarehouseTemplateRepository } from '../warehouse-template/warehouse-template.repository';
import { EmailService } from '../notification/email.service';
import { OrganizationRepository } from '../organization/organization.repository';
import { SepayService } from '../payment/sepay.service';
import { PaymentSchedulerService } from '../payment/payment-scheduler.service';
import { UserNotificationService } from '../user-notification/user-notification.service';

const Decimal = Prisma.Decimal;

@Injectable()
export class OrgRentalContractService {
    private readonly CONTRACT_CACHE_TTL: number;
    private readonly CONTRACT_LIST_CACHE_TTL: number;
    private readonly LOCK_DURATION_SECONDS: number;
    private readonly MAX_PENDING_PER_USER: number;
    private readonly CONTRACT_PREFIX: string;
    private readonly MAX_DELAYED_START_DAYS: number;

    constructor(
        private readonly repository: RentalContractRepository,
        private readonly templateRepository: WarehouseTemplateRepository,
        private readonly organizationRepository: OrganizationRepository,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
        private readonly emailService: EmailService,
        @Inject(forwardRef(() => SepayService))
        private readonly sepayService: SepayService,
        private readonly paymentScheduler: PaymentSchedulerService,
        private readonly userNotificationService: UserNotificationService,
        private readonly signatureService: SignatureService,
    ) {
        this.CONTRACT_CACHE_TTL = this.configService.get<number>('REDIS_RENTAL_CONTRACT_CACHE_TTL') || 300;
        this.CONTRACT_LIST_CACHE_TTL = this.configService.get<number>('REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL') || 60;
        this.LOCK_DURATION_SECONDS = this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
        this.MAX_PENDING_PER_USER = this.configService.get<number>('RENTAL_MAX_PENDING_PER_USER') || 3;
        this.CONTRACT_PREFIX = this.configService.get<string>('RENTAL_CONTRACT_PREFIX') || 'GENHUB';
        this.MAX_DELAYED_START_DAYS = this.configService.get<number>('RENTAL_MAX_DELAYED_START_DAYS') || 14;
    }

    /**
     * Kiểm tra quyền organization
     */
    private async checkOrgPermission(
        orgId: string,
        userId: string,
        permissionKey: string,
        lang: string,
    ): Promise<void> {
        const org = await this.organizationRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.not_found', { lang }),
            );
        }

        if (userId === org.owner_id || userId === org.owner?.id) {
            return;
        }

        const member = await this.organizationRepository.findMemberByUserAndOrg(userId, orgId);
        if (!member || !member.is_accepted) {
            throw new ForbiddenException(
                await this.i18n.translate('rental-contract.errors.no_permission', { lang }),
            );
        }

        const hasDirectPermission = member.permissions?.some(
            (p) => p.permission.key === permissionKey,
        );
        if (hasDirectPermission) return;

        // Note: Role permission checking logic should be implemented if roles are used
        const hasRolePermission = false;

        if (!hasRolePermission && !hasDirectPermission) {
            throw new ForbiddenException(
                await this.i18n.translate('rental-contract.errors.no_permission', { lang }),
            );
        }
    }

    /**
     * Tổ chức tạo hợp đồng thuê mới
     */
    async create(
        dto: OrgCreateRentalContractDto,
        userId: string,
        organizationId: string,
        lang: string,
        signatureFile?: Express.Multer.File,
    ): Promise<ICreateContractResult> {
        await this.checkOrgPermission(organizationId, userId, 'rental-contract.create', lang);

        if (dto.addon_ids) dto.addon_ids = [...new Set(dto.addon_ids)];
        if (dto.coupon_codes) dto.coupon_codes = [...new Set(dto.coupon_codes)];

        const seenTemplateIds = new Set<string>();
        dto.templates = dto.templates.filter(t => {
            if (seenTemplateIds.has(t.template_id)) return false;
            seenTemplateIds.add(t.template_id);
            if (t.row_template_ids) t.row_template_ids = [...new Set(t.row_template_ids)];
            return true;
        });

        const tier = await this.prisma.rentalDurationTier.findFirst({
            where: { id: dto.duration_tier_id, is_deleted: false, is_active: true },
        });
        if (!tier) {
            throw new BadRequestException(
                this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }),
            );
        }

        const rentalMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);

        let contractStartDate = new Date();
        if (dto.scheduled_start_at) {
            const now = new Date();
            const maxStartDate = new Date(now.getTime() + this.MAX_DELAYED_START_DAYS * 24 * 60 * 60 * 1000);

            if (dto.scheduled_start_at < now) {
                throw new BadRequestException(this.i18n.t('rental-contract.errors.start_date_past', { lang }));
            }
            if (dto.scheduled_start_at > maxStartDate) {
                throw new BadRequestException(
                    this.i18n.t('rental-contract.errors.start_date_too_far', { lang, args: { days: this.MAX_DELAYED_START_DAYS } }),
                );
            }
            contractStartDate = dto.scheduled_start_at;
        }

        const pendingCount = await this.repository.countPendingByUser(userId);
        if (pendingCount >= this.MAX_PENDING_PER_USER) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.max_pending_reached', { lang }));
        }

        const allPriceDetails: IRentalPriceCalculation[] = [];
        const lockKeys: string[] = [];
        let totalPrice = 0;
        let overallDiscountRate = 0;

        for (const templateItem of dto.templates) {
            const template = await this.templateRepository.findById(templateItem.template_id);
            if (!template) {
                throw new NotFoundException(this.i18n.t('rental-contract.errors.template_not_found', { lang }));
            }

            const isWholeWarehouse = !templateItem.row_template_ids || templateItem.row_template_ids.length === 0;
            if (!isWholeWarehouse && !template.is_shared_warehouse) {
                throw new BadRequestException(this.i18n.t('warehouse.errors.not_shared_warehouse', { lang }));
            }

            if (isWholeWarehouse) {
                lockKeys.push(`rental:lock:template:${templateItem.template_id}`);
            } else {
                templateItem.row_template_ids!.forEach((rowId) => {
                    lockKeys.push(`rental:lock:row:${rowId}`);
                });
            }

            const priceDetail = await this.calculateRentalPriceForTemplate(
                template,
                templateItem,
                rentalMonths,
                isWholeWarehouse,
                dto.duration_tier_id,
            );
            allPriceDetails.push(priceDetail);
            totalPrice += isNaN(priceDetail.subtotal) ? 0 : priceDetail.subtotal;
        }

        if (allPriceDetails.length > 0) {
            overallDiscountRate = allPriceDetails.reduce((sum, d) => sum + d.discountRate, 0) / allPriceDetails.length;
        }

        const lockResult = await this.acquireLock(lockKeys);
        if (!lockResult.success) {
            throw new ConflictException(this.i18n.t('warehouse.errors.template_locked', { lang }));
        }

        try {
            const code = this.generateContractCode();
            const rentalDays = rentalMonths * 30;

            const startedAt = contractStartDate;
            const expiredAt = new Date(startedAt.getTime() + rentalDays * 24 * 60 * 60 * 1000);

            const contractData: Prisma.RentalContractCreateInput = {
                code,
                name: `Hợp đồng thuê ${dto.templates.length} kho`,
                status: ContractStatus.PENDING,
                started_at: startedAt,
                expired_at: expiredAt,
                total_price: new Decimal(totalPrice),
                discount_rate: new Decimal(overallDiscountRate),
                final_price: new Decimal(totalPrice),
                notes: dto.notes,
                payment_method: dto.payment_method,
                auto_renew: dto.auto_renew ?? false,
                created_by: userId,
                organization: { connect: { id: organizationId } },
            };

            const detailsData = allPriceDetails.map((d) => ({
                rental_contract_id: '',
                warehouse_template_id: d.templateId,
                warehouse_name: d.warehouseName,
                warehouse_description: d.warehouseDescription || null,
                contents_description: d.contentsDescription || null,
                row_template_ids: d.rowTemplateIds,
                is_whole_warehouse: d.isWholeWarehouse,
                price_per_month: new Decimal(d.pricePerMonth),
                discount_rate: new Decimal(d.discountRate),
                rental_days: d.rentalDays,
                subtotal: new Decimal(d.subtotal),
                created_by: userId,
            }));

            const contract = await this.repository.createWithDetails(contractData, detailsData);

            this.systemLogService.info(
                'rental-contract',
                'create_org',
                `Org created rental contract: ${code}`,
                { userId, metaData: { contractId: contract.id, templateCount: dto.templates.length, code } },
            );

            this.auditLogService.logCreate(
                organizationId,
                'rental_contract',
                contract.id,
                { ...dto, code } as unknown as Record<string, unknown>,
                { userId, description: `Org created rental contract: ${code}` },
            );

            this.websocketGateway.emitRentalContractCreated(organizationId, contract.id, code, userId);
            await this.invalidateContractListCache();

            const paymentResult = await this.sepayService.createContractPayment({
                rentalContractId: contract.id,
                amount: Math.round(parseFloat(contract.final_price.toString())),
                description: `${code}`,
                type: 'NEW_CONTRACT',
                userId,
            });

            const paymentExpiredAt = new Date();
            paymentExpiredAt.setSeconds(paymentExpiredAt.getSeconds() + this.LOCK_DURATION_SECONDS);
            this.paymentScheduler.schedulePaymentExpire(paymentResult.paymentId, paymentExpiredAt, userId);

            const contractCancelAt = new Date();
            // Default 24h expires pending contract if not paid
            const contractExpireSeconds = this.configService.get<number>('CONTRACT_PENDING_EXPIRE_SECONDS') || 86400;
            contractCancelAt.setSeconds(contractCancelAt.getSeconds() + contractExpireSeconds);
            this.paymentScheduler.scheduleContractCancel(contract.id, contractCancelAt, userId);

            let signatureResult: any = null;
            if (signatureFile) {
                try {
                    signatureResult = await this.signatureService.uploadSignature(
                        contract.id,
                        signatureFile.buffer,
                        userId,
                        lang,
                    );
                } catch (error) {
                    this.systemLogService.error(
                        'rental-contract',
                        'upload_signature_error',
                        `Failed to upload signature for contract ${contract.id}`,
                        { metaData: { error, contractId: contract.id } },
                    );
                }
            }

            return {
                contract: contract as unknown as IRentalContractWithRelations,
                payment: paymentResult,
                signature: signatureResult,
            };
        } finally {
            await this.releaseLock(lockKeys);
        }
    }

    async findMany(
        query: QueryRentalContractDto,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
        await this.checkOrgPermission(organizationId, userId, 'rental-contract.list', lang);
        query.organization_id = organizationId;

        const queryParams: Record<string, unknown> = {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
            status: query.status,
            organization_id: organizationId,
            userId,
        };
        const cacheKey = this.getContractListCacheKey(queryParams);

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch { }
        }

        const result = await this.repository.findMany(query);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.CONTRACT_LIST_CACHE_TTL);

        return result;
    }

    async findById(
        id: string,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<IRentalContractWithRelations> {
        const contract = await this.repository.findById(id);
        if (!contract) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }

        if (contract.organization_id !== organizationId) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }

        await this.checkOrgPermission(organizationId, userId, 'rental-contract.read', lang);
        return contract;
    }

    async findByIdWithFullDetails(
        contractId: string,
        userId: string,
        organizationId: string,
        lang: string,
    ) {
        const contract = await this.repository.findByIdWithFullDetails(contractId);
        if (!contract) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }

        if (contract.organization_id !== organizationId) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }

        await this.checkOrgPermission(organizationId, userId, 'rental-contract.read', lang);
        return contract;
    }

    async renew(
        id: string,
        dto: RenewRentalContractDto,
        userId: string,
        organizationId: string,
        lang: string,
        signatureFile?: Express.Multer.File,
    ): Promise<IRenewContractResult> {
        if (dto.addon_ids) dto.addon_ids = [...new Set(dto.addon_ids)];
        if (dto.coupon_codes) dto.coupon_codes = [...new Set(dto.coupon_codes)];

        const existing = await this.repository.findByIdWithOrganization(id);
        if (!existing) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }

        if (existing.organization_id !== organizationId) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }

        await this.checkOrgPermission(organizationId, userId, 'rental-contract.update', lang);

        if (existing.status !== ContractStatus.ACTIVE) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_renew', { lang }));
        }
        if (!existing.expired_at) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.no_expiry_date', { lang }));
        }

        const tier = await this.prisma.rentalDurationTier.findFirst({
            where: { id: dto.duration_tier_id, is_deleted: false, is_active: true },
        });
        if (!tier) {
            throw new BadRequestException(this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }));
        }
        const adjustMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);

        const newExpiredAt = new Date(existing.expired_at);
        newExpiredAt.setMonth(newExpiredAt.getMonth() + adjustMonths);

        if (newExpiredAt < new Date()) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_reduce_past_now', { lang }));
        }

        const updateData: Prisma.RentalContractUpdateInput = {
            updated_by: userId,
            expired_at: newExpiredAt,
        };

        const contract = await this.repository.update(id, updateData);

        await Promise.all([
            this.invalidateContractCache(id),
            this.invalidateContractListCache(),
        ]);

        if (existing.organization?.owner) {
            try {
                await this.sendContractTimeChangedEmail({
                    ownerEmail: existing.organization.owner.email,
                    ownerName: existing.organization.owner.name,
                    contractCode: existing.code,
                    adjustMonths: adjustMonths,
                    newExpiredAt,
                    lang,
                });
            } catch (emailError) {
                this.systemLogService.error('rental-contract', 'email', 'Failed to send contract changed email', { userId, metaData: { contractId: id, error: String(emailError) } });
            }
        }

        const action = adjustMonths > 0 ? 'renew' : 'reduce';
        this.systemLogService.info('rental-contract', action, `${action} rental contract: ${contract.code}`, { userId, metaData: { contractId: id, adjustMonths } });
        this.auditLogService.logUpdate(organizationId, 'rental_contract', id, { expired_at: existing.expired_at } as unknown as Record<string, unknown>, { adjustMonths } as unknown as Record<string, unknown>, { userId, description: `${action} rental contract: ${contract.code}` });
        this.websocketGateway.emitRentalContractRenewed(organizationId, id, contract.code, newExpiredAt.toISOString(), userId);

        let signatureResult: any = null;
        if (signatureFile) {
            try {
                signatureResult = await this.signatureService.uploadSignature(contract.id, signatureFile.buffer, userId, lang);
            } catch (error) {
                this.systemLogService.error('rental-contract', 'upload_signature_error', `Failed to upload signature for renew contract ${contract.id}`, { metaData: { error, contractId: contract.id } });
            }
        }

        return { contract, signature: signatureResult };
    }

    async delete(
        id: string,
        dto: OrgCancelContractDto,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }
        if (existing.organization_id !== organizationId) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }

        await this.checkOrgPermission(organizationId, userId, 'rental-contract.delete', lang);

        if (([ContractStatus.COMPLETED, ContractStatus.LIQUIDATED] as ContractStatus[]).includes(existing.status)) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_cancel', { lang }));
        }

        await this.repository.cancelContract(id, userId, ContractCancelType.CLIENT_REQUEST, dto.cancel_reason);

        const lockKey = `rental:lock:contract:${id}`;
        await this.releaseLock([lockKey]);

        await Promise.all([this.invalidateContractCache(id), this.invalidateContractListCache()]);

        this.systemLogService.info('rental-contract', 'delete_org', `Cancelled rental contract (org): ${existing.code}`, { userId, metaData: { contractId: id, code: existing.code } });
        this.auditLogService.logDelete(organizationId, 'rental_contract', id, { status: existing.status, code: existing.code } as unknown as Record<string, unknown>, { userId, description: `Cancelled rental contract: ${existing.code}` });
    }

    async deleteMany(
        items: OrgDeleteManyItemDto[],
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<void> {
        const ids = items.map(item => item.id);
        const contracts = await this.repository.findByIds(ids);
        if (contracts.length === 0) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }

        await this.checkOrgPermission(organizationId, userId, 'rental-contract.delete', lang);

        if (contracts.some(c => c.organization_id !== organizationId)) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }

        if (contracts.some(c => ([ContractStatus.COMPLETED, ContractStatus.LIQUIDATED] as ContractStatus[]).includes(c.status))) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_cancel', { lang }));
        }

        for (const item of items) {
            await this.repository.cancelContract(item.id, userId, ContractCancelType.CLIENT_REQUEST, item.cancel_reason);
        }

        const lockKeys = ids.map(id => `rental:lock:contract:${id}`);
        await this.releaseLock(lockKeys);

        await Promise.all(ids.map(id => this.invalidateContractCache(id)));
        await this.invalidateContractListCache();

        this.websocketGateway.emitToOrganization(organizationId, 'rentalContract:deletedMany', {
            ids, orgId: organizationId, deletedBy: userId, timestamp: new Date().toISOString(),
        });

        const org = await this.organizationRepository.findById(organizationId);
        if (org?.owner?.email) {
            try {
                const deleter = await this.organizationRepository.findUserById(userId);
                await this.emailService.sendContractCancelledEmail(
                    org.owner.email,
                    org.owner.name || org.owner.email,
                    contracts.map(c => c.code),
                    deleter?.name || userId,
                    lang
                );
            } catch (error) { }
        }
    }

    async retryPayment(
        contractId: string,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<ICreateContractResult> {
        const contract = await this.repository.findById(contractId);
        if (!contract) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }
        if (contract.organization_id !== organizationId) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }

        await this.checkOrgPermission(organizationId, userId, 'rental-contract.update', lang);

        if (contract.status !== ContractStatus.PENDING) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_retry_non_pending', { lang }));
        }

        const existingPayments = await this.repository.findPaymentsByContract(contractId);
        const currentPayment = existingPayments.find(p => p.status === 'PENDING');
        if (currentPayment?.expired_at && new Date() < currentPayment.expired_at) {
            throw new BadRequestException(this.i18n.t('rental-contract.errors.payment_still_active', { lang }));
        }

        const lockKeys: string[] = [];
        if (contract.details) {
            for (const detail of contract.details) {
                if (detail.is_whole_warehouse) {
                    lockKeys.push(`rental:lock:template:${detail.warehouse_template_id}`);
                } else if (detail.row_template_ids) {
                    for (const rowId of detail.row_template_ids) {
                        lockKeys.push(`rental:lock:row:${rowId}`);
                    }
                }
            }
        }

        for (const lockKey of lockKeys) {
            const lockValue = await this.redisService.get(lockKey);
            if (lockValue && lockValue !== contractId) {
                throw new ConflictException(this.i18n.t('warehouse.errors.template_locked', { lang }));
            }
        }

        if (currentPayment) {
            // Cancel old scheduled
            this.paymentScheduler.cancelScheduledExpire(currentPayment.id);
        }

        const paymentResult = await this.sepayService.createContractPayment({
            rentalContractId: contractId,
            amount: Math.round(parseFloat(contract.final_price.toString())),
            description: contract.code,
            type: 'NEW_CONTRACT',
            userId,
        });

        const paymentExpiredAt = new Date();
        paymentExpiredAt.setSeconds(paymentExpiredAt.getSeconds() + this.LOCK_DURATION_SECONDS);
        this.paymentScheduler.schedulePaymentExpire(paymentResult.paymentId, paymentExpiredAt, userId);

        return { contract, payment: paymentResult };
    }

    async getContractAddons(contractId: string, userId: string, organizationId: string, lang: string) {
        const contract = await this.checkAccess(contractId, userId, organizationId, 'rental-contract.read', lang);
        return this.repository.findContractAddons(contractId);
    }

    async getContractInsurances(contractId: string, userId: string, organizationId: string, lang: string) {
        const contract = await this.checkAccess(contractId, userId, organizationId, 'rental-contract.read', lang);
        return this.repository.findContractInsurances(contractId);
    }

    async getContractLogs(contractId: string, userId: string, organizationId: string, lang: string) {
        const contract = await this.checkAccess(contractId, userId, organizationId, 'rental-contract.read', lang);
        return this.repository.findContractLogs(contractId);
    }

    private async checkAccess(contractId: string, userId: string, organizationId: string, permission: string, lang: string) {
        const contract = await this.repository.findById(contractId);
        if (!contract) {
            throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
        }
        if (contract.organization_id !== organizationId) {
            throw new ForbiddenException(this.i18n.t('rental-contract.errors.no_permission', { lang }));
        }
        await this.checkOrgPermission(organizationId, userId, permission, lang);
        return contract;
    }

    // Helper methods (Duplicated from Admin Service to ensure independence)

    private generateContractCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${this.CONTRACT_PREFIX}-${result}`;
    }

    private async calculateRentalPriceForTemplate(
        template: any,
        templateItem: RentalTemplateItemDto,
        months: number,
        isWholeWarehouse: boolean,
        durationTierId: string,
    ): Promise<IRentalPriceCalculation> {
        const discountRate = this.getDiscountRate(isWholeWarehouse, template, templateItem.row_template_ids, durationTierId);
        const rentalDays = months * 30;

        let pricePerMonth = 0;
        let subtotal = 0;

        if (isWholeWarehouse) {
            const rawPrice = Number(template.price_per_month);
            pricePerMonth = isNaN(rawPrice) ? 0 : rawPrice;
            subtotal = pricePerMonth * months * (1 - discountRate / 100);
        } else if (
            templateItem.row_template_ids &&
            templateItem.row_template_ids.length > 0
        ) {
            for (const rowId of templateItem.row_template_ids) {
                const row = template.rows?.find((r: any) => r.id === rowId);
                if (row) {
                    const rowPrice = Number(row.price_per_month);
                    pricePerMonth += isNaN(rowPrice) ? 0 : rowPrice;
                }
            }
            subtotal = pricePerMonth * months * (1 - discountRate / 100);
        }

        // Ensure subtotal is never NaN
        if (isNaN(subtotal)) subtotal = 0;

        return {
            templateId: templateItem.template_id,
            warehouseName: templateItem.warehouse_name,
            warehouseDescription: templateItem.warehouse_description,
            contentsDescription: templateItem.contents_description,
            rowTemplateIds: templateItem.row_template_ids || [],
            isWholeWarehouse,
            pricePerMonth,
            discountRate,
            rentalDays,
            subtotal,
        };
    }

    /**
     * Get discount rate from WarehouseDiscountConfig or RowDiscountConfig based on duration tier
     */
    private getDiscountRate(
        isWholeWarehouse: boolean,
        template: any,
        rowTemplateIds: string[] | undefined,
        durationTierId: string,
    ): number {
        // For whole warehouse, use warehouse discount_configs
        if (isWholeWarehouse && template.discount_configs) {
            const config = template.discount_configs.find(
                (c: any) => c.duration_tier_id === durationTierId && !c.is_deleted,
            );
            if (config) {
                const discount = Number(config.discount_percent);
                return isNaN(discount) ? 0 : Math.min(discount, 100);
            }
        }

        // For shared warehouse (row rental), calculate average discount from rows
        if (!isWholeWarehouse && rowTemplateIds?.length && template.rows) {
            let totalDiscount = 0;
            let count = 0;
            for (const rowId of rowTemplateIds) {
                const row = template.rows.find((r: any) => r.id === rowId);
                if (row?.discount_configs) {
                    const rowConfig = row.discount_configs.find(
                        (c: any) => c.duration_tier_id === durationTierId && !c.is_deleted,
                    );
                    if (rowConfig) {
                        const discount = Number(rowConfig.discount_percent);
                        if (!isNaN(discount)) {
                            totalDiscount += discount;
                            count++;
                        }
                    }
                }
            }
            if (count > 0) {
                return Math.min(totalDiscount / count, 100);
            }
        }

        // Default: no discount
        return 0;
    }

    private async acquireLock(keys: string | string[]): Promise<{ success: boolean }> {
        const lockKeys = Array.isArray(keys) ? keys : [keys];
        for (const key of lockKeys) {
            const exists = await this.redisService.exists(key);
            if (exists) return { success: false };
        }
        for (const key of lockKeys) {
            await this.redisService.set(key, 'locked', this.LOCK_DURATION_SECONDS);
        }
        return { success: true };
    }

    private async releaseLock(keys: string | string[]): Promise<void> {
        const lockKeys = Array.isArray(keys) ? keys : [keys];
        for (const key of lockKeys) await this.redisService.del(key);
    }

    private getContractListCacheKey(query: Record<string, unknown>): string {
        const sortedParams = Object.keys(query).sort().map((key) => `${key}=${query[key]}`).join('&');
        return `rental-contract:list:${sortedParams}`;
    }
    private async invalidateContractCache(id: string): Promise<void> {
        await this.redisService.del(`rental-contract:${id}`);
    }
    private async invalidateContractListCache(): Promise<void> {
        await this.redisService.delByPattern('rental-contract:list:*');
    }
    private convertDurationToMonths(value: number, unit: string): number {
        switch (unit?.toUpperCase()) {
            case 'DAY': return Math.ceil(value / 30);
            case 'WEEK': return Math.ceil((value * 7) / 30);
            case 'MONTH': return value;
            case 'YEAR': return value * 12;
            default: return value;
        }
    }

    private async sendContractTimeChangedEmail(data: IContractTimeChangedEmail): Promise<void> {
        const isExtension = data.adjustMonths > 0;
        const subject = this.i18n.t(
            isExtension
                ? 'rental-contract.email.contract_extended_subject'
                : 'rental-contract.email.contract_reduced_subject',
            { lang: data.lang, args: { code: data.contractCode } },
        );
        const body = this.i18n.t(
            isExtension
                ? 'rental-contract.email.contract_extended_body'
                : 'rental-contract.email.contract_reduced_body',
            {
                lang: data.lang,
                args: {
                    code: data.contractCode,
                    months: Math.abs(data.adjustMonths),
                    date: data.newExpiredAt.toLocaleDateString('vi-VN'),
                },
            },
        );
        await this.emailService.sendEmail({
            to: data.ownerEmail,
            subject: String(subject),
            text: String(body),
        });
    }
}

