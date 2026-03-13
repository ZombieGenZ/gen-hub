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
        reason: { type: 'string', example: 'Sá»­ dá»¥ng ngĂ´n ngá»¯ khĂ´ng phĂ¹ há»£p' },
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
    message: 'KhĂ´ng tĂ¬m tháº¥y user',
});

const paginatedUsersSchema = buildSuccessResponseSchema({
    code: 'user-management.list',
    message: 'Láº¥y danh sĂ¡ch users thĂ nh cĂ´ng',
    dataSchema: buildPaginationDataSchema(userItemSchema),
    dataExample: {
        items: [
            {
                id: USER_ID,
                email: 'user@genhub.vn',
                full_name: 'Nguyen Van A',
                is_banned: false,
                is_verified: true,
                warning_count: 1,
                created_at: '2026-03-13T08:00:00.000Z',
            },
        ],
        total: 150,
        limit: 20,
        offset: 0,
        hasMore: true,
    },
});

const statsSchema = buildSuccessResponseSchema({
    code: 'user-management.stats',
    message: 'Láº¥y thá»‘ng kĂª users thĂ nh cĂ´ng',
    dataSchema: {
        type: 'object',
        properties: {
            total: { type: 'number', example: 2500 },
            online: { type: 'number', example: 138 },
            active: { type: 'number', example: 2310 },
            warned: { type: 'number', example: 42 },
            banned: { type: 'number', example: 17 },
        },
    },
    dataExample: {
        total: 2500,
        online: 138,
        active: 2310,
        warned: 42,
        banned: 17,
    },
});

const userWarningsSchema = buildSuccessResponseSchema({
    code: 'user-management.warnings.list',
    message: 'Láº¥y danh sĂ¡ch cáº£nh cĂ¡o thĂ nh cĂ´ng',
    dataSchema: buildPaginationDataSchema(warningItemSchema),
    dataExample: {
        items: [
            {
                id: WARNING_ID,
                reason: 'Sá»­ dá»¥ng ngĂ´n ngá»¯ khĂ´ng phĂ¹ há»£p',
                status: 'active',
                is_permanent: false,
                expires_at: '2026-03-20T08:00:00.000Z',
                created_at: '2026-03-13T08:00:00.000Z',
            },
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
    },
});

const userSessionsSchema = buildSuccessResponseSchema({
    code: 'user-management.sessions.list',
    message: 'Láº¥y danh sĂ¡ch sessions thĂ nh cĂ´ng',
    dataSchema: buildPaginationDataSchema(sessionItemSchema),
    dataExample: {
        items: [
            {
                id: SESSION_ID,
                device_name: 'Chrome on Windows',
                ip_address: '203.113.10.20',
                last_active_at: '2026-03-13T09:30:00.000Z',
                is_current: true,
            },
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
    },
});

const rolesPermissionsSchema = buildSuccessResponseSchema({
    code: 'user-management.roles_permissions.get',
    message: 'Láº¥y roles vĂ  permissions thĂ nh cĂ´ng',
    dataSchema: {
        type: 'object',
        properties: {
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
        },
    },
    dataExample: {
        roles: [{ id: ROLE_ID, name: 'Support Staff' }],
        permissions: [{ id: PERMISSION_ID, key: 'user-management.read' }],
    },
});

const countResultSchema = {
    type: 'object',
    properties: {
        count: { type: 'number', example: 2 },
    },
};

const exportResultSchema = {
    type: 'object',
    properties: {
        data: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true,
            },
        },
        count: { type: 'number', example: 2, nullable: true },
        filename: { type: 'string', example: 'users-export-2026-03-13.json' },
    },
};

