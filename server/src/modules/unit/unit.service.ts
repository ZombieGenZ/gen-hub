import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { UnitRepository } from './unit.repository';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto } from './dto';
import { IUnit, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';

@Injectable()
export class UnitService {
  private readonly UNIT_LIST_TTL: number;
  private readonly UNIT_DETAIL_TTL: number;
  private readonly UNIT_KEY_PREFIX: string;
  private readonly UNIT_LIST_KEY_PREFIX: string;

  constructor(
    private readonly repository: UnitRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly auditLogService: OrganizationAuditLogService,
    private readonly i18n: I18nService,
  ) {
    this.UNIT_LIST_TTL =
      this.configService.get<number>('REDIS_UNIT_LIST_TTL') || 300;
    this.UNIT_DETAIL_TTL =
      this.configService.get<number>('REDIS_UNIT_DETAIL_TTL') || 600;
    this.UNIT_KEY_PREFIX =
      this.configService.get<string>('REDIS_UNIT_KEY_PREFIX') || 'unit:detail';
    this.UNIT_LIST_KEY_PREFIX =
      this.configService.get<string>('REDIS_UNIT_LIST_KEY_PREFIX') ||
      'unit:list';
  }

  private getListCacheKey(orgId: string, query: QueryUnitDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryUnitDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryUnitDto]}`)
      .join('&');
    return `${this.UNIT_LIST_KEY_PREFIX}:${orgId}:${sortedParams}`;
  }

  private getDetailCacheKey(id: string): string {
    return `${this.UNIT_KEY_PREFIX}:${id}`;
  }

  /**
   * Tạo mới Unit
   */
  async create(
    orgId: string,
    dto: CreateUnitDto,
    actorId: string,
    lang: string,
  ): Promise<IUnit> {
    // Kiểm tra organization tồn tại
    const orgExists = await this.repository.orgExists(orgId);
    if (!orgExists) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.organization_not_found', {
          lang,
        }),
      );
    }

    // Kiểm tra tên trùng
    const nameExists = await this.repository.nameExistsInOrg(dto.name, orgId);
    if (nameExists) {
      throw new ConflictException(
        await this.i18n.translate('unit.errors.name_exists', { lang }),
      );
    }

    const unit = await this.repository.create({
      name: dto.name,
      description: dto.description,
      is_used_multiple_languages: dto.is_used_multiple_languages ?? false,
      is_active: dto.is_active ?? true,
      created_by: actorId,
      organization: { connect: { id: orgId } },
    });

    // Invalidate cache
    await this.redisService.delByPattern(
      `${this.UNIT_LIST_KEY_PREFIX}:${orgId}:*`,
    );

    // Emit realtime event
    this.websocketGateway.emitToOrganization(orgId, 'unit:created', {
      id: unit.id,
      name: unit.name,
      actorId,
    });

    // Audit log
    this.auditLogService.logCreate(
      orgId,
      'Unit',
      unit.id,
      unit as unknown as Record<string, unknown>,
      { userId: actorId, description: `Created unit: ${unit.name}` },
    );

    return unit;
  }

  /**
   * Lấy danh sách Unit
   */
  async findMany(
    orgId: string,
    query: QueryUnitDto,
    lang: string,
  ): Promise<IPaginatedResponse<IUnit>> {
    const orgExists = await this.repository.orgExists(orgId);
    if (!orgExists) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.organization_not_found', {
          lang,
        }),
      );
    }

    const cacheKey = this.getListCacheKey(orgId, query);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.repository.findByOrgId(orgId, query);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.UNIT_LIST_TTL,
    );

    return result;
  }

  /**
   * Lấy chi tiết Unit
   */
  async findById(orgId: string, id: string, lang: string): Promise<IUnit> {
    const cacheKey = this.getDetailCacheKey(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const unit = JSON.parse(cached) as IUnit;
      if (unit.organization_id === orgId) {
        return unit;
      }
    }

    const unit = await this.repository.findByIdAndOrgId(id, orgId);
    if (!unit) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.not_found', { lang }),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(unit),
      this.UNIT_DETAIL_TTL,
    );

    return unit;
  }

  /**
   * Cập nhật Unit
   */
  async update(
    orgId: string,
    id: string,
    dto: UpdateUnitDto,
    actorId: string,
    lang: string,
  ): Promise<IUnit> {
    const existing = await this.repository.findByIdAndOrgId(id, orgId);
    if (!existing) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.not_found', { lang }),
      );
    }

    // Kiểm tra tên trùng nếu thay đổi
    if (dto.name && dto.name !== existing.name) {
      const nameExists = await this.repository.nameExistsInOrg(
        dto.name,
        orgId,
        id,
      );
      if (nameExists) {
        throw new ConflictException(
          await this.i18n.translate('unit.errors.name_exists', { lang }),
        );
      }
    }

    const unit = await this.repository.update(id, {
      ...dto,
      updated_by: actorId,
    });

    // Invalidate cache
    await this.redisService.del(this.getDetailCacheKey(id));
    await this.redisService.delByPattern(
      `${this.UNIT_LIST_KEY_PREFIX}:${orgId}:*`,
    );

    // Emit realtime event
    this.websocketGateway.emitToOrganization(orgId, 'unit:updated', {
      id: unit.id,
      name: unit.name,
      changedFields: Object.keys(dto),
      actorId,
    });

    // Audit log
    this.auditLogService.logUpdate(
      orgId,
      'Unit',
      unit.id,
      existing as unknown as Record<string, unknown>,
      unit as unknown as Record<string, unknown>,
      { userId: actorId, description: `Updated unit: ${unit.name}` },
    );

    return unit;
  }

  /**
   * Xóa Unit
   */
  async delete(
    orgId: string,
    id: string,
    actorId: string,
    lang: string,
  ): Promise<void> {
    const existing = await this.repository.findByIdAndOrgId(id, orgId);
    if (!existing) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.not_found', { lang }),
      );
    }

    // Kiểm tra xem đơn vị tính có đang được sử dụng không
    const isUsed = await this.repository.isUsedByProduct(id);
    if (isUsed) {
      throw new BadRequestException(
        await this.i18n.translate('unit.errors.in_use', { lang }),
      );
    }

    await this.repository.softDelete(id, actorId);

    // Invalidate cache
    await this.redisService.del(this.getDetailCacheKey(id));
    await this.redisService.delByPattern(
      `${this.UNIT_LIST_KEY_PREFIX}:${orgId}:*`,
    );

    // Emit realtime event
    this.websocketGateway.emitToOrganization(orgId, 'unit:deleted', {
      id,
      name: existing.name,
      actorId,
    });

    // Audit log
    this.auditLogService.logDelete(
      orgId,
      'Unit',
      id,
      existing as unknown as Record<string, unknown>,
      { userId: actorId, description: `Deleted unit: ${existing.name}` },
    );
  }

  /**
   * Xóa nhiều Unit
   */
  async deleteMany(
    orgId: string,
    ids: string[],
    actorId: string,
    lang: string,
  ): Promise<void> {
    const units = await this.repository.findByIds(ids);
    if (units.length === 0) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.not_found', { lang }),
      );
    }

    const invalidOrg = units.find((u) => u.organization_id !== orgId);
    if (invalidOrg) {
      throw new NotFoundException(
        await this.i18n.translate('unit.errors.not_found', { lang }),
      );
    }

    // Kiểm tra xem có đơn vị tính nào đang được sử dụng không
    for (const unit of units) {
      const isUsed = await this.repository.isUsedByProduct(unit.id);
      if (isUsed) {
        throw new BadRequestException(
          await this.i18n.translate('unit.errors.in_use', { lang }),
        );
      }
    }

    await this.repository.softDeleteMany(ids, actorId);

    // Invalidate cache
    await Promise.all(
      ids.map((id) => this.redisService.del(this.getDetailCacheKey(id))),
    );
    await this.redisService.delByPattern(
      `${this.UNIT_LIST_KEY_PREFIX}:${orgId}:*`,
    );

    // Emit realtime event
    this.websocketGateway.emitToOrganization(orgId, 'unit:deletedMany', {
      ids,
      actorId,
    });

    units.forEach((u) => {
      this.auditLogService.logDelete(
        orgId,
        'Unit',
        u.id,
        { name: u.name } as Record<string, unknown>,
        { userId: actorId, description: `Deleted unit: ${u.name}` },
      );
    });
  }
}
