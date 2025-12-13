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
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { OrgNotificationService } from './org-notification.service';
import {
    CreateOrgNotificationDto,
    UpdateOrgNotificationDto,
    QueryOrgNotificationDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, RequireOrgPermission } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IOrgNotification, IPaginatedResponse } from './interfaces';

@ApiTags('Organization Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/notifications')
@UseGuards(JwtAuthGuard)
export class OrgNotificationController {
    constructor(private readonly service: OrgNotificationService) { }

    @Post()
    @RequireOrgPermission('organization.notification.create')
    @ApiOperation({ summary: 'Tạo thông báo tổ chức mới' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
    async create(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreateOrgNotificationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IOrgNotification>> {
        const result = await this.service.create(orgId, dto, userId, lang);
        return new CreatedResponse(ResponseCode.ORG_NOTIFICATION_CREATE_SUCCESS, result);
    }

    @Get()
    @RequireOrgPermission('organization.notification.list')
    @ApiOperation({ summary: 'Lấy danh sách thông báo tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryOrgNotificationDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IOrgNotification>>> {
        const result = await this.service.findMany(orgId, query, lang);
        return new GetResponse(ResponseCode.ORG_NOTIFICATION_LIST_SUCCESS, result);
    }

    @Get(':id')
    @RequireOrgPermission('organization.notification.read')
    @ApiOperation({ summary: 'Lấy chi tiết thông báo tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IOrgNotification>> {
        const result = await this.service.findById(orgId, id, lang);
        return new GetResponse(ResponseCode.ORG_NOTIFICATION_GET_SUCCESS, result);
    }

    @Put(':id')
    @RequireOrgPermission('organization.notification.update')
    @ApiOperation({ summary: 'Cập nhật thông báo tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrgNotificationDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IOrgNotification>> {
        const result = await this.service.update(orgId, id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.ORG_NOTIFICATION_UPDATE_SUCCESS, result);
    }

    @Delete(':id')
    @RequireOrgPermission('organization.notification.delete')
    @ApiOperation({ summary: 'Xóa thông báo tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của thông báo', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(orgId, id, userId, lang);
        return new DeletedResponse(ResponseCode.ORG_NOTIFICATION_DELETE_SUCCESS, null);
    }
}
