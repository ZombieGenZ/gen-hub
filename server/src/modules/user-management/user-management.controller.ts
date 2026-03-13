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
const USER_ID_2 = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440101';
const WARNING_ID = '550e8400-e29b-41d4-a716-446655440201';
const WARNING_CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440211';
const ROLE_ID = '550e8400-e29b-41d4-a716-446655440301';
const ROLE_ID_2 = '550e8400-e29b-41d4-a716-446655440302';
const PERMISSION_ID = '550e8400-e29b-41d4-a716-446655440401';
const PERMISSION_ID_2 = '550e8400-e29b-41d4-a716-446655440402';

const userItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', description: 'ID của user', example: USER_ID },
        email: { type: 'string', description: 'Email đăng nhập', example: 'user@genhub.vn' },
        full_name: { type: 'string', description: 'Họ và tên hiển thị', example: 'Nguyễn Văn A' },
        is_banned: { type: 'boolean', description: 'Trạng thái bị khóa', example: false },
        is_verified: { type: 'boolean', description: 'Trạng thái xác minh tài khoản', example: true },
        warning_count: { type: 'number', description: 'Số lượng cảnh cáo hiện có', example: 1 },
        created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời điểm tạo tài khoản',
            example: '2026-03-13T08:00:00.000Z',
        },
    },
};

const userDetailSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', description: 'ID của user', example: USER_ID },
        email: { type: 'string', description: 'Email đăng nhập', example: 'user@genhub.vn' },
        full_name: { type: 'string', description: 'Họ và tên đầy đủ', example: 'Nguyễn Văn A' },
        phone: { type: 'string', description: 'Số điện thoại', example: '0901234567' },
        is_banned: { type: 'boolean', description: 'Trạng thái bị khóa', example: false },
        is_verified: { type: 'boolean', description: 'Trạng thái xác minh tài khoản', example: true },
        warning_count: { type: 'number', description: 'Tổng số cảnh cáo của user', example: 1 },
        roles: {
            type: 'array',
            description: 'Danh sách vai trò của user',
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
            description: 'Danh sách quyền đang có của user',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: PERMISSION_ID },
                    key: { type: 'string', example: 'user-management.read' },
                },
            },
        },
        created_at: { type: 'string', format: 'date-time', description: 'Thời điểm tạo', example: '2026-03-13T08:00:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', description: 'Thời điểm cập nhật gần nhất', example: '2026-03-13T09:00:00.000Z' },
    },
};

const userDetailExample = {
    id: USER_ID,
    email: 'user@genhub.vn',
    full_name: 'Nguyễn Văn A',
    phone: '0901234567',
    is_banned: false,
    is_verified: true,
    warning_count: 1,
    roles: [{ id: ROLE_ID, name: 'Support Staff' }],
    permissions: [{ id: PERMISSION_ID, key: 'user-management.read' }],
    created_at: '2026-03-13T08:00:00.000Z',
    updated_at: '2026-03-13T09:00:00.000Z',
};

const sessionItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', description: 'ID của session', example: SESSION_ID },
        device_name: { type: 'string', description: 'Thiết bị hoặc trình duyệt', example: 'Chrome on Windows' },
        ip_address: { type: 'string', description: 'Địa chỉ IP của session', example: '203.113.10.20' },
        last_active_at: { type: 'string', format: 'date-time', description: 'Thời điểm hoạt động gần nhất', example: '2026-03-13T09:30:00.000Z' },
        is_current: { type: 'boolean', description: 'Đây có phải session hiện tại không', example: true },
    },
};

const warningItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', description: 'ID của cảnh cáo', example: WARNING_ID },
        reason: { type: 'string', description: 'Lý do cảnh cáo', example: 'Sử dụng ngôn ngữ không phù hợp' },
        status: { type: 'string', description: 'Trạng thái cảnh cáo', example: 'active' },
        is_permanent: { type: 'boolean', description: 'Cảnh cáo vĩnh viễn hay tạm thời', example: false },
        expires_at: { type: 'string', format: 'date-time', nullable: true, description: 'Thời điểm hết hiệu lực', example: '2026-03-20T08:00:00.000Z' },
        created_at: { type: 'string', format: 'date-time', description: 'Thời điểm tạo cảnh cáo', example: '2026-03-13T08:00:00.000Z' },
    },
};

const warningItemExample = {
    id: WARNING_ID,
    reason: 'Sử dụng ngôn ngữ không phù hợp',
    status: 'active',
    is_permanent: false,
    expires_at: '2026-03-20T08:00:00.000Z',
    created_at: '2026-03-13T08:00:00.000Z',
};

const rolesPermissionsDataSchema = {
    type: 'object',
    properties: {
        roles: {
            type: 'array',
            description: 'Danh sách vai trò của user',
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
            description: 'Danh sách quyền của user',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: PERMISSION_ID },
                    key: { type: 'string', example: 'user-management.read' },
                },
            },
        },
    },
};

