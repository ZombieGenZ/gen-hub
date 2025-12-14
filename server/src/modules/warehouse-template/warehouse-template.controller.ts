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
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { I18nLang } from 'nestjs-i18n';

import { WarehouseTemplateService } from './warehouse-template.service';
import {
    CreateWarehouseTemplateDto,
    UpdateWarehouseTemplateDto,
    QueryWarehouseTemplateDto,
    UpsertLayoutDto,
} from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IWarehouseTemplateWithRelations, IPaginatedResponse } from './interfaces';

// Cấu hình upload ảnh
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@ApiTags('Warehouse Templates')
@ApiBearerAuth('JWT-auth')
@Controller('warehouse-templates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarehouseTemplateController {
    constructor(private readonly service: WarehouseTemplateService) { }

    @Post()
    @RequirePermission('warehouse-template.create')
    @ApiOperation({ summary: 'Tạo mới template kho hàng' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 409, description: 'Tên template đã tồn tại' })
    async create(
        @Body() dto: CreateWarehouseTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.create(dto, userId, lang);
        return new CreatedResponse(ResponseCode.WAREHOUSE_TEMPLATE_CREATE_SUCCESS, result);
    }

    @Get()
    @RequirePermission('warehouse-template.list')
    @ApiOperation({ summary: 'Lấy danh sách template kho hàng' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryWarehouseTemplateDto,
    ): Promise<GetResponse<IPaginatedResponse<IWarehouseTemplateWithRelations>>> {
        const result = await this.service.findMany(query);
        return new GetResponse(ResponseCode.WAREHOUSE_TEMPLATE_LIST_SUCCESS, result);
    }

    @Get(':id')
    @RequirePermission('warehouse-template.read')
    @ApiOperation({ summary: 'Lấy chi tiết template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_TEMPLATE_GET_SUCCESS, result);
    }

    @Put(':id')
    @RequirePermission('warehouse-template.update')
    @ApiOperation({ summary: 'Cập nhật thông tin template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    @ApiResponse({ status: 409, description: 'Tên template đã tồn tại' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarehouseTemplateDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_TEMPLATE_UPDATE_SUCCESS, result);
    }

    @Delete(':id')
    @RequirePermission('warehouse-template.delete')
    @ApiOperation({ summary: 'Xóa template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_TEMPLATE_DELETE_SUCCESS, null);
    }

    @Put(':id/layout')
    @RequirePermission('warehouse-template.design')
    @ApiOperation({ summary: 'Cập nhật layout (rows, racks, shelves, blocks)' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật layout thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async upsertLayout(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpsertLayoutDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IWarehouseTemplateWithRelations>> {
        const result = await this.service.upsertLayout(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_TEMPLATE_LAYOUT_UPDATE_SUCCESS, result);
    }

    // ==================== IMAGE ENDPOINTS ====================

    @Post(':id/images')
    @RequirePermission('warehouse-template.update')
    @UseInterceptors(FilesInterceptor('images', MAX_FILES, {
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (req, file, cb) => {
            if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Chỉ chấp nhận file ảnh: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
            }
        },
    }))
    @ApiOperation({ summary: 'Upload ảnh cho template kho hàng' })
    @ApiConsumes('multipart/form-data')
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiBody({
        description: 'Danh sách ảnh (tối đa 10 ảnh, mỗi ảnh max 5MB)',
        schema: {
            type: 'object',
            properties: {
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Upload thành công' })
    @ApiResponse({ status: 400, description: 'File không hợp lệ hoặc vượt quá giới hạn' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async uploadImages(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFiles() files: Express.Multer.File[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh');
        }

        const result = await this.service.uploadImages(id, files, userId, lang);
        return new CreatedResponse(ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_UPLOAD_SUCCESS, result);
    }

    @Get(':id/images')
    @RequirePermission('warehouse-template.read')
    @ApiOperation({ summary: 'Lấy danh sách ảnh của template' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách ảnh thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async getImages(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getImages(id, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_LIST_SUCCESS, result);
    }

    @Delete(':id/images/:imageId')
    @RequirePermission('warehouse-template.update')
    @ApiOperation({ summary: 'Xóa ảnh của template' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiParam({ name: 'imageId', description: 'ID của ảnh', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa ảnh thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template hoặc ảnh' })
    async deleteImage(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('imageId', ParseUUIDPipe) imageId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteImage(id, imageId, userId, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_DELETE_SUCCESS, null);
    }

    @Put(':id/images/reorder')
    @RequirePermission('warehouse-template.update')
    @ApiOperation({ summary: 'Sắp xếp lại thứ tự ảnh' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiBody({
        description: 'Danh sách thứ tự mới của ảnh',
        schema: {
            type: 'object',
            properties: {
                images: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            order: { type: 'number' },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Sắp xếp thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async reorderImages(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { images: { id: string; order: number }[] },
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.reorderImages(id, body.images, userId, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_REORDER_SUCCESS, null);
    }
}
