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

import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentActor, RequireOrgPermission } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IProduct, IPaginatedResponse } from './interfaces';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication (alternative to JWT)', required: false })
@Controller('organizations/:orgId/products')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class ProductController {
    constructor(private readonly service: ProductService) { }

    @Post()
    @RequireOrgPermission('product.create')
    @ApiOperation({ summary: 'Tạo sản phẩm mới (bao gồm đơn vị tính quy đổi)' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    @ApiResponse({ status: 409, description: 'SKU đã tồn tại' })
    async create(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreateProductDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IProduct>> {
        const result = await this.service.create(orgId, dto, actorId, lang);
        return new CreatedResponse(ResponseCode.PRODUCT_CREATE_SUCCESS, result);
    }

    @Get()
    @RequireOrgPermission('product.list')
    @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryProductDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IProduct>>> {
        const result = await this.service.findMany(orgId, query, lang);
        return new GetResponse(ResponseCode.PRODUCT_LIST_SUCCESS, result);
    }

    @Get(':id')
    @RequireOrgPermission('product.read')
    @ApiOperation({ summary: 'Lấy chi tiết sản phẩm' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của sản phẩm' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IProduct>> {
        const result = await this.service.findById(orgId, id, lang);
        return new GetResponse(ResponseCode.PRODUCT_GET_SUCCESS, result);
    }

    @Put(':id')
    @RequireOrgPermission('product.update')
    @ApiOperation({ summary: 'Cập nhật sản phẩm (bao gồm đơn vị tính quy đổi)' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của sản phẩm' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IProduct>> {
        const result = await this.service.update(orgId, id, dto, actorId, lang);
        return new UpdatedResponse(ResponseCode.PRODUCT_UPDATE_SUCCESS, result);
    }

    @Delete(':id')
    @RequireOrgPermission('product.delete')
    @ApiOperation({ summary: 'Xóa sản phẩm' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của sản phẩm' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(orgId, id, actorId, lang);
        return new DeletedResponse(ResponseCode.PRODUCT_DELETE_SUCCESS, null);
    }
}
