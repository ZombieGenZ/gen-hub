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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import type { Request } from 'express';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
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
    BulkBanUsersDto,
    BulkUnbanUsersDto,
    BulkWarnUsersDto,
    ClearAllWarningsDto,
    BulkClearAllWarningsDto,
    DurationType,
    DeleteUserDto,
    BulkDeleteUsersDto,
    BulkDownloadUsersDto,
    DownloadAllUsersDto,
} from './dto';
import {
    GetResponse,
    CreatedResponse,
    UpdatedResponse,
    DeletedResponse,
} from '../../common/responses/success.response';
import {
    buildErrorResponseSchema,
    buildPaginationDataSchema,
    buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440101';
const WARNING_ID = '550e8400-e29b-41d4-a716-446655440201';
const ROLE_ID = '550e8400-e29b-41d4-a716-446655440301';
const PERMISSION_ID = '550e8400-e29b-41d4-a716-446655440401';

const userItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: USER_ID },
        email: { type: 'string', example: 'user@genhub.vn' },
        full_name: { type: 'string', example: 'Nguyen Van A' },
        is_banned: { type: 'boolean', example: false },
        is_verified: { type: 'boolean', example: true },
        warning_count: { type: 'number', example: 1 },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
    },
};

const userDetailSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: USER_ID },
        email: { type: 'string', example: 'user@genhub.vn' },
        full_name: { type: 'string', example: 'Nguyen Van A' },
        phone: { type: 'string', example: '0901234567' },
        is_banned: { type: 'boolean', example: false },
        is_verified: { type: 'boolean', example: true },
        warning_count: { type: 'number', example: 1 },
        roles: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: ROLE_ID },
                    name: { type: 'string', example: 'Support Staff' },
                },
            },
        },
        permissions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: PERMISSION_ID },
                    key: { type: 'string', example: 'user-management.read' },
                },
            },
        },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:00:00.000Z' },
    },
};

const sessionItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: SESSION_ID },
        device_name: { type: 'string', example: 'Chrome on Windows' },
        ip_address: { type: 'string', example: '203.113.10.20' },
        last_active_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:30:00.000Z' },
        is_current: { type: 'boolean', example: true },
    },
};

const warningItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: WARNING_ID },
        reason: { type: 'string', example: 'Sử dụng ngôn ngữ không phù hợp' },
        status: { type: 'string', example: 'active' },
        is_permanent: { type: 'boolean', example: false },
        expires_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-03-20T08:00:00.000Z' },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
    },
};

const simpleActionSchema = (code: string, message: string, data: unknown = null) => buildSuccessResponseSchema({
    code,
    message,
    dataSchema: data === null ? { type: 'null', nullable: true } : { type: 'object' },
    dataExample: data,
});

const userNotFoundSchema = buildErrorResponseSchema({
    code: 'user-management.user_not_found',
    message: 'Không tìm thấy user',
});