const rolesPermissionsSchema = buildSuccessResponseSchema({
    code: 'user-management.roles_permissions.get',
    message: 'Lấy roles và permissions thành công',
    dataSchema: rolesPermissionsDataSchema,
    dataExample: {
        roles: [{ id: ROLE_ID, name: 'Support Staff' }],
        permissions: [{ id: PERMISSION_ID, key: 'user-management.read' }],
    },
});

const countResultSchema = {
    type: 'object',
    properties: {
        count: { type: 'number', description: 'Số lượng bản ghi đã xử lý', example: 2 },
    },
};

const booleanActionResultSchema = {
    type: 'object',
    properties: {
        success: { type: 'boolean', description: 'Kết quả thao tác', example: true },
    },
};

const exportUserDataSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: USER_ID },
        email: { type: 'string', example: 'user@genhub.vn' },
        full_name: { type: 'string', example: 'Nguyễn Văn A' },
        phone: { type: 'string', example: '0901234567' },
        is_banned: { type: 'boolean', example: false },
        is_verified: { type: 'boolean', example: true },
        warning_count: { type: 'number', example: 1 },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:00:00.000Z' },
    },
};

const exportUserDataExample = {
    id: USER_ID,
    email: 'user@genhub.vn',
    full_name: 'Nguyễn Văn A',
    phone: '0901234567',
    is_banned: false,
    is_verified: true,
    warning_count: 1,
    created_at: '2026-03-13T08:00:00.000Z',
    updated_at: '2026-03-13T09:00:00.000Z',
};

const singleExportResultSchema = {
    type: 'object',
    properties: {
        data: { ...exportUserDataSchema, nullable: true, description: 'Dữ liệu user được export' },
        filename: { type: 'string', description: 'Tên file gợi ý', example: 'user-550e8400-e29b-41d4-a716-446655440001-2026-03-13.json' },
    },
};

const bulkExportResultSchema = {
    type: 'object',
    properties: {
        data: { type: 'array', description: 'Danh sách dữ liệu user được export', items: exportUserDataSchema },
        count: { type: 'number', nullable: true, description: 'Tổng số user được export', example: 2 },
        filename: { type: 'string', description: 'Tên file gợi ý', example: 'users-export-2026-03-13.json' },
    },
};

const buildCountSuccessSchema = (code: string, message: string, count = 1) => buildSuccessResponseSchema({
    code,
    message,
    dataSchema: countResultSchema,
    dataExample: { count },
});

const buildBooleanActionSuccessSchema = (code: string, message: string) => buildSuccessResponseSchema({
    code,
    message,
    dataSchema: booleanActionResultSchema,
    dataExample: { success: true },
});

const invalidUuidSchema = buildErrorResponseSchema({
    code: 'error.validation.invalid_uuid',
    message: 'ID hoặc tham số định danh không đúng định dạng UUID',
});

const noUsersSelectedSchema = buildErrorResponseSchema({
    code: 'user-management.no_users_selected',
    message: 'Danh sách user cần xử lý không hợp lệ hoặc rỗng',
});

const userNotFoundSchema = buildErrorResponseSchema({
    code: 'user-management.user_not_found',
    message: 'Không tìm thấy user',
});

const warningCategoryNotFoundSchema = buildErrorResponseSchema({
    code: 'warning-category.not_found',
    message: 'Không tìm thấy danh mục cảnh cáo',
});

