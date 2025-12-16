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

import { BatchService } from './batch.service';
import { CreateBatchDto, UpdateBatchDto, QueryBatchDto } from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentActor, RequireOrgPermission } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IBatch, IPaginatedResponse } from './interfaces';

@ApiTags('Batches')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('organizations/:orgId')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class BatchController {
    constructor(private readonly service: BatchService) { }

    @Post('batches')
    @RequireOrgPermission('batch.create')
    @ApiOperation({ summary: 'Tạo lô hàng mới' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
    @ApiResponse({ status: 409, description: 'Mã lô đã tồn tại' })
    async create(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreateBatchDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IBatch>> {
        const result = await this.service.create(orgId, dto, actorId, lang);
        return new CreatedResponse(ResponseCode.BATCH_CREATE_SUCCESS, result);
    }

    @Get('products/:productId/batches')
    @RequireOrgPermission('batch.list')
    @ApiOperation({ summary: 'Lấy danh sách lô hàng theo sản phẩm' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'productId', description: 'ID của sản phẩm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findByProductId(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('productId', ParseUUIDPipe) productId: string,
        @Query() query: QueryBatchDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IBatch>>> {
        const result = await this.service.findByProductId(orgId, productId, query, lang);
        return new GetResponse(ResponseCode.BATCH_LIST_SUCCESS, result);
    }

    @Get('batches/:id')
    @RequireOrgPermission('batch.read')
    @ApiOperation({ summary: 'Lấy chi tiết lô hàng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của lô hàng' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy lô hàng' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IBatch>> {
        const result = await this.service.findById(orgId, id, lang);
        return new GetResponse(ResponseCode.BATCH_GET_SUCCESS, result);
    }

    @Put('batches/:id')
    @RequireOrgPermission('batch.update')
    @ApiOperation({ summary: 'Cập nhật lô hàng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của lô hàng' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy lô hàng' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateBatchDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IBatch>> {
        const result = await this.service.update(orgId, id, dto, actorId, lang);
        return new UpdatedResponse(ResponseCode.BATCH_UPDATE_SUCCESS, result);
    }

    @Delete('batches/:id')
    @RequireOrgPermission('batch.delete')
    @ApiOperation({ summary: 'Xóa lô hàng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của lô hàng' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy lô hàng' })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(orgId, id, actorId, lang);
        return new DeletedResponse(ResponseCode.BATCH_DELETE_SUCCESS, null);
    }
}