@ApiTags('User Management')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserManagementController {
    constructor(private readonly service: UserManagementService) { }

    @Get()
    @RequirePermission('user-management.list')
    @ApiOperation({
        summary: 'Lấy danh sách users',
        description: 'Lấy danh sách tất cả users trong hệ thống với phân trang, tìm kiếm, và bộ lọc. Yêu cầu quyền `user-management.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng tối đa', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm theo tên, email' })
    @ApiQuery({ name: 'is_banned', required: false, type: Boolean, description: 'Lọc theo trạng thái ban' })
    @ApiQuery({ name: 'is_verified', required: false, type: Boolean, description: 'Lọc theo trạng thái xác thực' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách users',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-management.list' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number', example: 150 },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async findMany(
        @Query() query: QueryUsersDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(query, lang);
        return new GetResponse('user-management.list', result);
    }

    @Get('stats')
    @RequirePermission('user-management.list')
    @ApiOperation({
        summary: 'Lấy thống kê users',
        description: 'Lấy thống kê tổng quan về users: tổng số, active, banned, verified. Yêu cầu quyền `user-management.list`.',
    })
    @ApiResponse({ status: 200, description: 'Thống kê users' })
    @ApiAuthResponses()
    async getStats() {
        const stats = await this.service.getStats();
        return new GetResponse('user-management.stats', stats);
    }

    @Get('download/all')
    @RequirePermission('user-management.download')
    @ApiOperation({
        summary: 'Tải dữ liệu tất cả users (có filter)',
        description: 'Export dữ liệu tất cả users theo filter. Trả về CSV/Excel. Yêu cầu quyền `user-management.download`.',
    })
    @ApiResponse({ status: 200, description: 'Dữ liệu export thành công' })
    @ApiAuthResponses()
    async downloadAllUsersData(
        @Query() query: DownloadAllUsersDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.downloadAllUsersData(query, adminId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new GetResponse('user-management.download_all_users_data', result);
    }

    @Get(':id')
    @RequirePermission('user-management.read')
    @ApiOperation({
        summary: 'Lấy chi tiết user',
        description: 'Lấy thông tin chi tiết của một user bao gồm: profile, roles, permissions, ban status, warning count. Yêu cầu quyền `user-management.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user (UUID)', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Chi tiết user' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const user = await this.service.findById(id, lang);
        return new GetResponse('user-management.read', user);
    }

    @Post(':id/ban')
    @RequirePermission('user-management.ban')
    @ApiOperation({
        summary: 'Ban user',
        description: 'Cấm user khỏi hệ thống. Có thể ban vĩnh viễn hoặc tạm thời với thời hạn. Yêu cầu quyền `user-management.ban`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần ban', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiBody({
        type: BanUserDto,
        examples: {
            permanent_ban: { summary: 'Ban vĩnh viễn', value: { reason: 'Vi phạm điều khoản nghiêm trọng', is_permanent: true } },
            temporary_ban: { summary: 'Ban tạm thời', value: { reason: 'Spam', is_permanent: false, duration_value: 7, duration_type: 'days' } },
        },
    })
    @ApiResponse({ status: 200, description: 'Ban thành công' })
    @ApiResponse({ status: 400, description: 'User đã bị ban' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Unban user',
        description: 'Gỡ lệnh cấm cho user. Yêu cầu quyền `user-management.unban`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần unban' })
    @ApiBody({ type: UnbanUserDto, examples: { unban: { summary: 'Unban', value: { note: 'Đã xem xét lại' } } } })
    @ApiResponse({ status: 200, description: 'Unban thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Lấy danh sách warnings của user',
        description: 'Lấy lịch sử cảnh cáo của user với phân trang. Yêu cầu quyền `user-management.warn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiResponse({ status: 200, description: 'Danh sách warnings' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Cảnh báo user',
        description: 'Thêm cảnh cáo cho user. Có thể vĩnh viễn hoặc tạm thời. Yêu cầu quyền `user-management.warn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiBody({ type: WarnUserDto })
    @ApiResponse({ status: 201, description: 'Cảnh cáo thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Gỡ cảnh báo user',
        description: 'Gỡ một cảnh cáo cụ thể của user. Yêu cầu quyền `user-management.unwarn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiParam({ name: 'warningId', description: 'ID của warning cần gỡ' })
    @ApiBody({ type: UnwarnUserDto })
    @ApiResponse({ status: 200, description: 'Gỡ cảnh báo thành công' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Lấy danh sách sessions của user',
        description: 'Lấy danh sách phiên đăng nhập của user. Yêu cầu quyền `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiResponse({ status: 200, description: 'Danh sách sessions' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Đăng xuất một session',
        description: 'Hủy một phiên đăng nhập cụ thể. Yêu cầu quyền `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiParam({ name: 'sessionId', description: 'ID của session cần hủy' })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Đăng xuất tất cả sessions',
        description: 'Hủy tất cả phiên đăng nhập của user. Yêu cầu quyền `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
    @ApiAuthResponses()
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

    @Get(':id/roles-permissions')
    @RequirePermission('user-management.read')
    @ApiOperation({
        summary: 'Lấy roles và permissions của user',
        description: 'Lấy danh sách roles và permissions được gán cho user. Yêu cầu quyền `user-management.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiResponse({ status: 200, description: 'Roles và permissions' })
    @ApiAuthResponses()
    async getUserRolesAndPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getUserRolesAndPermissions(id, lang);
        return new GetResponse('user-management.roles_permissions.get', result);
    }

    @Put(':id/roles-permissions')
    @RequirePermission('user-management.update')
    @ApiOperation({
        summary: 'Gán roles và permissions cho user',
        description: 'Cập nhật roles và permissions cho user. Yêu cầu quyền `user-management.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiBody({ type: AssignUserRolesPermissionsDto })
    @ApiResponse({ status: 200, description: 'Gán thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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

    @Post('bulk/ban')
    @RequirePermission('user-management.ban')
    @ApiOperation({
        summary: 'Ban nhiều users cùng lúc',
        description: 'Ban hàng loạt users với cùng lý do. Yêu cầu quyền `user-management.ban`.',
    })
    @ApiBody({ type: BulkBanUsersDto })
    @ApiResponse({ status: 200, description: 'Ban thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async bulkBanUsers(
        @Body() dto: BulkBanUsersDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.bulkBanUsers(
            dto.user_ids, dto.reason, dto.is_permanent || false,
            dto.duration_value, dto.duration_type, adminId, lang,
            { ip: req.ip, userAgent: req.headers['user-agent'] },
        );
        return new UpdatedResponse('user-management.bulk_ban', result);
    }

    @Post('bulk/unban')
    @RequirePermission('user-management.unban')
    @ApiOperation({ summary: 'Unban nhiều users cùng lúc' })
    @ApiBody({ type: BulkUnbanUsersDto })
    @ApiResponse({ status: 200, description: 'Unban thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async bulkUnbanUsers(
        @Body() dto: BulkUnbanUsersDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.bulkUnbanUsers(
            dto.user_ids, dto.note, adminId, lang,
            { ip: req.ip, userAgent: req.headers['user-agent'] },
        );
        return new UpdatedResponse('user-management.bulk_unban', result);
    }

    @Post('bulk/warn')
    @RequirePermission('user-management.warn')
    @ApiOperation({ summary: 'Cảnh cáo nhiều users cùng lúc' })
    @ApiBody({ type: BulkWarnUsersDto })
    @ApiResponse({ status: 201, description: 'Cảnh cáo thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async bulkWarnUsers(
        @Body() dto: BulkWarnUsersDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.bulkWarnUsers(
            dto.user_ids, dto.category_id, dto.reason,
            dto.is_permanent || false, dto.duration_value, dto.duration_type,
            adminId, lang, { ip: req.ip, userAgent: req.headers['user-agent'] },
        );
        return new CreatedResponse('user-management.bulk_warn', result);
    }

    @Delete(':id/warnings')
    @RequirePermission('user-management.unwarn')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa tất cả cảnh cáo của user' })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiBody({ type: ClearAllWarningsDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    async clearAllWarnings(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ClearAllWarningsDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.clearAllWarnings(id, dto.note, adminId, lang, {
            ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('user-management.clear_all_warnings', result);
    }

    @Delete('bulk/warnings')
    @RequirePermission('user-management.unwarn')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa tất cả cảnh cáo của nhiều users' })
    @ApiBody({ type: BulkClearAllWarningsDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    async bulkClearAllWarnings(
        @Body() dto: BulkClearAllWarningsDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.bulkClearAllWarnings(dto.user_ids, dto.note, adminId, lang, {
            ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('user-management.bulk_clear_all_warnings', result);
    }

    @Delete(':id')
    @RequirePermission('user-management.delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Xóa 1 user (soft delete)',
        description: 'Soft delete user - đánh dấu is_deleted. Yêu cầu quyền `user-management.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiBody({ type: DeleteUserDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: DeleteUserDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.deleteUser(id, dto.reason, adminId, lang, {
            ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('user-management.delete_user', result);
    }

    @Delete('bulk/delete')
    @RequirePermission('user-management.delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa nhiều users cùng lúc (soft delete)' })
    @ApiBody({ type: BulkDeleteUsersDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async bulkDeleteUsers(
        @Body() dto: BulkDeleteUsersDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.bulkDeleteUsers(dto.user_ids, dto.reason, adminId, lang, {
            ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('user-management.bulk_delete_users', result);
    }

    @Get(':id/download')
    @RequirePermission('user-management.download')
    @ApiOperation({ summary: 'Tải dữ liệu 1 user' })
    @ApiParam({ name: 'id', description: 'ID của user' })
    @ApiResponse({ status: 200, description: 'Tải thành công' })
    @ApiAuthResponses()
    async downloadUserData(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.downloadUserData(id, adminId, lang, {
            ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return new GetResponse('user-management.download_user_data', result);
    }

    @Post('bulk/download')
    @RequirePermission('user-management.download')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Tải dữ liệu nhiều users' })
    @ApiBody({ type: BulkDownloadUsersDto })
    @ApiResponse({ status: 200, description: 'Tải thành công' })
    @ApiAuthResponses()
    async bulkDownloadUsersData(
        @Body() dto: BulkDownloadUsersDto,
        @CurrentUser('userId') adminId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ) {
        const result = await this.service.bulkDownloadUsersData(dto.user_ids, adminId, lang, {
            ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return new GetResponse('user-management.bulk_download_users_data', result);
    }
}