const paginatedUsersSchema = buildSuccessResponseSchema({
    code: 'user-management.list',
    message: 'Lấy danh sách users thành công',
    dataSchema: buildPaginationDataSchema(userItemSchema),
    dataExample: {
        items: [
            {
                id: USER_ID,
                email: 'user@genhub.vn',
                full_name: 'Nguyễn Văn A',
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
    message: 'Lấy thống kê users thành công',
    dataSchema: {
        type: 'object',
        properties: {
            total: { type: 'number', description: 'Tổng số users', example: 2500 },
            online: { type: 'number', description: 'Số users đang online', example: 138 },
            active: { type: 'number', description: 'Số users đang hoạt động', example: 2310 },
            warned: { type: 'number', description: 'Số users đang có cảnh cáo', example: 42 },
            banned: { type: 'number', description: 'Số users đang bị khóa', example: 17 },
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
    message: 'Lấy danh sách cảnh cáo thành công',
    dataSchema: buildPaginationDataSchema(warningItemSchema),
    dataExample: {
        items: [warningItemExample],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
    },
});

const userSessionsSchema = buildSuccessResponseSchema({
    code: 'user-management.sessions.list',
    message: 'Lấy danh sách sessions thành công',
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
        description:
            'Trả về danh sách users trong hệ thống có hỗ trợ phân trang, tìm kiếm theo từ khóa và lọc theo trạng thái. Endpoint này phù hợp cho trang quản trị danh sách tài khoản và yêu cầu quyền `user-management.list`.',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Số lượng user tối đa trả về trong một lần gọi API',
        example: 20,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        type: Number,
        description: 'Vị trí bắt đầu của danh sách dùng cho phân trang',
        example: 0,
    })
    @ApiQuery({
        name: 'keywords',
        required: false,
        type: String,
        description: 'Từ khóa tìm kiếm theo email hoặc họ tên user',
        example: 'nguyen van a',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['active', 'banned', 'verified', 'unverified'],
        description: 'Lọc danh sách user theo trạng thái tổng quát',
        example: 'active',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách users thành công với dữ liệu phân trang',
        schema: paginatedUsersSchema,
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
        description:
            'Trả về số liệu tổng quan của users trong hệ thống, bao gồm tổng số tài khoản, số user online, active, bị cảnh cáo và bị khóa. Yêu cầu quyền `user-management.list`.',
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
        summary: 'Tải dữ liệu tất cả users',
        description:
            'Export dữ liệu toàn bộ users trong hệ thống theo bộ lọc hiện tại. Kết quả trả về gồm dữ liệu, tổng số bản ghi export và tên file gợi ý để tải xuống. Yêu cầu quyền `user-management.download`.',
    })
    @ApiQuery({
        name: 'keywords',
        required: false,
        type: String,
        description: 'Từ khóa lọc dữ liệu export theo email hoặc họ tên',
        example: 'support@genhub.vn',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['active', 'banned', 'verified', 'unverified', 'deleted'],
        description: 'Lọc dữ liệu export theo trạng thái user',
        example: 'active',
    })
    @ApiResponse({
        status: 200,
        description: 'Tải dữ liệu tất cả users thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.download_all_users_data',
            message: 'Tải dữ liệu tất cả users thành công',
            dataSchema: bulkExportResultSchema,
            dataExample: {
                data: [exportUserDataExample],
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
        summary: 'Lấy chi tiết user',
        description:
            'Trả về toàn bộ thông tin chi tiết của một user theo ID, bao gồm profile cơ bản, vai trò, quyền, trạng thái xác minh, trạng thái khóa và số cảnh cáo hiện có. Yêu cầu quyền `user-management.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần xem chi tiết', example: USER_ID })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết user thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.read',
            message: 'Lấy chi tiết user thành công',
            dataSchema: userDetailSchema,
            dataExample: userDetailExample,
        }),
    })
    @ApiResponse({ status: 400, description: 'ID user không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user theo ID được cung cấp', schema: userNotFoundSchema })
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
        summary: 'Khóa user',
        description:
            'Khóa một user khỏi hệ thống. Có thể khóa vĩnh viễn hoặc khóa tạm thời theo thời lượng cụ thể. Endpoint yêu cầu quyền `user-management.ban` và có ghi nhận lịch sử thao tác trong system log.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần khóa', example: USER_ID })
    @ApiBody({
        type: BanUserDto,
        description: 'Thông tin khóa user, bao gồm lý do và tùy chọn thời hạn khóa',
        examples: {
            permanent_ban: {
                summary: 'Khóa vĩnh viễn',
                description: 'Dùng khi user vi phạm nghiêm trọng và cần khóa không thời hạn',
                value: { reason: 'Vi phạm điều khoản sử dụng nghiêm trọng', is_permanent: true },
            },
            temporary_ban_days: {
                summary: 'Khóa tạm thời theo ngày',
                description: 'Dùng khi cần khóa user trong 7 ngày',
                value: { reason: 'Spam nội dung lặp lại', is_permanent: false, duration_value: 7, duration_type: DurationType.DAYS },
            },
            temporary_ban_hours: {
                summary: 'Khóa tạm thời theo giờ',
                description: 'Dùng khi cần hạn chế truy cập trong thời gian ngắn',
                value: { reason: 'Có dấu hiệu truy cập bất thường', is_permanent: false, duration_value: 12, duration_type: DurationType.HOURS },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Khóa user thành công và trả về thông tin user sau cập nhật',
        schema: buildSuccessResponseSchema({
            code: 'user-management.ban',
            message: 'Khóa user thành công',
            dataSchema: userDetailSchema,
            dataExample: { ...userDetailExample, is_banned: true },
        }),
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể khóa do dữ liệu không hợp lệ, thao tác lên chính mình, user được bảo vệ hoặc user đã bị khóa',
        schema: buildErrorResponseSchema({
            code: 'user-management.ban_invalid',
            message: 'Không thể khóa user với dữ liệu hoặc trạng thái hiện tại',
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần khóa', schema: userNotFoundSchema })
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
        summary: 'Mở khóa user',
        description:
            'Gỡ trạng thái khóa của một user và cho phép user đăng nhập lại bình thường. Endpoint yêu cầu quyền `user-management.unban` và có thể đính kèm ghi chú nội bộ.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần mở khóa', example: USER_ID })
    @ApiBody({
        type: UnbanUserDto,
        description: 'Thông tin bổ sung khi mở khóa user',
        examples: {
            review_approved: {
                summary: 'Mở khóa sau khi xem xét',
                description: 'Dùng khi admin đã xác minh user không còn vi phạm',
                value: { note: 'Đã xem xét lại và cho phép hoạt động trở lại' },
            },
            appeal_accepted: {
                summary: 'Mở khóa sau khi khiếu nại',
                description: 'Dùng khi chấp thuận khiếu nại của user',
                value: { note: 'Chấp thuận khiếu nại và khôi phục tài khoản' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Mở khóa user thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.unban',
            message: 'Mở khóa user thành công',
            dataSchema: userDetailSchema,
            dataExample: { ...userDetailExample, is_banned: false },
        }),
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể mở khóa do user chưa bị khóa, thao tác lên chính mình hoặc user được bảo vệ',
        schema: buildErrorResponseSchema({
            code: 'user-management.unban_invalid',
            message: 'Không thể mở khóa user với trạng thái hiện tại',
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần mở khóa', schema: userNotFoundSchema })
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
        summary: 'Lấy danh sách cảnh cáo của user',
        description:
            'Trả về lịch sử cảnh cáo của một user theo ID, có hỗ trợ phân trang và lọc theo trạng thái cảnh cáo. Yêu cầu quyền `user-management.warn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần lấy danh sách cảnh cáo', example: USER_ID })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng cảnh cáo tối đa trả về trong một trang', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu của danh sách cảnh cáo', example: 0 })
    @ApiQuery({ name: 'status', required: false, enum: ['active', 'removed', 'expired'], description: 'Lọc cảnh cáo theo trạng thái xử lý', example: 'active' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách cảnh cáo thành công', schema: userWarningsSchema })
    @ApiResponse({ status: 400, description: 'ID user không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần lấy cảnh cáo', schema: userNotFoundSchema })
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
        summary: 'Cảnh cáo user',
        description:
            'Tạo một cảnh cáo mới cho user theo danh mục cảnh cáo. Có thể tạo cảnh cáo vĩnh viễn hoặc cảnh cáo tạm thời với thời lượng cụ thể. Endpoint yêu cầu quyền `user-management.warn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần cảnh cáo', example: USER_ID })
    @ApiBody({
        type: WarnUserDto,
        description: 'Thông tin cảnh cáo user',
        examples: {
            permanent_warning: {
                summary: 'Cảnh cáo vĩnh viễn',
                description: 'Dùng khi hành vi vi phạm cần lưu cảnh cáo không thời hạn',
                value: { category_id: WARNING_CATEGORY_ID, reason: 'Sử dụng ngôn ngữ không phù hợp nhiều lần', is_permanent: true },
            },
            temporary_warning_days: {
                summary: 'Cảnh cáo tạm thời theo ngày',
                description: 'Dùng khi cảnh cáo chỉ có hiệu lực trong một khoảng thời gian',
                value: { category_id: WARNING_CATEGORY_ID, reason: 'Spam nội dung trong khu vực bình luận', is_permanent: false, duration_value: 10, duration_type: DurationType.DAYS },
            },
            temporary_warning_hours: {
                summary: 'Cảnh cáo tạm thời theo giờ',
                description: 'Dùng khi cần cảnh báo ngắn hạn',
                value: { category_id: WARNING_CATEGORY_ID, reason: 'Có hành vi gây rối trong phiên chat trực tiếp', is_permanent: false, duration_value: 24, duration_type: DurationType.HOURS },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Cảnh cáo user thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.warn',
            message: 'Cảnh cáo user thành công',
            dataSchema: warningItemSchema,
            dataExample: warningItemExample,
        }),
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể cảnh cáo do dữ liệu không hợp lệ, thao tác lên chính mình hoặc user được bảo vệ',
        schema: buildErrorResponseSchema({
            code: 'user-management.warn_invalid',
            message: 'Không thể cảnh cáo user với dữ liệu hiện tại',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy user hoặc danh mục cảnh cáo',
        schema: buildErrorResponseSchema({
            code: 'user-management.warn_not_found',
            message: 'Không tìm thấy user hoặc danh mục cảnh cáo',
        }),
    })
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
        summary: 'Gỡ cảnh cáo của user',
        description:
            'Gỡ một cảnh cáo cụ thể của user theo `warningId`. Endpoint dùng khi admin quyết định hủy hiệu lực cảnh cáo sau khi rà soát hoặc xử lý khiếu nại. Yêu cầu quyền `user-management.unwarn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user sở hữu cảnh cáo cần gỡ', example: USER_ID })
    @ApiParam({ name: 'warningId', description: 'ID của cảnh cáo cần gỡ', example: WARNING_ID })
    @ApiBody({
        type: UnwarnUserDto,
        description: 'Thông tin ghi chú nội bộ khi gỡ cảnh cáo',
        examples: {
            manual_review: {
                summary: 'Gỡ sau khi kiểm tra',
                description: 'Dùng khi admin xem xét và xác định cảnh cáo không còn phù hợp',
                value: { note: 'Đã xem xét và gỡ bỏ cảnh cáo' },
            },
            complaint_resolved: {
                summary: 'Gỡ sau khi giải quyết khiếu nại',
                description: 'Dùng khi user khiếu nại thành công',
                value: { note: 'Cảnh cáo được gỡ sau khi xác minh khiếu nại hợp lệ' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Gỡ cảnh cáo thành công',
        schema: buildBooleanActionSuccessSchema('user-management.unwarn', 'Gỡ cảnh cáo user thành công'),
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể gỡ cảnh cáo do trạng thái không hợp lệ, thao tác lên chính mình hoặc user được bảo vệ',
        schema: buildErrorResponseSchema({
            code: 'user-management.unwarn_invalid',
            message: 'Không thể gỡ cảnh cáo với trạng thái hiện tại',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy user hoặc cảnh cáo cần gỡ',
        schema: buildErrorResponseSchema({
            code: 'user-management.unwarn_not_found',
            message: 'Không tìm thấy user hoặc cảnh cáo cần gỡ',
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
        description:
            'Trả về danh sách các phiên đăng nhập của user theo ID, có hỗ trợ phân trang để hiển thị lịch sử thiết bị và phiên hoạt động. Yêu cầu quyền `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần lấy sessions', example: USER_ID })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng session tối đa trả về trong một trang', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu của danh sách sessions', example: 0 })
    @ApiResponse({ status: 200, description: 'Lấy danh sách sessions thành công', schema: userSessionsSchema })
    @ApiResponse({ status: 400, description: 'ID user không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần lấy sessions', schema: userNotFoundSchema })
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
        summary: 'Thu hồi một session của user',
        description:
            'Thu hồi một phiên đăng nhập cụ thể của user theo `sessionId`. Endpoint này hữu ích khi admin muốn buộc đăng xuất một thiết bị nghi ngờ bất thường. Yêu cầu quyền `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user sở hữu session cần thu hồi', example: USER_ID })
    @ApiParam({ name: 'sessionId', description: 'ID của session cần thu hồi', example: SESSION_ID })
    @ApiResponse({
        status: 200,
        description: 'Thu hồi session thành công',
        schema: buildBooleanActionSuccessSchema('user-management.session.revoke', 'Thu hồi session thành công'),
    })
    @ApiResponse({ status: 400, description: 'ID user hoặc session không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy user hoặc session cần thu hồi',
        schema: buildErrorResponseSchema({
            code: 'user-management.session.revoke_not_found',
            message: 'Không tìm thấy user hoặc session cần thu hồi',
        }),
    })
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
        summary: 'Thu hồi tất cả sessions của user',
        description:
            'Thu hồi toàn bộ các phiên đăng nhập hiện có của user, dùng khi cần buộc đăng xuất trên tất cả thiết bị. Yêu cầu quyền `user-management.sessions`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần thu hồi toàn bộ sessions', example: USER_ID })
    @ApiResponse({
        status: 200,
        description: 'Thu hồi tất cả sessions thành công',
        schema: buildCountSuccessSchema('user-management.sessions.revoke_all', 'Thu hồi tất cả sessions thành công', 3),
    })
    @ApiResponse({ status: 400, description: 'ID user không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần thu hồi sessions', schema: userNotFoundSchema })
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
        description:
            'Trả về danh sách roles và permissions hiện được gán cho user. Endpoint này phù hợp để đổ dữ liệu cho màn hình phân quyền người dùng. Yêu cầu quyền `user-management.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần xem phân quyền', example: USER_ID })
    @ApiResponse({ status: 200, description: 'Lấy roles và permissions thành công', schema: rolesPermissionsSchema })
    @ApiResponse({ status: 400, description: 'ID user không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần xem phân quyền', schema: userNotFoundSchema })
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
        description:
            'Cập nhật vai trò và quyền trực tiếp cho user. Có thể gửi riêng `role_ids`, riêng `permission_ids` hoặc gửi đồng thời cả hai mảng. Các giá trị được gửi sẽ đồng bộ lại toàn bộ cấu hình phân quyền tương ứng. Yêu cầu quyền `user-management.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần cập nhật roles và permissions', example: USER_ID })
    @ApiBody({
        type: AssignUserRolesPermissionsDto,
        description: 'Dữ liệu gán roles và permissions cho user',
        examples: {
            assign_roles_only: {
                summary: 'Chỉ cập nhật roles',
                description: 'Dùng khi chỉ cần đồng bộ danh sách vai trò của user',
                value: { role_ids: [ROLE_ID, ROLE_ID_2] },
            },
            assign_permissions_only: {
                summary: 'Chỉ cập nhật permissions trực tiếp',
                description: 'Dùng khi chỉ gán quyền trực tiếp cho user',
                value: { permission_ids: [PERMISSION_ID, PERMISSION_ID_2] },
            },
            assign_both: {
                summary: 'Cập nhật đồng thời roles và permissions',
                description: 'Dùng khi muốn cấu hình phân quyền đầy đủ cho user',
                value: { role_ids: [ROLE_ID], permission_ids: [PERMISSION_ID, PERMISSION_ID_2] },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Gán roles và permissions thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.roles_permissions.assign',
            message: 'Gán roles và permissions thành công',
            dataSchema: rolesPermissionsDataSchema,
            dataExample: {
                roles: [{ id: ROLE_ID, name: 'Support Staff' }],
                permissions: [{ id: PERMISSION_ID, key: 'user-management.read' }],
            },
        }),
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể cập nhật phân quyền do thao tác lên chính mình, user được bảo vệ hoặc dữ liệu không hợp lệ',
        schema: buildErrorResponseSchema({
            code: 'user-management.roles_permissions.assign_invalid',
            message: 'Không thể cập nhật roles và permissions cho user',
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần cập nhật phân quyền', schema: userNotFoundSchema })
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
        summary: 'Khóa nhiều users cùng lúc',
        description:
            'Khóa hàng loạt nhiều user bằng cùng một lý do và cùng cấu hình thời hạn khóa. Endpoint hữu ích cho các đợt xử lý vi phạm hàng loạt và yêu cầu quyền `user-management.ban`.',
    })
    @ApiBody({
        type: BulkBanUsersDto,
        description: 'Danh sách users cần khóa và thông tin khóa áp dụng đồng loạt',
        examples: {
            permanent_bulk_ban: {
                summary: 'Khóa vĩnh viễn nhiều users',
                description: 'Dùng khi nhiều tài khoản vi phạm nghiêm trọng cùng loại',
                value: { user_ids: [USER_ID, USER_ID_2], reason: 'Vi phạm điều khoản sử dụng nghiêm trọng', is_permanent: true },
            },
            temporary_bulk_ban: {
                summary: 'Khóa tạm thời nhiều users',
                description: 'Dùng khi cần khóa nhóm user trong 3 ngày',
                value: { user_ids: [USER_ID, USER_ID_2], reason: 'Spam liên tục trên hệ thống', is_permanent: false, duration_value: 3, duration_type: DurationType.DAYS },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Khóa nhiều users thành công',
        schema: buildCountSuccessSchema('user-management.bulk_ban', 'Khóa nhiều users thành công', 2),
    })
    @ApiResponse({ status: 400, description: 'Danh sách users rỗng hoặc dữ liệu khóa không hợp lệ', schema: noUsersSelectedSchema })
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
    @ApiOperation({
        summary: 'Mở khóa nhiều users cùng lúc',
        description:
            'Mở khóa hàng loạt nhiều tài khoản trong một lần gọi API. Có thể gửi ghi chú nội bộ cho đợt xử lý này. Endpoint yêu cầu quyền `user-management.unban`.',
    })
    @ApiBody({
        type: BulkUnbanUsersDto,
        description: 'Danh sách users cần mở khóa và ghi chú nội bộ',
        examples: {
            bulk_unban_review: {
                summary: 'Mở khóa sau đợt rà soát',
                description: 'Dùng khi admin duyệt mở khóa nhiều tài khoản cùng lúc',
                value: { user_ids: [USER_ID, USER_ID_2], note: 'Mở khóa sau khi hoàn tất rà soát vi phạm' },
            },
            bulk_unban_appeal: {
                summary: 'Mở khóa do chấp thuận khiếu nại',
                description: 'Dùng khi nhiều user khiếu nại thành công',
                value: { user_ids: [USER_ID, USER_ID_2], note: 'Chấp thuận khiếu nại và khôi phục truy cập' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Mở khóa nhiều users thành công',
        schema: buildCountSuccessSchema('user-management.bulk_unban', 'Mở khóa nhiều users thành công', 2),
    })
    @ApiResponse({ status: 400, description: 'Danh sách users rỗng hoặc dữ liệu không hợp lệ', schema: noUsersSelectedSchema })
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
    @ApiOperation({
        summary: 'Cảnh cáo nhiều users cùng lúc',
        description:
            'Tạo cảnh cáo hàng loạt cho nhiều user với cùng danh mục, cùng lý do và cùng thời hạn cảnh cáo. Endpoint yêu cầu quyền `user-management.warn`.',
    })
    @ApiBody({
        type: BulkWarnUsersDto,
        description: 'Danh sách users cần cảnh cáo và cấu hình cảnh cáo áp dụng đồng loạt',
        examples: {
            permanent_bulk_warn: {
                summary: 'Cảnh cáo vĩnh viễn nhiều users',
                description: 'Dùng khi nhiều tài khoản vi phạm cùng loại và cần lưu cảnh cáo lâu dài',
                value: { user_ids: [USER_ID, USER_ID_2], category_id: WARNING_CATEGORY_ID, reason: 'Vi phạm quy định cộng đồng', is_permanent: true },
            },
            temporary_bulk_warn: {
                summary: 'Cảnh cáo tạm thời nhiều users',
                description: 'Dùng khi cảnh cáo chỉ có hiệu lực trong 2 tuần',
                value: { user_ids: [USER_ID, USER_ID_2], category_id: WARNING_CATEGORY_ID, reason: 'Spam quảng cáo trong nhiều khu vực', is_permanent: false, duration_value: 2, duration_type: DurationType.WEEKS },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Cảnh cáo nhiều users thành công',
        schema: buildCountSuccessSchema('user-management.bulk_warn', 'Cảnh cáo nhiều users thành công', 2),
    })
    @ApiResponse({ status: 400, description: 'Danh sách users rỗng hoặc dữ liệu cảnh cáo không hợp lệ', schema: noUsersSelectedSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục cảnh cáo được chỉ định', schema: warningCategoryNotFoundSchema })
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
    @ApiOperation({
        summary: 'Xóa tất cả cảnh cáo của user',
        description:
            'Gỡ toàn bộ cảnh cáo đang có của một user và trả về số lượng cảnh cáo đã được xóa. Endpoint yêu cầu quyền `user-management.unwarn`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần xóa toàn bộ cảnh cáo', example: USER_ID })
    @ApiBody({
        type: ClearAllWarningsDto,
        description: 'Ghi chú nội bộ khi xóa toàn bộ cảnh cáo của user',
        examples: {
            clear_by_request: {
                summary: 'Xóa theo yêu cầu',
                description: 'Dùng khi admin chủ động xóa tất cả cảnh cáo cho user',
                value: { note: 'Xóa cảnh cáo theo yêu cầu nội bộ' },
            },
            clear_after_review: {
                summary: 'Xóa sau khi rà soát',
                description: 'Dùng khi toàn bộ cảnh cáo không còn phù hợp',
                value: { note: 'Đã rà soát và xóa toàn bộ cảnh cáo' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa tất cả cảnh cáo của user thành công',
        schema: buildCountSuccessSchema('user-management.clear_all_warnings', 'Xóa tất cả cảnh cáo của user thành công', 3),
    })
    @ApiResponse({
        status: 400,
        description: 'ID user không đúng định dạng hoặc không thể thao tác lên chính mình / user được bảo vệ',
        schema: buildErrorResponseSchema({
            code: 'user-management.clear_all_warnings_invalid',
            message: 'Không thể xóa tất cả cảnh cáo của user',
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần xóa cảnh cáo', schema: userNotFoundSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Xóa tất cả cảnh cáo của nhiều users',
        description:
            'Gỡ toàn bộ cảnh cáo của nhiều user trong một lần gọi API và trả về số lượng cảnh cáo đã xử lý. Endpoint yêu cầu quyền `user-management.unwarn`.',
    })
    @ApiBody({
        type: BulkClearAllWarningsDto,
        description: 'Danh sách users cần xóa toàn bộ cảnh cáo',
        examples: {
            clear_bulk: {
                summary: 'Xóa hàng loạt cảnh cáo',
                description: 'Dùng khi cần reset cảnh cáo cho nhiều user',
                value: { user_ids: [USER_ID, USER_ID_2], note: 'Xóa cảnh cáo hàng loạt sau đợt rà soát' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa tất cả cảnh cáo của nhiều users thành công',
        schema: buildCountSuccessSchema('user-management.bulk_clear_all_warnings', 'Xóa tất cả cảnh cáo của nhiều users thành công', 6),
    })
    @ApiResponse({ status: 400, description: 'Danh sách users rỗng hoặc dữ liệu không hợp lệ', schema: noUsersSelectedSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
        summary: 'Xóa một user',
        description:
            'Soft delete một user bằng cách đánh dấu trạng thái xóa trong hệ thống, không xóa vật lý khỏi cơ sở dữ liệu. Endpoint yêu cầu quyền `user-management.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần xóa', example: USER_ID })
    @ApiBody({
        type: DeleteUserDto,
        description: 'Lý do xóa user để phục vụ audit nội bộ',
        examples: {
            delete_violation: {
                summary: 'Xóa do vi phạm',
                description: 'Dùng khi user vi phạm nghiêm trọng và cần khóa vĩnh viễn bằng soft delete',
                value: { reason: 'Vi phạm nghiêm trọng quy định hệ thống' },
            },
            delete_cleanup: {
                summary: 'Xóa do dọn dẹp dữ liệu',
                description: 'Dùng khi tài khoản trùng lặp hoặc không hợp lệ',
                value: { reason: 'Tài khoản trùng lặp, cần dọn dẹp dữ liệu' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa user thành công',
        schema: buildCountSuccessSchema('user-management.delete_user', 'Xóa user thành công', 1),
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể xóa do ID không hợp lệ, thao tác lên chính mình hoặc user được bảo vệ',
        schema: buildErrorResponseSchema({
            code: 'user-management.delete_invalid',
            message: 'Không thể xóa user với dữ liệu hoặc trạng thái hiện tại',
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần xóa', schema: userNotFoundSchema })
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
    @ApiOperation({
        summary: 'Xóa nhiều users cùng lúc',
        description:
            'Soft delete nhiều users trong một lần gọi API. Hệ thống sẽ bỏ qua các user không thể thao tác và trả về số lượng user đã xử lý thành công. Endpoint yêu cầu quyền `user-management.delete`.',
    })
    @ApiBody({
        type: BulkDeleteUsersDto,
        description: 'Danh sách users cần xóa và lý do phục vụ audit nội bộ',
        examples: {
            delete_many_violation: {
                summary: 'Xóa nhiều users do vi phạm',
                description: 'Dùng khi cần xử lý hàng loạt tài khoản vi phạm',
                value: { user_ids: [USER_ID, USER_ID_2], reason: 'Vi phạm nghiêm trọng quy định cộng đồng' },
            },
            delete_many_cleanup: {
                summary: 'Xóa nhiều users do dọn dẹp',
                description: 'Dùng khi loại bỏ tài khoản test hoặc trùng lặp',
                value: { user_ids: [USER_ID, USER_ID_2], reason: 'Dọn dẹp tài khoản test và dữ liệu trùng' },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa nhiều users thành công',
        schema: buildCountSuccessSchema('user-management.bulk_delete_users', 'Xóa nhiều users thành công', 2),
    })
    @ApiResponse({ status: 400, description: 'Danh sách users rỗng hoặc không có user hợp lệ để xóa', schema: noUsersSelectedSchema })
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
    @ApiOperation({
        summary: 'Tải dữ liệu một user',
        description:
            'Export dữ liệu của một user cụ thể theo ID. Kết quả trả về gồm dữ liệu user và tên file gợi ý để tải xuống. Endpoint yêu cầu quyền `user-management.download`.',
    })
    @ApiParam({ name: 'id', description: 'ID của user cần tải dữ liệu', example: USER_ID })
    @ApiResponse({
        status: 200,
        description: 'Tải dữ liệu một user thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.download_user_data',
            message: 'Tải dữ liệu user thành công',
            dataSchema: singleExportResultSchema,
            dataExample: {
                data: exportUserDataExample,
                filename: 'user-550e8400-e29b-41d4-a716-446655440001-2026-03-13.json',
            },
        }),
    })
    @ApiResponse({ status: 400, description: 'ID user không đúng định dạng UUID', schema: invalidUuidSchema })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user cần tải dữ liệu', schema: userNotFoundSchema })
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
    @ApiOperation({
        summary: 'Tải dữ liệu nhiều users',
        description:
            'Export dữ liệu của nhiều user trong một lần gọi API dựa trên danh sách `user_ids`. Kết quả bao gồm dữ liệu export, tổng số user và tên file gợi ý. Endpoint yêu cầu quyền `user-management.download`.',
    })
    @ApiBody({
        type: BulkDownloadUsersDto,
        description: 'Danh sách users cần export dữ liệu',
        examples: {
            export_selected_users: {
                summary: 'Export nhiều users đã chọn',
                description: 'Dùng khi admin chọn nhiều user từ bảng danh sách để tải dữ liệu',
                value: { user_ids: [USER_ID, USER_ID_2] },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Tải dữ liệu nhiều users thành công',
        schema: buildSuccessResponseSchema({
            code: 'user-management.bulk_download_users_data',
            message: 'Tải dữ liệu nhiều users thành công',
            dataSchema: bulkExportResultSchema,
            dataExample: {
                data: [
                    exportUserDataExample,
                    {
                        ...exportUserDataExample,
                        id: USER_ID_2,
                        email: 'support@genhub.vn',
                        full_name: 'Trần Thị B',
                    },
                ],
                count: 2,
                filename: 'users-export-2026-03-13.json',
            },
        }),
    })
    @ApiResponse({ status: 400, description: 'Danh sách users rỗng hoặc không hợp lệ', schema: noUsersSelectedSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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



