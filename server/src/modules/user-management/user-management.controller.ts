import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import type { Request } from 'express';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { UserManagementService } from './user-management.service';
import {
    QueryUsersDto,
    BanUserDto,
    UnbanUserDto,
    WarnUserDto,
    UnwarnUserDto,
    QueryUserWarningsDto,
    QuerySessionsDto,
    AssignUserRolesPermissionsDto,
} from './dto';
import {
    GetResponse,
    CreatedResponse,
    UpdatedResponse,
    DeletedResponse,
} from '../../common/responses/success.response';

@ApiTags('User Management')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserManagementController {
    constructor(private readonly service: UserManagementService) { }

    @Get()
    @RequirePermission('user-management.list')
    @ApiOperation({ summary: 'Lấy danh sách users' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryUsersDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(query, lang);
        return new GetResponse('user-management.list', result);
    }

    @Get('stats')
    @RequirePermission('user-management.list')
    @ApiOperation({ summary: 'Lấy thống kê users' })
    @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
    async getStats() {
        const stats = await this.service.getStats();
        return new GetResponse('user-management.stats', stats);
    }


    @Get(':id')
    @RequirePermission('user-management.read')
    @ApiOperation({ summary: 'Lấy chi tiết user' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const user = await this.service.findById(id, lang);
        return new GetResponse('user-management.read', user);
    }

    @Post(':id/ban')
    @RequirePermission('user-management.ban')
    @ApiOperation({ summary: 'Ban user' })
    @ApiResponse({ status: 200, description: 'Ban thành công' })
    async banUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: BanUserDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const user = await this.service.banUser(id, dto, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse('user-management.ban', user);
    }

    @Post(':id/unban')
    @RequirePermission('user-management.unban')
    @ApiOperation({ summary: 'Unban user' })
    @ApiResponse({ status: 200, description: 'Unban thành công' })
    async unbanUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UnbanUserDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const user = await this.service.unbanUser(id, dto, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse('user-management.unban', user);
    }

    @Get(':id/warnings')
    @RequirePermission('user-management.warn')
    @ApiOperation({ summary: 'Lấy danh sách warnings của user' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findUserWarnings(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: QueryUserWarningsDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findUserWarnings(id, query, lang);
        return new GetResponse('user-management.warnings.list', result);
    }

    @Post(':id/warn')
    @RequirePermission('user-management.warn')
    @ApiOperation({ summary: 'Cảnh báo user' })
    @ApiResponse({ status: 201, description: 'Cảnh báo thành công' })
    async warnUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: WarnUserDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const warning = await this.service.warnUser(id, dto, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new CreatedResponse('user-management.warn', warning);
    }

    @Post(':id/unwarn/:warningId')
    @RequirePermission('user-management.unwarn')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Gỡ cảnh báo user' })
    @ApiResponse({ status: 200, description: 'Gỡ cảnh báo thành công' })
    async unwarnUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('warningId', ParseUUIDPipe) warningId: string,
        @Body() dto: UnwarnUserDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.unwarnUser(id, warningId, dto, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse('user-management.unwarn', result);
    }

    @Get(':id/sessions')
    @RequirePermission('user-management.sessions')
    @ApiOperation({ summary: 'Lấy danh sách sessions của user' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findUserSessions(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: QuerySessionsDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findUserSessions(id, query, lang);
        return new GetResponse('user-management.sessions.list', result);
    }

    @Delete(':id/sessions/:sessionId')
    @RequirePermission('user-management.sessions')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đăng xuất một session' })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
    async revokeSession(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.revokeSession(id, sessionId, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('user-management.session.revoke', result);
    }

    @Delete(':id/sessions')
    @RequirePermission('user-management.sessions')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Đăng xuất tất cả sessions' })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
    async revokeAllSessions(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.revokeAllSessions(id, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('user-management.sessions.revoke_all', result);
    }

    // ==================== User Roles/Permissions ====================

    @Get(':id/roles-permissions')
    @RequirePermission('user-management.read')
    @ApiOperation({ summary: 'Lấy roles và permissions của user' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    async getUserRolesAndPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getUserRolesAndPermissions(id, lang);
        return new GetResponse('user-management.roles_permissions.get', result);
    }

    @Put(':id/roles-permissions')
    @RequirePermission('user-management.update')
    @ApiOperation({ summary: 'Gán roles và permissions cho user' })
    @ApiResponse({ status: 200, description: 'Gán thành công' })
    async assignUserRolesPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AssignUserRolesPermissionsDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.assignUserRolesPermissions(id, dto, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse('user-management.roles_permissions.assign', result);
    }
}