@ApiTags('User Management')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserManagementController {
    constructor(private readonly service: UserManagementService) { }

    @Get()
    @RequirePermission('user-management.list')
    @ApiOperation({
        summary: 'Láº¥y danh sĂ¡ch users',
        description: 'Láº¥y danh sĂ¡ch táº¥t cáº£ users trong há»‡ thá»‘ng vá»›i phĂ¢n trang, tĂ¬m kiáº¿m, vĂ  bá»™ lá»c. YĂªu cáº§u quyá»n `user-management.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sá»‘ lÆ°á»£ng tá»‘i Ä‘a', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vá»‹ trĂ­ báº¯t Ä‘áº§u', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo họ tên hoặc email', example: 'user@genhub.vn' })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'banned', 'verified', 'unverified'], description: 'Lọc danh sách theo trạng thái tổng quát của user', example: 'active' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách users thành công', schema: paginatedUsersSchema })
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
        summary: 'Láº¥y thá»‘ng kĂª users',
        description: 'Láº¥y thá»‘ng kĂª tá»•ng quan vá» users: tá»•ng sá»‘, active, banned, verified. YĂªu cáº§u quyá»n `user-management.list`.',
    })
    @ApiResponse({ status: 200, description: 'Lấy thống kê users thành công', schema: statsSchema })
    @ApiAuthResponses()
    async getStats() {
        const stats = await this.service.getStats();
        return new GetResponse('user-management.stats', stats);
    }

    @Get('download/all')
    @RequirePermission('user-management.download')
    @ApiOperation({
        summary: 'Táº£i dá»¯ liá»‡u táº¥t cáº£ users (cĂ³ filter)',
        description: 'Export dá»¯ liá»‡u táº¥t cáº£ users theo filter. Tráº£ vá» CSV/Excel. YĂªu cáº§u quyá»n `user-management.download`.',
    })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa lọc dữ liệu export', example: 'support@genhub.vn' })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'banned', 'verified', 'unverified', 'deleted'], description: 'Lọc dữ liệu export theo trạng thái user', example: 'active' })
    @ApiResponse({
        status: 200,
        description: 'Tải dữ liệu tất cả users thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.download_all_users_data',
            message: 'Tải dữ liệu tất cả users thành công',
            dataSchema: exportResultSchema,
            dataExample: {
                data: [{ id: USER_ID, email: 'user@genhub.vn', full_name: 'Nguyen Van A' }],
                count: 1,
                filename: 'all-users-export-2026-03-13.json',
            },
        }),
    })
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
        summary: 'Láº¥y chi tiáº¿t user',
        description: 'Láº¥y thĂ´ng tin chi tiáº¿t cá»§a má»™t user bao gá»“m: profile, roles, permissions, ban status, warning count. YĂªu cáº§u quyá»n `user-management.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user (UUID)', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết user thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.read',
            message: 'Lấy chi tiết user thành công',
            dataSchema: userDetailSchema,
            dataExample: {
                id: USER_ID,
                email: 'user@genhub.vn',
                full_name: 'Nguyen Van A',
                phone: '0901234567',
                is_banned: false,
                is_verified: true,
                warning_count: 1,
                roles: [{ id: ROLE_ID, name: 'Support Staff' }],
                permissions: [{ id: PERMISSION_ID, key: 'user-management.read' }],
                created_at: '2026-03-13T08:00:00.000Z',
                updated_at: '2026-03-13T09:00:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user', schema: userNotFoundSchema })
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
        description: 'Cáº¥m user khá»i há»‡ thá»‘ng. CĂ³ thá»ƒ ban vÄ©nh viá»…n hoáº·c táº¡m thá»i vá»›i thá»i háº¡n. YĂªu cáº§u quyá»n `user-management.ban`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user cáº§n ban', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiBody({
        type: BanUserDto,
        examples: {
            permanent_ban: { summary: 'Ban vÄ©nh viá»…n', value: { reason: 'Vi pháº¡m Ä‘iá»u khoáº£n nghiĂªm trá»ng', is_permanent: true } },
            temporary_ban: { summary: 'Ban táº¡m thá»i', value: { reason: 'Spam', is_permanent: false, duration_value: 7, duration_type: 'days' } },
        },
    })
    @ApiResponse({ status: 200, description: 'Ban user thành công', schema: buildSuccessResponseSchema({ code: 'user-management.ban', message: 'Ban user thành công', dataSchema: userDetailSchema, dataExample: userDetailSchema.properties }) })
    @ApiResponse({ status: 400, description: 'User Ä‘Ă£ bá»‹ ban' })
    @ApiResponse({ status: 404, description: 'KhĂ´ng tĂ¬m tháº¥y user' })
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
        description: 'Gá»¡ lá»‡nh cáº¥m cho user. YĂªu cáº§u quyá»n `user-management.unban`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user cáº§n unban' })
    @ApiBody({ type: UnbanUserDto, examples: { unban: { summary: 'Unban', value: { note: 'ÄĂ£ xem xĂ©t láº¡i' } } } })
    @ApiResponse({ status: 200, description: 'Unban user thành công', schema: buildSuccessResponseSchema({ code: 'user-management.unban', message: 'Unban user thành công', dataSchema: userDetailSchema, dataExample: userDetailSchema.properties }) })
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
        summary: 'Láº¥y danh sĂ¡ch warnings cá»§a user',
        description: 'Láº¥y lá»‹ch sá»­ cáº£nh cĂ¡o cá»§a user vá»›i phĂ¢n trang. YĂªu cáº§u quyá»n `user-management.warn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng cảnh cáo tối đa trả về', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu của danh sách cảnh cáo', example: 0 })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'removed', 'expired'], description: 'Lọc cảnh cáo theo trạng thái', example: 'active' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách cảnh cáo thành công', schema: userWarningsSchema })
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
        summary: 'Cáº£nh bĂ¡o user',
        description: 'ThĂªm cáº£nh cĂ¡o cho user. CĂ³ thá»ƒ vÄ©nh viá»…n hoáº·c táº¡m thá»i. YĂªu cáº§u quyá»n `user-management.warn`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiBody({ type: WarnUserDto })
    @ApiResponse({ status: 201, description: 'Cáº£nh cĂ¡o thĂ nh cĂ´ng' })
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
        summary: 'Gá»¡ cáº£nh bĂ¡o user',
        description: 'Gá»¡ má»™t cáº£nh cĂ¡o cá»¥ thá»ƒ cá»§a user. YĂªu cáº§u quyá»n `user-management.unwarn`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiParam({ name: 'warningId', description: 'ID cá»§a warning cáº§n gá»¡' })
    @ApiBody({ type: UnwarnUserDto })
    @ApiResponse({ status: 200, description: 'Gá»¡ cáº£nh bĂ¡o thĂ nh cĂ´ng' })
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
        summary: 'Láº¥y danh sĂ¡ch sessions cá»§a user',
        description: 'Láº¥y danh sĂ¡ch phiĂªn Ä‘Äƒng nháº­p cá»§a user. YĂªu cáº§u quyá»n `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng session tối đa trả về', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu của danh sách session', example: 0 })
    @ApiResponse({ status: 200, description: 'Lấy danh sách sessions thành công', schema: userSessionsSchema })
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
        summary: 'ÄÄƒng xuáº¥t má»™t session',
        description: 'Há»§y má»™t phiĂªn Ä‘Äƒng nháº­p cá»¥ thá»ƒ. YĂªu cáº§u quyá»n `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiParam({ name: 'sessionId', description: 'ID cá»§a session cáº§n há»§y' })
    @ApiResponse({ status: 200, description: 'ÄÄƒng xuáº¥t thĂ nh cĂ´ng' })
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
        summary: 'ÄÄƒng xuáº¥t táº¥t cáº£ sessions',
        description: 'Há»§y táº¥t cáº£ phiĂªn Ä‘Äƒng nháº­p cá»§a user. YĂªu cáº§u quyá»n `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiResponse({ status: 200, description: 'ÄÄƒng xuáº¥t thĂ nh cĂ´ng' })
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
        summary: 'Láº¥y roles vĂ  permissions cá»§a user',
        description: 'Láº¥y danh sĂ¡ch roles vĂ  permissions Ä‘Æ°á»£c gĂ¡n cho user. YĂªu cáº§u quyá»n `user-management.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Lấy roles và permissions thành công', schema: rolesPermissionsSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user', schema: userNotFoundSchema })
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
        summary: 'GĂ¡n roles vĂ  permissions cho user',
        description: 'Cáº­p nháº­t roles vĂ  permissions cho user. YĂªu cáº§u quyá»n `user-management.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiBody({ type: AssignUserRolesPermissionsDto })
    @ApiResponse({
        status: 200,
        description: 'Gán roles và permissions thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.roles_permissions.assign',
            message: 'Gán roles và permissions thành công',
            dataSchema: {
                type: 'object',
                properties: {
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
                },
            },
            dataExample: {
                roles: [{ id: ROLE_ID, name: 'Support Staff' }],
                permissions: [{ id: PERMISSION_ID, key: 'user-management.read' }],
            },
        }),
    })
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
        summary: 'Ban nhiá»u users cĂ¹ng lĂºc',
        description: 'Ban hĂ ng loáº¡t users vá»›i cĂ¹ng lĂ½ do. YĂªu cáº§u quyá»n `user-management.ban`.',
    })
    @ApiBody({ type: BulkBanUsersDto })
    @ApiResponse({ status: 200, description: 'Ban user thành công', schema: buildSuccessResponseSchema({ code: 'user-management.ban', message: 'Ban user thành công', dataSchema: userDetailSchema, dataExample: userDetailSchema.properties }) })
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
    @ApiOperation({ summary: 'Unban nhiá»u users cĂ¹ng lĂºc' })
    @ApiBody({ type: BulkUnbanUsersDto })
    @ApiResponse({ status: 200, description: 'Unban user thành công', schema: buildSuccessResponseSchema({ code: 'user-management.unban', message: 'Unban user thành công', dataSchema: userDetailSchema, dataExample: userDetailSchema.properties }) })
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
    @ApiOperation({ summary: 'Cáº£nh cĂ¡o nhiá»u users cĂ¹ng lĂºc' })
    @ApiBody({ type: BulkWarnUsersDto })
    @ApiResponse({ status: 201, description: 'Cáº£nh cĂ¡o thĂ nh cĂ´ng' })
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
    @ApiOperation({ summary: 'XĂ³a táº¥t cáº£ cáº£nh cĂ¡o cá»§a user' })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiBody({ type: ClearAllWarningsDto })
    @ApiResponse({ status: 200, description: 'XĂ³a thĂ nh cĂ´ng' })
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
    @ApiOperation({ summary: 'XĂ³a táº¥t cáº£ cáº£nh cĂ¡o cá»§a nhiá»u users' })
    @ApiBody({ type: BulkClearAllWarningsDto })
    @ApiResponse({ status: 200, description: 'XĂ³a thĂ nh cĂ´ng' })
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
        summary: 'XĂ³a 1 user (soft delete)',
        description: 'Soft delete user - Ä‘Ă¡nh dáº¥u is_deleted. YĂªu cáº§u quyá»n `user-management.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiBody({ type: DeleteUserDto })
    @ApiResponse({ status: 200, description: 'XĂ³a thĂ nh cĂ´ng' })
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
    @ApiOperation({ summary: 'XĂ³a nhiá»u users cĂ¹ng lĂºc (soft delete)' })
    @ApiBody({ type: BulkDeleteUsersDto })
    @ApiResponse({ status: 200, description: 'XĂ³a thĂ nh cĂ´ng' })
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
    @ApiOperation({ summary: 'Táº£i dá»¯ liá»‡u 1 user' })
    @ApiParam({ name: 'id', description: 'ID cá»§a user' })
    @ApiResponse({ status: 200, description: 'Táº£i thĂ nh cĂ´ng' })
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
    @ApiOperation({ summary: 'Táº£i dá»¯ liá»‡u nhiá»u users' })
    @ApiBody({ type: BulkDownloadUsersDto })
    @ApiResponse({ status: 200, description: 'Táº£i thĂ nh cĂ´ng' })
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



