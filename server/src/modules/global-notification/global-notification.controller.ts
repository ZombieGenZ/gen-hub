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
import { RequirePermission, CurrentUser } from '../../common/decorators';
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
    @ApiOperation({ summary: 'Tạo thông báo toàn cầu mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateGlobalNotificationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IGlobalNotification>> {
        const result = await this.service.create(dto, userId, lang);
        return new CreatedResponse(ResponseCode.GLOBAL_NOTIFICATION_CREATE_SUCCESS, result);
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách thông báo toàn cầu (public)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryGlobalNotificationDto,
    ): Promise<GetResponse<IPaginatedResponse<IGlobalNotification>>> {
        const result = await this.service.findMany(query);
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get('active')
    @ApiOperation({ summary: 'Lấy danh sách thông báo đang active (public)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async getActiveNotifications(): Promise<GetResponse<IGlobalNotification[]>> {
        const result = await this.service.getActiveNotifications();
        return new GetResponse(ResponseCode.GLOBAL_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết thông báo toàn cầu (public)' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
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
    @ApiOperation({ summary: 'Cập nhật thông báo toàn cầu' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateGlobalNotificationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IGlobalNotification>> {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.GLOBAL_NOTIFICATION_UPDATE_SUCCESS, result);
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('global-notification.delete')
    @ApiOperation({ summary: 'Xóa thông báo toàn cầu' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse(ResponseCode.GLOBAL_NOTIFICATION_DELETE_SUCCESS, null);
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('global-notification.delete')
    @ApiOperation({ summary: 'Xóa nhiều thông báo toàn cầu' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse(ResponseCode.GLOBAL_NOTIFICATION_DELETE_SUCCESS, null);
    }
}
