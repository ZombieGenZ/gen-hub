import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Query,
    Body,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { UserNotificationService } from './user-notification.service';
import { SendUserNotificationDto, QueryUserNotificationDto, SendBulkUserNotificationDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    ApiAuthResponses,
    ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    ResponseCode,
} from '../../common/responses';
import { IUserNotification, IPaginatedResponse } from './interfaces';

@ApiTags('User Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('user-notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationController {
    constructor(private readonly service: UserNotificationService) { }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách thông báo của user hiện tại',
        description: 'Lấy danh sách thông báo của user đang đăng nhập với hỗ trợ phân trang và lọc. Có thể lọc theo trạng thái đã đọc và loại thông báo.',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Số lượng bản ghi tối đa trả về (mặc định: 10)',
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        description: 'Vị trí bắt đầu lấy dữ liệu (mặc định: 0)',
        type: Number,
        example: 0,
    })
    @ApiQuery({
        name: 'keywords',
        required: false,
        description: 'Từ khóa tìm kiếm (tiêu đề, nội dung)',
        type: String,
        example: 'hợp đồng',
    })
    @ApiQuery({
        name: 'is_read',
        required: false,
        description: 'Lọc theo trạng thái đã đọc',
        type: Boolean,
        example: false,
    })
    @ApiQuery({
        name: 'type',
        required: false,
        description: 'Lọc theo loại thông báo',
        enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'],
        example: 'INFO',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thông báo thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.list_success' },
                message: { type: 'string', example: 'Lấy danh sách thông báo thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    user_id: { type: 'string', format: 'uuid' },
                                    title: { type: 'string', example: 'Hợp đồng sắp hết hạn' },
                                    content: { type: 'string', example: 'Hợp đồng RC-2026020001 sẽ hết hạn vào ngày 01/03/2026' },
                                    type: { type: 'string', enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'], example: 'WARNING' },
                                    is_read: { type: 'boolean', example: false },
                                    read_at: { type: 'string', format: 'date-time', nullable: true },
                                    created_at: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        total: { type: 'number', example: 25 },
                        limit: { type: 'number', example: 10 },
                        offset: { type: 'number', example: 0 },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async getMyNotifications(
        @CurrentUser('userId') userId: string,
        @Query() query: QueryUserNotificationDto,
    ): Promise<GetResponse<IPaginatedResponse<IUserNotification>>> {
        const result = await this.service.getMyNotifications(userId, query);
        return new GetResponse(ResponseCode.USER_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get('unread-count')
    @ApiOperation({
        summary: 'Đếm số thông báo chưa đọc',
        description: 'Trả về số lượng thông báo chưa đọc của user hiện tại. Thường dùng để hiển thị badge trên icon thông báo.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy số lượng thông báo chưa đọc thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.get_success' },
                message: { type: 'string', example: 'Lấy thông tin thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', example: 5, description: 'Số thông báo chưa đọc' },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async countUnread(
        @CurrentUser('userId') userId: string,
    ): Promise<GetResponse<{ count: number }>> {
        const count = await this.service.countUnread(userId);
        return new GetResponse(ResponseCode.USER_NOTIFICATION_GET_SUCCESS, { count });
    }

    @Get('user/:userId')
    @UseGuards(PermissionGuard)
    @RequirePermission('user-notification.list.all')
    @ApiOperation({
        summary: 'Lấy danh sách thông báo của user bất kỳ (Admin)',
        description: 'Admin lấy danh sách thông báo của một user cụ thể theo ID. Yêu cầu quyền `user-notification.list.all`.',
    })
    @ApiParam({
        name: 'userId',
        description: 'ID của user cần xem thông báo (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Số lượng bản ghi tối đa trả về',
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        description: 'Vị trí bắt đầu lấy dữ liệu',
        type: Number,
        example: 0,
    })
    @ApiQuery({
        name: 'is_read',
        required: false,
        description: 'Lọc theo trạng thái đã đọc',
        type: Boolean,
    })
    @ApiQuery({
        name: 'type',
        required: false,
        description: 'Lọc theo loại thông báo',
        enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'],
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thông báo thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.list_success' },
                message: { type: 'string', example: 'Lấy danh sách thông báo thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    description: 'Cấu trúc giống response của GET /user-notifications',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy user',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.user_not_found' },
                message: { type: 'string', example: 'Không tìm thấy người dùng' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiAuthResponses()
    async getNotificationsByUserId(
        @Param('userId', ParseUUIDPipe) targetUserId: string,
        @Query() query: QueryUserNotificationDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IUserNotification>>> {
        const result = await this.service.getNotificationsByUserId(targetUserId, query, lang);
        return new GetResponse(ResponseCode.USER_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Post('send')
    @UseGuards(PermissionGuard)
    @RequirePermission('user-notification.send')
    @ApiOperation({
        summary: 'Gửi thông báo cho user (Admin)',
        description: 'Admin gửi thông báo cho một user cụ thể. Thông báo sẽ hiển thị trong danh sách thông báo của user và có thể gửi push notification nếu user đã cấu hình. Yêu cầu quyền `user-notification.send`.',
    })
    @ApiBody({
        type: SendUserNotificationDto,
        description: 'Thông tin thông báo cần gửi',
        examples: {
            info_notification: {
                summary: 'Thông báo thông tin',
                description: 'Gửi thông báo loại INFO',
                value: {
                    user_id: '550e8400-e29b-41d4-a716-446655440001',
                    title: 'Thông báo từ hệ thống',
                    content: 'Hệ thống sẽ bảo trì vào lúc 22:00 ngày 01/02/2026. Vui lòng lưu lại công việc trước thời điểm này.',
                    type: 'INFO',
                },
            },
            warning_notification: {
                summary: 'Thông báo cảnh báo',
                description: 'Gửi thông báo loại WARNING',
                value: {
                    user_id: '550e8400-e29b-41d4-a716-446655440001',
                    title: 'Hợp đồng sắp hết hạn',
                    content: 'Hợp đồng RC-2026020001 của bạn sẽ hết hạn vào ngày 01/03/2026. Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.',
                    type: 'WARNING',
                },
            },
            success_notification: {
                summary: 'Thông báo thành công',
                description: 'Gửi thông báo loại SUCCESS',
                value: {
                    user_id: '550e8400-e29b-41d4-a716-446655440001',
                    title: 'Thanh toán thành công',
                    content: 'Bạn đã thanh toán thành công đơn hàng #12345. Cảm ơn bạn đã sử dụng dịch vụ.',
                    type: 'SUCCESS',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Gửi thông báo thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.send_success' },
                message: { type: 'string', example: 'Gửi thông báo thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        type: { type: 'string', enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'] },
                        is_read: { type: 'boolean', example: false },
                        read_at: { type: 'null' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy user',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.user_not_found' },
                message: { type: 'string', example: 'Không tìm thấy người dùng' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async sendNotification(
        @Body() dto: SendUserNotificationDto,
        @CurrentUser('userId') senderId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IUserNotification>> {
        const result = await this.service.sendNotification(dto, senderId, lang);
        return new CreatedResponse(ResponseCode.USER_NOTIFICATION_SEND_SUCCESS, result);
    }

    @Put(':id/read')
    @ApiOperation({
        summary: 'Đánh dấu thông báo đã đọc',
        description: 'Đánh dấu một thông báo cụ thể là đã đọc. User chỉ có thể đánh dấu thông báo của chính mình.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID của thông báo (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiResponse({
        status: 200,
        description: 'Đánh dấu thông báo đã đọc thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.mark_read_success' },
                message: { type: 'string', example: 'Đánh dấu đã đọc thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        is_read: { type: 'boolean', example: true },
                        read_at: { type: 'string', format: 'date-time', example: '2026-02-01T09:30:00.000Z' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Không có quyền đánh dấu thông báo này',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.no_permission' },
                message: { type: 'string', example: 'Bạn không có quyền thực hiện thao tác này' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy thông báo',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.not_found' },
                message: { type: 'string', example: 'Không tìm thấy thông báo' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiAuthResponses()
    async markAsRead(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IUserNotification>> {
        const result = await this.service.markAsRead(id, userId, lang);
        return new UpdatedResponse(ResponseCode.USER_NOTIFICATION_MARK_READ_SUCCESS, result);
    }

    @Put('read-all')
    @ApiOperation({
        summary: 'Đánh dấu tất cả thông báo đã đọc',
        description: 'Đánh dấu tất cả thông báo chưa đọc của user hiện tại thành đã đọc. Trả về số lượng thông báo đã được cập nhật.',
    })
    @ApiResponse({
        status: 200,
        description: 'Đánh dấu tất cả thông báo đã đọc thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.mark_all_read_success' },
                message: { type: 'string', example: 'Đánh dấu tất cả đã đọc thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', example: 5, description: 'Số thông báo đã được đánh dấu' },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    async markAllAsRead(
        @CurrentUser('userId') userId: string,
    ): Promise<UpdatedResponse<{ count: number }>> {
        const result = await this.service.markAllAsRead(userId);
        return new UpdatedResponse(ResponseCode.USER_NOTIFICATION_MARK_ALL_READ_SUCCESS, result);
    }

    @Post('send-bulk')
    @UseGuards(PermissionGuard)
    @RequirePermission('user-notification.send.bulk')
    @ApiOperation({
        summary: 'Gửi thông báo cho nhiều users (Admin)',
        description: 'Admin gửi thông báo hàng loạt cho nhiều users cùng lúc. Tất cả users sẽ nhận được cùng một nội dung thông báo. Yêu cầu quyền `user-notification.send.bulk`.',
    })
    @ApiBody({
        type: SendBulkUserNotificationDto,
        description: 'Thông tin thông báo và danh sách users nhận',
        examples: {
            bulk_info: {
                summary: 'Gửi thông báo cho nhiều users',
                description: 'Gửi thông báo bảo trì hệ thống cho tất cả users được chọn',
                value: {
                    user_ids: [
                        '550e8400-e29b-41d4-a716-446655440001',
                        '550e8400-e29b-41d4-a716-446655440002',
                        '550e8400-e29b-41d4-a716-446655440003',
                    ],
                    title: 'Thông báo bảo trì hệ thống',
                    content: 'Hệ thống sẽ bảo trì vào lúc 22:00 ngày 01/02/2026. Thời gian bảo trì dự kiến 2 giờ.',
                    type: 'WARNING',
                },
            },
            bulk_promotion: {
                summary: 'Thông báo khuyến mãi',
                description: 'Gửi thông báo khuyến mãi cho nhóm khách hàng VIP',
                value: {
                    user_ids: [
                        '550e8400-e29b-41d4-a716-446655440001',
                        '550e8400-e29b-41d4-a716-446655440002',
                    ],
                    title: 'Ưu đãi đặc biệt dành cho bạn',
                    content: 'Giảm 20% phí thuê kho cho hợp đồng mới trong tháng 2/2026. Áp dụng mã: VIP2026',
                    type: 'SUCCESS',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Gửi thông báo hàng loạt thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.send_success' },
                message: { type: 'string', example: 'Gửi thông báo thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', example: 3, description: 'Số thông báo đã gửi thành công' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Một số user không tồn tại',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'user-notification.some_users_not_found' },
                message: { type: 'string', example: 'Một số người dùng không tồn tại' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async sendBulkNotification(
        @Body() dto: SendBulkUserNotificationDto,
        @CurrentUser('userId') senderId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<{ count: number }>> {
        const result = await this.service.sendBulkNotification(dto, senderId, lang);
        return new CreatedResponse(ResponseCode.USER_NOTIFICATION_SEND_SUCCESS, result);
    }
}
