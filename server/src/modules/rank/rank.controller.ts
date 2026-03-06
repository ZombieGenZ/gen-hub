import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { DeleteManyDto } from '../../common/dto';
import { CurrentUser, RequireAnyPermission, RequirePermission } from '../../common/decorators';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { CreatedResponse, DeletedResponse, GetResponse, UpdatedResponse } from '../../common/responses';
import { PrismaService } from '../../prisma/prisma.service';
import { RankService } from './rank.service';
import { CreateRankDto, QueryRankDto, UpdateRankDto } from './dto';
import { IRank, IPaginatedResponse } from './types';

@ApiTags('Ranks')
@Controller('ranks')
export class RankController {
  constructor(
    private readonly service: RankService,
    private readonly prisma: PrismaService,
  ) {}

  private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    if (!userId) return false;

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        system_roles: {
          where: { is_deleted: false, is_active: true },
          include: {
            role: {
              include: {
                permissions: {
                  where: { is_deleted: false, is_active: true },
                  include: { permission: true },
                },
              },
            },
          },
        },
        system_permissions: {
          where: { is_deleted: false, is_active: true },
          include: { permission: true },
        },
      },
    });

    if (!user) return false;

    const hasDirect = user.system_permissions.some((p) => p.permission.key === permissionKey);
    if (hasDirect) return true;

    return user.system_roles.some((ur) => ur.role.permissions.some((rp) => rp.permission.key === permissionKey));
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rank.create')
  async create(
    @Body() dto: CreateRankDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IRank>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('rank.create.success', result);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.list', 'rank.list.all')
  async findAll(
    @Query() query: QueryRankDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<IRank>>> {
    const hasListAll = await this.hasPermission(userId, 'rank.list.all');
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('rank.list.success', result);
  }

  @Get('active')
  async findAllActive(@Query() query: QueryRankDto): Promise<GetResponse<IPaginatedResponse<IRank>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('rank.list.success', result);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.read', 'rank.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IRank>> {
    const hasReadAll = await this.hasPermission(userId, 'rank.read.all');
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('rank.get.success', result);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.update', 'rank.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRankDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IRank>> {
    const hasUpdateAll = await this.hasPermission(userId, 'rank.update.all');
    const result = await this.service.update(id, dto, userId, hasUpdateAll, lang);
    return new UpdatedResponse('rank.update.success', result);
  }

  @Delete('delete/many')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.delete', 'rank.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'rank.delete.all');
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('rank.delete.success', null);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.delete', 'rank.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'rank.delete.all');
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('rank.delete.success', null);
  }
}


