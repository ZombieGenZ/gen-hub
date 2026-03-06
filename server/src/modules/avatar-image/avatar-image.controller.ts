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
import { AvatarImageService } from './avatar-image.service';
import { CreateAvatarImageDto, QueryAvatarImageDto, UpdateAvatarImageDto } from './dto';
import { IAvatarImage, IPaginatedResponse } from './types';

@ApiTags('Avatar Images')
@Controller('avatar-images')
export class AvatarImageController {
  constructor(
    private readonly service: AvatarImageService,
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
  @RequirePermission('avatar-image.create')
  async create(
    @Body() dto: CreateAvatarImageDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IAvatarImage>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('avatar-image.create.success', result);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.list', 'avatar-image.list.all')
  async findAll(
    @Query() query: QueryAvatarImageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<IAvatarImage>>> {
    const hasListAll = await this.hasPermission(userId, 'avatar-image.list.all');
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('avatar-image.list.success', result);
  }

  @Get('active')
  async findAllActive(@Query() query: QueryAvatarImageDto): Promise<GetResponse<IPaginatedResponse<IAvatarImage>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('avatar-image.list.success', result);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.read', 'avatar-image.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IAvatarImage>> {
    const hasReadAll = await this.hasPermission(userId, 'avatar-image.read.all');
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('avatar-image.get.success', result);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.update', 'avatar-image.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvatarImageDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IAvatarImage>> {
    const hasUpdateAll = await this.hasPermission(userId, 'avatar-image.update.all');
    const result = await this.service.update(id, dto, userId, hasUpdateAll, lang);
    return new UpdatedResponse('avatar-image.update.success', result);
  }

  @Delete('delete/many')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.delete', 'avatar-image.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'avatar-image.delete.all');
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('avatar-image.delete.success', null);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.delete', 'avatar-image.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'avatar-image.delete.all');
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('avatar-image.delete.success', null);
  }
}
