import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';
import { OrganizationRepository } from './organization.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from './organization-audit-log.service';
import { EmailService } from '../notification/email.service';
import { CipherService } from '../../common/services/cipher.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  QueryOrganizationDto,
  TransferOwnershipDto,
  InviteMemberDto,
  AssignMemberRolesDto,
  AssignMemberPermissionsDto,
} from './dto';
import {
  IOrganizationWithRelations,
  IOrganizationMember,
  IOrganizationPermission,
  IPaginatedResponse,
} from './interfaces';

/**
 * Service chứa business logic cho Organization module
 */
@Injectable()
export class OrganizationService {
  private readonly INVITE_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly repository: OrganizationRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly auditLogService: OrganizationAuditLogService,
    private readonly emailService: EmailService,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
    private readonly cipherService: CipherService,
  ) { }

  /**
   * Loại bỏ các trường nhạy cảm khỏi response
   * Các trường google_client_id, google_client_secret, google_refresh_token, email_primary_address
   * và các trường gmail_pubsub chỉ được sử dụng nội bộ bởi hệ thống
   */
  private stripSensitiveFields(org: IOrganizationWithRelations): IOrganizationWithRelations {
    const {
      google_client_id,
      google_client_secret,
      google_refresh_token,
      email_primary_address,
      gmail_pubsub_topic,
      gmail_pubsub_subscription,
      gmail_webhook_secret,
      ...safeOrg
    } = org as any;

    // Convert BigInt fields to Number to avoid JSON serialization error
    if (safeOrg.api_key_logs_retention_ms != null) {
      safeOrg.api_key_logs_retention_ms = Number(safeOrg.api_key_logs_retention_ms);
    }
    if (safeOrg.org_audit_logs_retention_ms != null) {
      safeOrg.org_audit_logs_retention_ms = Number(safeOrg.org_audit_logs_retention_ms);
    }

    // Convert Decimal fields to Number to avoid JSON serialization error
    if (safeOrg.min_loss_tolerance != null) {
      safeOrg.min_loss_tolerance = Number(safeOrg.min_loss_tolerance);
    }
    if (safeOrg.max_loss_tolerance != null) {
      safeOrg.max_loss_tolerance = Number(safeOrg.max_loss_tolerance);
    }

    return safeOrg as IOrganizationWithRelations;
  }

  async create(
    dto: CreateOrganizationDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationWithRelations> {

    // Check duplicate tax code
    const isTaxCodeExist = await this.repository.findByTaxCode(dto.tax_code);
    if (isTaxCodeExist) {
      throw new ConflictException(
        await this.i18n.translate('organization.validation.tax_code_exists', { lang }),
      );
    }

    // Lookup tax code
    const taxInfo = await this.lookupTaxCode(dto.tax_code);
    if (!taxInfo) {
      throw new BadRequestException(
        await this.i18n.translate(
          'organization.validation.tax_code_invalid',
          { lang },
        ),
      );
    }

    // Validate and check Google credentials if enabled
    if (dto.is_using_google_email) {
      if (
        !dto.google_client_id ||
        !dto.google_client_secret ||
        !dto.google_refresh_token ||
        !dto.email_primary_address
      ) {
        throw new BadRequestException(
          await this.i18n.translate(
            'organization.validation.google_fields_required',
            { lang },
          ),
        );
      }

      await this.verifyGoogleCredentials(
        dto.google_client_id,
        dto.google_client_secret,
        dto.google_refresh_token,
        lang,
      );

      // Encrypt sensitive fields
      dto.google_client_id = this.cipherService.encrypt(dto.google_client_id);
      dto.google_client_secret = this.cipherService.encrypt(
        dto.google_client_secret,
      );
      dto.google_refresh_token = this.cipherService.encrypt(
        dto.google_refresh_token,
      );
      dto.email_primary_address = this.cipherService.encrypt(
        dto.email_primary_address,
      );
    } else {
      // Khi không dùng Google Email, xóa email_primary_address để không lưu giá trị rác
      dto.email_primary_address = undefined;
    }

    // Mã hóa các trường Gmail Pub/Sub (luôn mã hóa nếu có)
    if (dto.gmail_pubsub_topic)
      dto.gmail_pubsub_topic = this.cipherService.encrypt(dto.gmail_pubsub_topic);
    if (dto.gmail_pubsub_subscription)
      dto.gmail_pubsub_subscription = this.cipherService.encrypt(dto.gmail_pubsub_subscription);
    if (dto.gmail_webhook_secret)
      dto.gmail_webhook_secret = this.cipherService.encrypt(dto.gmail_webhook_secret);

    // Tạo organization
    const org = await this.repository.create({
      name: taxInfo.name,
      international_name: taxInfo.internationalName,
      tax_code: dto.tax_code,
      headquarters_address: taxInfo.address,
      representative_name: dto.representative_name,
      representative_title: dto.representative_title,
      representative_phone: dto.representative_phone,
      representative_email: dto.representative_email,
      is_active: dto.is_active ?? true,
      owner: { connect: { id: userId } },
      created_by: userId,
      is_using_google_email: dto.is_using_google_email,
      google_client_id: dto.google_client_id,
      google_client_secret: dto.google_client_secret,
      google_refresh_token: dto.google_refresh_token,
      email_primary_address: dto.email_primary_address,
      gmail_pubsub_topic: dto.gmail_pubsub_topic,
      gmail_pubsub_subscription: dto.gmail_pubsub_subscription,
      gmail_webhook_secret: dto.gmail_webhook_secret,
    });

    // Thêm owner vào danh sách members với trạng thái đã chấp nhận
    await this.repository.createMember({
      organization: { connect: { id: org.id } },
      user: { connect: { id: userId } },
      is_accepted: true,
      is_active: true,
      created_by: userId,
    });

    // Invalidate cache
    await this.redisService.invalidateOrganizationListCache();

    // Log
    this.systemLogService.info(
      'organization',
      'create',
      `Organization created: ${org.name}`,
      { userId },
    );

    this.auditLogService.logCreate(
      org.id,
      'Organization',
      org.id,
      {
        name: org.name,
        is_using_google_email: org.is_using_google_email,
      },
      { userId },
    );

    // Emit WebSocket event - gửi org đã strip sensitive fields
    this.websocketGateway.emitOrganizationCreated(userId, this.stripSensitiveFields(org));

    return this.stripSensitiveFields(org);
  }

  private async lookupTaxCode(taxCode: string): Promise<{ name: string; address: string; internationalName?: string } | null> {
    try {
      const response = await axios.get(`https://api.vietqr.io/v2/business/${taxCode}`);
      if (response.data && response.data.code === '00' && response.data.data) {
        return {
          name: response.data.data.name,
          address: response.data.data.address,
          internationalName: response.data.data.internationalName,
        };
      }
      return null;
    } catch (error) {
      this.systemLogService.error(
        'organization',
        'lookup_tax_code',
        `Tax code lookup failed for ${taxCode}: ${error.message}`,
        { metaData: { error: error?.response?.data || error } },
      );
      return null;
    }
  }

  private async verifyGoogleCredentials(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    lang: string,
  ): Promise<void> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      if (!response.data || !response.data.access_token) {
        throw new Error('No access token returned');
      }
    } catch (error) {
      this.systemLogService.error(
        'organization',
        'verify_google',
        `Google credential verification failed: ${error.message}`,
        { metaData: { error: error?.response?.data || error } },
      );
      throw new BadRequestException(
        await this.i18n.translate(
          'organization.validation.google_credentials_invalid',
          { lang },
        ),
      );
    }
  }

  async findById(
    id: string,
    lang: string,
    userId?: string,
    hasReadAllPermission?: boolean,
  ): Promise<IOrganizationWithRelations> {
    // Kiểm tra cache trước
    const cached =
      await this.redisService.getOrganizationCache<IOrganizationWithRelations>(
        id,
      );
    if (cached) {
      // Nếu không có quyền .all, kiểm tra xem user có phải owner hoặc member không
      if (!hasReadAllPermission && userId) {
        const isOwnerOrMember =
          cached.owner_id === userId ||
          (await this.repository.findMemberByUserAndOrg(userId, id)) !== null;
        if (!isOwnerOrMember) {
          throw new NotFoundException(
            await this.i18n.translate('organization.errors.not_found', {
              lang,
            }),
          );
        }
      }
      return cached;
    }

    const org = await this.repository.findById(id);
    if (!org) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.not_found', { lang }),
      );
    }

    // Nếu không có quyền .all, kiểm tra xem user có phải owner hoặc member không
    if (!hasReadAllPermission && userId) {
      const isOwnerOrMember =
        org.owner_id === userId ||
        org.owner?.id === userId ||
        (await this.repository.findMemberByUserAndOrg(userId, id)) !== null;
      if (!isOwnerOrMember) {
        throw new NotFoundException(
          await this.i18n.translate('organization.errors.not_found', { lang }),
        );
      }
    }

    // Ẩn các trường nhạy cảm và convert BigInt/Decimal trước khi cache
    const safeOrg = this.stripSensitiveFields(org);

    // Cache result (sau khi đã strip và convert)
    await this.redisService.setOrganizationCache(id, safeOrg);

    return safeOrg;
  }

  async findMany(
    query: QueryOrganizationDto,
    userId: string,
    hasListAllPermission?: boolean,
  ): Promise<IPaginatedResponse<IOrganizationWithRelations>> {
    // Nếu có quyền .all, không filter theo userId
    const effectiveUserId = hasListAllPermission ? undefined : userId;
    const cacheKey = this.redisService.getOrganizationListCacheKey({
      ...query,
      userId: effectiveUserId,
    });
    const cached =
      await this.redisService.getOrganizationListCache<
        IPaginatedResponse<IOrganizationWithRelations>
      >(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findMany(query, effectiveUserId);

    // Ẩn các trường nhạy cảm và convert BigInt TRƯỚC khi cache
    if (result.items) {
      result.items = result.items.map(org => this.stripSensitiveFields(org));
    }

    // Cache result (sau khi đã strip và convert BigInt)
    await this.redisService.setOrganizationListCache(cacheKey, result);

    return result;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    userId: string,
    lang: string,
    hasUpdateAllPermission?: boolean,
  ): Promise<IOrganizationWithRelations> {
    // Lấy org trực tiếp từ repository vì cần dữ liệu gốc với sensitive fields
    const org = await this.repository.findById(id);
    if (!org) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.not_found', { lang }),
      );
    }

    // Kiểm tra quyền: phải là owner HOẶC có quyền organization.update.all
    const isOwner = org.owner_id === userId || org.owner?.id === userId;
    if (!hasUpdateAllPermission && !isOwner) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.not_owner', { lang }),
      );
    }

    // Chỉ có admin (người có quyền update.all) mới được cập nhật is_active
    if (dto.is_active !== undefined && !hasUpdateAllPermission) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.update_active_forbidden', { lang }),
      );
    }

    const oldData = {
      name: org.name,
      is_active: org.is_active,
      is_using_google_email: org.is_using_google_email,
    };

    // Validate if Google Email is being enabled or credentials are changed while enabled
    const isUsingGoogle =
      dto.is_using_google_email ?? org.is_using_google_email;

    if (isUsingGoogle) {
      // Decrypt stored credentials để so sánh và validate
      const storedClientId = org.google_client_id ? this.cipherService.decrypt(org.google_client_id) : null;
      const storedClientSecret = org.google_client_secret ? this.cipherService.decrypt(org.google_client_secret) : null;
      const storedRefreshToken = org.google_refresh_token ? this.cipherService.decrypt(org.google_refresh_token) : null;
      const storedEmailPrimary = org.email_primary_address ? this.cipherService.decrypt(org.email_primary_address) : null;

      const clientId = dto.google_client_id ?? storedClientId;
      const clientSecret = dto.google_client_secret ?? storedClientSecret;
      const refreshToken = dto.google_refresh_token ?? storedRefreshToken;
      const emailPrimary = dto.email_primary_address ?? storedEmailPrimary;

      if (!clientId || !clientSecret || !refreshToken || !emailPrimary) {
        throw new BadRequestException(
          await this.i18n.translate(
            'organization.validation.google_fields_required',
            { lang },
          ),
        );
      }

      // Verify connection
      await this.verifyGoogleCredentials(
        clientId,
        clientSecret,
        refreshToken,
        lang,
      );
    }

    // Encrypt sensitive fields
    if (dto.google_client_id)
      dto.google_client_id = this.cipherService.encrypt(dto.google_client_id);
    if (dto.google_client_secret)
      dto.google_client_secret = this.cipherService.encrypt(
        dto.google_client_secret,
      );
    if (dto.google_refresh_token)
      dto.google_refresh_token = this.cipherService.encrypt(
        dto.google_refresh_token,
      );
    if (dto.email_primary_address)
      dto.email_primary_address = this.cipherService.encrypt(
        dto.email_primary_address,
      );

    // Mã hóa các trường Gmail Pub/Sub
    if (dto.gmail_pubsub_topic)
      dto.gmail_pubsub_topic = this.cipherService.encrypt(dto.gmail_pubsub_topic);
    if (dto.gmail_pubsub_subscription)
      dto.gmail_pubsub_subscription = this.cipherService.encrypt(dto.gmail_pubsub_subscription);
    if (dto.gmail_webhook_secret)
      dto.gmail_webhook_secret = this.cipherService.encrypt(dto.gmail_webhook_secret);

    const updated = await this.repository.update(id, {
      ...dto,
      updated_by: userId,
      updated_at: new Date(),
    });

    // Invalidate cache
    await this.redisService.invalidateAllOrganizationCache(id);

    // Log
    this.systemLogService.info(
      'organization',
      'update',
      `Organization updated: ${updated.name}`,
      { userId },
    );
    this.auditLogService.logUpdate(
      id,
      'Organization',
      id,
      oldData,
      {
        name: updated.name,
        is_active: updated.is_active,
        is_using_google_email: updated.is_using_google_email,
      },
      { userId },
    );

    // Emit WebSocket - gửi org đã strip sensitive fields
    this.websocketGateway.emitOrganizationUpdated(org.owner_id, this.stripSensitiveFields(updated));

    return this.stripSensitiveFields(updated);
  }

  async delete(
    id: string,
    userId: string,
    lang: string,
    hasDeleteAllPermission?: boolean,
  ): Promise<void> {
    const org = await this.findById(id, lang);

    // Kiểm tra quyền: phải là owner HOẶC có quyền organization.delete.all
    const isOwner = org.owner_id === userId || org.owner?.id === userId;
    if (!hasDeleteAllPermission && !isOwner) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.not_owner', { lang }),
      );
    }

    // Soft delete tất cả members
    await this.repository.softDeleteAllMembersByOrgId(id, userId);

    // Soft delete tất cả roles
    await this.repository.softDeleteAllRolesByOrgId(id);

    // Soft delete tất cả API keys
    await this.repository.softDeleteAllApiKeysByOrgId(id);

    // Soft delete organization
    const oldData = { name: org.name, is_active: org.is_active };
    await this.repository.softDelete(id, userId);

    // Invalidate cache
    await this.redisService.invalidateAllOrganizationCache(id);

    // Log
    this.systemLogService.info(
      'organization',
      'delete',
      `Organization deleted: ${org.name}`,
      { userId },
    );
    this.auditLogService.logDelete(id, 'Organization', id, oldData, { userId });

    // Emit WebSocket
    this.websocketGateway.emitOrganizationDeleted(org.owner_id, id);
  }

  async deleteMany(
    ids: string[],
    userId: string,
    lang: string,
    hasDeleteAllPermission?: boolean,
  ): Promise<void> {
    const orgs = await this.repository.findByIds(ids);
    if (orgs.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.not_found', { lang }),
      );
    }

    // Check permissions
    if (!hasDeleteAllPermission) {
      const unauthorizedOrg = orgs.find(
        (org) => org.owner_id !== userId && org.owner?.id !== userId,
      );
      if (unauthorizedOrg) {
        throw new ForbiddenException(
          await this.i18n.translate('organization.errors.not_owner', { lang }),
        );
      }
    }

    // Cascade delete
    await this.repository.softDeleteAllMembersByOrgIds(ids, userId);
    await this.repository.softDeleteAllRolesByOrgIds(ids);
    await this.repository.softDeleteAllApiKeysByOrgIds(ids);
    await this.repository.softDeleteMany(ids, userId);

    // Invalidate cache and emit events
    await Promise.all(
      orgs.map(async (org) => {
        await this.redisService.invalidateAllOrganizationCache(org.id);

        this.systemLogService.info(
          'organization',
          'delete',
          `Organization deleted: ${org.name}`,
          { userId },
        );
        this.auditLogService.logDelete(
          org.id,
          'Organization',
          org.id,
          { name: org.name, is_active: org.is_active } as Record<string, unknown>,
          { userId },
        );
        this.websocketGateway.emitOrganizationDeleted(org.owner_id, org.id);
      }),
    );

    // Emit deletedMany event
    this.websocketGateway.emitOrganizationsDeletedMany(userId, ids);
  }

  async transferOwnership(
    id: string,
    dto: TransferOwnershipDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationWithRelations> {
    const org = await this.findById(id, lang);

    // Kiểm tra quyền: phải là owner
    const isOwner = org.owner_id === userId || org.owner?.id === userId;
    if (!isOwner) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.not_owner', { lang }),
      );
    }

    // Kiểm tra new owner tồn tại theo email
    const newOwner = await this.repository.findUserByEmail(dto.new_owner_email);
    if (!newOwner) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.user_not_found', {
          lang,
        }),
      );
    }

    // Kiểm tra không được transfer cho chính mình
    if (newOwner.id === userId) {
      throw new ForbiddenException(
        await this.i18n.translate(
          'organization.errors.cannot_transfer_to_self',
          { lang },
        ),
      );
    }

    // Kiểm tra new owner là member của org
    const member = await this.repository.findMemberByUserAndOrg(
      newOwner.id,
      id,
    );
    if (!member || !member.is_accepted) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.new_owner_not_member', {
          lang,
        }),
      );
    }

    const oldOwnerId = org.owner_id;
    const updated = await this.repository.update(id, {
      owner: { connect: { id: newOwner.id } },
      updated_by: userId,
      updated_at: new Date(),
    });

    // Invalidate cache
    await this.redisService.invalidateAllOrganizationCache(id);

    // Log
    this.systemLogService.info(
      'organization',
      'transfer_ownership',
      `Ownership transferred from ${oldOwnerId} to ${newOwner.id}`,
      { userId },
    );
    this.auditLogService.logUpdate(
      id,
      'Organization',
      id,
      { owner_id: oldOwnerId },
      { owner_id: newOwner.id },
      { userId, description: 'Ownership transferred' },
    );

    const safeUpdated = this.stripSensitiveFields(updated);

    // Emit WebSocket to both old and new owner
    this.websocketGateway.emitOwnershipTransferred(
      oldOwnerId,
      newOwner.id,
      safeUpdated,
    );

    return safeUpdated;
  }

  async inviteMember(
    orgId: string,
    dto: InviteMemberDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationMember[]> {
    // Loại bỏ emails trùng nhau
    dto.emails = [...new Set(dto.emails)];

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.member.invite',
      org.owner_id,
      lang,
    );

    // Lấy thông tin người mời trước
    const inviter = await this.repository.findUserById(userId);
    const inviterName = inviter?.name || inviter?.email || 'Unknown';
    const inviterEmail = inviter?.email || '';

    const results: IOrganizationMember[] = [];
    const errors: { email: string; error: string }[] = [];

    // Xử lý từng email
    for (const email of dto.emails) {
      try {
        // Kiểm tra user tồn tại theo email
        const user = await this.repository.findUserByEmail(email);
        if (!user) {
          errors.push({
            email,
            error: await this.i18n.translate('organization.errors.user_not_found', { lang }),
          });
          continue;
        }

        // Kiểm tra đã là member chưa
        const existingMember = await this.repository.findMemberByUserAndOrg(
          user.id,
          orgId,
        );
        if (existingMember && existingMember.is_accepted) {
          errors.push({
            email,
            error: await this.i18n.translate('organization.errors.already_member', { lang }),
          });
          continue;
        }
        if (existingMember && !existingMember.is_accepted) {
          errors.push({
            email,
            error: await this.i18n.translate('organization.errors.already_invited', { lang }),
          });
          continue;
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpiresAt = new Date();
        inviteTokenExpiresAt.setDate(
          inviteTokenExpiresAt.getDate() + this.INVITE_TOKEN_EXPIRY_DAYS,
        );

        // Tạo member (pending invitation) với display_name tự động lấy từ user.name
        const member = await this.repository.createMember({
          organization: { connect: { id: orgId } },
          user: { connect: { id: user.id } },
          display_name: user.name || user.email?.split('@')[0] || null,
          is_accepted: false,
          is_active: true,
          invite_token: inviteToken,
          invite_token_expires_at: inviteTokenExpiresAt,
          created_by: userId,
        });

        // Log
        this.auditLogService.logCreate(
          orgId,
          'OrganizationMember',
          member.id,
          { email, user_id: user.id, invited_by: userId, display_name: member.display_name },
          { userId },
        );

        // Emit WebSocket to the invited user
        this.websocketGateway.emitMemberInvited(user.id, {
          organization: org,
          member,
        });

        const inviteeName = user.name || user.email || 'User';

        // Gửi email mời (không block)
        this.emailService
          .sendOrganizationInviteEmail(
            email,
            inviteToken,
            inviteeName,
            org.name,
            inviterName,
            inviterEmail,
            lang,
          )
          .catch((err) => {
            this.systemLogService.error(
              'organization',
              'invite_email',
              `Failed to send invite email to ${email}: ${err.message}`,
              { userId },
            );
          });

        results.push(member);
      } catch (err) {
        errors.push({
          email,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Invalidate cache sau khi xử lý xong tất cả
    if (results.length > 0) {
      await this.redisService.invalidateOrganizationMemberCache(orgId);
    }

    // Log tổng kết
    if (results.length > 0) {
      this.systemLogService.info(
        'organization',
        'invite_members',
        `Invited ${results.length} members to ${org.name}`,
        { userId, metaData: { successCount: results.length, errorCount: errors.length } },
      );
    }

    // Nếu không có kết quả thành công nào và có lỗi, throw để frontend xử lý
    if (results.length === 0 && errors.length > 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.invite_failed_all', { lang }) +
        ': ' +
        errors.map((e) => `${e.email}: ${e.error}`).join(', '),
      );
    }

    return results;
  }

  /**
   * Kiểm tra token mời có hợp lệ không (chỉ kiểm tra token của user hiện tại)
   */
  async verifyInviteToken(
    token: string,
    userId: string,
    lang: string,
  ): Promise<{
    valid: boolean;
    organization?: { id: string; name: string };
    invitedEmail?: string;
    expiresAt?: Date;
  }> {
    const member = await this.repository.findMemberByInviteToken(token);

    if (!member) {
      return { valid: false };
    }

    // Kiểm tra token có thuộc về user hiện tại không
    if (member.user_id !== userId) {
      return { valid: false };
    }

    // Kiểm tra đã accept chưa
    if (member.is_accepted) {
      return { valid: false };
    }

    // Kiểm tra token hết hạn
    if (
      member.invite_token_expires_at &&
      new Date() > member.invite_token_expires_at
    ) {
      return { valid: false };
    }

    // Lấy thông tin organization
    const org = await this.repository.findById(member.organization_id);
    const user = await this.repository.findUserById(member.user_id);

    return {
      valid: true,
      organization: org ? { id: org.id, name: org.name } : undefined,
      invitedEmail: user?.email ?? undefined,
      expiresAt: member.invite_token_expires_at || undefined,
    };
  }

  /**
   * Chấp nhận lời mời bằng token
   */
  async acceptInviteByToken(
    token: string,
    userId: string,
    lang: string,
  ): Promise<IOrganizationMember> {
    const member = await this.repository.findMemberByInviteToken(token);

    if (!member) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.invite_not_found', {
          lang,
        }),
      );
    }

    // Kiểm tra user có phải người được mời không
    if (member.user_id !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.invite_not_for_you', {
          lang,
        }),
      );
    }

    // Kiểm tra đã accept chưa
    if (member.is_accepted) {
      throw new ConflictException(
        await this.i18n.translate('organization.errors.already_member', {
          lang,
        }),
      );
    }

    // Kiểm tra token hết hạn
    if (
      member.invite_token_expires_at &&
      new Date() > member.invite_token_expires_at
    ) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.invite_expired', {
          lang,
        }),
      );
    }

    const updated = await this.repository.updateMember(member.id, {
      is_accepted: true,
      invite_token: null,
      invite_token_expires_at: null,
      updated_at: new Date(),
    });

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(
      member.organization_id,
    );

    // Log
    this.auditLogService.logUpdate(
      member.organization_id,
      'OrganizationMember',
      member.id,
      { is_accepted: false },
      { is_accepted: true },
      { userId },
    );

    return updated;
  }

  /**
   * Từ chối lời mời bằng token
   */
  async rejectInviteByToken(
    token: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const member = await this.repository.findMemberByInviteToken(token);

    if (!member) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.invite_not_found', {
          lang,
        }),
      );
    }

    // Kiểm tra user có phải người được mời không
    if (member.user_id !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.invite_not_for_you', {
          lang,
        }),
      );
    }

    // Kiểm tra đã accept chưa
    if (member.is_accepted) {
      throw new ConflictException(
        await this.i18n.translate('organization.errors.already_member', {
          lang,
        }),
      );
    }

    // Kiểm tra token hết hạn
    if (
      member.invite_token_expires_at &&
      new Date() > member.invite_token_expires_at
    ) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.invite_expired', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteMember(member.id, userId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(
      member.organization_id,
    );

    // Log
    this.auditLogService.logDelete(
      member.organization_id,
      'OrganizationMember',
      member.id,
      { user_id: userId, rejected: true },
      { userId },
    );
  }

  async cancelInvite(
    orgId: string,
    memberId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.member.invite.remove',
      org.owner_id,
      lang,
    );

    const member = await this.repository.findMemberById(memberId);
    if (!member || member.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.invite_not_found', {
          lang,
        }),
      );
    }

    if (member.is_accepted) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteMember(memberId, userId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logDelete(
      orgId,
      'OrganizationMember',
      memberId,
      { user_id: member.user_id },
      { userId },
    );
  }

  async acceptInvite(
    orgId: string,
    userId: string,
    lang: string,
  ): Promise<IOrganizationMember> {
    const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
    if (!member) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.invite_not_found', {
          lang,
        }),
      );
    }

    if (member.is_accepted) {
      throw new ConflictException(
        await this.i18n.translate('organization.errors.already_member', {
          lang,
        }),
      );
    }

    const updated = await this.repository.updateMember(member.id, {
      is_accepted: true,
      updated_at: new Date(),
    });

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'OrganizationMember',
      member.id,
      { is_accepted: false },
      { is_accepted: true },
      { userId },
    );

    // Emit socket event
    const org = await this.findById(orgId, lang);
    this.websocketGateway.emitMemberAccepted(orgId, org.name, member.id, userId);

    return updated;
  }

  async rejectInvite(
    orgId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
    if (!member) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.invite_not_found', {
          lang,
        }),
      );
    }

    if (member.is_accepted) {
      throw new ConflictException(
        await this.i18n.translate('organization.errors.already_member', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteMember(member.id, userId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logDelete(
      orgId,
      'OrganizationMember',
      member.id,
      { user_id: userId, rejected: true },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitMemberRejected(orgId, userId);
  }

  async getMembers(
    orgId: string,
    userId: string,
    query: { limit?: number; offset?: number; is_accepted?: boolean },
    lang: string,
  ): Promise<IPaginatedResponse<IOrganizationMember>> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.member.list',
      org.owner_id,
      lang,
    );

    const result = await this.repository.findMembersByOrgId(orgId, query);

    // Merge permissions từ roles vào mảng permissions của member
    const membersWithMergedPermissions = result.items.map((member: any) => {
      // Lấy direct permissions và đánh dấu source
      const directPermissions = (member.permissions || []).map((p: any) => ({
        ...p,
        source: 'permission',
        roles: [],
      }));

      // Lấy permissions từ roles và gom các roles có cùng permission
      const rolePermissionsMap = new Map<string, any>();
      for (const memberRole of member.roles || []) {
        const role = memberRole.role;
        if (role && role.permissions) {
          for (const rolePermission of role.permissions) {
            const permissionId = rolePermission.permission.id;
            if (rolePermissionsMap.has(permissionId)) {
              // Thêm role vào danh sách roles của permission đã tồn tại
              rolePermissionsMap.get(permissionId).roles.push({
                id: role.id,
                name: role.name,
              });
            } else {
              // Tạo permission mới với role đầu tiên
              rolePermissionsMap.set(permissionId, {
                id: rolePermission.id,
                organization_member_id: member.id,
                organization_permission_id:
                  rolePermission.organization_permission_id,
                warehouse_id: null,
                is_active: true,
                created_at: rolePermission.created_at || new Date(),
                updated_at: rolePermission.updated_at || new Date(),
                is_deleted: false,
                deleted_at: null,
                permission: rolePermission.permission,
                source: 'role',
                roles: [{ id: role.id, name: role.name }],
              });
            }
          }
        }
      }
      const rolePermissions = Array.from(rolePermissionsMap.values());

      // Merge permission + role permissions, ưu tiên permission nếu trùng
      const allPermissions = [...directPermissions, ...rolePermissions];
      const uniquePermissions = allPermissions.filter(
        (p, index, self) =>
          index === self.findIndex((t) => t.permission.id === p.permission.id),
      );

      // Xóa permissions nested trong roles để tránh lặp dữ liệu
      const cleanedRoles = (member.roles || []).map((mr: any) => ({
        id: mr.id,
        organization_role_id: mr.organization_role_id,
        role: {
          id: mr.role.id,
          name: mr.role.name,
        },
      }));

      return {
        ...member,
        roles: cleanedRoles,
        permissions: uniquePermissions,
      };
    });

    return {
      ...result,
      items: membersWithMergedPermissions as IOrganizationMember[],
    };
  }

  async assignMemberRoles(
    orgId: string,
    memberId: string,
    dto: AssignMemberRolesDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationMember> {
    // Loại bỏ role_ids trùng nhau
    dto.role_ids = [...new Set(dto.role_ids)];

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.member.role.assign',
      org.owner_id,
      lang,
    );

    const member = await this.repository.findMemberById(memberId);
    if (!member || member.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }

    await this.repository.assignMemberRoles(memberId, dto.role_ids, userId);

    const updated = await this.repository.findMemberById(memberId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'OrganizationMember',
      memberId,
      {},
      { role_ids: dto.role_ids },
      { userId, description: 'Roles assigned' },
    );

    // Emit socket event
    this.websocketGateway.emitMemberRolesUpdated(orgId, memberId, dto.role_ids, userId);

    return updated!;
  }

  async assignMemberPermissions(
    orgId: string,
    memberId: string,
    dto: AssignMemberPermissionsDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationMember> {
    // Loại bỏ permission_ids trùng nhau
    dto.permission_ids = [...new Set(dto.permission_ids)];

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.member.permission.assign',
      org.owner_id,
      lang,
    );

    const member = await this.repository.findMemberById(memberId);
    if (!member || member.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }

    await this.repository.assignMemberPermissions(
      memberId,
      dto.permission_ids,
      userId,
    );

    const updated = await this.repository.findMemberById(memberId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'OrganizationMember',
      memberId,
      {},
      { permission_ids: dto.permission_ids },
      { userId, description: 'Permissions assigned' },
    );

    // Emit socket event
    this.websocketGateway.emitMemberPermissionsUpdated(orgId, memberId, dto.permission_ids, userId);

    return updated!;
  }

  /**
   * Cập nhật display name của member (Admin or Self)
   */
  async updateMemberDisplayName(
    orgId: string,
    memberId: string,
    displayName: string,
    userId: string,
    lang: string,
    isSelf: boolean = false,
  ): Promise<IOrganizationMember> {
    const org = await this.findById(orgId, lang);

    const member = await this.repository.findMemberById(memberId);
    if (!member || member.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }

    // Nếu là self update, kiểm tra memberId phải thuộc về userId
    if (isSelf) {
      if (member.user_id !== userId) {
        throw new ForbiddenException(
          await this.i18n.translate('organization.errors.permission_denied', {
            lang,
          }),
        );
      }
    } else {
      // Admin update: cần quyền
      await this.checkOrgPermission(
        orgId,
        userId,
        'organization.member.update',
        org.owner_id,
        lang,
      );
    }

    const oldDisplayName = member.display_name;
    const updated = await this.repository.updateMember(memberId, {
      display_name: displayName,
      updated_by: userId,
      updated_at: new Date(),
    });

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'OrganizationMember',
      memberId,
      { display_name: oldDisplayName },
      { display_name: displayName },
      { userId, description: isSelf ? 'Self display name updated' : 'Display name updated by admin' },
    );

    // Emit WebSocket event
    this.websocketGateway.server.to(`organization:${orgId}`).emit('member:displayNameUpdated', {
      organizationId: orgId,
      memberId,
      displayName,
      updatedBy: userId,
    });

    return updated;
  }

  /**
   * Tìm member theo userId và orgId
   */
  async findMemberByUserAndOrg(
    userId: string,
    orgId: string,
    lang: string,
  ): Promise<IOrganizationMember> {
    const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
    if (!member) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }
    return member;
  }

  async removeMember(
    orgId: string,
    memberId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.member.remove',
      org.owner_id,
      lang,
    );

    const member = await this.repository.findMemberById(memberId);
    if (!member || member.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }

    // Không thể xóa owner
    const ownerIdForCheck = org.owner_id || org.owner?.id;
    if (member.user_id === ownerIdForCheck) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.cannot_remove_owner', {
          lang,
        }),
      );
    }

    // Không thể tự xóa mình
    if (member.user_id === userId) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.cannot_remove_self', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteMember(memberId, userId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logDelete(
      orgId,
      'OrganizationMember',
      memberId,
      { user_id: member.user_id },
      { userId },
    );

    // Emit WebSocket to removed user
    this.websocketGateway.emitMemberRemoved(member.user_id, {
      organizationId: orgId,
      memberId,
    });
  }

  /**
   * Rời khỏi tổ chức (member tự rời)
   */
  async leaveOrganization(
    orgId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Owner không thể rời khỏi tổ chức
    const isOwner = org.owner_id === userId || org.owner?.id === userId;
    if (isOwner) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.owner_cannot_leave', {
          lang,
        }),
      );
    }

    // Tìm membership
    const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
    if (!member) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.member_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteMember(member.id, userId);

    // Invalidate cache
    await this.redisService.invalidateOrganizationMemberCache(orgId);

    // Log
    this.auditLogService.logDelete(
      orgId,
      'OrganizationMember',
      member.id,
      { user_id: userId, left: true },
      { userId },
    );

    // Emit WebSocket
    this.websocketGateway.emitMemberLeft(orgId, member.id, userId);
  }



  async getPermissions(
    orgId: string,
    userId: string,
    lang: string,
  ): Promise<IOrganizationPermission[]> {
    const org = await this.findById(orgId, lang);

    // Chỉ cần là member hoặc owner mới xem được permissions
    const isOwner = org.owner_id === userId || org.owner?.id === userId;
    if (!isOwner) {
      const member = await this.repository.findMemberByUserAndOrg(
        userId,
        orgId,
      );
      if (!member || !member.is_accepted) {
        throw new ForbiddenException(
          await this.i18n.translate('organization.errors.permission_denied', {
            lang,
          }),
        );
      }
    }

    return this.repository.findAllOrganizationPermissions();
  }



  /**
   * Kiểm tra quyền organization.
   * Owner luôn có full quyền, member cần có permission tương ứng.
   */
  async checkOrgPermission(
    orgId: string,
    userId: string,
    permissionKey: string,
    ownerId: string,
    lang: string,
  ): Promise<void> {
    // Owner có full quyền
    if (userId === ownerId) {
      return;
    }

    // Kiểm tra member và permission
    const member = await this.repository.findMemberByUserAndOrg(userId, orgId);
    if (!member || !member.is_accepted) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.permission_denied', {
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
    const hasRolePermission = member.roles?.some((r) =>
      r.role?.permissions?.some(
        (rp) => rp.permission?.key === permissionKey,
      ),
    );

    if (!hasRolePermission) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.permission_denied', {
          lang,
        }),
      );
    }
  }
}
