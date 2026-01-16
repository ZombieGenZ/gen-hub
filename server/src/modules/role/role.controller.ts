import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import type { Request } from 'express';

import { RoleService } from './role.service';
import {
    CreateRoleDto,
    UpdateRoleDto,
    QueryRoleDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IRoleListResult, IRoleWithPermissions } from './interfaces';
import { Role } from '@prisma/client';

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
    constructor(private readonly service: RoleService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.create')
    @ApiOperation({ summary: 'Tạo role mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateRoleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<CreatedResponse<Role>> {
        const result = await this.service.create(dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new CreatedResponse(ResponseCode.ROLE_CREATE_SUCCESS, result);
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.read')
    @ApiOperation({ summary: 'Lấy danh sách roles' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryRoleDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IRoleListResult>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.ROLE_LIST_SUCCESS, result);
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.read')
    @ApiOperation({ summary: 'Lấy chi tiết role' })
    @ApiParam({ name: 'id', description: 'ID của role', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IRoleWithPermissions>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.ROLE_GET_SUCCESS, result);
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.update')
    @ApiOperation({ summary: 'Cập nhật role' })
    @ApiParam({ name: 'id', description: 'ID của role', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRoleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<UpdatedResponse<Role>> {
        const result = await this.service.update(id, dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse(ResponseCode.ROLE_UPDATE_SUCCESS, result);
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.delete')
    @ApiOperation({ summary: 'Xóa role' })
    @ApiParam({ name: 'id', description: 'ID của role', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy role' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse(ResponseCode.ROLE_DELETE_SUCCESS, null);
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('role.delete')
    @ApiOperation({ summary: 'Xóa nhiều roles' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(dto.ids, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse(ResponseCode.ROLE_DELETE_SUCCESS, null);
    }
}
