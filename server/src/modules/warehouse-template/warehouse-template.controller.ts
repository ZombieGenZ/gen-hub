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
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard, OptionalJwtAuthGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';
import { IWarehouseTemplateWithRelations, IPaginatedResponse } from './interfaces';
import { PrismaService } from '../../prisma/prisma.service';

// Cấu hình upload ảnh
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@ApiTags('Warehouse Templates')
@ApiBearerAuth('JWT-auth')
@Controller('warehouse-templates')
export class WarehouseTemplateController {
    constructor(
        private readonly service: WarehouseTemplateService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Kiểm tra user có permission cụ thể không
     */
    private async hasPermission(userId: string | undefined, permissionKey: string): Promise<boolean> {
        if (!userId) return false;

        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            include: {
                system_roles: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    where: { is_deleted: false, is_active: true },
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
                system_permissions: {
                    where: { is_deleted: false, is_active: true },
                    include: { permission: true },
                },
            },
        });

        if (!user) return false;

        // Check direct permissions
        const hasDirectPerm = user.system_permissions.some(
            (p) => p.permission.key === permissionKey,
        );
        if (hasDirectPerm) return true;

        // Check role permissions
        const hasRolePerm = user.system_roles.some((ur) =>
            ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
        );
        return hasRolePerm;
    }

    @Post()
    @UseGuards(JwtAuthGuard, PermissionGuard)
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

    /**
     * Lấy danh sách template - không cần xác thực
     * - Có quyền list.all: có thể filter is_active = false hoặc không truyền is_active
     * - Không có quyền list.all: chỉ xem is_active = true
     */
    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Lấy danh sách template kho hàng' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryWarehouseTemplateDto,
        @CurrentUser('userId') userId: string | undefined,
    ): Promise<GetResponse<IPaginatedResponse<IWarehouseTemplateWithRelations>>> {
        const hasListAllPermission = await this.hasPermission(userId, 'warehouse-template.list.all');

        // Nếu không có quyền list.all, buộc is_active = true
        if (!hasListAllPermission) {
            query.is_active = true;
        }

        const result = await this.service.findMany(query);
        return new GetResponse(ResponseCode.WAREHOUSE_TEMPLATE_LIST_SUCCESS, result);
    }

    /**
     * Lấy chi tiết template - không cần xác thực
     */
    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Lấy chi tiết template kho hàng' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string | undefined,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IWarehouseTemplateWithRelations>> {
        const hasListAllPermission = await this.hasPermission(userId, 'warehouse-template.list.all');
        const result = await this.service.findById(id, lang, hasListAllPermission);
        return new GetResponse(ResponseCode.WAREHOUSE_TEMPLATE_GET_SUCCESS, result);
    }


    @Put(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
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

    @Delete('delete/many')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('warehouse-template.delete')
    @ApiOperation({ summary: 'Xóa nhiều template kho hàng' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_TEMPLATE_DELETE_SUCCESS, null, 'Xóa nhiều template thành công');
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
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
    @UseGuards(JwtAuthGuard, PermissionGuard)
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

    @Post(':id/images')
    @UseGuards(JwtAuthGuard, PermissionGuard)
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

    /**
     * Lấy danh sách ảnh - không cần xác thực
     */
    @Get(':id/images')
    @UseGuards(OptionalJwtAuthGuard)
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
    @UseGuards(JwtAuthGuard, PermissionGuard)
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

    @Delete(':id/images/delete/many')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('warehouse-template.update')
    @ApiOperation({ summary: 'Xóa nhiều ảnh của template' })
    @ApiParam({ name: 'id', description: 'ID của template', type: 'string' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa nhiều ảnh thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template hoặc ảnh' })
    async deleteManyImages(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteManyImages(id, dto.ids, userId, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_TEMPLATE_IMAGE_DELETE_SUCCESS, null, 'Xóa nhiều ảnh thành công');
    }

    @Put(':id/images/reorder')
    @UseGuards(JwtAuthGuard, PermissionGuard)
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
