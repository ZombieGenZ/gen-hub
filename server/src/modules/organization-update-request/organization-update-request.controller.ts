import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationUpdateRequestService } from './organization-update-request.service';
import { QueryOrganizationUpdateRequestDto, RejectOrganizationUpdateRequestDto } from './dto';
import { CurrentUser, RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import { I18nLang } from 'nestjs-i18n';
import { OkResponse, GetResponse, ResponseCode } from '../../common/responses';

@ApiTags('Organization Update Requests')
@ApiBearerAuth()
@Controller('organization-update-requests')
@UseGuards(PermissionGuard)
export class OrganizationUpdateRequestController {
    constructor(private readonly service: OrganizationUpdateRequestService) { }



    @Get()
    @RequirePermission('organization.update_request.list')
    @ApiOperation({ summary: 'Lấy danh sách yêu cầu cập nhật tổ chức' })
    async findAll(@Query() query: QueryOrganizationUpdateRequestDto) {
        const data = await this.service.findAll(query);
        return new GetResponse(ResponseCode.ORGANIZATION_UPDATE_REQUEST_LIST_SUCCESS, data);
    }

    @Get(':id')
    @RequirePermission('organization.update_request.read')
    @ApiOperation({ summary: 'Lấy chi tiết yêu cầu cập nhật tổ chức' })
    async findOne(@Param('id') id: string, @I18nLang() lang: string) {
        const data = await this.service.findOne(id, lang);
        return new OkResponse(ResponseCode.ORGANIZATION_UPDATE_REQUEST_GET_SUCCESS, data);
    }

    @Patch(':id/approve')
    @RequirePermission('organization.update_request.approve')
    @ApiOperation({ summary: 'Duyệt yêu cầu cập nhật thông tin tổ chức' })
    async approve(@Param('id') id: string, @CurrentUser('userId') userId: string, @I18nLang() lang: string) {
        const data = await this.service.approve(id, userId, lang);
        return new OkResponse(ResponseCode.ORGANIZATION_UPDATE_REQUEST_APPROVE_SUCCESS, data);
    }

    @Patch(':id/reject')
    @RequirePermission('organization.update_request.reject')
    @ApiOperation({ summary: 'Từ chối yêu cầu cập nhật thông tin tổ chức' })
    async reject(
        @Param('id') id: string,
        @CurrentUser('userId') userId: string,
        @Body() dto: RejectOrganizationUpdateRequestDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.reject(id, userId, dto, lang);
        return new OkResponse(ResponseCode.ORGANIZATION_UPDATE_REQUEST_REJECT_SUCCESS, data);
    }
}
