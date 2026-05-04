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
import {
  ContractStatus,
  Prisma,
  ContractCancelType,
  PaymentStatus,
} from '@prisma/client';
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
import { PdfService } from '../rental-contract-shared/pdf.service';
import { DocusignService } from '../rental-contract-shared/docusign.service';
import { PublicCouponService } from '../public-coupon/public-coupon.service';
import { SendDocusignDto } from './dto';
import { QUOTATION_CONSTANTS } from '../public-quotation/constants/public-quotation.constants';
import { RentalContractMapper } from '../rental-contract-shared/helpers/rental-contract-mapper.helper';

const Decimal = Prisma.Decimal;

@Injectable()
export class OrgRentalContractService {
  private readonly CONTRACT_CACHE_TTL: number;
  private readonly CONTRACT_LIST_CACHE_TTL: number;
  private readonly LOCK_DURATION_SECONDS: number;
  private readonly MAX_PENDING_PER_USER: number;
  private readonly CONTRACT_PREFIX: string;
  private readonly MAX_DELAYED_START_DAYS: number;
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
    private readonly userNotificationService: UserNotificationService,
    private readonly signatureService: SignatureService,
    private readonly pdfService: PdfService,
    private readonly docusignService: DocusignService,
    private readonly publicCouponService: PublicCouponService,
  ) {
    this.CONTRACT_CACHE_TTL =
      this.configService.get<number>('REDIS_RENTAL_CONTRACT_CACHE_TTL') || 300;
    this.CONTRACT_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL') ||
      60;
    this.LOCK_DURATION_SECONDS =
      this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
    this.MAX_PENDING_PER_USER =
      this.configService.get<number>('RENTAL_MAX_PENDING_PER_USER') || 3;
    this.CONTRACT_PREFIX =
      this.configService.get<string>('RENTAL_CONTRACT_PREFIX') || 'GENHUB';
    this.MAX_DELAYED_START_DAYS =
      this.configService.get<number>('RENTAL_MAX_DELAYED_START_DAYS') || 14;
    this.VAT_RATE = this.configService.get<number>('RENTAL_VAT_RATE') || 0;
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

    const member = await this.organizationRepository.findMemberByUserAndOrg(
      userId,
      orgId,
    );
    if (!member || !member.is_accepted) {
      throw new ForbiddenException(
        await this.i18n.translate('rental-contract.errors.no_permission', {
          lang,
        }),
      );
    }

    const hasDirectPermission = member.permissions?.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirectPermission) return;

    // Check permissions via roles
    const hasRolePermission = member.roles?.some((mr) =>
      mr.role?.permissions?.some((rp) => rp.permission?.key === permissionKey),
    );
    if (hasRolePermission) return;

    throw new ForbiddenException(
      await this.i18n.translate('rental-contract.errors.no_permission', {
        lang,
      }),
    );
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
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.create',
      lang,
    );

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

    let contractStartDate = new Date();
    if (dto.scheduled_start_at) {
      const now = new Date();
      const maxStartDate = new Date(
        now.getTime() + this.MAX_DELAYED_START_DAYS * 24 * 60 * 60 * 1000,
      );

      if (dto.scheduled_start_at < now) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.errors.start_date_past', { lang }),
        );
      }
      if (dto.scheduled_start_at > maxStartDate) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.errors.start_date_too_far', {
            lang,
            args: { days: this.MAX_DELAYED_START_DAYS },
          }),
        );
      }
      contractStartDate = dto.scheduled_start_at;
    }

    const pendingCount = await this.repository.countPendingByUser(userId);
    if (pendingCount >= this.MAX_PENDING_PER_USER) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.max_pending_reached', { lang }),
      );
    }

    const allPriceDetails: IRentalPriceCalculation[] = [];
    const lockKeys: string[] = [];
    let totalPrice = 0;
    let overallDiscountRate = 0;

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
      // if (isWholeWarehouse) {
      //     if (template.is_rented || template.rental_status === 'RENTED') {
      //         throw new ConflictException({
      //             code: 'rental-contract.warehouse_lock.conflict',
      //             message: this.i18n.t('rental-contract.warehouse_lock.conflict', { lang }),
      //             success: false,
      //         });
      //     }
      //     lockKeys.push(`rental:lock:template:${templateItem.template_id}`);
      // } else {
      //     for (const rowId of templateItem.row_template_ids!) {
      //         const row = template.rows?.find((r: any) => r.id === rowId);
      //         if (row?.is_rented) {
      //             throw new ConflictException({
      //                 code: 'rental-contract.warehouse_lock.conflict',
      //                 message: this.i18n.t('rental-contract.warehouse_lock.conflict', { lang }),
      //                 success: false,
      //             });
      //         }
      //         lockKeys.push(`rental:lock:row:${rowId}`);
      //     }
      // }

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
      overallDiscountRate =
        allPriceDetails.reduce((sum, d) => sum + d.discountRate, 0) /
        allPriceDetails.length;
    }

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

      const startedAt = contractStartDate;
      const expiredAt = new Date(
        startedAt.getTime() + rentalDays * 24 * 60 * 60 * 1000,
      );

      // Tính thuế VAT ban đầu (chưa có coupon/addon/insurance)
      const vatRate = this.VAT_RATE;
      const initialVatAmount = Math.round(totalPrice * (vatRate / 100));

      const contractData: Prisma.RentalContractCreateInput = {
        code,
        name: `Hợp đồng thuê ${dto.templates.length} kho`,
        status: ContractStatus.PENDING,
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
        organization: { connect: { id: organizationId } },
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

      // ── Bước 1: Lưu addon records & tích luỹ giá ────────────────────────────
      // Thực hiện trước coupon để tính coupon trên fullSubtotal (giống quotation API)
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

      // ── Bước 2: Lưu insurance records & tích luỹ giá ────────────────────────
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

      // ── Bước 3: Tính fullSubtotal (base + addon + insurance) & áp coupon ────
      // Phải tính coupon trên fullSubtotal để khớp với logic quotation API:
      //   grandTotal = (base + addon + insurance - coupon) * 1.1
      const fullSubtotal = totalPrice + totalAddonPrice + totalInsurancePrice;

      let totalCouponDiscount = 0;
      if (dto.coupon_codes && dto.coupon_codes.length > 0) {
        const allTemplateIds = dto.templates.map((t) => t.template_id);
        const allRowTemplateIds = dto.templates.flatMap(
          (t) => t.row_template_ids || [],
        );

        for (const couponCode of dto.coupon_codes) {
          try {
            const validation = await this.publicCouponService.validateCoupon(
              userId,
              {
                code: couponCode,
                type: 'NEW_CONTRACT',
                warehouse_template_ids: allTemplateIds,
                row_template_ids: allRowTemplateIds,
                addon_ids: dto.addon_ids,
                rental_duration_tier_id: dto.duration_tier_id,
                // Validate coupon trên tổng bao gồm cả addon & insurance
                order_amount: fullSubtotal,
              },
              lang,
            );

            if (validation.is_valid && validation.id) {
              const alreadyApplied =
                await this.repository.isCouponAlreadyApplied(
                  contract.id,
                  validation.id,
                );
              if (alreadyApplied) continue;

              const discountAmount = validation.discount_amount || 0;
              await this.repository.addCoupon({
                rental_contract_id: contract.id,
                coupon_id: validation.id,
                discount_value: Number(validation.discount_value) || 0,
                discount_amount: discountAmount,
                created_by: userId,
              });
              totalCouponDiscount += discountAmount;

              // Tăng usage count
              await this.prisma.coupon.update({
                where: { id: validation.id },
                data: { current_usage: { increment: 1 } },
              });
            }
          } catch {
            // Coupon không hợp lệ → bỏ qua, tiếp tục coupon khác
          }
        }
      }

      // ── Bước 4: Tính final_price & vat theo đúng thứ tự giống quotation API ─
      // Công thức: grandTotal = (fullSubtotal - coupon) * (1 + VAT%)
      const priceAfterCoupon = Math.max(0, fullSubtotal - totalCouponDiscount);
      const finalVatAmount = Math.round(priceAfterCoupon * (vatRate / 100));
      const finalPrice = priceAfterCoupon + finalVatAmount;

      await this.prisma.rentalContract.update({
        where: { id: contract.id },
        data: {
          final_price: new Decimal(finalPrice),
          vat_amount: new Decimal(finalVatAmount),
        },
      });
      (contract as any).final_price = new Decimal(finalPrice);
      (contract as any).vat_amount = new Decimal(finalVatAmount);

      this.systemLogService.info(
        'rental-contract',
        'create_org',
        `Org created rental contract: ${code}`,
        {
          userId,
          metaData: {
            contractId: contract.id,
            templateCount: dto.templates.length,
            code,
          },
        },
      );

      this.auditLogService.logCreate(
        organizationId,
        'rental_contract',
        contract.id,
        { ...dto, code } as unknown as Record<string, unknown>,
        { userId, description: `Org created rental contract: ${code}` },
      );

      this.websocketGateway.emitRentalContractCreated(
        organizationId,
        contract.id,
        code,
        userId,
      );
      await this.invalidateContractListCache();

      const finalPriceNum = Math.round(parseFloat(contract.final_price.toString()));
      const vatAmountNum = Math.round(parseFloat(contract.vat_amount?.toString() || '0'));
      const depositAmount = Math.max(
        QUOTATION_CONSTANTS.MIN_DEPOSIT_AMOUNT,
        Math.round(finalPriceNum * QUOTATION_CONSTANTS.DEPOSIT_PERCENT),
      );
      const depositVatAmount = Math.round(vatAmountNum * QUOTATION_CONSTANTS.DEPOSIT_PERCENT);

      const paymentResult = await this.sepayService.createContractPayment({
        rentalContractId: contract.id,
        amount: depositAmount,
        vat_amount: depositVatAmount,
        description: `${code}`,
        type: 'NEW_CONTRACT',
        userId,
      });

      const paymentExpiredAt = new Date();
      paymentExpiredAt.setSeconds(
        paymentExpiredAt.getSeconds() + this.LOCK_DURATION_SECONDS,
      );
      this.paymentScheduler.schedulePaymentExpire(
        paymentResult.paymentId,
        paymentExpiredAt,
        userId,
      );

      const contractCancelAt = new Date();
      // Default 24h expires pending contract if not paid
      const contractExpireSeconds =
        this.configService.get<number>('CONTRACT_PENDING_EXPIRE_SECONDS') ||
        86400;
      contractCancelAt.setSeconds(
        contractCancelAt.getSeconds() + contractExpireSeconds,
      );
      this.paymentScheduler.scheduleContractCancel(
        contract.id,
        contractCancelAt,
        userId,
      );

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

      // Re-fetch full contract to include addons, insurances, etc.
      const fullContract = await this.repository.findByIdWithFullDetails(contract.id);

      return {
        contract: RentalContractMapper.mapToFrontend(fullContract),
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
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.list',
      lang,
    );
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
      } catch {
        await this.redisService.del(cacheKey);
      }
    }

    const result = await this.repository.findMany(query);
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.CONTRACT_LIST_CACHE_TTL,
    );

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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.read',
      lang,
    );

    const mapped = RentalContractMapper.mapToFrontend(contract);
    this.resolveSignerSignedUrls(mapped);
    return mapped;
  }

  async findByIdWithFullDetails(
    contractId: string,
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    const contract = await this.repository.findByIdWithFullDetails(contractId);
    if (!contract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.read',
      lang,
    );

    const mapped = RentalContractMapper.mapToFrontend(contract);
    this.resolveSignerSignedUrls(mapped);
    return mapped;
  }

  private resolveSignerSignedUrls(mapped: any): void {
    if (mapped.signers?.length) {
      for (const signer of mapped.signers) {
        if (signer.avatar) {
          const signedUrl = this.signatureService.getSignedUrlByRawUrl(signer.avatar);
          signer.avatar = signedUrl;
          signer.url = signedUrl;
        }
      }
    }
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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    if (existing.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    if (existing.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_renew', { lang }),
      );
    }
    if (!existing.expired_at) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.no_expiry_date', { lang }),
      );
    }

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
    const adjustMonths = this.convertDurationToMonths(
      tier.duration_value,
      tier.duration_unit,
    );

    const newExpiredAt = new Date(existing.expired_at);
    newExpiredAt.setMonth(newExpiredAt.getMonth() + adjustMonths);

    if (newExpiredAt < new Date()) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_reduce_past_now', { lang }),
      );
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
        this.systemLogService.error(
          'rental-contract',
          'email',
          'Failed to send contract changed email',
          { userId, metaData: { contractId: id, error: String(emailError) } },
        );
      }
    }

    const action = adjustMonths > 0 ? 'renew' : 'reduce';
    this.systemLogService.info(
      'rental-contract',
      action,
      `${action} rental contract: ${contract.code}`,
      { userId, metaData: { contractId: id, adjustMonths } },
    );
    this.auditLogService.logUpdate(
      organizationId,
      'rental_contract',
      id,
      { expired_at: existing.expired_at } as unknown as Record<string, unknown>,
      { adjustMonths } as unknown as Record<string, unknown>,
      { userId, description: `${action} rental contract: ${contract.code}` },
    );
    this.websocketGateway.emitRentalContractRenewed(
      organizationId,
      id,
      contract.code,
      newExpiredAt.toISOString(),
      userId,
    );

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
          `Failed to upload signature for renew contract ${contract.id}`,
          { metaData: { error, contractId: contract.id } },
        );
      }
    }

    // Re-fetch full contract to return updated data
    const fullContract = await this.repository.findByIdWithFullDetails(id);

    return {
      contract: RentalContractMapper.mapToFrontend(fullContract),
      signature: signatureResult,
    };
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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }
    if (existing.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.delete',
      lang,
    );

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
      ContractCancelType.CLIENT_REQUEST,
      dto.cancel_reason,
    );

    const lockKey = `rental:lock:contract:${id}`;
    await this.releaseLock([lockKey]);

    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

    this.systemLogService.info(
      'rental-contract',
      'delete_org',
      `Cancelled rental contract (org): ${existing.code}`,
      { userId, metaData: { contractId: id, code: existing.code } },
    );
    this.auditLogService.logDelete(
      organizationId,
      'rental_contract',
      id,
      { status: existing.status, code: existing.code } as unknown as Record<
        string,
        unknown
      >,
      { userId, description: `Cancelled rental contract: ${existing.code}` },
    );
  }

  async deleteMany(
    items: OrgDeleteManyItemDto[],
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<void> {
    const ids = items.map((item) => item.id);
    const contracts = await this.repository.findByIds(ids);
    if (contracts.length === 0) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.delete',
      lang,
    );

    if (contracts.some((c) => c.organization_id !== organizationId)) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

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
        ContractCancelType.CLIENT_REQUEST,
        item.cancel_reason,
      );
    }

    const lockKeys = ids.map((id) => `rental:lock:contract:${id}`);
    await this.releaseLock(lockKeys);

    await Promise.all(ids.map((id) => this.invalidateContractCache(id)));
    await this.invalidateContractListCache();

    this.websocketGateway.emitToOrganization(
      organizationId,
      'rentalContract:deletedMany',
      {
        ids,
        orgId: organizationId,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      },
    );

    const org = await this.organizationRepository.findById(organizationId);
    if (org?.owner?.email) {
      try {
        const deleter = await this.organizationRepository.findUserById(userId);
        await this.emailService.sendContractCancelledEmail(
          org.owner.email,
          org.owner.name || org.owner.email,
          contracts.map((c) => c.code),
          deleter?.name || userId,
          lang,
        );
      } catch (error) {
        this.systemLogService.warn(
          'org-rental-contract',
          'send_contract_cancelled_email_failed',
          `Failed to send contract cancelled email to ${org.owner.email}: ${(error as Error).message}`,
        );
      }
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
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }
    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    if (contract.status !== ContractStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_retry_non_pending', {
          lang,
        }),
      );
    }

    const existingPayments =
      await this.repository.findPaymentsByContract(contractId);
    let currentPayment = existingPayments.find(
      (p) => p.status === PaymentStatus.PENDING,
    );
    const now = new Date();

    if (currentPayment?.expired_at && now >= currentPayment.expired_at) {
      await this.paymentScheduler.expirePayment(currentPayment.id);
      currentPayment = undefined;
    }

    if (currentPayment?.expired_at && now < currentPayment.expired_at) {
      return {
        contract: {
          ...contract,
          payments: existingPayments.map((p) => ({
            ...p,
            method: contract.payment_method,
            transaction_code: p.payment_code,
          })),
        } as any,
        payment: {
          paymentId: currentPayment.id,
          paymentCode: currentPayment.payment_code,
          amount: Number(currentPayment.amount),
          qrCode: currentPayment.qr_code || '',
          payment_url: currentPayment.qr_code || undefined, // Thêm để frontend redirect
          status: currentPayment.status.toString(),
          expiredAt: currentPayment.expired_at,
          bankInfo: this.sepayService.getBankInfo(),
        },
      };
    }

    const lockKeys: string[] = [];
    if (contract.details) {
      for (const detail of contract.details) {
        if (detail.is_whole_warehouse) {
          lockKeys.push(`rental:lock:template:${detail.warehouse_template_id}`);
        } else if (detail.detail_rows) {
          for (const detailRow of detail.detail_rows) {
            const rowId = detailRow.row_template_id;
            lockKeys.push(`rental:lock:row:${rowId}`);
          }
        }
      }
    }

    for (const lockKey of lockKeys) {
      const lockValue = await this.redisService.get(lockKey);
      if (lockValue && lockValue !== contractId) {
        throw new ConflictException(
          this.i18n.t('warehouse.errors.template_locked', { lang }),
        );
      }
    }

    if (currentPayment) {
      // Cancel old scheduled
      this.paymentScheduler.cancelScheduledExpire(currentPayment.id);
    }

    const retryFinalPriceNum = Math.round(parseFloat(contract.final_price.toString()));
    const retryVatAmountNum = Math.round(parseFloat(contract.vat_amount?.toString() || '0'));
    const retryDepositAmount = Math.max(
      QUOTATION_CONSTANTS.MIN_DEPOSIT_AMOUNT,
      Math.round(retryFinalPriceNum * QUOTATION_CONSTANTS.DEPOSIT_PERCENT),
    );
    const retryDepositVatAmount = Math.round(retryVatAmountNum * QUOTATION_CONSTANTS.DEPOSIT_PERCENT);

    const paymentResult = await this.sepayService.createContractPayment({
      rentalContractId: contractId,
      amount: retryDepositAmount,
      vat_amount: retryDepositVatAmount,
      description: contract.code,
      type: 'NEW_CONTRACT',
      userId,
    });

    const paymentExpiredAt = new Date();
    paymentExpiredAt.setSeconds(
      paymentExpiredAt.getSeconds() + this.LOCK_DURATION_SECONDS,
    );
    this.paymentScheduler.schedulePaymentExpire(
      paymentResult.paymentId,
      paymentExpiredAt,
      userId,
    );

    return {
      contract: contract as any,
      payment: {
        paymentId: paymentResult.paymentId,
        paymentCode: paymentResult.paymentCode,
        amount: paymentResult.amount,
        qrCode: paymentResult.qrCode,
        payment_url: paymentResult.qrCode, // Thêm để frontend redirect
        status: paymentResult.status,
        expiredAt: paymentResult.expiredAt,
        bankInfo: this.sepayService.getBankInfo(),
      },
    };
  }

  /**
   * Gửi hợp đồng qua DocuSign và lấy URL ký
   */
  async sendToDocusign(
    id: string,
    dto: SendDocusignDto,
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<{ signingUrl: string }> {
    const contract = await this.checkAccess(
      id,
      userId,
      organizationId,
      'rental-contract.update',
      lang,
    );

    // Chỉ cho phép ký khi hợp đồng ở trạng thái PENDING hoặc ACTIVE (gia hạn)
    if (
      contract.status !== ContractStatus.PENDING &&
      contract.status !== ContractStatus.ACTIVE
    ) {
      throw new BadRequestException(
        await this.i18n.translate(
          'rental-contract.errors.invalid_status_for_signing',
          { lang },
        ),
      );
    }

    const fullContract = await this.repository.findByIdWithFullDetails(id);
    if (!fullContract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // 1. Tạo PDF buffer
    const pdfBuffer = await this.pdfService.generateContractPdf(
      fullContract as unknown as IRentalContractWithRelations,
    );

    // 2. Tạo DocuSign envelope
    const signerName =
      (fullContract.organization as any)?.representative_name ||
      fullContract.organization?.name ||
      'Customer';
    const signerEmail =
      (fullContract.organization as any)?.owner?.email ||
      'customer@example.com';

    // Dùng userId làm clientUserId để DocuSign biết đây là embedded signing cho user này
    const clientUserId = userId;

    const envelopeId = await this.docusignService.createEnvelope(
      pdfBuffer,
      signerName,
      signerEmail,
      clientUserId,
      fullContract.code,
    );

    // 3. Tạo signing URL
    const signingUrl = await this.docusignService.getRecipientViewUrl(
      envelopeId,
      signerName,
      signerEmail,
      clientUserId,
      dto.returnUrl,
    );

    // Lưu envelopeId vào contract để theo dõi (cần thêm field vào DB nếu muốn, hoặc lưu log)
    this.systemLogService.info(
      'rental-contract',
      'docusign_sent',
      `Contract ${fullContract.code} sent to DocuSign. EnvelopeId: ${envelopeId}`,
      { userId, metaData: { contractId: id, envelopeId } },
    );

    return { signingUrl };
  }

  async getContractAddons(
    contractId: string,
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    const contract = await this.checkAccess(
      contractId,
      userId,
      organizationId,
      'rental-contract.read',
      lang,
    );
    return this.repository.findContractAddons(contractId);
  }

  /**
   * Cập nhật danh sách addons cho hợp đồng (Org-level)
   * Logic upsert: addon mới sẽ được thêm, addon không có trong list sẽ bị hủy
   */
  async updateContractAddons(
    contractId: string,
    addonIds: string[],
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    const contract = await this.checkAccess(
      contractId,
      userId,
      organizationId,
      'rental-contract.update',
      lang,
    );

    if (
      contract.status !== ContractStatus.ACTIVE &&
      contract.status !== ContractStatus.PENDING
    ) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.invalid_status_for_update', {
          lang,
        }),
      );
    }

    const currentAddons = await this.repository.findContractAddons(contractId);
    const activeAddons = currentAddons.filter((a) => !a.is_cancelled);
    const currentAddonIds = new Set(activeAddons.map((a) => a.addon_id));
    const desiredAddonIds = new Set(addonIds);

    // Add new addons
    const toAdd = addonIds.filter((aid) => !currentAddonIds.has(aid));
    if (toAdd.length > 0) {
      const addons = await this.prisma.addon.findMany({
        where: { id: { in: toAdd }, is_deleted: false, is_active: true },
      });
      for (const addon of addons) {
        await this.repository.addAddon({
          rental_contract_id: contractId,
          addon_id: addon.id,
          price_at_purchase: Number(addon.price),
          is_gift: false,
          created_by: userId,
        });
      }
    }

    // Cancel removed addons (only those registered within 2 days)
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const toRemove = activeAddons.filter(
      (a) => !desiredAddonIds.has(a.addon_id),
    );
    for (const addon of toRemove) {
      const createdAt = new Date(addon.created_at).getTime();
      if (Date.now() - createdAt <= TWO_DAYS_MS) {
        await this.prisma.rentalContractAddon.update({
          where: { id: addon.id },
          data: { is_cancelled: true },
        });
      }
    }

    // Emit update event
    this.websocketGateway.emitToOrganization(
      organizationId,
      'rentalContract:updated',
      {
        contractId,
      },
    );

    return this.repository.findContractAddons(contractId);
  }

  async getContractInsurances(
    contractId: string,
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    const contract = await this.checkAccess(
      contractId,
      userId,
      organizationId,
      'rental-contract.read',
      lang,
    );
    return this.repository.findContractInsurances(contractId);
  }

  async getContractLogs(
    contractId: string,
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    const contract = await this.checkAccess(
      contractId,
      userId,
      organizationId,
      'rental-contract.read',
      lang,
    );
    return this.repository.findContractLogs(contractId);
  }

  private async checkAccess(
    contractId: string,
    userId: string,
    organizationId: string,
    permission: string,
    lang: string,
  ) {
    const contract = await this.repository.findById(contractId);
    if (!contract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }
    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
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

  private async acquireLock(
    keys: string | string[],
  ): Promise<{ success: boolean }> {
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
}
