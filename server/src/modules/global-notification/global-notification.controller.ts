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
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { GlobalNotificationService } from './global-notification.service';
import {
    CreateGlobalNotificationDto,
    UpdateGlobalNotificationDto,
    QueryGlobalNotificationDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
    RequirePermission,
    CurrentUser,
    ApiAuthResponses,
    ApiValidationErrorResponse,
} from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IGlobalNotification, IPaginatedResponse } from './interfaces';
import { buildErrorSchema, buildSuccessSchema } from '../../common/swagger/master-data-swagger.helper';

const ApiStandardResponse = (options: {
    status: number; description: string; codeExample: string; messageExample: string; dataSchema?: Record<string, any>; dataExample?: unknown;
}) => ApiResponse({
    status: options.status,
    description: options.description,
    schema: buildSuccessSchema({
        code: options.codeExample,
        message: options.messageExample,
        dataSchema: options.dataSchema ?? { type: 'null', nullable: true },
        dataExample: options.dataExample,
    }),
});

const ApiStandardErrorResponse = (options: {
    status: number; description: string; codeExample: string; messageExample: string;
}) => ApiResponse({
    status: options.status,
    description: options.description,
    schema: buildErrorSchema({
        code: options.codeExample,
        message: options.messageExample,
    }),
});

