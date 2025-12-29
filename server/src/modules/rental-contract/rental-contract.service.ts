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
import { ContractStatus, Prisma, PaymentType } from '@prisma/client';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

import { RentalContractRepository } from './rental-contract.repository';
import {
  CreateRentalContractDto,
  UpdateRentalContractDto,
  QueryRentalContractDto,
  RentalTemplateItemDto,
  RenewRentalContractDto,
} from './dto';
import {
  IRentalContractWithRelations,
  IPaginatedResponse,
  ICreateContractResult,
  IRentalPriceCalculation,
  IContractTimeChangedEmail,
  IAddonCancelledEmail,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { WarehouseTemplateRepository } from '../warehouse-template/warehouse-template.repository';
import { EmailService } from '../notification/email.service';
import { OrganizationRepository } from '../organization/organization.repository';
import { SepayService } from '../payment/sepay.service';
import { PaymentSchedulerService } from '../payment/payment-scheduler.service';

import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { UserNotificationService } from '../user-notification/user-notification.service';

/**
 * Service xử lý business logic cho RentalContract
 */
@Injectable()
export class RentalContractService {
  private readonly CONTRACT_CACHE_TTL: number;
  private readonly CONTRACT_LIST_CACHE_TTL: number;
  private readonly LOCK_DURATION_SECONDS: number;
  private readonly MAX_PENDING_PER_USER: number;
  private readonly CONTRACT_PREFIX: string;
  private readonly ALLOWED_MONTHS: number[];

  constructor(
    private readonly repository: RentalContractRepository,
    private readonly templateRepository: WarehouseTemplateRepository,
    private readonly organizationRepository: OrganizationRepository,
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
    @InjectQueue('rental-contract') private readonly contractQueue: Queue,
    private readonly userNotificationService: UserNotificationService,
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

    // Parse allowed months từ config
    const allowedMonthsStr =
      this.configService.get<string>('RENTAL_ALLOWED_MONTHS') ||
      '1,3,6,12,24,36';
    this.ALLOWED_MONTHS = allowedMonthsStr
      .split(',')
      .map((m) => parseInt(m.trim(), 10))
      .filter((m) => !isNaN(m));
  }

  /**
   * Kiểm tra quyền organization.
   * Owner có full quyền, member cần có permission tương ứng.
   */
  private async checkOrgPermission(
    orgId: string,
    userId: string,
    permissionKey: string,
    lang: string,
  ): Promise<void> {
    // Lấy thông tin organization
    const org = await this.organizationRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.not_found', { lang }),
      );
    }

    // Owner có full quyền (kiểm tra cả owner_id và owner.id để đảm bảo)
    if (userId === org.owner_id || userId === org.owner?.id) {
      return;
    }

    // Kiểm tra member và permission
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

    // Kiểm tra direct permissions
    const hasDirectPermission = member.permissions?.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirectPermission) return;

    // Kiểm tra role permissions
    const hasRolePermission = member.roles?.some(
      (r) =>
        // TODO: implement full check when roles include permissions
        false,
    );

    if (!hasRolePermission && !hasDirectPermission) {
      throw new ForbiddenException(
        await this.i18n.translate('rental-contract.errors.no_permission', {
          lang,
        }),
      );
    }
  }

  /**
   * Tạo hợp đồng thuê mới (hỗ trợ nhiều templates)
   */
  async create(
    dto: CreateRentalContractDto,
    userId: string,
    lang: string,
  ): Promise<ICreateContractResult> {
    // Loại bỏ các giá trị trùng nhau trong arrays
    if (dto.addon_ids) {
      dto.addon_ids = [...new Set(dto.addon_ids)];
    }
    if (dto.coupon_codes) {
      dto.coupon_codes = [...new Set(dto.coupon_codes)];
    }
    // Loại bỏ templates trùng template_id (giữ lại template đầu tiên)
    const seenTemplateIds = new Set<string>();
    dto.templates = dto.templates.filter(t => {
      if (seenTemplateIds.has(t.template_id)) return false;
      seenTemplateIds.add(t.template_id);
      // Loại bỏ row_template_ids trùng nhau trong mỗi template
      if (t.row_template_ids) {
        t.row_template_ids = [...new Set(t.row_template_ids)];
      }
      return true;
    });

    // Lấy thông tin từ duration tier (bắt buộc)
    const tier = await this.repository['prisma'].rentalDurationTier.findFirst({
      where: { id: dto.duration_tier_id, is_deleted: false, is_active: true },
    });
    if (!tier) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }),
      );
    }

    // Chuyển đổi duration_value theo unit sang tháng
    const rentalMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);

    // Validate rental_months
    if (!this.ALLOWED_MONTHS.includes(rentalMonths)) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.validation.rental_months_invalid', {
          lang,
          args: { allowed: this.ALLOWED_MONTHS.join(', ') },
        }),
      );
    }

    // Kiểm tra giới hạn pending contracts
    const pendingCount = await this.repository.countPendingByUser(userId);
    if (pendingCount >= this.MAX_PENDING_PER_USER) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.max_pending_reached', { lang }),
      );
    }

    // Validate và tính giá cho tất cả templates
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

      // Validate row templates nếu thuê theo row
      if (!isWholeWarehouse && !template.is_shared_warehouse) {
        throw new BadRequestException(
          this.i18n.t('warehouse.errors.not_shared_warehouse', { lang }),
        );
      }

      // Tạo lock keys
      if (isWholeWarehouse) {
        lockKeys.push(`rental:lock:template:${templateItem.template_id}`);
      } else {
        templateItem.row_template_ids!.forEach((rowId) => {
          lockKeys.push(`rental:lock:row:${rowId}`);
        });
      }

      // Tính giá cho template này
      const priceDetail = await this.calculateRentalPriceForTemplate(
        template,
        templateItem,
        rentalMonths,
        isWholeWarehouse,
      );
      allPriceDetails.push(priceDetail);
      totalPrice += priceDetail.subtotal;
    }

    // Tính discount rate trung bình
    if (allPriceDetails.length > 0) {
      overallDiscountRate =
        allPriceDetails.reduce((sum, d) => sum + d.discountRate, 0) /
        allPriceDetails.length;
    }

    // Acquire locks
    const lockResult = await this.acquireLock(lockKeys);
    if (!lockResult.success) {
      throw new ConflictException(
        this.i18n.t('warehouse.errors.template_locked', { lang }),
      );
    }

    try {
      // Generate contract code
      const code = this.generateContractCode();
      const rentalDays = rentalMonths * 30;

      const startedAt = new Date();
      const expiredAt = new Date(
        startedAt.getTime() + rentalDays * 24 * 60 * 60 * 1000,
      );

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
        created_by: userId,
        organization: { connect: { id: dto.organization_id } },
      };

      const detailsData = allPriceDetails.map((d) => ({
        rental_contract_id: '',
        warehouse_template_id: d.templateId,
        warehouse_name: d.warehouseName,
        warehouse_description: d.warehouseDescription || null,
        row_template_ids: d.rowTemplateIds,
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

      // Log
      this.systemLogService.info(
        'rental-contract',
        'create',
        `Created rental contract: ${code}`,
        {
          userId,
          metaData: {
            contractId: contract.id,
            templateCount: dto.templates.length,
            code,
          },
        },
      );

      // Audit log
      this.auditLogService.logCreate(
        dto.organization_id,
        'rental_contract',
        contract.id,
        { ...dto, code } as unknown as Record<string, unknown>,
        { userId, description: `Created rental contract: ${code}` },
      );

      // Emit socket event
      this.websocketGateway.emitRentalContractCreated(dto.organization_id, contract.id, code, userId);

      // Invalidate list cache
      await this.invalidateContractListCache();

      // Tạo payment link với SePay
      const paymentResult = await this.sepayService.createContractPayment({
        rentalContractId: contract.id,
        amount: Math.round(parseFloat(contract.final_price.toString())),
        description: `${code}`,
        type: 'NEW_CONTRACT',
        userId,
      });

      // Schedule payment expiry
      const lockExpireSeconds = this.configService.get<number>('RENTAL_LOCK_DURATION_SECONDS') || 3600;
      const paymentExpiredAt = new Date();
      paymentExpiredAt.setSeconds(paymentExpiredAt.getSeconds() + lockExpireSeconds);
      this.paymentScheduler.schedulePaymentExpire(paymentResult.paymentId, paymentExpiredAt, userId);

      // Schedule contract cancel
      const contractExpireSeconds = this.configService.get<number>('CONTRACT_PENDING_EXPIRE_SECONDS') || 86400;
      const contractCancelAt = new Date();
      contractCancelAt.setSeconds(contractCancelAt.getSeconds() + contractExpireSeconds);
      this.paymentScheduler.scheduleContractCancel(contract.id, contractCancelAt, userId);

      return {
        contract,
        payment: paymentResult,
      };
    } catch (error) {
      await this.releaseLock(lockKeys);
      throw error;
    }
  }

  /**
   * Lấy danh sách hợp đồng
   * - hasListAllPermission = true: xem tất cả
   * - hasListAllPermission = false: chỉ xem contracts của orgs mà user là owner/member
   * - Có organization_id trong query: lọc theo org đó
   */
  async findMany(
    query: QueryRentalContractDto,
    userId: string,
    hasListAllPermission: boolean,
    lang: string = 'vi',
  ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
    // Nếu có organization_id trong query, kiểm tra quyền đọc trong org đó
    if (query.organization_id) {
      await this.checkOrgPermission(
        query.organization_id,
        userId,
        'rental-contract.list',
        lang,
      );
    } else if (!hasListAllPermission) {
      // Không có quyền list.all và không chỉ định org -> lọc theo user's orgs
      // Tìm tất cả orgs mà user là owner hoặc member
      const userOrgs = await this.organizationRepository.findOrgIdsByUser(userId);
      if (userOrgs.length === 0) {
        return { items: [], total: 0, limit: query.limit || 10, offset: query.offset || 0, hasMore: false };
      }
      // Sẽ lọc theo danh sách org IDs trong repository
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
      } catch {
        // Cache không hợp lệ
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

  /**
   * Lấy chi tiết hợp đồng
   * Kiểm tra quyền: phải là owner/member của org đó
   */
  async findById(
    id: string,
    userId: string,
    lang: string = 'vi',
  ): Promise<IRentalContractWithRelations> {
    const cacheKey = this.getContractCacheKey(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const contract = JSON.parse(cached) as IRentalContractWithRelations;
        // Kiểm tra user có phải owner/member của org không
        await this.checkOrgPermission(
          contract.organization_id,
          userId,
          'rental-contract.read',
          lang,
        );
        return contract;
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        // Cache không hợp lệ
      }
    }

    const contract = await this.repository.findById(id);
    if (!contract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Kiểm tra user có phải owner/member của org không
    await this.checkOrgPermission(
      contract.organization_id,
      userId,
      'rental-contract.read',
      lang,
    );

    await this.redisService.set(
      cacheKey,
      JSON.stringify(contract),
      this.CONTRACT_CACHE_TTL,
    );

    return contract;
  }

  /**
   * Cập nhật hợp đồng (name, notes, điều chỉnh thời gian)
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

    const organizationId = existing.organization_id;

    // Kiểm tra quyền cấp org: owner có full quyền, member cần permission
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    // Xác định số tháng điều chỉnh từ extend_duration_tier_id hoặc reduce_months
    let adjustMonths: number | null = null;

    if (dto.extend_duration_tier_id) {
      // Gia hạn bằng duration tier
      const tier = await this.repository['prisma'].rentalDurationTier.findFirst({
        where: { id: dto.extend_duration_tier_id, is_deleted: false, is_active: true },
      });
      if (!tier) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }),
        );
      }
      adjustMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);
    } else if (dto.reduce_months) {
      // Giảm thời gian
      adjustMonths = -dto.reduce_months;
    }

    // Chỉ cho phép điều chỉnh thời gian hợp đồng ACTIVE
    if (adjustMonths && existing.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_renew', { lang }),
      );
    }

    const updateData: Prisma.RentalContractUpdateInput = {
      updated_by: userId,
    };

    if (dto.name) updateData.name = dto.name;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Điều chỉnh thời gian hợp đồng
    let newExpiredAt: Date | null = null;
    if (adjustMonths && adjustMonths !== 0 && existing.expired_at) {
      newExpiredAt = new Date(existing.expired_at);
      newExpiredAt.setMonth(newExpiredAt.getMonth() + adjustMonths);

      // Validate: không cho giảm xuống dưới ngày hiện tại
      if (newExpiredAt < new Date()) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.errors.cannot_reduce_past_now', {
            lang,
          }),
        );
      }

      updateData.expired_at = newExpiredAt;
    }

    const contract = await this.repository.update(id, updateData);

    // Invalidate caches
    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

    // Gửi email thông báo nếu thay đổi thời gian
    if (
      adjustMonths &&
      adjustMonths !== 0 &&
      newExpiredAt &&
      existing.organization?.owner
    ) {
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
        // Log lỗi email nhưng không throw
        this.systemLogService.error(
          'rental-contract',
          'email',
          'Failed to send contract time changed email',
          {
            userId,
            metaData: { contractId: id, error: String(emailError) },
          },
        );
      }
    }

    // Log
    const action =
      adjustMonths && adjustMonths > 0
        ? 'renew'
        : adjustMonths && adjustMonths < 0
          ? 'reduce'
          : 'update';
    this.systemLogService.info(
      'rental-contract',
      action,
      `${action} rental contract: ${contract.code}`,
      {
        userId,
        metaData: { contractId: id, adjustMonths },
      },
    );

    // Audit log
    this.auditLogService.logUpdate(
      organizationId,
      'rental_contract',
      id,
      {
        name: existing.name,
        expired_at: existing.expired_at,
      } as unknown as Record<string, unknown>,
      dto as unknown as Record<string, unknown>,
      { userId, description: `${action} rental contract: ${contract.code}` },
    );

    // Emit socket event
    this.websocketGateway.emitRentalContractUpdated(organizationId, id, contract.code, userId, contract.status);

    return contract;
  }

  /**
   * Hủy hợp đồng (soft delete)
   */
  async delete(
    id: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    // Dùng findByIdWithOrganization để lấy owner email
    const existing = await this.repository.findByIdWithOrganization(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    const organizationId = existing.organization_id;

    // Kiểm tra quyền cấp org: owner có full quyền, member cần permission
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.delete',
      lang,
    );

    // Không cho hủy hợp đồng đã COMPLETED hoặc LIQUIDATED
    const nonCancellableStatuses: ContractStatus[] = [
      ContractStatus.COMPLETED,
      ContractStatus.LIQUIDATED,
    ];
    if (nonCancellableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    // Set actual_ended_at và soft delete
    await this.repository.cancelContract(id, userId);

    // Release lock nếu còn
    const lockKey = `rental:lock:contract:${id}`;
    await this.releaseLock([lockKey]);

    // Invalidate caches
    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

    // Gửi email thông báo cho owner
    if (existing.organization?.owner?.email) {
      try {
        const deleter = await this.organizationRepository.findUserById(userId);
        const deleterName = deleter?.name || userId;

        await this.emailService.sendContractCancelledEmail(
          existing.organization.owner.email,
          existing.organization.owner.name || existing.organization.owner.email,
          [existing.code],
          deleterName,
          lang,
        );
      } catch (error) {
        this.systemLogService.error(
          'rental-contract',
          'email',
          'Failed to send contract cancelled email',
          { userId, metaData: { error } },
        );
      }
    }

    // Log
    this.systemLogService.info(
      'rental-contract',
      'delete',
      `Cancelled rental contract: ${existing.code}`,
      {
        userId,
        metaData: { contractId: id, code: existing.code },
      },
    );

    // Audit log
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

    // Emit socket event
    this.websocketGateway.emitRentalContractDeleted(organizationId, id, userId);
  }

  async deleteMany(ids: string[], userId: string, lang: string): Promise<void> {
    const contracts = await this.repository.findByIds(ids);
    if (contracts.length === 0) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Check non-cancellable
    const nonCancellable = contracts.find(c =>
      ([ContractStatus.COMPLETED, ContractStatus.LIQUIDATED] as ContractStatus[]).includes(c.status)
    );
    if (nonCancellable) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    // Group by Org to check permissions
    const contractsByOrg = contracts.reduce((acc, c) => {
      acc[c.organization_id] = acc[c.organization_id] || [];
      acc[c.organization_id].push(c);
      return acc;
    }, {} as Record<string, IRentalContractWithRelations[]>);

    for (const orgId in contractsByOrg) {
      await this.checkOrgPermission(orgId, userId, 'rental-contract.delete', lang);
    }

    await this.repository.softDeleteMany(ids, userId);

    // Release locks
    const lockKeys = ids.map(id => `rental:lock:contract:${id}`);
    await this.releaseLock(lockKeys);

    // Invalidate caches
    await Promise.all(ids.map(id => this.invalidateContractCache(id)));
    await this.invalidateContractListCache();

    // Get deleter info
    const deleter = await this.organizationRepository.findUserById(userId);
    const deleterName = deleter?.name || userId;

    // Emit & Log
    for (const orgId in contractsByOrg) {
      const orgContracts = contractsByOrg[orgId];
      const orgContractIds = orgContracts.map(c => c.id);

      this.websocketGateway.emitToOrganization(orgId, 'rentalContract:deletedMany', {
        ids: orgContractIds,
        orgId,
        deletedBy: userId,
        timestamp: new Date().toISOString(),
      });

      // Send Email
      try {
        const org = await this.organizationRepository.findById(orgId);
        if (org && org.owner && org.owner.email) {
          const codes = orgContracts.map(c => c.code);
          await this.emailService.sendContractCancelledEmail(
            org.owner.email,
            org.owner.name || org.owner.email,
            codes,
            deleterName,
            lang,
          );
        }
      } catch (error) {
        this.systemLogService.error(
          'rental-contract',
          'email',
          'Failed to send contract cancelled email (deleteMany)',
          { userId, metaData: { orgId, error } },
        );
      }

      orgContracts.forEach(c => {
        this.systemLogService.info(
          'rental-contract',
          'delete_many',
          `Cancelled rental contract: ${c.code}`,
          { userId, metaData: { contractId: c.id, code: c.code } },
        );

        this.auditLogService.logDelete(
          orgId,
          'rental_contract',
          c.id,
          { status: c.status, code: c.code } as Record<string, unknown>,
          { userId, description: `Batch cancelled rental contract: ${c.code}` },
        );
      });
    }
  }

  async deleteManyByOrg(
    ids: string[],
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<void> {
    const contracts = await this.repository.findByIds(ids);
    if (contracts.length === 0) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    await this.checkOrgPermission(organizationId, userId, 'rental-contract.delete', lang);

    const invalidContract = contracts.find(c => c.organization_id !== organizationId);
    if (invalidContract) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    const nonCancellable = contracts.find(c =>
      ([ContractStatus.COMPLETED, ContractStatus.LIQUIDATED] as ContractStatus[]).includes(c.status)
    );
    if (nonCancellable) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);

    const lockKeys = ids.map(id => `rental:lock:contract:${id}`);
    await this.releaseLock(lockKeys);

    await Promise.all(ids.map(id => this.invalidateContractCache(id)));
    await this.invalidateContractListCache();

    this.websocketGateway.emitToOrganization(organizationId, 'rentalContract:deletedMany', {
      ids,
      orgId: organizationId,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Send Email
    try {
      const org = await this.organizationRepository.findById(organizationId);
      const deleter = await this.organizationRepository.findUserById(userId);
      const deleterName = deleter?.name || userId;

      if (org && org.owner && org.owner.email) {
        const codes = contracts.map(c => c.code);
        await this.emailService.sendContractCancelledEmail(
          org.owner.email,
          org.owner.name || org.owner.email,
          codes,
          deleterName,
          lang,
        );
      }
    } catch (error) {
      this.systemLogService.error(
        'rental-contract',
        'email',
        'Failed to send contract cancelled email (deleteManyByOrg)',
        { userId, metaData: { organizationId, error } },
      );
    }

    contracts.forEach(c => {
      this.systemLogService.info(
        'rental-contract',
        'delete_many',
        `Cancelled rental contract: ${c.code}`,
        { userId, metaData: { contractId: c.id, code: c.code } },
      );

      this.auditLogService.logDelete(
        organizationId,
        'rental_contract',
        c.id,
        { status: c.status, code: c.code } as Record<string, unknown>,
        { userId, description: `Batch cancelled rental contract: ${c.code}` },
      );
    });
  }

  /**
   * Lấy danh sách hợp đồng của tổ chức
   * Chỉ owner/member của org mới được xem
   */
  async findManyByOrg(
    query: QueryRentalContractDto,
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.list',
      lang,
    );

    // Force filter theo organizationId
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
        // Cache không hợp lệ
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

  /**
   * Lấy chi tiết hợp đồng của tổ chức
   * Chỉ owner/member của org mới được xem
   */
  async findByIdByOrg(
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

    // Kiểm tra contract thuộc org
    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.read',
      lang,
    );

    return contract;
  }

  /**
   * Gia hạn hợp đồng
   * Chỉ owner/member của org mới được gia hạn
   */
  async renewByOrg(
    id: string,
    dto: RenewRentalContractDto,
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<IRentalContractWithRelations> {
    // Loại bỏ các giá trị trùng nhau trong arrays
    if (dto.addon_ids) {
      dto.addon_ids = [...new Set(dto.addon_ids)];
    }
    if (dto.coupon_codes) {
      dto.coupon_codes = [...new Set(dto.coupon_codes)];
    }

    const existing = await this.repository.findByIdWithOrganization(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Kiểm tra contract thuộc org
    if (existing.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    // Chỉ cho phép gia hạn hợp đồng ACTIVE
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

    // Xác định số tháng điều chỉnh từ extend_duration_tier_id hoặc reduce_months
    let adjustMonths: number;

    if (dto.extend_duration_tier_id) {
      // Gia hạn bằng duration tier
      const tier = await this.repository['prisma'].rentalDurationTier.findFirst({
        where: { id: dto.extend_duration_tier_id, is_deleted: false, is_active: true },
      });
      if (!tier) {
        throw new BadRequestException(
          this.i18n.t('rental-contract.validation.duration_tier_not_found', { lang }),
        );
      }
      adjustMonths = this.convertDurationToMonths(tier.duration_value, tier.duration_unit);
    } else if (dto.reduce_months) {
      // Giảm thời gian
      adjustMonths = -dto.reduce_months;
    } else {
      throw new BadRequestException(
        this.i18n.t('rental-contract.validation.extend_or_reduce_required', { lang }),
      );
    }

    const newExpiredAt = new Date(existing.expired_at);
    newExpiredAt.setMonth(newExpiredAt.getMonth() + adjustMonths);

    // Validate: không cho giảm xuống dưới ngày hiện tại
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


    // Invalidate caches
    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

    // Gửi email thông báo
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

    // Log
    const action = adjustMonths > 0 ? 'renew' : 'reduce';
    this.systemLogService.info(
      'rental-contract',
      action,
      `${action} rental contract: ${contract.code}`,
      { userId, metaData: { contractId: id, adjustMonths: adjustMonths } },
    );

    // Audit log
    this.auditLogService.logUpdate(
      organizationId,
      'rental_contract',
      id,
      { expired_at: existing.expired_at } as unknown as Record<string, unknown>,
      { adjustMonths: adjustMonths } as unknown as Record<string, unknown>,
      { userId, description: `${action} rental contract: ${contract.code}` },
    );

    // Emit socket event
    this.websocketGateway.emitRentalContractRenewed(
      organizationId,
      id,
      contract.code,
      newExpiredAt.toISOString(),
      userId,
    );

    return contract;
  }

  /**
   * Hủy hợp đồng của tổ chức
   * Chỉ owner/member của org mới được hủy
   */
  async deleteByOrg(
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

    // Kiểm tra contract thuộc org
    if (existing.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.delete',
      lang,
    );

    // Không cho hủy hợp đồng đã COMPLETED hoặc LIQUIDATED
    const nonCancellableStatuses: ContractStatus[] = [
      ContractStatus.COMPLETED,
      ContractStatus.LIQUIDATED,
    ];
    if (nonCancellableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    // Set actual_ended_at và soft delete
    await this.repository.cancelContract(id, userId);

    // Release lock nếu còn
    const lockKey = `rental:lock:contract:${id}`;
    await this.releaseLock([lockKey]);

    // Invalidate caches
    await Promise.all([
      this.invalidateContractCache(id),
      this.invalidateContractListCache(),
    ]);

    // Log
    this.systemLogService.info(
      'rental-contract',
      'delete',
      `Cancelled rental contract (org): ${existing.code}`,
      { userId, metaData: { contractId: id, code: existing.code } },
    );

    // Audit log
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

  /**
   * Tạo lại link thanh toán cho hợp đồng PENDING đã hết hạn
   * Kiểm tra templates không bị block bởi user khác
   */
  async retryPayment(
    contractId: string,
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<ICreateContractResult> {
    // Tìm contract
    const contract = await this.repository.findById(contractId);
    if (!contract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Kiểm tra contract thuộc org
    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    // Chỉ cho phép retry cho contract PENDING
    if (contract.status !== ContractStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_retry_non_pending', { lang }),
      );
    }

    // Kiểm tra payment hiện tại
    const existingPayments = await this.repository.findPaymentsByContract(contractId);
    const currentPayment = existingPayments.find(p => p.status === 'PENDING');

    if (currentPayment && currentPayment.expired_at && new Date() < currentPayment.expired_at) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.payment_still_active', { lang }),
      );
    }

    // Kiểm tra templates không bị block bởi user khác
    // (Logic tương tự create - check lock keys)
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

    // Kiểm tra lock (không acquire, chỉ check)
    for (const lockKey of lockKeys) {
      const lockValue = await this.redisService.get(lockKey);
      if (lockValue && lockValue !== contractId) {
        throw new ConflictException(
          this.i18n.t('warehouse.errors.template_locked', { lang }),
        );
      }
    }

    // Đánh dấu payment cũ là EXPIRED
    if (currentPayment) {
      // Update via prisma (assuming repository method exists or direct prisma call)
      this.paymentScheduler.cancelScheduledExpire(currentPayment.id);
    }

    // Tạo payment mới
    const paymentResult = await this.sepayService.createContractPayment({
      rentalContractId: contractId,
      amount: Math.round(parseFloat(contract.final_price.toString())),
      description: contract.code,
      type: 'NEW_CONTRACT',
      userId,
    });

    // Schedule payment expiry
    const lockExpireHours = this.configService.get<number>('RENTAL_LOCK_DURATION_HOURS') || 1;
    const paymentExpiredAt = new Date();
    paymentExpiredAt.setHours(paymentExpiredAt.getHours() + lockExpireHours);
    this.paymentScheduler.schedulePaymentExpire(paymentResult.paymentId, paymentExpiredAt, userId);

    // Log
    this.systemLogService.info(
      'rental-contract',
      'retry-payment',
      `Retry payment for contract: ${contract.code}`,
      { userId, metaData: { contractId, paymentId: paymentResult.paymentId } },
    );

    return {
      contract,
      payment: paymentResult,
    };
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

    // Thu thập templateIds và rowTemplateIds từ contract
    const templateIds: string[] = [];
    const rowTemplateIds: string[] = [];

    for (const detail of contract.details) {
      if (detail.warehouse_template_id) {
        templateIds.push(detail.warehouse_template_id);
      }
      if (detail.row_template_ids && detail.row_template_ids.length > 0) {
        rowTemplateIds.push(...detail.row_template_ids);
      }
    }

    if (templateIds.length === 0 && rowTemplateIds.length === 0) {
      return;
    }

    // Tìm các contracts xung đột
    const conflictingContracts = await this.repository.findConflictingPendingContracts(
      templateIds,
      rowTemplateIds,
      contractId,
    );

    if (conflictingContracts.length === 0) {
      return;
    }

    // Hủy từng contract xung đột
    for (const conflictContract of conflictingContracts) {
      try {
        // Hủy contract
        await this.repository.cancelContract(conflictContract.id, 'SYSTEM');

        // Hủy các scheduled payments/contracts
        const payments = await this.repository.findPaymentsByContract(conflictContract.id);
        for (const payment of payments) {
          if (payment.status === 'PENDING') {
            this.paymentScheduler.cancelScheduledExpire(payment.id);
          }
        }
        this.paymentScheduler.cancelScheduledCancel(conflictContract.id);

        // Emit socket event thông báo cho user
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

  /**
   * Thêm addon vào hợp đồng
   * Chỉ owner/member của org mới được thêm
   */
  async addAddon(
    contractId: string,
    addonId: string,
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    // Tìm contract
    const contract = await this.repository.findById(contractId);
    if (!contract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Kiểm tra contract thuộc org
    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    // Chỉ thêm addon cho contract ACTIVE
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.not_active', { lang }),
      );
    }

    // Kiểm tra addon đã được thêm chưa
    const alreadyAdded = await this.repository.isAddonAlreadyAdded(contractId, addonId);
    if (alreadyAdded) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.addon_already_added', { lang }),
      );
    }

    // Lấy thông tin addon (cần import PrismaService hoặc tạo AddonRepository)
    // Tạm thời lấy qua prisma direct
    const addon = await this.repository['prisma'].addon.findFirst({
      where: { id: addonId, is_deleted: false, is_active: true },
    });
    if (!addon) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.addon_not_found', { lang }),
      );
    }

    // Thêm addon
    const contractAddon = await this.repository.addAddon({
      rental_contract_id: contractId,
      addon_id: addonId,
      price_at_purchase: Number(addon.price),
      is_gift: false,
      created_by: userId,
    });

    // Ghi log
    await this.repository.createLog({
      rental_contract_id: contractId,
      action: 'ADDON_ADDED',
      description: `Addon "${addon.name}" đã được thêm vào hợp đồng`,
      metadata: {
        addon_id: addonId,
        addon_name: addon.name,
        price: Number(addon.price),
      },
      created_by: userId,
    });

    // Log hệ thống
    this.systemLogService.info(
      'rental-contract',
      'addon-added',
      `Added addon ${addon.name} to contract ${contract.code}`,
      { userId, metaData: { contractId, addonId, addonName: addon.name } },
    );

    // Emit socket event
    this.websocketGateway.emitToOrganization(organizationId, 'rentalContract:addonAdded', {
      contractId,
      contractCode: contract.code,
      addonId,
      addonName: addon.name,
      addedBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Invalidate cache
    await this.invalidateContractCache(contractId);

    return contractAddon;
  }

  /**
   * Hủy addon từ hợp đồng
   * Chỉ owner/member của org mới được hủy
   */
  async removeAddon(
    contractAddonId: string,
    cancelReason: string,
    userId: string,
    organizationId: string,
    lang: string,
  ) {
    // Tìm contract addon
    const contractAddon = await this.repository.findContractAddonById(contractAddonId);
    if (!contractAddon) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.contract_addon_not_found', { lang }),
      );
    }

    // Kiểm tra đã bị hủy chưa
    if (contractAddon.is_cancelled) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.addon_already_cancelled', { lang }),
      );
    }

    const contract = contractAddon.rental_contract;
    if (!contract) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Kiểm tra contract thuộc org
    if (contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    // Hủy addon
    const result = await this.repository.cancelAddon(contractAddonId, cancelReason, userId);

    // Ghi log
    await this.repository.createLog({
      rental_contract_id: contract.id,
      action: 'ADDON_CANCELLED',
      description: `Addon "${result.addon.name}" đã bị hủy. Lý do: ${cancelReason}`,
      metadata: {
        contract_addon_id: contractAddonId,
        addon_id: result.addon_id,
        addon_name: result.addon.name,
        cancel_reason: cancelReason,
      },
      created_by: userId,
    });

    // Log hệ thống
    this.systemLogService.info(
      'rental-contract',
      'addon-cancelled',
      `Cancelled addon ${result.addon.name} from contract ${contract.code}`,
      { userId, metaData: { contractId: contract.id, addonId: result.addon_id, reason: cancelReason } },
    );

    // Emit socket event
    this.websocketGateway.emitToOrganization(organizationId, 'rentalContract:addonCancelled', {
      contractId: contract.id,
      contractCode: contract.code,
      contractAddonId,
      addonId: result.addon_id,
      addonName: result.addon.name,
      cancelReason,
      cancelledBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Gửi email thông báo hủy addon
    const organization = await this.organizationRepository.findById(organizationId);
    if (organization?.owner?.email) {
      try {
        await this.sendAddonCancelledEmail({
          ownerEmail: organization.owner.email,
          ownerName: organization.owner.name,
          contractCode: contract.code,
          addonName: result.addon.name,
          cancelReason,
          lang,
        });
      } catch (emailError) {
        this.systemLogService.error(
          'rental-contract',
          'email',
          'Failed to send addon cancelled email',
          { userId, metaData: { contractId: contract.id, addonId: result.addon_id, error: String(emailError) } },
        );
      }

      // Gửi User Notification cho Owner
      if (organization.owner.id) {
        try {
          await this.userNotificationService.sendNotification({
            user_id: organization.owner.id,
            title: this.i18n.t('rental-contract.success.addon_cancelled_title', { lang }),
            content: this.i18n.t('rental-contract.success.addon_cancelled_content', {
              lang,
              args: { addon: result.addon.name, code: contract.code }
            }),
            type: 'WARNING',
          }, userId, lang);
        } catch (notifError) {
          this.systemLogService.error(
            'rental-contract',
            'notification',
            'Failed to send addon cancelled notification',
            { userId, metaData: { contractId: contract.id, addonId: result.addon_id, error: String(notifError) } },
          );
        }
      }
    }

    // Invalidate cache
    await this.invalidateContractCache(contract.id);

    return result;
  }

  /**
   * Hủy hợp đồng với lý do
   */
  async cancelContractWithReason(
    contractId: string,
    cancelReason: string,
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<void> {
    const existing = await this.repository.findById(contractId);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('rental-contract.errors.not_found', { lang }),
      );
    }

    // Kiểm tra contract thuộc org
    if (existing.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('rental-contract.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền org-level
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.delete',
      lang,
    );

    // Không cho hủy hợp đồng đã COMPLETED hoặc LIQUIDATED
    const nonCancellableStatuses: ContractStatus[] = [
      ContractStatus.COMPLETED,
      ContractStatus.LIQUIDATED,
    ];
    if (nonCancellableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        this.i18n.t('rental-contract.errors.cannot_cancel', { lang }),
      );
    }

    // Ghi log trước khi hủy
    await this.repository.createLog({
      rental_contract_id: contractId,
      action: 'CANCELLED',
      description: `Hợp đồng đã bị hủy. Lý do: ${cancelReason}`,
      metadata: {
        previous_status: existing.status,
        cancel_reason: cancelReason,
      },
      created_by: userId,
    });

    // Set actual_ended_at và soft delete
    await this.repository.cancelContract(contractId, userId);

    // Release lock nếu còn
    const lockKey = `rental:lock:contract:${contractId}`;
    await this.releaseLock([lockKey]);

    // Invalidate caches
    await Promise.all([
      this.invalidateContractCache(contractId),
      this.invalidateContractListCache(),
    ]);

    // Log
    this.systemLogService.info(
      'rental-contract',
      'cancel',
      `Cancelled contract ${existing.code} with reason: ${cancelReason}`,
      { userId, metaData: { contractId, code: existing.code, reason: cancelReason } },
    );

    // Audit log
    this.auditLogService.logDelete(
      organizationId,
      'rental_contract',
      contractId,
      { status: existing.status, code: existing.code, cancel_reason: cancelReason } as unknown as Record<
        string,
        unknown
      >,
      { userId, description: `Cancelled contract: ${existing.code}` },
    );

    // Emit socket event
    this.websocketGateway.emitToOrganization(organizationId, 'rentalContract:cancelled', {
      contractId,
      code: existing.code,
      cancelReason,
      cancelledBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Lấy addons của hợp đồng
   */
  async getContractAddons(
    contractId: string,
    userId: string,
    organizationId: string,
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

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.read',
      lang,
    );

    return this.repository.findContractAddons(contractId);
  }

  /**
   * Lấy log của hợp đồng
   */
  async getContractLogs(
    contractId: string,
    userId: string,
    organizationId: string,
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

    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.read',
      lang,
    );

    return this.repository.findContractLogs(contractId);
  }

  /**
   * Lấy thông tin đầy đủ của hợp đồng (với addons, logs, coupons)
   */
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

    return contract;
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

  private async calculateRentalPriceForTemplate(
    template: any,
    templateItem: RentalTemplateItemDto,
    months: number,
    isWholeWarehouse: boolean,
  ): Promise<IRentalPriceCalculation> {
    const discountRate = this.getDiscountRate(
      months,
      isWholeWarehouse,
      template,
    );
    const rentalDays = months * 30;

    let pricePerMonth = 0;
    let subtotal = 0;

    if (isWholeWarehouse) {
      pricePerMonth = Number(template.price_per_month);
      subtotal = pricePerMonth * months * (1 - discountRate / 100);
    } else if (
      templateItem.row_template_ids &&
      templateItem.row_template_ids.length > 0
    ) {
      for (const rowId of templateItem.row_template_ids) {
        const row = template.rows?.find((r: any) => r.id === rowId);
        if (row) {
          pricePerMonth += Number(row.price_per_month);
        }
      }
      subtotal = pricePerMonth * months * (1 - discountRate / 100);
    }

    return {
      templateId: templateItem.template_id,
      warehouseName: templateItem.warehouse_name,
      warehouseDescription: templateItem.warehouse_description,
      rowTemplateIds: templateItem.row_template_ids || [],
      isWholeWarehouse,
      pricePerMonth,
      discountRate,
      rentalDays,
      subtotal,
    };
  }

  private getDiscountRate(
    months: number,
    isWholeWarehouse: boolean,
    template: any,
  ): number {
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

    // Giảm giá đã được xử lý qua discount_configs

    return Math.min(baseDiscount, 100);
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
    const ttl = this.LOCK_DURATION_SECONDS;

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

  /**
   * Chuyển đổi duration value theo unit sang số tháng
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
        return value; // Mặc định là tháng
    }
  }

  /**
   * Gửi email thông báo hủy addon
   */
  private async sendAddonCancelledEmail(
    data: IAddonCancelledEmail,
  ): Promise<void> {
    const subject = this.i18n.t(
      'rental-contract.email.addon_cancelled_subject',
      { lang: data.lang, args: { addon: data.addonName } },
    );
    const body = this.i18n.t(
      'rental-contract.email.addon_cancelled_body',
      {
        lang: data.lang,
        args: {
          addon: data.addonName,
          code: data.contractCode,
          reason: data.cancelReason || 'Không có lý do',
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

