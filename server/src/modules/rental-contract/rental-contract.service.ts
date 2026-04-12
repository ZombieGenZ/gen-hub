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
  private readonly VAT_RATE: number;

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
    this.CONTRACT_CACHE_TTL =
      this.configService.get<number>('REDIS_RENTAL_CONTRACT_CACHE_TTL') || 300;
    this.CONTRACT_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL') ||
      60;
    this.LOCK_DURATION_SECONDS =
      this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
    this.CONTRACT_PREFIX =
      this.configService.get<string>('RENTAL_CONTRACT_PREFIX') || 'GENHUB';
    this.VAT_RATE = this.configService.get<number>('RENTAL_VAT_RATE') || 0;
  }

  /**
   * Helper: Convert duration to months
   */
  private convertDurationToMonths(value: number, unit: string): number {
    switch (unit?.toUpperCase()) {
      case 'DAY':
        return Math.ceil(value / 30);
      case 'WEEK':
        return Math.ceil((value * 7) / 30);
      case 'MONTH':
        return value;
      case 'YEAR':
        return value * 12;
      default:
        return value;
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
    dto.templates = dto.templates.filter((t) => {
      if (seenTemplateIds.has(t.template_id)) return false;
      seenTemplateIds.add(t.template_id);
      if (t.row_template_ids)
        t.row_template_ids = [...new Set(t.row_template_ids)];
      return true;
    });

    // Get tier info
    const tier = await this.prisma.rentalDurationTier.findFirst({
      where: { id: dto.duration_tier_id, is_deleted: false, is_active: true },
    });
    if (!tier) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.validation.duration_tier_not_found', {
          lang,
        }),
      );
    }
    const rentalMonths = this.convertDurationToMonths(
      tier.duration_value,
      tier.duration_unit,
    );

    // Validating organization exists
    const orgExists = await this.organizationRepository.findById(
      dto.organization_id,
    );
    if (!orgExists) {
      throw new BadRequestException(
        this.i18n.t('organization.errors.not_found', { lang }),
      );
    }

    const allPriceDetails: IRentalPriceCalculation[] = [];
    const lockKeys: string[] = [];
    let totalPrice = 0;

    // Calculate price for each template
    for (const templateItem of dto.templates) {
      const template = await this.templateRepository.findById(
        templateItem.template_id,
      );
      if (!template) {
        throw new NotFoundException(
          this.i18n.t('rental-contract.errors.template_not_found', { lang }),
        );
      }
      const isWholeWarehouse =
        !templateItem.row_template_ids ||
        templateItem.row_template_ids.length === 0;
      if (!isWholeWarehouse && !template.is_shared_warehouse) {
        throw new BadRequestException(
          this.i18n.t('warehouse.errors.not_shared_warehouse', { lang }),
        );
      }

      // Check if template/rows are already rented
      if (isWholeWarehouse) {
        if (template.is_rented || template.rental_status === 'RENTED') {
          throw new ConflictException({
            code: 'rental-contract.warehouse_lock.conflict',
            message: this.i18n.t('rental-contract.warehouse_lock.conflict', {
              lang,
            }),
            success: false,
          });
        }
        lockKeys.push(`rental:lock:template:${templateItem.template_id}`);
      } else {
        for (const rowId of templateItem.row_template_ids!) {
          const row = template.rows?.find((r: any) => r.id === rowId);
          if (row?.is_rented) {
            throw new ConflictException({
              code: 'rental-contract.warehouse_lock.conflict',
              message: this.i18n.t('rental-contract.warehouse_lock.conflict', {
                lang,
              }),
              success: false,
            });
          }
          lockKeys.push(`rental:lock:row:${rowId}`);
        }
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

    const overallDiscountRate =
      allPriceDetails.length > 0
        ? allPriceDetails.reduce((sum, d) => sum + d.discountRate, 0) /
          allPriceDetails.length
        : 0;

    // Acquire Locks
    const lockResult = await this.acquireLock(lockKeys);
    if (!lockResult.success) {
      throw new ConflictException({
        code: 'rental-contract.warehouse_lock.locked',
        message: this.i18n.t('rental-contract.warehouse_lock.locked', { lang }),
        success: false,
      });
    }

    try {
      const code = this.generateContractCode();
      const rentalDays = rentalMonths * 30;
      const startedAt = dto.scheduled_start_at || new Date();
      const expiredAt = new Date(
        startedAt.getTime() + rentalDays * 24 * 60 * 60 * 1000,
      );

      // Admin tạo contract: có thể là ACTIVE ngay (CASH) hoặc PENDING (TRANSFER)
      const status =
        dto.type === AdminPaymentType.CASH
          ? ContractStatus.ACTIVE
          : ContractStatus.PENDING;

      // Tính thuế VAT ban đầu
      const vatRate = this.VAT_RATE;
      const initialVatAmount = Math.round(totalPrice * (vatRate / 100));

      const contractData: Prisma.RentalContractCreateInput = {
        code,
        name: `Hợp đồng thuê ${dto.templates.length} kho (Admin)`,
        status,
        started_at: startedAt,
        expired_at: expiredAt,
        total_price: new Decimal(totalPrice),
        discount_rate: new Decimal(overallDiscountRate),
        vat_rate: new Decimal(vatRate),
        vat_amount: new Decimal(initialVatAmount),
        final_price: new Decimal(totalPrice + initialVatAmount),
        notes: dto.notes,
        payment_method: dto.payment_method,
        auto_renew: dto.auto_renew ?? false,
        created_by: userId,
        organization: { connect: { id: dto.organization_id } },
      };

      const detailsData = allPriceDetails.map((d) => ({
        warehouse_template_id: d.templateId,
        warehouse_name: d.warehouseName,
        warehouse_description: d.warehouseDescription || null,
        contents_description: d.contentsDescription || null,
        rowTemplateIds: d.rowTemplateIds,
        is_whole_warehouse: d.isWholeWarehouse,
        price_per_month: new Decimal(d.pricePerMonth),
        discount_rate: new Decimal(d.discountRate),
        rental_days: d.rentalDays,
        subtotal: new Decimal(d.subtotal),
        created_by: userId,
      }));

      const contract = await this.repository.createWithDetails(
        contractData,
        detailsData,
      );

      // Áp dụng addon nếu có
      let totalAddonPrice = 0;
      if (dto.addon_ids && dto.addon_ids.length > 0) {
        const addons = await this.prisma.addon.findMany({
          where: {
            id: { in: dto.addon_ids },
            is_deleted: false,
            is_active: true,
          },
        });

        for (const addon of addons) {
          await this.repository.addAddon({
            rental_contract_id: contract.id,
            addon_id: addon.id,
            price_at_purchase: Number(addon.price),
            is_gift: false,
            created_by: userId,
          });
          const addonCostDetail = addon.is_monthly_payment
            ? Number(addon.price) * rentalMonths
            : Number(addon.price);
          totalAddonPrice += addonCostDetail;
        }
      }

      // Áp dụng bảo hiểm nếu có
      let totalInsurancePrice = 0;
      if (dto.insurance_ids && dto.insurance_ids.length > 0) {
        const insurances = await this.prisma.insurance.findMany({
          where: {
            id: { in: dto.insurance_ids },
            is_deleted: false,
            is_active: true,
          },
        });

        for (const insurance of insurances) {
          let managementFee = 0;
          if (insurance.use_management_fee && insurance.management_fee_value) {
            if (insurance.management_fee_type === 'PERCENT') {
              const totalBaseRental = allPriceDetails.reduce(
                (sum, d) => sum + d.pricePerMonth * (d.rentalDays / 30),
                0,
              );
              managementFee =
                totalBaseRental *
                (Number(insurance.management_fee_value) / 100);
            } else {
              managementFee =
                Number(insurance.management_fee_value) * rentalMonths;
            }
          }

          await this.repository.addInsurance({
            rental_contract_id: contract.id,
            insurance_id: insurance.id,
            price_at_purchase: Number(insurance.price),
            management_fee: managementFee || undefined,
            created_by: userId,
          });

          const insuranceBasePrice = Number(insurance.price) * rentalMonths;
          totalInsurancePrice += insuranceBasePrice + managementFee;
        }
      }

      if (totalAddonPrice > 0 || totalInsurancePrice > 0) {
        const currentFinal = parseFloat(contract.final_price.toString());
        const currentVat = parseFloat(contract.vat_amount?.toString() || '0');
        const newBasePrice =
          currentFinal - currentVat + totalAddonPrice + totalInsurancePrice;
        const recalculatedVat = Math.round(newBasePrice * (vatRate / 100));
        const newFinalPrice = newBasePrice + recalculatedVat;
        await this.prisma.rentalContract.update({
          where: { id: contract.id },
          data: {
            final_price: new Decimal(newFinalPrice),
            vat_amount: new Decimal(recalculatedVat),
          },
        });
        (contract as any).final_price = new Decimal(newFinalPrice);
        (contract as any).vat_amount = new Decimal(recalculatedVat);
      }

      if (status === ContractStatus.ACTIVE) {
        await this.activateContractWarehouses(
          contract.id,
          dto.organization_id,
          userId,
        );
      }

      this.systemLogService.info(
        'rental-contract',
        'create_admin',
        `Admin created contract: ${code} (${status})`,
        { userId, metaData: { contractId: contract.id, code } },
      );

      this.auditLogService.logCreate(
        dto.organization_id,
        'rental_contract',
        contract.id,
        { ...dto, code, admin_create: true } as unknown as Record<
          string,
          unknown
        >,
        { userId, description: `Admin created contract: ${code}` },
      );

      this.websocketGateway.emitRentalContractCreated(
        dto.organization_id,
        contract.id,
        code,
        userId,
      );
      await this.invalidateContractListCache();

      // Handle Payment Creation if TRANSFER, or Mock if CASH
      let paymentResult;
      if (dto.type === AdminPaymentType.TRANSFER) {
        paymentResult = await this.sepayService.createContractPayment({
          rentalContractId: contract.id,
          amount: Math.round(parseFloat(contract.final_price.toString())),
          vat_amount: Math.round(
            parseFloat(contract.vat_amount?.toString() || '0'),
          ),
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
            `Failed to upload signature for admin contract ${contract.id}`,
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
      const userOrgs =
        await this.organizationRepository.findOrgIdsByUser(userId);
      if (userOrgs.length === 0) {
        return {
          items: [],
          total: 0,
          limit: query.limit || 10,
          offset: query.offset || 0,
          hasMore: false,
        };
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
      } catch {}
    }

    const result = await this.repository.findMany(query);
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.CONTRACT_LIST_CACHE_TTL,
    );
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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }
    // Admin có thể view mọi contract (giả sử permission đã check ở controller level hoặc contract guard)
    // Serialize safely: BigInt fields (e.g. sepay_transaction_id) cannot be JSON.stringify-ed natively
    const contractObj = JSON.parse(
      JSON.stringify(contract, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
    return {
      ...contractObj,
      payments: contractObj.payments?.map((p: any) => ({
        ...p,
        method: contract.payment_method, // Back-fill method from contract
        transaction_code: p.payment_code, // Map payment_code to transaction_code
      })),
    } as unknown as IRentalContractWithRelations;
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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    let adjustMonths: number | null = null;
    if (dto.extend_duration_tier_id) {
      const tier = await this.prisma.rentalDurationTier.findFirst({
        where: {
          id: dto.extend_duration_tier_id,
          is_deleted: false,
          is_active: true,
        },
      });
      if (!tier) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.validation.duration_tier_not_found', {
            lang,
          }),
        );
      }
      adjustMonths = this.convertDurationToMonths(
        tier.duration_value,
        tier.duration_unit,
      );
    } else if (dto.reduce_months) {
      adjustMonths = -dto.reduce_months;
    }

    if (adjustMonths && existing.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_renew', { lang }),
      );
    }

    const updateData: Prisma.RentalContractUpdateInput = { updated_by: userId };
    if (dto.name) updateData.name = dto.name;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    let newExpiredAt: Date | null = null;
    if (adjustMonths && adjustMonths !== 0 && existing.expired_at) {
      newExpiredAt = new Date(existing.expired_at);
      newExpiredAt.setMonth(newExpiredAt.getMonth() + adjustMonths);
      if (newExpiredAt < new Date()) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.errors.cannot_reduce_past_now', {
            lang,
          }),
        );
      }
      updateData.expired_at = newExpiredAt;
    }

    let contract = await this.repository.update(id, updateData);

    // ─── Sync Addons ───
    if (dto.addon_ids !== undefined) {
      const currentAddons = await this.repository.findContractAddons(id);
      const activeAddons = currentAddons.filter((a) => !a.is_cancelled);
      const currentAddonIds = new Set(activeAddons.map((a) => a.addon_id));
      const desiredAddonIds = new Set(dto.addon_ids);

      // Add new addons
      const toAdd = dto.addon_ids.filter((aid) => !currentAddonIds.has(aid));
      if (toAdd.length > 0) {
        const addons = await this.prisma.addon.findMany({
          where: { id: { in: toAdd }, is_deleted: false, is_active: true },
        });
        for (const addon of addons) {
          await this.repository.addAddon({
            rental_contract_id: id,
            addon_id: addon.id,
            price_at_purchase: Number(addon.price),
            is_gift: false,
            created_by: userId,
          });
          await this.repository.createLog({
            rental_contract_id: id,
            action: 'ADDON_ADDED',
            description: `Đã thêm dịch vụ: ${addon.name}`,
            metadata: {
              addon_id: addon.id,
              addon_name: addon.name,
              price: Number(addon.price),
            },
            created_by: userId,
          });
        }
      }

      // Cancel removed addons (only if within 2 days)
      for (const existingAddon of activeAddons) {
        if (!desiredAddonIds.has(existingAddon.addon_id)) {
          const createdAt = new Date(existingAddon.created_at);
          const now = new Date();
          const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
          if (now.getTime() - createdAt.getTime() <= twoDaysMs) {
            await this.repository.cancelAddon(
              existingAddon.id,
              'Người dùng hủy từ trang quản lý dịch vụ',
              userId,
            );
            await this.repository.createLog({
              rental_contract_id: id,
              action: 'ADDON_CANCELLED',
              description: `Đã hủy dịch vụ: ${existingAddon.addon?.name || existingAddon.addon_id}`,
              metadata: { addon_id: existingAddon.addon_id },
              created_by: userId,
            });
          }
        }
      }

      // Refresh contract after addon changes
      contract = await this.repository.update(id, { updated_by: userId });
    }

    // ─── Sync Insurances ───
    if (dto.insurance_ids !== undefined) {
      const currentInsurances =
        await this.repository.findContractInsurances(id);
      const currentInsuranceIds = new Set(
        currentInsurances.map((i) => i.insurance_id),
      );
      const desiredInsuranceIds = new Set(dto.insurance_ids);

      // Add new insurances
      const toAddIns = dto.insurance_ids.filter(
        (iid) => !currentInsuranceIds.has(iid),
      );
      if (toAddIns.length > 0) {
        const insurances = await this.prisma.insurance.findMany({
          where: { id: { in: toAddIns }, is_deleted: false, is_active: true },
        });
        const rentalMonthsForInsurance = contract.expired_at
          ? Math.max(
              0,
              Math.round(
                (new Date(contract.expired_at).getTime() -
                  new Date(contract.started_at).getTime()) /
                  (1000 * 60 * 60 * 24 * 30),
              ),
            )
          : Math.max(
              0,
              Math.round(Number(contract.details?.[0]?.rental_days ?? 0) / 30),
            );
        for (const insurance of insurances) {
          let managementFee = 0;
          if (insurance.use_management_fee && insurance.management_fee_value) {
            if (insurance.management_fee_type === 'PERCENT') {
              const totalBaseRental = (contract.details ?? []).reduce(
                (sum, detail) => {
                  const pricePerMonth = Number(detail.price_per_month ?? 0);
                  const rentalDays = Number(detail.rental_days ?? 0);
                  return sum + pricePerMonth * (rentalDays / 30);
                },
                0,
              );
              managementFee =
                totalBaseRental *
                (Number(insurance.management_fee_value) / 100);
            } else {
              managementFee =
                Number(insurance.management_fee_value) *
                rentalMonthsForInsurance;
            }
          }

          await this.repository.addInsurance({
            rental_contract_id: id,
            insurance_id: insurance.id,
            price_at_purchase: Number(insurance.price),
            management_fee: managementFee || undefined,
            created_by: userId,
          });
          await this.repository.createLog({
            rental_contract_id: id,
            action: 'ADDON_ADDED',
            description: `Đã thêm bảo hiểm: ${insurance.name}`,
            metadata: {
              insurance_id: insurance.id,
              insurance_name: insurance.name,
              price: Number(insurance.price),
            },
            created_by: userId,
          });
        }
      }

      contract = await this.repository.update(id, { updated_by: userId });
    }

    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

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
      'rental-contract',
      'update',
      `Admin updated contract ${contract.code}`,
      { userId, metaData: { contractId: id, adjustMonths } },
    );

    this.auditLogService.logUpdate(
      existing.organization_id,
      'rental_contract',
      id,
      {
        name: existing.name,
        expired_at: existing.expired_at,
      } as unknown as Record<string, unknown>,
      dto as unknown as Record<string, unknown>,
      { userId, description: `Admin updated contract: ${contract.code}` },
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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    if (
      (
        [
          ContractStatus.COMPLETED,
          ContractStatus.LIQUIDATED,
        ] as ContractStatus[]
      ).includes(existing.status)
    ) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    await this.repository.cancelContract(
      id,
      userId,
      dto.cancel_type,
      dto.cancel_reason,
    );

    const lockKey = `rental:lock:contract:${id}`;
    await this.releaseLock([lockKey]);
    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

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
      } catch (e) {}
    }

    this.systemLogService.info(
      'rental-contract',
      'delete_admin',
      `Admin cancelled contract ${existing.code}`,
      { userId, metaData: { contractId: id } },
    );
    this.auditLogService.logDelete(
      existing.organization_id,
      'rental_contract',
      id,
      { status: existing.status } as unknown as Record<string, unknown>,
      { userId, description: `Admin cancelled contract: ${existing.code}` },
    );
  }

  /**
   * Admin delete many
   */
  async deleteMany(
    items: DeleteManyItemDto[],
    userId: string,
    lang: string,
  ): Promise<void> {
    const ids = items.map((item) => item.id);
    const contracts = await this.repository.findByIds(ids);
    if (contracts.length === 0) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Admin có quyền delete all, chỉ cần check logic business
    if (
      contracts.some((c) =>
        (
          [
            ContractStatus.COMPLETED,
            ContractStatus.LIQUIDATED,
          ] as ContractStatus[]
        ).includes(c.status),
      )
    ) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    for (const item of items) {
      await this.repository.cancelContract(
        item.id,
        userId,
        item.cancel_type,
        item.cancel_reason,
      );
    }

    const lockKeys = ids.map((id) => `rental:lock:contract:${id}`);
    await this.releaseLock(lockKeys);
    await Promise.all(ids.map((id) => this.invalidateContractCache(id)));
    await this.invalidateContractListCache();

    // Noti logic (group by org)
    const contractsByOrg = contracts.reduce(
      (acc, c) => {
        acc[c.organization_id] = acc[c.organization_id] || [];
        acc[c.organization_id].push(c);
        return acc;
      },
      {} as Record<string, IRentalContractWithRelations[]>,
    );

    for (const orgId in contractsByOrg) {
      const orgContracts = contractsByOrg[orgId];
      this.websocketGateway.emitToOrganization(
        orgId,
        'rentalContract:deletedMany',
        {
          ids: orgContracts.map((c) => c.id),
          orgId,
          deletedBy: userId,
          timestamp: new Date().toISOString(),
        },
      );
      // Audit/Email...
    }
  }

  // --- Activation Logic ---

  /**
   * Sau khi hợp đồng chuyển sang ACTIVE:
   * Tạo Warehouse thực từ WarehouseTemplate cho từng chi tiết hợp đồng
   * (is_whole_warehouse = true). Cập nhật RentalContractDetail.warehouse_id.
   */
  async activateContractWarehouses(
    contractId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const details = await this.prisma.rentalContractDetail.findMany({
      where: { rental_contract_id: contractId, is_deleted: false },
      include: {
        detail_rows: true,
        warehouse_template: {
          include: {
            rows: {
              where: { is_deleted: false },
              include: {
                racks: {
                  where: { is_deleted: false },
                  include: {
                    shelves: {
                      where: { is_deleted: false },
                      include: {
                        blocks: {
                          where: { is_deleted: false },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const detail of details) {
      if (detail.warehouse_id) continue;

      const template = detail.warehouse_template;
      if (!template) continue;

      // Wrap the creation in a transaction to ensure data integrity
      try {
        await this.prisma.$transaction(async (tx) => {
          const warehouse = await tx.warehouse.create({
            data: {
              name: detail.warehouse_name || template.name,
              description:
                detail.warehouse_description || template.description || null,
              organization_id: orgId,
              length: template.length,
              width: template.width,
              block_length: template.block_length,
              block_width: template.block_width,
              ceiling_height: template.ceiling_height ?? null,
              max_load_capacity: template.max_load_capacity ?? null,
              total_weight_capacity: template.total_weight_capacity ?? null,
              ward_id: template.ward_id ?? null,
              address_detail: template.address_detail ?? null,
              latitude: template.latitude ?? null,
              longitude: template.longitude ?? null,
              warehouse_template_id: template.id,
              is_active: true,
              is_deleted: false,
              created_by: userId,
            },
          });

          // Deep clone rows, racks, shelves, and blocks
          for (const rowTpl of template.rows) {
            // IF partial rental AND this rowTpl is NOT in the rented rows list, SKIP!
            if (!detail.is_whole_warehouse && detail.detail_rows) {
              const rentedRowIds = detail.detail_rows.map(
                (dr) => dr.row_template_id,
              );
              if (!rentedRowIds.includes(rowTpl.id)) {
                continue;
              }
            }

            const row = await tx.row.create({
              data: {
                warehouse_id: warehouse.id,
                name: rowTpl.name,
                code: rowTpl.code,
                description: rowTpl.description,
                is_rented: rowTpl.is_rented,
                position_x: rowTpl.position_x,
                position_y: rowTpl.position_y,
                position_rotation: rowTpl.position_rotation,
                total_weight_capacity: rowTpl.total_weight_capacity,
                row_template_id: rowTpl.id,
                is_active: true,
                is_deleted: false,
                created_by: userId,
              },
            });

            for (const rackTpl of rowTpl.racks) {
              const rack = await tx.rack.create({
                data: {
                  row_id: row.id,
                  name: rackTpl.name,
                  code: rackTpl.code,
                  description: rackTpl.description,
                  position_x: rackTpl.position_x,
                  position_y: rackTpl.position_y,
                  position_rotation: rackTpl.position_rotation,
                  dimensions_width: rackTpl.dimensions_width,
                  dimensions_depth: rackTpl.dimensions_depth,
                  dimensions_height: rackTpl.dimensions_height,
                  default_block_max_weight_capacity:
                    rackTpl.default_block_max_weight_capacity,
                  total_weight_capacity: rackTpl.total_weight_capacity,
                  total_height: rackTpl.total_height,
                  overload_threshold_percent:
                    rackTpl.overload_threshold_percent,
                  is_rented: false,
                  is_active: true,
                  is_deleted: false,
                  created_by: userId,
                },
              });

              for (const shelfTpl of rackTpl.shelves) {
                const shelf = await tx.shelf.create({
                  data: {
                    rack_id: rack.id,
                    name: shelfTpl.name,
                    code: shelfTpl.code,
                    description: shelfTpl.description,
                    height: shelfTpl.height,
                    total_weight_capacity: shelfTpl.total_weight_capacity,
                    is_active: true,
                    is_deleted: false,
                    created_by: userId,
                  },
                });

                for (const blockTpl of shelfTpl.blocks) {
                  await tx.block.create({
                    data: {
                      shelf_id: shelf.id,
                      name: blockTpl.name,
                      code: blockTpl.code,
                      description: blockTpl.description,
                      position_x: blockTpl.position_x,
                      position_y: blockTpl.position_y,
                      dimensions_width: blockTpl.dimensions_width,
                      dimensions_height: blockTpl.dimensions_height,
                      max_weight_capacity: blockTpl.max_weight_capacity,
                      height: blockTpl.height,
                      is_active: true,
                      is_deleted: false,
                      created_by: userId,
                    },
                  });
                }
              }
            }
          }

          await tx.rentalContractDetail.update({
            where: { id: detail.id },
            data: { warehouse_id: warehouse.id },
          });

          this.systemLogService.info(
            'rental-contract',
            'activate_warehouse',
            `Created warehouse ${warehouse.id} with layout for org ${orgId} from template ${template.id} (is_whole: ${detail.is_whole_warehouse})`,
            { userId, metaData: { contractId, warehouseId: warehouse.id } },
          );
        });
      } catch (error: any) {
        this.systemLogService.error(
          'rental-contract',
          'activate_warehouse_error',
          `Failed to create warehouse layout for contract detail ${detail.id}: ${error.message}`,
          { userId, metaData: { contractId, detailId: detail.id, error } },
        );
      }
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
    durationTierId: string,
  ): Promise<IRentalPriceCalculation> {
    const discountRate = this.getDiscountRate(
      isWholeWarehouse,
      template,
      templateItem.row_template_ids,
      durationTierId,
    );
    const rentalDays = months * 30;
    let pricePerMonth = 0;
    let subtotal = 0;

    if (isWholeWarehouse) {
      const rawPrice = Number(template.price_per_month);
      pricePerMonth = isNaN(rawPrice) ? 0 : rawPrice;
      subtotal = pricePerMonth * months * (1 - discountRate / 100);
    } else if (templateItem.row_template_ids?.length) {
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

  private async sendContractTimeChangedEmail(
    data: IContractTimeChangedEmail,
  ): Promise<void> {
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

  private async acquireLock(
    keys: string | string[],
  ): Promise<{ success: boolean }> {
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
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
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
      if (detail.warehouse_template_id)
        templateIds.push(detail.warehouse_template_id);
      if (detail.detail_rows && detail.detail_rows.length > 0) {
        detail.detail_rows.forEach((relation) =>
          rowTemplateIds.push(relation.row_template_id),
        );
      }
    }

    if (templateIds.length === 0 && rowTemplateIds.length === 0) return;

    // Tìm các contracts xung đột
    const conflictingContracts =
      await this.repository.findConflictingPendingContracts(
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
        const payments = await this.repository.findPaymentsByContract(
          conflictContract.id,
        );
        for (const payment of payments) {
          if (payment.status === 'PENDING') {
            this.paymentScheduler.cancelScheduledExpire(payment.id);
          }
        }
        this.paymentScheduler.cancelScheduledCancel(conflictContract.id);

        // Emit socket event
        if (conflictContract.created_by) {
          this.websocketGateway.server
            .to(`user:${conflictContract.created_by}`)
            .emit('contract:cancelled_by_conflict', {
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
          {
            metaData: { contractId: conflictContract.id, error: String(error) },
          },
        );
      }
    }

    // Invalidate cache
    await this.invalidateContractListCache();
  }
}
