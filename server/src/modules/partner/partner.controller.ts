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
    ApiHeader,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { PartnerService } from './partner.service';
import {
    CreatePartnerDto,
    UpdatePartnerDto,
    QueryPartnerDto,
} from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentActor, RequireOrgPermission } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IPartner, IPaginatedResponse } from './interfaces';

@ApiTags('Partners')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('organizations/:orgId/partners')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class PartnerController {
    constructor(private readonly service: PartnerService) { }

    @Post()
    @RequireOrgPermission('partner.create')
    @ApiOperation({ summary: 'Tạo đối tác mới' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
    @ApiResponse({ status: 409, description: 'Mã đối tác đã tồn tại' })
    async create(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreatePartnerDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IPartner>> {
        const result = await this.service.create(orgId, dto, actorId, lang);
        return new CreatedResponse(ResponseCode.PARTNER_CREATE_SUCCESS, result);
    }

    @Get()
    @RequireOrgPermission('partner.list')
    @ApiOperation({ summary: 'Lấy danh sách đối tác' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryPartnerDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IPartner>>> {
        const result = await this.service.findMany(orgId, query, lang);
        return new GetResponse(ResponseCode.PARTNER_LIST_SUCCESS, result);
    }

    @Get(':id')
    @RequireOrgPermission('partner.read')
    @ApiOperation({ summary: 'Lấy chi tiết đối tác' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của đối tác' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đối tác' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPartner>> {
        const result = await this.service.findById(orgId, id, lang);
        return new GetResponse(ResponseCode.PARTNER_GET_SUCCESS, result);
    }

    @Put(':id')
    @RequireOrgPermission('partner.update')
    @ApiOperation({ summary: 'Cập nhật đối tác' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của đối tác' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đối tác' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePartnerDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IPartner>> {
        const result = await this.service.update(orgId, id, dto, actorId, lang);
        return new UpdatedResponse(ResponseCode.PARTNER_UPDATE_SUCCESS, result);
    }

    @Delete(':id')
    @RequireOrgPermission('partner.delete')
    @ApiOperation({ summary: 'Xóa đối tác' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của đối tác' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đối tác' })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(orgId, id, actorId, lang);
        return new DeletedResponse(ResponseCode.PARTNER_DELETE_SUCCESS, null);
    }
}
