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
import {
  CreateRentalContractDto,
  UpdateRentalContractDto,
  QueryRentalContractDto,
  RentalTemplateItemDto,
} from './dto';
import {
  IRentalContractWithRelations,
  IPaginatedResponse,
  ICreateContractResult,
  IRentalPriceCalculation,
  IContractTimeChangedEmail,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { WarehouseTemplateRepository } from '../warehouse-template/warehouse-template.repository';
import { EmailService } from '../notification/email.service';
import { OrganizationRepository } from '../organization/organization.repository';
import { PayosService } from '../payment/payos.service';
import { PaymentType } from '@prisma/client';

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
    private readonly payosService: PayosService,
  ) {
    this.CONTRACT_CACHE_TTL =
      this.configService.get<number>('REDIS_RENTAL_CONTRACT_CACHE_TTL') || 300;
    this.CONTRACT_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL') ||
      60;
    this.LOCK_DURATION_HOURS =
      this.configService.get<number>('RENTAL_LOCK_DURATION_HOURS') || 1;
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
    // Validate rental_months
    if (!this.ALLOWED_MONTHS.includes(dto.rental_months)) {
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
        dto.rental_months,
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
      const rentalDays = dto.rental_months * 30;

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

      // Invalidate list cache
      await this.invalidateContractListCache();

      // Tạo payment link với PayOS
      const paymentResult = await this.payosService.createContractPayment(
        contract.id,
        Math.round(parseFloat(contract.final_price.toString())),
        `${code}`,
        PaymentType.NEW_CONTRACT,
        userId,
      );

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
   * Nếu có organizationId, kiểm tra quyền đọc trong org đó
   */
  async findMany(
    query: QueryRentalContractDto,
    userId: string,
    organizationId?: string,
    lang: string = 'vi',
  ): Promise<IPaginatedResponse<IRentalContractWithRelations>> {
    // Nếu có organizationId, kiểm tra quyền đọc
    if (organizationId) {
      await this.checkOrgPermission(
        organizationId,
        userId,
        'rental-contract.list',
        lang,
      );
      // Ghi đè organization_id trong query
      query.organization_id = organizationId;
    }

    const queryParams: Record<string, unknown> = {
      limit: query.limit,
      offset: query.offset,
      keywords: query.keywords,
      status: query.status,
      organization_id: query.organization_id,
      userId, // Thêm userId vào cache key để phân biệt
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
   * Kiểm tra quyền: phải là owner/member của org đó hoặc có permission
   */
  async findById(
    id: string,
    userId: string,
    organizationId?: string,
    lang: string = 'vi',
  ): Promise<IRentalContractWithRelations> {
    const cacheKey = this.getContractCacheKey(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const contract = JSON.parse(cached) as IRentalContractWithRelations;
        // Kiểm tra quyền truy cập
        if (organizationId && contract.organization_id !== organizationId) {
          throw new ForbiddenException(
            await this.i18n.translate('rental-contract.errors.no_permission', {
              lang,
            }),
          );
        }
        if (organizationId) {
          await this.checkOrgPermission(
            contract.organization_id,
            userId,
            'rental-contract.read',
            lang,
          );
        }
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

    // Kiểm tra quyền truy cập
    if (organizationId && contract.organization_id !== organizationId) {
      throw new ForbiddenException(
        await this.i18n.translate('rental-contract.errors.no_permission', {
          lang,
        }),
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
    organizationId: string,
    lang: string,
  ): Promise<IRentalContractWithRelations> {
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

    // Kiểm tra quyền cấp org: owner có full quyền, member cần permission
    await this.checkOrgPermission(
      organizationId,
      userId,
      'rental-contract.update',
      lang,
    );

    // Chỉ cho phép điều chỉnh thời gian hợp đồng ACTIVE
    if (dto.adjust_months && existing.status !== ContractStatus.ACTIVE) {
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
    if (dto.adjust_months && dto.adjust_months !== 0 && existing.expired_at) {
      newExpiredAt = new Date(existing.expired_at);
      newExpiredAt.setMonth(newExpiredAt.getMonth() + dto.adjust_months);

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
      dto.adjust_months &&
      dto.adjust_months !== 0 &&
      newExpiredAt &&
      existing.organization?.owner
    ) {
      try {
        await this.sendContractTimeChangedEmail({
          ownerEmail: existing.organization.owner.email,
          ownerName: existing.organization.owner.full_name,
          contractCode: existing.code,
          adjustMonths: dto.adjust_months,
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
      dto.adjust_months && dto.adjust_months > 0
        ? 'renew'
        : dto.adjust_months && dto.adjust_months < 0
          ? 'reduce'
          : 'update';
    this.systemLogService.info(
      'rental-contract',
      action,
      `${action} rental contract: ${contract.code}`,
      {
        userId,
        metaData: { contractId: id, adjustMonths: dto.adjust_months },
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
  }

  // =====================================================
  // ORG-LEVEL METHODS (dành cho /organizations/:orgId/rental-contracts)
  // Yêu cầu: owner hoặc member của organization
  // =====================================================

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
   * Gia hạn hợp đồng (chỉ cho phép adjust_months)
   * Chỉ owner/member của org mới được gia hạn
   */
  async renewByOrg(
    id: string,
    dto: { adjust_months: number },
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<IRentalContractWithRelations> {
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

    const newExpiredAt = new Date(existing.expired_at);
    newExpiredAt.setMonth(newExpiredAt.getMonth() + dto.adjust_months);

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
          ownerName: existing.organization.owner.full_name,
          contractCode: existing.code,
          adjustMonths: dto.adjust_months,
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
    const action = dto.adjust_months > 0 ? 'renew' : 'reduce';
    this.systemLogService.info(
      'rental-contract',
      action,
      `${action} rental contract: ${contract.code}`,
      { userId, metaData: { contractId: id, adjustMonths: dto.adjust_months } },
    );

    // Audit log
    this.auditLogService.logUpdate(
      organizationId,
      'rental_contract',
      id,
      { expired_at: existing.expired_at } as unknown as Record<string, unknown>,
      { adjust_months: dto.adjust_months } as unknown as Record<string, unknown>,
      { userId, description: `${action} rental contract: ${contract.code}` },
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

    // Thêm giảm giá cho thuê cả kho
    if (isWholeWarehouse) {
      baseDiscount += Number(template.whole_warehouse_discount);
    }

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
