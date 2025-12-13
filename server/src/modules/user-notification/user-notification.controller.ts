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
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { UserNotificationService } from './user-notification.service';
import { SendUserNotificationDto, QueryUserNotificationDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
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
    @ApiOperation({ summary: 'Lấy danh sách thông báo của user hiện tại' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async getMyNotifications(
        @CurrentUser('userId') userId: string,
        @Query() query: QueryUserNotificationDto,
    ): Promise<GetResponse<IPaginatedResponse<IUserNotification>>> {
        const result = await this.service.getMyNotifications(userId, query);
        return new GetResponse(ResponseCode.USER_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Đếm số thông báo chưa đọc' })
    @ApiResponse({ status: 200, description: 'Lấy số lượng thành công' })
    async countUnread(
        @CurrentUser('userId') userId: string,
    ): Promise<GetResponse<{ count: number }>> {
        const count = await this.service.countUnread(userId);
        return new GetResponse(ResponseCode.USER_NOTIFICATION_GET_SUCCESS, { count });
    }

    @Get('user/:userId')
    @UseGuards(PermissionGuard)
    @RequirePermission('user-notification.list.all')
    @ApiOperation({ summary: 'Lấy danh sách thông báo của user bất kỳ (Admin)' })
    @ApiParam({ name: 'userId', description: 'ID của user', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
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
    @ApiOperation({ summary: 'Gửi thông báo cho user (Admin)' })
    @ApiResponse({ status: 201, description: 'Gửi thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
    async sendNotification(
        @Body() dto: SendUserNotificationDto,
        @CurrentUser('userId') senderId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IUserNotification>> {
        const result = await this.service.sendNotification(dto, senderId, lang);
        return new CreatedResponse(ResponseCode.USER_NOTIFICATION_SEND_SUCCESS, result);
    }

    @Put(':id/read')
    @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Đánh dấu thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async markAsRead(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IUserNotification>> {
        const result = await this.service.markAsRead(id, userId, lang);
        return new UpdatedResponse(ResponseCode.USER_NOTIFICATION_MARK_READ_SUCCESS, result);
    }

    @Put('read-all')
    @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
    @ApiResponse({ status: 200, description: 'Đánh dấu thành công' })
    async markAllAsRead(
        @CurrentUser('userId') userId: string,
    ): Promise<UpdatedResponse<{ count: number }>> {
        const result = await this.service.markAllAsRead(userId);
        return new UpdatedResponse(ResponseCode.USER_NOTIFICATION_MARK_ALL_READ_SUCCESS, result);
    }
}
