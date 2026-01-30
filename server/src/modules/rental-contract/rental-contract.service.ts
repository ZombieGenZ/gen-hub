import {
  Injectable,
  NotFoundException,
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
  CreateRentalContractDto,
  UpdateRentalContractDto,
  QueryRentalContractDto,
  CancelContractDto,
  DeleteManyItemDto,
  AdminCreateRentalContractDto,
  AdminPaymentType,
  RentalTemplateItemDto,
} from './dto';
import {
  IRentalContractWithRelations,
  IPaginatedResponse,
  ICreateContractResult,
  IRentalPriceCalculation,
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

const Decimal = Prisma.Decimal;

/**
 * Service xử lý business logic cho RentalContract (Admin/System Scope)
 */
@Injectable()
export class RentalContractService {
  private readonly CONTRACT_CACHE_TTL: number;
  private readonly CONTRACT_LIST_CACHE_TTL: number;
  private readonly LOCK_DURATION_SECONDS: number;
  private readonly CONTRACT_PREFIX: string;

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
    private readonly signatureService: SignatureService,
  ) {
    this.CONTRACT_CACHE_TTL = this.configService.get<number>('REDIS_RENTAL_CONTRACT_CACHE_TTL') || 300;
    this.CONTRACT_LIST_CACHE_TTL = this.configService.get<number>('REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL') || 60;
    this.LOCK_DURATION_SECONDS = this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
    this.CONTRACT_PREFIX = this.configService.get<string>('RENTAL_CONTRACT_PREFIX') || 'GENHUB';
  }

  /**
   * Helper: Convert duration to months
   */
  private convertDurationToMonths(value: number, unit: string): number {
    switch (unit?.toUpperCase()) {
      case 'DAY': return Math.ceil(value / 30);
      case 'WEEK': return Math.ceil((value * 7) / 30);
      case 'MONTH': return value;
      case 'YEAR': return value * 12;
      default: return value;
    }
  }

  /**
   * Admin tạo hợp đồng thuê
   */
  async createByAdmin(
    dto: AdminCreateRentalContractDto,
    userId: string,
    lang: string,
    signatureFile?: Express.Multer.File,
  ): Promise<ICreateContractResult> {
    // Logic create by admin
    // Clean duplicate inputs
    if (dto.addon_ids) dto.addon_ids = [...new Set(dto.addon_ids)];
    if (dto.coupon_codes) dto.coupon_codes = [...new Set(dto.coupon_codes)];

    const seenTemplateIds = new Set<string>();
    dto.templates = dto.templates.filter(t => {
      if (seenTemplateIds.has(t.template_id)) return false;
      seenTemplateIds.add(t.template_id);
      if (t.row_template_ids) t.row_template_ids = [...new Set(t.row_template_ids)];
      return true;
    });

    // Get tier info
    const tier = await this.prisma.rentalDurationTier.findFirst({
      where: { id: dto.duration_tier_id, is_deleted: false, is_active: true },
    });
    if (!tier) {
      throw new BadRequestException(this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }));
    }
    const rentalMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);

    // Validating organization exists
    const orgExists = await this.organizationRepository.findById(dto.organization_id);
    if (!orgExists) {
      throw new BadRequestException(this.i18n.t('organization.errors.not_found', { lang }));
    }

    const allPriceDetails: IRentalPriceCalculation[] = [];
    const lockKeys: string[] = [];
    let totalPrice = 0;

    // Calculate price for each template
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
        templateItem.row_template_ids!.forEach((rowId) => lockKeys.push(`rental:lock:row:${rowId}`));
      }

      const priceDetail = await this.calculateRentalPriceForTemplate(template, templateItem, rentalMonths, isWholeWarehouse);
      allPriceDetails.push(priceDetail);
      totalPrice += priceDetail.subtotal;
    }

    const overallDiscountRate = allPriceDetails.length > 0
      ? allPriceDetails.reduce((sum, d) => sum + d.discountRate, 0) / allPriceDetails.length
      : 0;

    // Acquire Locks
    const lockResult = await this.acquireLock(lockKeys);
    if (!lockResult.success) {
      throw new ConflictException(this.i18n.t('warehouse.errors.template_locked', { lang }));
    }

    try {
      const code = this.generateContractCode();
      const rentalDays = rentalMonths * 30;
      const startedAt = dto.scheduled_start_at || new Date();
      const expiredAt = new Date(startedAt.getTime() + rentalDays * 24 * 60 * 60 * 1000);

      // Admin tạo contract: có thể là ACTIVE ngay (CASH) hoặc PENDING (TRANSFER)
      const status = dto.type === AdminPaymentType.CASH ? ContractStatus.ACTIVE : ContractStatus.PENDING;

      const contractData: Prisma.RentalContractCreateInput = {
        code,
        name: `Hợp đồng thuê ${dto.templates.length} kho (Admin)`,
        status,
        started_at: startedAt,
        expired_at: expiredAt,
        total_price: new Decimal(totalPrice),
        discount_rate: new Decimal(overallDiscountRate),
        final_price: new Decimal(totalPrice),
        notes: dto.notes,
        payment_method: dto.payment_method,
        auto_renew: dto.auto_renew ?? false,
        created_by: userId,
        organization: { connect: { id: dto.organization_id } },
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

      if (status === ContractStatus.ACTIVE) {
        // TODO: Activate logic (create real warehouses/rows)
        this.systemLogService.info('rental-contract', 'activate_todo', `TODO: Copy warehouses for contract ${contract.code}`, { userId, metaData: { contractId: contract.id } });
      }

      this.systemLogService.info(
        'rental-contract',
        'create_admin',
        `Admin created contract: ${code} (${status})`,
        { userId, metaData: { contractId: contract.id, code } }
      );

      this.auditLogService.logCreate(
        dto.organization_id,
        'rental_contract',
        contract.id,
        { ...dto, code, admin_create: true } as unknown as Record<string, unknown>,
        { userId, description: `Admin created contract: ${code}` },
      );

      this.websocketGateway.emitRentalContractCreated(dto.organization_id, contract.id, code, userId);
      await this.invalidateContractListCache();

      // Handle Payment Creation if TRANSFER, or Mock if CASH
      let paymentResult;
      if (dto.type === AdminPaymentType.TRANSFER) {
        paymentResult = await this.sepayService.createContractPayment({
          rentalContractId: contract.id,
          amount: Math.round(parseFloat(contract.final_price.toString())),
          description: `${code}`,
          type: 'NEW_CONTRACT',
          userId,
        });
      } else {
        paymentResult = {
          paymentId: 'CASH-' + contract.id,
          paymentCode: 'CASH',
          amount: totalPrice,
          qrCode: '',
          status: 'PAID',
          expiredAt: new Date(),
        };
      }

      // Upload signature if provided
      let signatureResult: any = null;
      if (signatureFile) {
        try {
          signatureResult = await this.signatureService.uploadSignature(contract.id, signatureFile.buffer, userId, lang);
        } catch (error) {
          this.systemLogService.error('rental-contract', 'upload_signature_error', `Failed to upload signature for admin contract ${contract.id}`, { metaData: { error, contractId: contract.id } });
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

  /**
   * Admin lấy danh sách hợp đồng
   */
  async findMany(
    query: QueryRentalContractDto,
    userId: string,
    hasListAllPermission: boolean,
    lang: string = 'vi',
  ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
    // Admin logic: nếu không có list.all, chỉ list contracts của chính mình (nếu admin đóng vai trò user)
    // Hoặc logic hiện tại: admin xem tất cả nếu có list.all
    if (!hasListAllPermission && !query.organization_id) {
      // Trường hợp hy hữu admin không có quyền list all
      const userOrgs = await this.organizationRepository.findOrgIdsByUser(userId);
      if (userOrgs.length === 0) {
        return { items: [], total: 0, limit: query.limit || 10, offset: query.offset || 0, hasMore: false };
      }
      (query as any).organization_ids = userOrgs;
    }

    const queryParams: Record<string, unknown> = {
      limit: query.limit,
      offset: query.offset,
      keywords: query.keywords,
      status: query.status,
      organization_id: query.organization_id,
      userId,
      hasListAllPermission,
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

  /**
   * Admin view detail
   */
  async findById(
    id: string,
    userId: string,
    lang: string = 'vi',
  ): Promise<IRentalContractWithRelations> {
    const contract = await this.repository.findById(id);
    if (!contract) {
      throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
    }
    // Admin có thể view mọi contract (giả sử permission đã check ở controller level hoặc contract guard)
    return contract;
  }

  /**
   * Admin update/renew
   */
  async update(
    id: string,
    dto: UpdateRentalContractDto,
    userId: string,
    lang: string,
  ): Promise<IRentalContractWithRelations> {
    const existing = await this.repository.findByIdWithOrganization(id);
    if (!existing) {
      throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
    }

    let adjustMonths: number | null = null;
    if (dto.extend_duration_tier_id) {
      const tier = await this.prisma.rentalDurationTier.findFirst({
        where: { id: dto.extend_duration_tier_id, is_deleted: false, is_active: true },
      });
      if (!tier) {
        throw new BadRequestException(this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }));
      }
      adjustMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);
    } else if (dto.reduce_months) {
      adjustMonths = -dto.reduce_months;
    }

    if (adjustMonths && existing.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_renew', { lang }));
    }

    const updateData: Prisma.RentalContractUpdateInput = { updated_by: userId };
    if (dto.name) updateData.name = dto.name;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    let newExpiredAt: Date | null = null;
    if (adjustMonths && adjustMonths !== 0 && existing.expired_at) {
      newExpiredAt = new Date(existing.expired_at);
      newExpiredAt.setMonth(newExpiredAt.getMonth() + adjustMonths);
      if (newExpiredAt < new Date()) {
        throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_reduce_past_now', { lang }));
      }
      updateData.expired_at = newExpiredAt;
    }

    const contract = await this.repository.update(id, updateData);

    await Promise.all([this.invalidateContractCache(id), this.invalidateContractListCache()]);

    // Email notification
    if (adjustMonths && newExpiredAt && existing.organization?.owner) {
      this.sendContractTimeChangedEmail({
        ownerEmail: existing.organization.owner.email,
        ownerName: existing.organization.owner.name,
        contractCode: existing.code,
        adjustMonths,
        newExpiredAt,
        lang,
      });
    }

    this.systemLogService.info(
      'rental-contract', 'update', `Admin updated contract ${contract.code}`,
      { userId, metaData: { contractId: id, adjustMonths } }
    );

    this.auditLogService.logUpdate(
      existing.organization_id, 'rental_contract', id,
      { name: existing.name, expired_at: existing.expired_at } as unknown as Record<string, unknown>,
      dto as unknown as Record<string, unknown>,
      { userId, description: `Admin updated contract: ${contract.code}` }
    );

    return contract;
  }

  /**
   * Admin delete
   */
  async delete(
    id: string,
    dto: CancelContractDto,
    userId: string,
    lang: string,
  ): Promise<void> {
    const existing = await this.repository.findByIdWithOrganization(id);
    if (!existing) {
      throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
    }

    if (([ContractStatus.COMPLETED, ContractStatus.LIQUIDATED] as ContractStatus[]).includes(existing.status)) {
      throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_cancel', { lang }));
    }

    await this.repository.cancelContract(id, userId, dto.cancel_type, dto.cancel_reason);

    const lockKey = `rental:lock:contract:${id}`;
    await this.releaseLock([lockKey]);
    await Promise.all([this.invalidateContractCache(id), this.invalidateContractListCache()]);

    // Email
    if (existing.organization?.owner?.email) {
      try {
        // Admin deleting -> use admin name or generic
        this.emailService.sendContractCancelledEmail(
          existing.organization.owner.email,
          existing.organization.owner.name || existing.organization.owner.email,
          [existing.code],
          'Admin',
          lang,
        );
      } catch (e) { }
    }

    this.systemLogService.info('rental-contract', 'delete_admin', `Admin cancelled contract ${existing.code}`, { userId, metaData: { contractId: id } });
    this.auditLogService.logDelete(
      existing.organization_id, 'rental_contract', id,
      { status: existing.status } as unknown as Record<string, unknown>,
      { userId, description: `Admin cancelled contract: ${existing.code}` }
    );
  }

  /**
   * Admin delete many
   */
  async deleteMany(items: DeleteManyItemDto[], userId: string, lang: string): Promise<void> {
    const ids = items.map(item => item.id);
    const contracts = await this.repository.findByIds(ids);
    if (contracts.length === 0) {
      throw new NotFoundException(this.i18n.t('rental-contract.errors.not_found', { lang }));
    }

    // Admin có quyền delete all, chỉ cần check logic business
    if (contracts.some(c => ([ContractStatus.COMPLETED, ContractStatus.LIQUIDATED] as ContractStatus[]).includes(c.status))) {
      throw new BadRequestException(this.i18n.t('rental-contract.errors.cannot_cancel', { lang }));
    }

    for (const item of items) {
      await this.repository.cancelContract(item.id, userId, item.cancel_type, item.cancel_reason);
    }

    const lockKeys = ids.map(id => `rental:lock:contract:${id}`);
    await this.releaseLock(lockKeys);
    await Promise.all(ids.map(id => this.invalidateContractCache(id)));
    await this.invalidateContractListCache();

    // Noti logic (group by org)
    const contractsByOrg = contracts.reduce((acc, c) => {
      acc[c.organization_id] = acc[c.organization_id] || [];
      acc[c.organization_id].push(c);
      return acc;
    }, {} as Record<string, IRentalContractWithRelations[]>);

    for (const orgId in contractsByOrg) {
      const orgContracts = contractsByOrg[orgId];
      this.websocketGateway.emitToOrganization(orgId, 'rentalContract:deletedMany', {
        ids: orgContracts.map(c => c.id), orgId, deletedBy: userId, timestamp: new Date().toISOString(),
      });
      // Audit/Email...
    }
  }


  // --- Shared Helper Methods (Duplicated) ---

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
  ): Promise<IRentalPriceCalculation> {
    const discountRate = this.getDiscountRate(months, isWholeWarehouse, template);
    const rentalDays = months * 30;
    let pricePerMonth = 0;
    let subtotal = 0;

    if (isWholeWarehouse) {
      pricePerMonth = Number(template.price_per_month);
      subtotal = pricePerMonth * months * (1 - discountRate / 100);
    } else if (templateItem.row_template_ids?.length) {
      for (const rowId of templateItem.row_template_ids) {
        const row = template.rows?.find((r: any) => r.id === rowId);
        if (row) pricePerMonth += Number(row.price_per_month);
      }
      subtotal = pricePerMonth * months * (1 - discountRate / 100);
    }

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

  private getDiscountRate(months: number, isWholeWarehouse: boolean, template: any): number {
    let baseDiscount = 0;
    if (months >= 36) baseDiscount = Number(template.discount_3_years_plus);
    else if (months >= 24) baseDiscount = Number(template.discount_2_years);
    else if (months >= 12) baseDiscount = Number(template.discount_1_year);
    else if (months >= 6) baseDiscount = Number(template.discount_6_months);
    else if (months >= 3) baseDiscount = Number(template.discount_3_months);
    else baseDiscount = Number(template.discount_1_month);
    return Math.min(baseDiscount, 100);
  }

  private async sendContractTimeChangedEmail(data: IContractTimeChangedEmail): Promise<void> {
    const isExtension = data.adjustMonths > 0;
    const subject = this.i18n.t(isExtension ? 'rental-contract.email.contract_extended_subject' : 'rental-contract.email.contract_reduced_subject', { lang: data.lang, args: { code: data.contractCode } });
    const body = this.i18n.t(isExtension ? 'rental-contract.email.contract_extended_body' : 'rental-contract.email.contract_reduced_body', {
      lang: data.lang,
      args: { code: data.contractCode, months: Math.abs(data.adjustMonths), date: data.newExpiredAt.toLocaleDateString('vi-VN') },
    });
    await this.emailService.sendEmail({ to: data.ownerEmail, subject: String(subject), text: String(body) });
  }

  private async acquireLock(keys: string | string[]): Promise<{ success: boolean }> {
    const lockKeys = Array.isArray(keys) ? keys : [keys];
    for (const key of lockKeys) {
      if (await this.redisService.exists(key)) return { success: false };
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

  /**
   * Hủy các contracts PENDING xung đột khi một contract được thanh toán thành công
   * Được gọi từ SepayService khi nhận webhook thanh toán thành công
   */
  async cancelConflictingContracts(contractId: string): Promise<void> {
    // Lấy contract vừa được thanh toán
    const contract = await this.repository.findById(contractId);
    if (!contract || !contract.details) {
      return;
    }

    // Thu thập templateIds và rowTemplateIds
    const templateIds: string[] = [];
    const rowTemplateIds: string[] = [];

    for (const detail of contract.details) {
      if (detail.warehouse_template_id) templateIds.push(detail.warehouse_template_id);
      if (detail.row_template_ids && detail.row_template_ids.length > 0) {
        // row_template_ids could be null or empty
        detail.row_template_ids.forEach(id => rowTemplateIds.push(id));
      }
    }

    if (templateIds.length === 0 && rowTemplateIds.length === 0) return;

    // Tìm các contracts xung đột
    const conflictingContracts = await this.repository.findConflictingPendingContracts(
      templateIds,
      rowTemplateIds,
      contractId,
    );

    if (conflictingContracts.length === 0) return;

    // Hủy từng contract xung đột
    for (const conflictContract of conflictingContracts) {
      try {
        // Hủy contract
        await this.repository.cancelContract(
          conflictContract.id,
          'SYSTEM',
          ContractCancelType.VIOLATION,
          'Hủy tự động do xung đột với hợp đồng khác được thanh toán trước',
        );

        // Hủy các scheduled payments/contracts
        const payments = await this.repository.findPaymentsByContract(conflictContract.id);
        for (const payment of payments) {
          if (payment.status === 'PENDING') {
            this.paymentScheduler.cancelScheduledExpire(payment.id);
          }
        }
        this.paymentScheduler.cancelScheduledCancel(conflictContract.id);

        // Emit socket event
        if (conflictContract.created_by) {
          this.websocketGateway.server.to(`user:${conflictContract.created_by}`).emit('contract:cancelled_by_conflict', {
            contractId: conflictContract.id,
            code: conflictContract.code,
            reason: 'warehouse_rented_by_others',
            conflictWithContractId: contractId,
          });
        }

        // Log
        this.systemLogService.info(
          'rental-contract',
          'cancel-by-conflict',
          `Contract ${conflictContract.code} cancelled due to conflict with ${contract.code}`,
          {
            metaData: {
              cancelledContractId: conflictContract.id,
              activeContractId: contractId,
            },
          },
        );
      } catch (error) {
        this.systemLogService.error(
          'rental-contract',
          'cancel-by-conflict',
          `Failed to cancel conflicting contract ${conflictContract.id}: ${error}`,
          { metaData: { contractId: conflictContract.id, error: String(error) } },
        );
      }
    }

    // Invalidate cache
    await this.invalidateContractListCache();
  }
}
