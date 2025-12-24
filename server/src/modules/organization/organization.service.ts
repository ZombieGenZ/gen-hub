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
import * as bcrypt from 'bcrypt';
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
  CreateOrganizationRoleDto,
  UpdateOrganizationRoleDto,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  QueryAdminApiKeyDto,
  UpdateAdminApiKeyDto,
} from './dto';
import {
  IOrganizationWithRelations,
  IOrganizationMember,
  IOrganizationRole,
  IOrganizationPermission,
  IApiKey,
  IApiKeyWithPlainKey,
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
   * chỉ được sử dụng nội bộ bởi hệ thống
   */
  private stripSensitiveFields(org: IOrganizationWithRelations): IOrganizationWithRelations {
    const { google_client_id, google_client_secret, google_refresh_token, email_primary_address, ...safeOrg } = org as any;
    return safeOrg as IOrganizationWithRelations;
  }

  async create(
    dto: CreateOrganizationDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationWithRelations> {


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
    }

    // Tạo organization
    const org = await this.repository.create({
      name: dto.name,
      is_active: dto.is_active ?? true,
      owner: { connect: { id: userId } },
      created_by: userId,
      is_using_google_email: dto.is_using_google_email,
      google_client_id: dto.google_client_id,
      google_client_secret: dto.google_client_secret,
      google_refresh_token: dto.google_refresh_token,
      email_primary_address: dto.email_primary_address,
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

    // Cache result
    await this.redisService.setOrganizationCache(id, org);

    // Ẩn các trường nhạy cảm khỏi response
    return this.stripSensitiveFields(org);
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

    // Cache result
    await this.redisService.setOrganizationListCache(cacheKey, result);

    // Ẩn các trường nhạy cảm khỏi response
    if (result.items) {
      result.items = result.items.map(org => this.stripSensitiveFields(org));
    }

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

    // Emit WebSocket to both old and new owner
    this.websocketGateway.emitOwnershipTransferred(
      oldOwnerId,
      newOwner.id,
      updated,
    );

    return updated;
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

  async createRole(
    orgId: string,
    dto: CreateOrganizationRoleDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationRole> {
    // Loại bỏ permission_ids trùng nhau
    if (dto.permission_ids) {
      dto.permission_ids = [...new Set(dto.permission_ids)];
    }

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.role.create',
      org.owner_id,
      lang,
    );

    const role = await this.repository.createRole({
      organization: { connect: { id: orgId } },
      name: dto.name,
      description: dto.description,
      is_active: dto.is_active ?? true,
      is_default: false,
    });

    // Gán permissions nếu có
    if (dto.permission_ids && dto.permission_ids.length > 0) {
      await this.repository.assignRolePermissions(role.id, dto.permission_ids);
    }

    const result = await this.repository.findRoleById(role.id);

    // Log
    this.auditLogService.logCreate(
      orgId,
      'OrganizationRole',
      role.id,
      { name: role.name },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitOrgRoleCreated(orgId, role.id, role.name, userId);

    return result!;
  }

  async getRoles(
    orgId: string,
    userId: string,
    lang: string,
  ): Promise<IOrganizationRole[]> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.role.list',
      org.owner_id,
      lang,
    );

    return this.repository.findRolesByOrgId(orgId);
  }

  async getRoleById(
    orgId: string,
    roleId: string,
    userId: string,
    lang: string,
  ): Promise<IOrganizationRole> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.role.read',
      org.owner_id,
      lang,
    );

    const role = await this.repository.findRoleById(roleId);
    if (!role || role.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.role_not_found', {
          lang,
        }),
      );
    }

    return role;
  }

  async updateRole(
    orgId: string,
    roleId: string,
    dto: UpdateOrganizationRoleDto,
    userId: string,
    lang: string,
  ): Promise<IOrganizationRole> {
    // Loại bỏ permission_ids trùng nhau
    if (dto.permission_ids) {
      dto.permission_ids = [...new Set(dto.permission_ids)];
    }

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.role.update',
      org.owner_id,
      lang,
    );

    const role = await this.repository.findRoleById(roleId);
    if (!role || role.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.role_not_found', {
          lang,
        }),
      );
    }

    const oldData = {
      name: role.name,
      description: role.description,
      is_active: role.is_active,
    };

    // Kiểm tra nếu is_active thay đổi thì cascade update sang member roles và api key roles
    if (dto.is_active !== undefined && dto.is_active !== role.is_active) {
      await this.repository.updateMemberRolesStatusByRoleId(
        roleId,
        dto.is_active,
      );
      await this.repository.updateApiKeyRolesStatusByRoleId(
        roleId,
        dto.is_active,
      );
    }

    await this.repository.updateRole(roleId, {
      name: dto.name,
      description: dto.description,
      is_active: dto.is_active,
      updated_at: new Date(),
    });

    // Update permissions nếu có
    if (dto.permission_ids !== undefined) {
      await this.repository.assignRolePermissions(roleId, dto.permission_ids);
    }

    const updated = await this.repository.findRoleById(roleId);

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'OrganizationRole',
      roleId,
      oldData,
      {
        name: updated?.name,
        description: updated?.description,
        is_active: updated?.is_active,
      },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitOrgRoleUpdated(orgId, roleId, updated?.name || '', userId);

    return updated!;
  }

  async deleteRole(
    orgId: string,
    roleId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.role.delete',
      org.owner_id,
      lang,
    );

    const role = await this.repository.findRoleById(roleId);
    if (!role || role.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.role_not_found', {
          lang,
        }),
      );
    }

    // Cascade soft delete member roles và api key roles trước khi xóa role
    await this.repository.softDeleteMemberRolesByRoleId(roleId);
    await this.repository.softDeleteApiKeyRolesByRoleId(roleId);

    await this.repository.softDeleteRole(roleId);

    // Log
    this.auditLogService.logDelete(
      orgId,
      'OrganizationRole',
      roleId,
      { name: role.name },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitOrgRoleDeleted(orgId, roleId, userId);
  }

  async deleteManyRoles(
    orgId: string,
    ids: string[],
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Check permission
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.role.delete',
      org.owner_id,
      lang,
    );

    const roles = await this.repository.findRolesByIds(ids);
    if (roles.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.role_not_found', {
          lang,
        }),
      );
    }

    // Check organization mismatch
    const invalidRole = roles.find(r => r.organization_id !== orgId);
    if (invalidRole) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.role_not_found', {
          lang,
        }),
      );
    }

    // Cascade soft delete dependencies
    await Promise.all([
      ...ids.map(id => this.repository.softDeleteMemberRolesByRoleId(id)),
      ...ids.map(id => this.repository.softDeleteApiKeyRolesByRoleId(id)),
    ]);

    await this.repository.softDeleteManyRoles(ids, userId);

    // Emit WebSocket event
    this.websocketGateway.emitOrgRolesDeletedMany(orgId, ids, userId);

    // Log
    roles.forEach(role => {
      this.auditLogService.logDelete(
        orgId,
        'OrganizationRole',
        role.id,
        { name: role.name } as Record<string, unknown>,
        { userId, description: `Deleted role: ${role.name}` },
      );
    });
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

  async createApiKey(
    orgId: string,
    dto: CreateApiKeyDto,
    userId: string,
    lang: string,
  ): Promise<IApiKeyWithPlainKey> {
    // Loại bỏ các giá trị trùng nhau trong arrays
    if (dto.role_ids) {
      dto.role_ids = [...new Set(dto.role_ids)];
    }
    if (dto.permission_ids) {
      dto.permission_ids = [...new Set(dto.permission_ids)];
    }
    if (dto.allowed_origins) {
      dto.allowed_origins = [...new Set(dto.allowed_origins)];
    }

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.create',
      org.owner_id,
      lang,
    );

    // Generate API key
    const plainKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(plainKey, 10);
    // key_prefix: PREFIX + 8 ký tự đầu của phần random (vd: GENHUB-A1B2C3D4)
    const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';
    const keyPrefix = `${prefix}-${plainKey.substring(prefix.length + 1, prefix.length + 9)}`;

    const apiKey = await this.repository.createApiKey({
      organization: { connect: { id: orgId } },
      created_by: { connect: { id: userId } },
      name: dto.name,
      description: dto.description,
      key_hash: hashedKey,
      key_prefix: keyPrefix,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      allowed_origins: dto.allowed_origins || [],
      rate_limit_ttl: this.configService.get<number>('API_KEY_RATE_LIMIT_TTL') ?? 60,
      rate_limit_max: this.configService.get<number>('API_KEY_RATE_LIMIT_MAX') ?? 100,
      is_active: true,
    });

    // Gán roles và permissions nếu có
    if (dto.role_ids && dto.role_ids.length > 0) {
      await this.repository.assignApiKeyRoles(apiKey.id, dto.role_ids);
    }
    if (dto.permission_ids && dto.permission_ids.length > 0) {
      await this.repository.assignApiKeyPermissions(
        apiKey.id,
        dto.permission_ids,
      );
    }

    const result = await this.repository.findApiKeyById(apiKey.id);

    // Log
    this.auditLogService.logCreate(
      orgId,
      'ApiKey',
      apiKey.id,
      { name: apiKey.name },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitApiKeyCreated(orgId, apiKey.id, apiKey.name, userId);

    return { ...result!, plain_key: plainKey };
  }

  async getApiKeys(
    orgId: string,
    userId: string,
    lang: string,
  ): Promise<IApiKey[]> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.read',
      org.owner_id,
      lang,
    );

    const apiKeys = await this.repository.findApiKeysByOrgId(orgId);

    // Merge permissions từ roles vào mảng permissions của api key
    return this.mergeApiKeyPermissions(apiKeys);
  }

  async getApiKeyById(
    orgId: string,
    keyId: string,
    userId: string,
    lang: string,
  ): Promise<IApiKey> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.read',
      org.owner_id,
      lang,
    );

    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey || apiKey.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    // Merge permissions từ roles vào mảng permissions
    const [result] = this.mergeApiKeyPermissions([apiKey]);
    return result;
  }

  /**
   * Merge permissions từ roles vào mảng permissions của API key
   * Tương tự như logic trong getMembers
   */
  private mergeApiKeyPermissions(apiKeys: IApiKey[]): IApiKey[] {
    return apiKeys.map((apiKey: any) => {
      // Lấy direct permissions và đánh dấu source
      const directPermissions = (apiKey.permissions || []).map((p: any) => ({
        ...p,
        source: 'permission',
        roles: [],
      }));

      // Lấy permissions từ roles và gom các roles có cùng permission
      const rolePermissionsMap = new Map<string, any>();
      for (const apiKeyRole of apiKey.roles || []) {
        const role = apiKeyRole.role;
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
                api_key_id: apiKey.id,
                organization_permission_id:
                  rolePermission.organization_permission_id,
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
      const cleanedRoles = (apiKey.roles || []).map((ar: any) => ({
        id: ar.id,
        organization_role_id: ar.organization_role_id,
        role: {
          id: ar.role.id,
          name: ar.role.name,
        },
      }));

      return {
        ...apiKey,
        roles: cleanedRoles,
        permissions: uniquePermissions,
      };
    }) as IApiKey[];
  }

  /**
   * Lấy thông tin API key từ plain key
   * Dùng để verify API key và lấy thông tin permissions
   */
  async getApiKeyByPlainKey(plainKey: string, lang: string): Promise<IApiKey> {
    // Lấy prefix từ config
    const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';

    // Validate format của key
    if (!plainKey.startsWith(`${prefix}-`)) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_invalid_format', {
          lang,
        }),
      );
    }

    // Tính key_prefix (PREFIX + 8 ký tự đầu của phần random)
    const randomPart = plainKey.substring(prefix.length + 1);
    const keyPrefix = `${prefix}-${randomPart.substring(0, 8)}`;

    // Tìm các API key có key_prefix match
    const apiKeys = await this.repository.findApiKeysByKeyPrefix(keyPrefix);

    if (apiKeys.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    // So sánh hash để tìm đúng API key
    for (const apiKey of apiKeys) {
      const isMatch = await bcrypt.compare(plainKey, apiKey.key_hash);
      if (isMatch) {
        // Kiểm tra hết hạn
        if (apiKey.expires_at && new Date() > new Date(apiKey.expires_at)) {
          throw new ForbiddenException(
            await this.i18n.translate('organization.errors.apikey_expired', {
              lang,
            }),
          );
        }

        // Merge permissions và trả về
        const [result] = this.mergeApiKeyPermissions([apiKey]);
        return result;
      }
    }

    throw new NotFoundException(
      await this.i18n.translate('organization.errors.apikey_not_found', {
        lang,
      }),
    );
  }

  async updateApiKey(
    orgId: string,
    keyId: string,
    dto: UpdateApiKeyDto,
    userId: string,
    lang: string,
  ): Promise<IApiKey> {
    // Loại bỏ các giá trị trùng nhau trong arrays
    if (dto.role_ids) {
      dto.role_ids = [...new Set(dto.role_ids)];
    }
    if (dto.permission_ids) {
      dto.permission_ids = [...new Set(dto.permission_ids)];
    }
    if (dto.allowed_origins) {
      dto.allowed_origins = [...new Set(dto.allowed_origins)];
    }

    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.update',
      org.owner_id,
      lang,
    );

    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey || apiKey.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    const oldData = { name: apiKey.name, is_active: apiKey.is_active };
    await this.repository.updateApiKey(keyId, {
      name: dto.name,
      description: dto.description,
      is_active: dto.is_active,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
      allowed_origins: dto.allowed_origins,
      updated_by: userId,
      updated_at: new Date(),
    });

    // Update roles và permissions nếu có
    if (dto.role_ids !== undefined) {
      await this.repository.assignApiKeyRoles(keyId, dto.role_ids);
    }
    if (dto.permission_ids !== undefined) {
      await this.repository.assignApiKeyPermissions(keyId, dto.permission_ids);
    }

    const updated = await this.repository.findApiKeyById(keyId);

    // Update roles và permissions status nếu is_active thay đổi
    if (dto.is_active !== undefined && dto.is_active !== apiKey.is_active) {
      await this.repository.updateApiKeyRolesStatusByApiKeyId(
        keyId,
        dto.is_active,
      );
      await this.repository.updateApiKeyPermissionsStatusByApiKeyId(
        keyId,
        dto.is_active,
      );
    }

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'ApiKey',
      keyId,
      oldData,
      { name: updated?.name, is_active: updated?.is_active },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitApiKeyUpdated(orgId, keyId, updated?.name || '', userId);

    return updated!;
  }

  async resetApiKey(
    orgId: string,
    keyId: string,
    userId: string,
    lang: string,
  ): Promise<IApiKeyWithPlainKey> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.reset',
      org.owner_id,
      lang,
    );

    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey || apiKey.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    // Generate new key
    const plainKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(plainKey, 10);
    // key_prefix: PREFIX + 8 ký tự đầu của phần random (vd: GENHUB-A1B2C3D4)
    const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';
    const keyPrefix = `${prefix}-${plainKey.substring(prefix.length + 1, prefix.length + 9)}`;

    await this.repository.updateApiKey(keyId, {
      key_hash: hashedKey,
      key_prefix: keyPrefix,
      updated_by: userId,
      updated_at: new Date(),
    });

    const updated = await this.repository.findApiKeyById(keyId);

    // Log
    this.auditLogService.logUpdate(
      orgId,
      'ApiKey',
      keyId,
      {},
      { key_reset: true },
      { userId, description: 'API key reset' },
    );

    return { ...updated!, plain_key: plainKey };
  }

  async deleteApiKey(
    orgId: string,
    keyId: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Kiểm tra quyền
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.delete',
      org.owner_id,
      lang,
    );

    const apiKey = await this.repository.findApiKeyById(keyId);
    if (!apiKey || apiKey.organization_id !== orgId) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteApiKey(keyId, userId);

    // Log
    this.auditLogService.logDelete(
      orgId,
      'ApiKey',
      keyId,
      { name: apiKey.name },
      { userId },
    );

    // Emit socket event
    this.websocketGateway.emitApiKeyDeleted(orgId, keyId, userId);
  }

  async deleteManyApiKeys(
    orgId: string,
    ids: string[],
    userId: string,
    lang: string,
  ): Promise<void> {
    const org = await this.findById(orgId, lang);

    // Check permission
    await this.checkOrgPermission(
      orgId,
      userId,
      'organization.apikey.delete',
      org.owner_id,
      lang,
    );

    const apiKeys = await this.repository.findApiKeysByIds(ids);
    if (apiKeys.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    // Check organization mismatch
    const invalidKey = apiKeys.find(k => k.organization_id !== orgId);
    if (invalidKey) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteManyApiKeys(ids, userId);

    // Emit WebSocket event
    this.websocketGateway.emitApiKeysDeletedMany(orgId, ids, userId);

    // Log
    apiKeys.forEach(apiKey => {
      this.auditLogService.logDelete(
        orgId,
        'ApiKey',
        apiKey.id,
        { name: apiKey.name } as Record<string, unknown>,
        { userId, description: `Deleted API key: ${apiKey.name}` },
      );
    });
  }

  /**
   * Lấy danh sách tất cả API keys (Admin)
   */
  async getAdminApiKeys(
    query: QueryAdminApiKeyDto,
    userId: string,
    lang: string,
  ): Promise<IPaginatedResponse<IApiKey>> {
    const result = await this.repository.findAllApiKeys(query);

    // Merge permissions từ roles
    const mergedItems = this.mergeApiKeyPermissions(result.items);

    return {
      ...result,
      items: mergedItems,
    };
  }

  /**
   * Lấy chi tiết API key theo ID (Admin)
   */
  async getAdminApiKeyById(
    id: string,
    userId: string,
    lang: string,
  ): Promise<IApiKey> {
    const apiKey = await this.repository.findApiKeyById(id);
    if (!apiKey) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    // Merge permissions từ roles
    const [result] = this.mergeApiKeyPermissions([apiKey]);
    return result;
  }

  /**
   * Cập nhật API key (Admin)
   */
  async updateAdminApiKey(
    id: string,
    dto: UpdateAdminApiKeyDto,
    userId: string,
    lang: string,
  ): Promise<IApiKey> {
    const apiKey = await this.repository.findApiKeyById(id);
    if (!apiKey) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    const oldData = {
      name: apiKey.name,
      is_active: apiKey.is_active,
      rate_limit_ttl: apiKey.rate_limit_ttl,
      rate_limit_max: apiKey.rate_limit_max,
    };

    await this.repository.updateApiKey(id, {
      name: dto.name,
      description: dto.description,
      is_active: dto.is_active,
      rate_limit_ttl: dto.rate_limit_ttl,
      rate_limit_max: dto.rate_limit_max,
      updated_by: userId,
      updated_at: new Date(),
    });

    const updated = await this.repository.findApiKeyById(id);

    // Log - ghi vào SystemLog vì là hành động admin
    this.systemLogService.info(
      'apikey',
      'admin_update',
      `API key ${apiKey.name} updated by admin`,
      { userId, metaData: { apiKeyId: id, orgId: apiKey.organization_id } },
    );
    this.auditLogService.logUpdate(
      apiKey.organization_id,
      'ApiKey',
      id,
      oldData,
      { name: updated?.name, is_active: updated?.is_active, rate_limit_ttl: updated?.rate_limit_ttl, rate_limit_max: updated?.rate_limit_max },
      { userId, description: 'Admin update' },
    );

    // Emit WebSocket
    this.websocketGateway.emitToOrganization(apiKey.organization_id, 'apiKey:updated', {
      apiKeyId: id,
      name: updated?.name,
      updatedBy: userId,
      isAdminAction: true,
    });

    const [result] = this.mergeApiKeyPermissions([updated!]);
    return result;
  }

  /**
   * Xóa API key (Admin)
   */
  async deleteAdminApiKey(
    id: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const apiKey = await this.repository.findApiKeyById(id);
    if (!apiKey) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteApiKey(id, userId);

    // Log - ghi vào SystemLog vì là hành động admin
    this.systemLogService.info(
      'apikey',
      'admin_delete',
      `API key ${apiKey.name} deleted by admin`,
      { userId, metaData: { apiKeyId: id, orgId: apiKey.organization_id } },
    );
    this.auditLogService.logDelete(
      apiKey.organization_id,
      'ApiKey',
      id,
      { name: apiKey.name },
      { userId, description: 'Admin delete' },
    );

    // Emit WebSocket
    this.websocketGateway.emitToOrganization(apiKey.organization_id, 'apiKey:deleted', {
      apiKeyId: id,
      name: apiKey.name,
      deletedBy: userId,
      isAdminAction: true,
    });
  }

  async deleteManyAdminApiKeys(
    ids: string[],
    userId: string,
    lang: string,
  ): Promise<void> {
    const apiKeys = await this.repository.findApiKeysByIds(ids);
    if (apiKeys.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.apikey_not_found', {
          lang,
        }),
      );
    }

    await this.repository.softDeleteManyApiKeys(ids, userId);

    // Group by OrgId for logging and event emission
    const keysByOrg = apiKeys.reduce((acc, key) => {
      acc[key.organization_id] = acc[key.organization_id] || [];
      acc[key.organization_id].push(key);
      return acc;
    }, {} as Record<string, IApiKey[]>);

    // Process per Org
    for (const orgId in keysByOrg) {
      const keys = keysByOrg[orgId];
      const keyIds = keys.map(k => k.id);

      // Audit Log for each key
      keys.forEach(key => {
        this.auditLogService.logDelete(
          orgId,
          'ApiKey',
          key.id,
          { name: key.name } as Record<string, unknown>,
          { userId, description: `Admin batch delete: ${key.name}` },
        );

        this.systemLogService.info(
          'apikey',
          'admin_delete',
          `API key ${key.name} deleted by admin`,
          { userId, metaData: { apiKeyId: key.id, orgId } },
        );
      });

      // Emit WebSocket per Org
      this.websocketGateway.emitToOrganization(orgId, 'apiKey:deletedMany', {
        apiKeyIds: keyIds,
        count: keyIds.length,
        deletedBy: userId,
        isAdminAction: true,
      });
    }
  }

  private generateApiKey(): string {
    const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';
    // Tạo chuỗi ngẫu nhiên gồm số và ký tự in hoa (32 ký tự)
    const randomPart = crypto.randomBytes(16).toString('hex').toUpperCase();
    return `${prefix}-${randomPart}`;
  }

  /**
   * Kiểm tra quyền organization.
   * Owner luôn có full quyền, member cần có permission tương ứng.
   */
  private async checkOrgPermission(
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
    const hasRolePermission = member.roles?.some((r) => {
      // Cần fetch role permissions - tạm thời skip vì đã include trong memberInclude
      return false; // TODO: implement full check
    });

    if (!hasRolePermission) {
      throw new ForbiddenException(
        await this.i18n.translate('organization.errors.permission_denied', {
          lang,
        }),
      );
    }
  }
}
