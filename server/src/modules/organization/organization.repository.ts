import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryOrganizationDto } from './dto';
import {
  IOrganizationWithRelations,
  IOrganizationMember,
  IOrganizationRole,
  IOrganizationPermission,
  IApiKey,
  IPaginatedResponse,
} from './interfaces';

/**
 * Repository xử lý database operations cho Organization
 */
@Injectable()
export class OrganizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationConfig: PaginationConfigService,
  ) {}

  /** Include relations cho Organization */
  private readonly orgInclude = {
    owner: {
      select: { id: true, name: true, email: true },
    },
    _count: {
      select: {
        members: { where: { is_deleted: false } },
        roles: { where: { is_deleted: false } },
        api_keys: { where: { is_deleted: false } },
      },
    },
  };

  /** Select fields cho Member (ẩn invite_token) */
  private readonly memberSelect = {
    id: true,
    user_id: true,
    organization_id: true,
    is_accepted: true,
    is_active: true,
    is_deleted: true,
    invite_token_expires_at: true,
    created_at: true,
    updated_at: true,
    user: {
      select: { id: true, name: true, email: true },
    },
    roles: {
      where: { is_deleted: false, is_active: true },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              where: { is_deleted: false, is_active: true },
              include: {
                permission: { select: { id: true, name: true, key: true } },
              },
            },
          },
        },
      },
    },
    permissions: {
      where: { is_deleted: false, is_active: true },
      select: {
        id: true,
        organization_member_id: true,
        organization_permission_id: true,
        warehouse_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        deleted_at: true,
        permission: { select: { id: true, name: true, key: true } },
      },
    },
  };

  async create(
    data: Prisma.OrganizationCreateInput,
  ): Promise<IOrganizationWithRelations> {
    return this.prisma.organization.create({
      data,
      include: this.orgInclude,
    }) as unknown as IOrganizationWithRelations;
  }

  async findById(id: string): Promise<IOrganizationWithRelations | null> {
    return this.prisma.organization.findFirst({
      where: { id, is_deleted: false },
      include: this.orgInclude,
    }) as unknown as IOrganizationWithRelations | null;
  }

  async findByName(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.organization.findFirst({
      where: {
        name,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!existing;
  }

  async findByTaxCode(taxCode: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.organization.findFirst({
      where: {
        tax_code: taxCode,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!existing;
  }

  async findByTaxCodeWithName(
    taxCode: string,
  ): Promise<{ name: string } | null> {
    return this.prisma.organization.findFirst({
      where: { tax_code: taxCode, is_deleted: false },
      select: { name: true },
    });
  }

  async findMany(
    query: QueryOrganizationDto,
    userId?: string,
  ): Promise<IPaginatedResponse<IOrganizationWithRelations>> {
    const limit = this.paginationConfig.getLimit(query.limit);
    const offset = this.paginationConfig.getOffset(query.offset);
    const { keywords, is_active } = query;

    const where: Prisma.OrganizationWhereInput = {
      is_deleted: false,
      ...(is_active !== undefined && { is_active }),
      ...(keywords && {
        name: { contains: keywords, mode: 'insensitive' },
      }),
      // Chỉ lấy organization mà user là owner hoặc member
      ...(userId && {
        OR: [
          { owner_id: userId },
          {
            members: {
              some: { user_id: userId, is_deleted: false, is_accepted: true },
            },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: this.orgInclude,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      items: items as unknown as IOrganizationWithRelations[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<IOrganizationWithRelations> {
    return this.prisma.organization.update({
      where: { id },
      data,
      include: this.orgInclude,
    }) as unknown as IOrganizationWithRelations;
  }

  async softDelete(
    id: string,
    deletedBy: string,
  ): Promise<IOrganizationWithRelations> {
    return this.prisma.organization.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
      include: this.orgInclude,
    }) as unknown as IOrganizationWithRelations;
  }

  async createMember(
    data: Prisma.OrganizationMemberCreateInput,
  ): Promise<IOrganizationMember> {
    return this.prisma.organizationMember.create({
      data,
      select: this.memberSelect,
    }) as unknown as IOrganizationMember;
  }

  async findMemberById(id: string): Promise<IOrganizationMember | null> {
    return this.prisma.organizationMember.findFirst({
      where: { id, is_deleted: false },
      select: this.memberSelect,
    }) as unknown as IOrganizationMember | null;
  }

  async findMemberByUserAndOrg(
    userId: string,
    orgId: string,
  ): Promise<IOrganizationMember | null> {
    return this.prisma.organizationMember.findFirst({
      where: { user_id: userId, organization_id: orgId, is_deleted: false },
      select: this.memberSelect,
    }) as unknown as IOrganizationMember | null;
  }

  async findMemberByInviteToken(
    token: string,
  ): Promise<IOrganizationMember | null> {
    return this.prisma.organizationMember.findFirst({
      where: { invite_token: token, is_deleted: false },
      select: this.memberSelect,
    }) as unknown as IOrganizationMember | null;
  }

  async findMembersByOrgId(
    orgId: string,
    query: { limit?: number; offset?: number; is_accepted?: boolean },
  ): Promise<IPaginatedResponse<IOrganizationMember>> {
    const limit = this.paginationConfig.getLimit(query.limit);
    const offset = this.paginationConfig.getOffset(query.offset);
    const { is_accepted } = query;

    const where: Prisma.OrganizationMemberWhereInput = {
      organization_id: orgId,
      is_deleted: false,
      ...(is_accepted !== undefined && { is_accepted }),
    };

    const [items, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where,
        select: this.memberSelect,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.organizationMember.count({ where }),
    ]);

    return {
      items: items as unknown as IOrganizationMember[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async updateMember(
    id: string,
    data: Prisma.OrganizationMemberUpdateInput,
  ): Promise<IOrganizationMember> {
    return this.prisma.organizationMember.update({
      where: { id },
      data,
      select: this.memberSelect,
    }) as unknown as IOrganizationMember;
  }

  async softDeleteMember(id: string, deletedBy: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.organizationMember.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
      }),
      this.prisma.organizationMemberRole.updateMany({
        where: { organization_member_id: id, is_deleted: false },
        data: { is_deleted: true, deleted_at: new Date() },
      }),
      this.prisma.organizationMemberPermission.updateMany({
        where: { organization_member_id: id, is_deleted: false },
        data: { is_deleted: true, deleted_at: new Date() },
      }),
    ]);
  }

  /**
   * Cập nhật is_active của tất cả OrganizationMemberRole theo member_id
   */
  async updateMemberRolesStatusByMemberId(
    memberId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.organizationMemberRole.updateMany({
      where: { organization_member_id: memberId, is_deleted: false },
      data: { is_active: isActive, updated_at: new Date() },
    });
  }

  /**
   * Cập nhật is_active của tất cả OrganizationMemberPermission theo member_id
   */
  async updateMemberPermissionsStatusByMemberId(
    memberId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.organizationMemberPermission.updateMany({
      where: { organization_member_id: memberId, is_deleted: false },
      data: { is_active: isActive, updated_at: new Date() },
    });
  }

  async assignMemberRoles(
    memberId: string,
    roleIds: string[],
    createdBy: string,
  ): Promise<void> {
    // Xóa roles cũ
    await this.prisma.organizationMemberRole.updateMany({
      where: { organization_member_id: memberId },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    // Thêm roles mới
    if (roleIds.length > 0) {
      await this.prisma.organizationMemberRole.createMany({
        data: roleIds.map((roleId) => ({
          organization_member_id: memberId,
          organization_role_id: roleId,
          is_active: true,
        })),
      });
    }
  }

  async assignMemberPermissions(
    memberId: string,
    permissionIds: string[],
    createdBy: string,
  ): Promise<void> {
    // Xóa permissions cũ
    await this.prisma.organizationMemberPermission.updateMany({
      where: { organization_member_id: memberId },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    // Thêm permissions mới
    if (permissionIds.length > 0) {
      await this.prisma.organizationMemberPermission.createMany({
        data: permissionIds.map((permissionId) => ({
          organization_member_id: memberId,
          organization_permission_id: permissionId,
          is_active: true,
        })),
      });
    }
  }

  /**
   * Lấy tất cả organization-level permissions (shared)
   */
  async findAllOrganizationPermissions(): Promise<IOrganizationPermission[]> {
    return this.prisma.organizationPermission.findMany({
      where: { is_deleted: false, is_active: true },
      orderBy: { key: 'asc' },
    }) as unknown as IOrganizationPermission[];
  }

  async findUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email },
      select: { id: true, name: true, email: true },
    });
  }

  /**
   * Soft delete tất cả members của organization
   */
  async softDeleteAllMembersByOrgId(
    orgId: string,
    deletedBy: string,
  ): Promise<void> {
    await this.prisma.organizationMember.updateMany({
      where: { organization_id: orgId, is_deleted: false },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  /**
   * Soft delete tất cả roles của organization
   */
  async softDeleteAllRolesByOrgId(orgId: string): Promise<void> {
    await this.prisma.organizationRole.updateMany({
      where: { organization_id: orgId, is_deleted: false },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  /**
   * Soft delete tất cả API keys của organization
   */
  async softDeleteAllApiKeysByOrgId(orgId: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { organization_id: orgId, is_deleted: false },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  async softDeleteAllApiKeysByOrgIds(orgIds: string[]): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { organization_id: { in: orgIds }, is_deleted: false },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  async softDeleteAllRolesByOrgIds(orgIds: string[]): Promise<void> {
    await this.prisma.organizationRole.updateMany({
      where: { organization_id: { in: orgIds }, is_deleted: false },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  async softDeleteAllMembersByOrgIds(
    orgIds: string[],
    deletedBy: string,
  ): Promise<void> {
    await this.prisma.organizationMember.updateMany({
      where: { organization_id: { in: orgIds }, is_deleted: false },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async softDeleteMany(ids: string[], deletedBy: string): Promise<void> {
    await this.prisma.organization.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findByIds(ids: string[]): Promise<IOrganizationWithRelations[]> {
    return this.prisma.organization.findMany({
      where: { id: { in: ids }, is_deleted: false },
      include: this.orgInclude,
    }) as unknown as IOrganizationWithRelations[];
  }

  /**
   * Tìm tất cả API keys active có expires_at
   */
  async findActiveApiKeysWithExpiration(): Promise<
    { id: string; name: string; expires_at: Date; organization_id: string }[]
  > {
    return this.prisma.apiKey.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        expires_at: { not: null },
      },
      select: {
        id: true,
        name: true,
        expires_at: true,
        organization_id: true,
      },
    }) as unknown as {
      id: string;
      name: string;
      expires_at: Date;
      organization_id: string;
    }[];
  }

  /**
   * Deactivate API key (set is_active = false)
   */
  async deactivateApiKey(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Deactivate tất cả API keys đã hết hạn
   */
  async deactivateExpiredApiKeys(): Promise<number> {
    const result = await this.prisma.apiKey.updateMany({
      where: {
        is_deleted: false,
        is_active: true,
        expires_at: { lte: new Date() },
      },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Lấy danh sách organization IDs mà user là owner hoặc member
   */
  async findOrgIdsByUser(userId: string): Promise<string[]> {
    const orgs = await this.prisma.organization.findMany({
      where: {
        is_deleted: false,
        OR: [
          { owner_id: userId },
          {
            members: {
              some: { user_id: userId, is_deleted: false, is_accepted: true },
            },
          },
        ],
      },
      select: { id: true },
    });
    return orgs.map((org) => org.id);
  }
}