@ApiTags('Global Notifications')
@Controller('global-notifications')
export class GlobalNotificationController {
    constructor(private readonly service: GlobalNotificationService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('global-notification.create')
    @ApiOperation({
        summary: 'Tạo thông báo toàn cầu mới',
        description: 'Tạo một thông báo toàn cầu mới để hiển thị cho tất cả người dùng trong hệ thống. Có thể cấu hình loại thông báo, khoảng thời gian hiển thị và trạng thái hoạt động. Yêu cầu quyền `global-notification.create`.',
    })
    @ApiBody({
        type: CreateGlobalNotificationDto,
        description: 'Dữ liệu thông báo toàn cầu cần tạo.',
        examples: {
            maintenance: {
                summary: 'Thông báo bảo trì hệ thống',
                description: 'Thông báo cảnh báo có khung thời gian hiển thị cụ thể.',
                value: {
                    title: 'Thông báo bảo trì hệ thống',
                    content: 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày 15/02/2026.',
                    type: 'WARNING',
                    starts_at: '2026-02-15T02:00:00.000Z',
                    ends_at: '2026-02-15T04:00:00.000Z',
                    is_active: true,
                },
            },
            promotion: {
                summary: 'Thông báo ưu đãi',
                description: 'Thông báo hiển thị ngay sau khi tạo, không đặt thời gian kết thúc.',
                value: {
                    title: 'Ưu đãi đặc biệt tháng 3',
                    content: 'Giảm 20% phí thuê kho trong tháng 3. Sử dụng mã: SPRING2026.',
                    type: 'SUCCESS',
                    is_active: true,
                },
            },
        },
    })
    @ApiStandardResponse({
        status: 201,
        description: 'Tạo thông báo toàn cầu thành công.',
        codeExample: 'global-notification.create_success',
        messageExample: 'Tạo thông báo toàn cầu thành công',
        dataSchema: {
            type: 'object',
            description: 'Thông tin thông báo vừa được tạo.',
            properties: {
                id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' },
                title: { type: 'string', example: 'Thông báo bảo trì hệ thống' },
                content: { type: 'string', example: 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày 15/02/2026.' },
                type: { type: 'string', example: 'WARNING' },
                starts_at: { type: 'string', format: 'date-time', example: '2026-02-15T02:00:00.000Z' },
                ends_at: { type: 'string', format: 'date-time', example: '2026-02-15T04:00:00.000Z' },
                is_active: { type: 'boolean', example: true },
            },
        },
        dataExample: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Thông báo bảo trì hệ thống',
            content: 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày 15/02/2026.',
            type: 'WARNING',
            starts_at: '2026-02-15T02:00:00.000Z',
            ends_at: '2026-02-15T04:00:00.000Z',
            is_active: true,
        },
    })
    @ApiStandardErrorResponse({
        status: 409,
        description: 'Dữ liệu tạo mới bị xung đột hoặc khung thời gian hiển thị không hợp lệ.',
        codeExample: 'error.global_notification.conflict',
        messageExample: 'Khung thời gian hiển thị bị xung đột với thông báo khác',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(
        @Body() dto: CreateGlobalNotificationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IGlobalNotification>> {
        const result = await this.service.create(dto, userId, lang);
        return new CreatedResponse(ResponseCode.GLOBAL_NOTIFICATION_CREATE_SUCCESS, result);
    }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách thông báo toàn cầu (public)',
        description: 'Trả về danh sách thông báo toàn cầu có hỗ trợ phân trang, tìm kiếm theo từ khóa và lọc theo trạng thái hoạt động hoặc loại thông báo. API public, không yêu cầu đăng nhập.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi tối đa trong một lần lấy.', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu để phân trang.', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo tiêu đề hoặc nội dung thông báo.', example: 'bảo trì' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái đang hoạt động.', example: true })
    @ApiQuery({ name: 'type', required: false, enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'], description: 'Lọc theo loại thông báo.', example: 'WARNING' })
    @ApiStandardResponse({
        status: 200,
        description: 'Lấy danh sách thông báo toàn cầu thành công.',
        codeExample: 'global-notification.list_success',
        messageExample: 'Lấy danh sách thông báo toàn cầu thành công',
        dataSchema: {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            title: { type: 'string' },
                            type: { type: 'string' },
                            is_active: { type: 'boolean' },
                        },
                    },
                },
                total: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                offset: { type: 'number', example: 0 },
            },
        },
        dataExample: {
            items: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    title: 'Thông báo bảo trì hệ thống',
                    type: 'WARNING',
                    is_active: true,
                },
            ],
            total: 1,
            limit: 10,
            offset: 0,
        },
    })
    async findMany(
        @Query() query: QueryGlobalNotificationDto,
    ): Promise<GetResponse<IPaginatedResponse<IGlobalNotification>>> {
        const result = await this.service.findMany(query);
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get('active')
    @ApiOperation({
        summary: 'Lấy danh sách thông báo đang active (public)',
        description: 'Trả về các thông báo đang còn hiệu lực hiển thị ở thời điểm hiện tại. API public, không yêu cầu đăng nhập.',
    })
    @ApiStandardResponse({
        status: 200,
        description: 'Lấy danh sách thông báo đang active thành công.',
        codeExample: 'global-notification.active_list_success',
        messageExample: 'Lấy danh sách thông báo đang active thành công',
        dataSchema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    type: { type: 'string' },
                },
            },
        },
        dataExample: [
            {
                id: '550e8400-e29b-41d4-a716-446655440001',
                title: 'Thông báo bảo trì hệ thống',
                content: 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày 15/02/2026.',
                type: 'WARNING',
            },
        ],
    })
    async getActiveNotifications(): Promise<GetResponse<IGlobalNotification[]>> {
        const result = await this.service.getActiveNotifications();
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy chi tiết thông báo toàn cầu (public)',
        description: 'Trả về đầy đủ thông tin chi tiết của một thông báo toàn cầu theo ID. API public, không yêu cầu đăng nhập.',
    })
    @ApiParam({ name: 'id', description: 'ID thông báo cần xem chi tiết.', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiStandardResponse({
        status: 200,
        description: 'Lấy chi tiết thông báo toàn cầu thành công.',
        codeExample: 'global-notification.get_success',
        messageExample: 'Lấy chi tiết thông báo toàn cầu thành công',
        dataSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                content: { type: 'string' },
                type: { type: 'string' },
                starts_at: { type: 'string', format: 'date-time' },
                ends_at: { type: 'string', format: 'date-time' },
                is_active: { type: 'boolean' },
            },
        },
        dataExample: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Thông báo bảo trì hệ thống',
            content: 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00 ngày 15/02/2026.',
            type: 'WARNING',
            starts_at: '2026-02-15T02:00:00.000Z',
            ends_at: '2026-02-15T04:00:00.000Z',
            is_active: true,
        },
    })
    @ApiStandardErrorResponse({
        status: 404,
        description: 'Không tìm thấy thông báo theo ID được cung cấp.',
        codeExample: 'error.global_notification.not_found',
        messageExample: 'Không tìm thấy thông báo toàn cầu',
    })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IGlobalNotification>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_GET_SUCCESS, result);
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('global-notification.update')
    @ApiOperation({
        summary: 'Cập nhật thông báo toàn cầu',
        description: 'Cập nhật một phần hoặc toàn bộ nội dung thông báo, loại thông báo, thời gian hiển thị và trạng thái hoạt động. Chỉ các trường được gửi trong request body mới được thay đổi. Yêu cầu quyền `global-notification.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID thông báo cần cập nhật.', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiBody({
        type: UpdateGlobalNotificationDto,
        description: 'Dữ liệu cập nhật cho thông báo toàn cầu.',
        examples: {
            update_content: {
                summary: 'Cập nhật tiêu đề và nội dung',
                description: 'Điều chỉnh nội dung thông báo sau khi thay đổi kế hoạch.',
                value: {
                    title: 'Cập nhật lịch bảo trì',
                    content: 'Lịch bảo trì được dời sang 03:00 ngày 16/02/2026.',
                    type: 'INFO',
                },
            },
            deactivate: {
                summary: 'Ngừng hiển thị thông báo',
                description: 'Ẩn thông báo mà không xóa bản ghi.',
                value: {
                    is_active: false,
                    ends_at: '2026-02-16T03:00:00.000Z',
                },
            },
        },
    })
    @ApiStandardResponse({
        status: 200,
        description: 'Cập nhật thông báo toàn cầu thành công.',
        codeExample: 'global-notification.update_success',
        messageExample: 'Cập nhật thông báo toàn cầu thành công',
        dataSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                content: { type: 'string' },
                type: { type: 'string' },
                is_active: { type: 'boolean' },
            },
        },
        dataExample: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Cập nhật lịch bảo trì',
            content: 'Lịch bảo trì được dời sang 03:00 ngày 16/02/2026.',
            type: 'INFO',
            is_active: true,
        },
    })
    @ApiStandardErrorResponse({
        status: 404,
        description: 'Không tìm thấy thông báo cần cập nhật.',
        codeExample: 'error.global_notification.not_found',
        messageExample: 'Không tìm thấy thông báo toàn cầu',
    })
    @ApiStandardErrorResponse({
        status: 409,
        description: 'Thông tin cập nhật gây xung đột trạng thái hoặc khung thời gian hiển thị.',
        codeExample: 'error.global_notification.conflict',
        messageExample: 'Thông tin cập nhật bị xung đột với dữ liệu hiện tại',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateGlobalNotificationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IGlobalNotification>> {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.GLOBAL_NOTIFICATION_UPDATE_SUCCESS, result);
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('global-notification.delete')
    @ApiOperation({
        summary: 'Xóa nhiều thông báo toàn cầu',
        description: 'Xóa nhiều thông báo trong một request bằng danh sách ID. Yêu cầu quyền `global-notification.delete`.',
    })
    @ApiBody({
        type: DeleteManyDto,
        description: 'Danh sách ID thông báo cần xóa.',
        examples: {
            batch_delete: {
                summary: 'Xóa nhiều thông báo',
                value: {
                    ids: [
                        '550e8400-e29b-41d4-a716-446655440001',
                        '550e8400-e29b-41d4-a716-446655440002',
                    ],
                },
            },
        },
    })
    @ApiStandardResponse({
        status: 200,
        description: 'Xóa nhiều thông báo toàn cầu thành công.',
        codeExample: 'global-notification.delete_success',
        messageExample: 'Xóa nhiều thông báo toàn cầu thành công',
    })
    @ApiStandardErrorResponse({
        status: 404,
        description: 'Ít nhất một thông báo trong danh sách không tồn tại.',
        codeExample: 'error.global_notification.not_found',
        messageExample: 'Không tìm thấy một hoặc nhiều thông báo cần xóa',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse(ResponseCode.GLOBAL_NOTIFICATION_DELETE_SUCCESS, null);
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('global-notification.delete')
    @ApiOperation({
        summary: 'Xóa thông báo toàn cầu',
        description: 'Xóa một thông báo toàn cầu theo ID. Yêu cầu quyền `global-notification.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID thông báo cần xóa.', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiStandardResponse({
        status: 200,
        description: 'Xóa thông báo toàn cầu thành công.',
        codeExample: 'global-notification.delete_success',
        messageExample: 'Xóa thông báo toàn cầu thành công',
    })
    @ApiStandardErrorResponse({
        status: 404,
        description: 'Không tìm thấy thông báo cần xóa.',
        codeExample: 'error.global_notification.not_found',
        messageExample: 'Không tìm thấy thông báo toàn cầu',
    })
    @ApiAuthResponses()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse(ResponseCode.GLOBAL_NOTIFICATION_DELETE_SUCCESS, null);
    }
}
