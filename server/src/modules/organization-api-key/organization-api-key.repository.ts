import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { IApiKey, IPaginatedResponse } from '../organization/interfaces';

@Injectable()
export class OrganizationApiKeyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationConfig: PaginationConfigService,
  ) {}

  async createApiKey(data: Prisma.ApiKeyCreateInput): Promise<IApiKey> {
    return this.prisma.apiKey.create({
      data,
      include: {
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
          include: {
            permission: { select: { id: true, name: true, key: true } },
          },
        },
      },
    }) as unknown as IApiKey;
  }

  async findApiKeyById(id: string): Promise<IApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: { id, is_deleted: false },
      include: {
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
          include: {
            permission: { select: { id: true, name: true, key: true } },
          },
        },
      },
    }) as unknown as IApiKey | null;
  }

  async findApiKeysByOrgId(orgId: string): Promise<IApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { organization_id: orgId, is_deleted: false },
      include: {
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
          include: {
            permission: { select: { id: true, name: true, key: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }) as unknown as IApiKey[];
  }

  async findApiKeysByKeyPrefix(keyPrefix: string): Promise<IApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: {
        key_prefix: keyPrefix,
        is_deleted: false,
        is_active: true,
      },
      include: {
        organization: {
          select: { id: true, name: true, owner_id: true },
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
          include: {
            permission: { select: { id: true, name: true, key: true } },
          },
        },
      },
    }) as unknown as IApiKey[];
  }

  async updateApiKey(
    id: string,
    data: Prisma.ApiKeyUpdateInput,
  ): Promise<IApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data,
      include: {
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
          include: {
            permission: { select: { id: true, name: true, key: true } },
          },
        },
      },
    }) as unknown as IApiKey;
  }

  async softDeleteApiKey(id: string, deletedBy: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.apiKey.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
      }),
      this.prisma.apiKeyRole.updateMany({
        where: { api_key_id: id, is_deleted: false },
        data: { is_deleted: true, deleted_at: new Date() },
      }),
      this.prisma.apiKeyPermission.updateMany({
        where: { api_key_id: id, is_deleted: false },
        data: { is_deleted: true, deleted_at: new Date() },
      }),
    ]);
  }

  async softDeleteManyApiKeys(ids: string[], deletedBy: string): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id) =>
        this.prisma.apiKey.update({
          where: { id },
          data: {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedBy,
          },
        }),
      ),
    );
    // FIXME: cascade manual inside transaction if needed
  }

  async updateApiKeyRolesStatusByApiKeyId(
    apiKeyId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.apiKeyRole.updateMany({
      where: { api_key_id: apiKeyId, is_deleted: false },
      data: { is_active: isActive, updated_at: new Date() },
    });
  }

  async updateApiKeyPermissionsStatusByApiKeyId(
    apiKeyId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.apiKeyPermission.updateMany({
      where: { api_key_id: apiKeyId, is_deleted: false },
      data: { is_active: isActive, updated_at: new Date() },
    });
  }

  async assignApiKeyRoles(apiKeyId: string, roleIds: string[]): Promise<void> {
    await this.prisma.apiKeyRole.updateMany({
      where: { api_key_id: apiKeyId },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    if (roleIds.length > 0) {
      await this.prisma.apiKeyRole.createMany({
        data: roleIds.map((roleId) => ({
          api_key_id: apiKeyId,
          organization_role_id: roleId,
          is_active: true,
        })),
      });
    }
  }

  async assignApiKeyPermissions(
    apiKeyId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.prisma.apiKeyPermission.updateMany({
      where: { api_key_id: apiKeyId },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    if (permissionIds.length > 0) {
      await this.prisma.apiKeyPermission.createMany({
        data: permissionIds.map((permissionId) => ({
          api_key_id: apiKeyId,
          organization_permission_id: permissionId,
          is_active: true,
        })),
      });
    }
  }

  async findApiKeysByIds(ids: string[]): Promise<IApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { id: { in: ids }, is_deleted: false },
      include: {
        roles: {
          where: { is_deleted: false, is_active: true },
          include: {
            role: { select: { id: true, name: true } },
          },
        },
        permissions: {
          where: { is_deleted: false, is_active: true },
          include: {
            permission: { select: { id: true, name: true, key: true } },
          },
        },
      },
    }) as unknown as IApiKey[];
  }

  // Admin Method
  async findAllApiKeys(query: {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
    organization_id?: string;
  }): Promise<IPaginatedResponse<IApiKey>> {
    const limit = this.paginationConfig.getLimit(query.limit);
    const offset = this.paginationConfig.getOffset(query.offset);
    const { keywords, is_active, organization_id } = query;

    const where: Prisma.ApiKeyWhereInput = {
      is_deleted: false,
      ...(is_active !== undefined && { is_active }),
      ...(organization_id && { organization_id }),
      ...(keywords && {
        OR: [
          { name: { contains: keywords, mode: 'insensitive' } },
          { description: { contains: keywords, mode: 'insensitive' } },
          { key_prefix: { contains: keywords, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          roles: {
            where: { is_deleted: false, is_active: true },
            include: {
              role: { select: { id: true, name: true } },
            },
          },
          permissions: {
            where: { is_deleted: false, is_active: true },
            include: {
              permission: { select: { id: true, name: true, key: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    return {
      items: items as unknown as IApiKey[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }
}
