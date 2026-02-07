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
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
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
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IGlobalNotification, IPaginatedResponse } from './interfaces';

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
        description: 'Tạo một thông báo toàn cầu mới hiển thị cho tất cả users. Có thể đặt lịch hiển thị, mức độ ưu tiên và thời gian hết hạn. Yêu cầu quyền `global-notification.create`.',
    })
    @ApiBody({
        type: CreateGlobalNotificationDto,
        examples: {
            maintenance: {
                summary: 'Thông báo bảo trì',
                value: {
                    title: 'Thông báo bảo trì hệ thống',
                    content: 'Hệ thống sẽ bảo trì từ 2:00 AM - 4:00 AM ngày 15/02/2026',
                    type: 'MAINTENANCE',
                    priority: 'HIGH',
                    start_at: '2026-02-15T00:00:00.000Z',
                    end_at: '2026-02-15T04:00:00.000Z',
                },
            },
            promotion: {
                summary: 'Thông báo khuyến mãi',
                value: {
                    title: 'Ưu đãi đặc biệt',
                    content: 'Giảm 20% phí thuê kho trong tháng 3. Sử dụng mã: SPRING2026',
                    type: 'PROMOTION',
                    priority: 'MEDIUM',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo thông báo thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string' },
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
            },
        },
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
        description: 'Lấy danh sách tất cả thông báo toàn cầu với phân trang. API public không cần đăng nhập.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'type', required: false, type: String, description: 'Lọc theo loại' })
    @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
    async findMany(
        @Query() query: QueryGlobalNotificationDto,
    ): Promise<GetResponse<IPaginatedResponse<IGlobalNotification>>> {
        const result = await this.service.findMany(query);
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get('active')
    @ApiOperation({
        summary: 'Lấy danh sách thông báo đang active (public)',
        description: 'Lấy danh sách thông báo đang trong thời gian hiển thị. API public không cần đăng nhập.',
    })
    @ApiResponse({ status: 200, description: 'Danh sách thông báo active' })
    async getActiveNotifications(): Promise<GetResponse<IGlobalNotification[]>> {
        const result = await this.service.getActiveNotifications();
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy chi tiết thông báo toàn cầu (public)',
        description: 'Lấy thông tin chi tiết của một thông báo. API public không cần đăng nhập.',
    })
    @ApiParam({ name: 'id', description: 'ID thông báo (UUID)', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({ status: 200, description: 'Chi tiết thông báo' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
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
        description: 'Cập nhật nội dung, thời gian hiển thị của thông báo. Yêu cầu quyền `global-notification.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID thông báo (UUID)' })
    @ApiBody({ type: UpdateGlobalNotificationDto })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
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
        description: 'Xóa nhiều thông báo cùng lúc. Yêu cầu quyền `global-notification.delete`.',
    })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
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
        description: 'Xóa một thông báo. Yêu cầu quyền `global-notification.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID thông báo (UUID)' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
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
