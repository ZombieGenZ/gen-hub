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
import { PhoneCodeService } from './phone-code.service';
import { CreatePhoneCodeDto, QueryPhoneCodeDto, UpdatePhoneCodeDto } from './dto';
import { IPhoneCode, IPaginatedResponse } from './types';

@ApiTags('Phone Codes')
@Controller('phone-codes')
export class PhoneCodeController {
  constructor(
    private readonly service: PhoneCodeService,
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
  @RequirePermission('phone-code.create')
  async create(
    @Body() dto: CreatePhoneCodeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IPhoneCode>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('phone-code.create.success', result);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.list', 'phone-code.list.all')
  async findAll(
    @Query() query: QueryPhoneCodeDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<IPhoneCode>>> {
    const hasListAll = await this.hasPermission(userId, 'phone-code.list.all');
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('phone-code.list.success', result);
  }

  @Get('active')
  async findAllActive(@Query() query: QueryPhoneCodeDto): Promise<GetResponse<IPaginatedResponse<IPhoneCode>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('phone-code.list.success', result);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.read', 'phone-code.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPhoneCode>> {
    const hasReadAll = await this.hasPermission(userId, 'phone-code.read.all');
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('phone-code.get.success', result);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.update', 'phone-code.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhoneCodeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IPhoneCode>> {
    const hasUpdateAll = await this.hasPermission(userId, 'phone-code.update.all');
    const result = await this.service.update(id, dto, userId, hasUpdateAll, lang);
    return new UpdatedResponse('phone-code.update.success', result);
  }

  @Delete('delete/many')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.delete', 'phone-code.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'phone-code.delete.all');
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('phone-code.delete.success', null);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.delete', 'phone-code.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'phone-code.delete.all');
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('phone-code.delete.success', null);
  }
}


