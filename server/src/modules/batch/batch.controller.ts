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
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { BatchService } from './batch.service';
import { CreateBatchDto, UpdateBatchDto, QueryBatchDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
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
    @ApiOperation({
        summary: 'Tạo lô hàng mới',
        description: 'Tạo lô hàng mới cho một sản phẩm. Mã lô hàng phải là duy nhất. Yêu cầu quyền `batch.create`.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiBody({
        type: CreateBatchDto,
        description: 'Thông tin lô hàng cần tạo',
        examples: {
            example1: {
                summary: 'Tạo lô hàng đầy đủ',
                value: {
                    product_id: '550e8400-e29b-41d4-a716-446655440001',
                    code: 'BATCH-2023-001',
                    manufacturing_date: '2023-01-01T00:00:00Z',
                    expiry_date: '2024-01-01T00:00:00Z',
                    import_price: 50000,
                    is_active: true
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo lô hàng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.create_success' },
                message: { type: 'string', example: 'Tạo lô hàng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        product_id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'BATCH-2023-001' },
                        manufacturing_date: { type: 'string', format: 'date-time' },
                        expiry_date: { type: 'string', format: 'date-time' },
                        import_price: { type: 'number', example: 50000 },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu không hợp lệ',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'validation_error' },
                message: { type: 'string', example: 'Dữ liệu không hợp lệ' },
                success: { type: 'boolean', example: false }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy sản phẩm',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.product_not_found' },
                message: { type: 'string', example: 'Không tìm thấy sản phẩm' },
                success: { type: 'boolean', example: false }
            }
        }
    })
    @ApiResponse({
        status: 409,
        description: 'Mã lô đã tồn tại',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.code_exists' },
                message: { type: 'string', example: 'Mã lô đã tồn tại' },
                success: { type: 'boolean', example: false }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Lấy danh sách lô hàng theo sản phẩm',
        description: 'Lấy danh sách lô hàng của một sản phẩm. Có thể lọc theo trạng thái và tìm kiếm. Yêu cầu quyền `batch.list`.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'productId', description: 'ID của sản phẩm (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi mỗi trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái hoạt động' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.list_success' },
                message: { type: 'string', example: 'Lấy danh sách lô hàng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    product_id: { type: 'string', format: 'uuid' },
                                    code: { type: 'string', example: 'BATCH-2023-001' },
                                    manufacturing_date: { type: 'string', format: 'date-time' },
                                    expiry_date: { type: 'string', format: 'date-time' },
                                    import_price: { type: 'number' },
                                    is_active: { type: 'boolean' },
                                    created_at: { type: 'string', format: 'date-time' }
                                }
                            }
                        },
                        total: { type: 'number' },
                        limit: { type: 'number' },
                        offset: { type: 'number' }
                    }
                }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Lấy chi tiết lô hàng',
        description: 'Lấy thông tin chi tiết của một lô hàng. Yêu cầu quyền `batch.read`.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID của lô hàng (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.get_success' },
                message: { type: 'string', example: 'Lấy thông tin lô hàng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        product_id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'BATCH-2023-001' },
                        manufacturing_date: { type: 'string', format: 'date-time' },
                        expiry_date: { type: 'string', format: 'date-time' },
                        import_price: { type: 'number' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        product: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                                sku: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lô hàng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lô hàng' },
                success: { type: 'boolean', example: false }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Cập nhật lô hàng',
        description: 'Cập nhật thông tin lô hàng. Yêu cầu quyền `batch.update`.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID của lô hàng (UUID)' })
    @ApiBody({
        type: UpdateBatchDto,
        description: 'Thông tin cần cập nhật',
        examples: {
            example1: {
                summary: 'Cập nhật ngày hết hạn',
                value: {
                    expiry_date: '2024-06-01T00:00:00Z',
                    import_price: 52000
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.update_success' },
                message: { type: 'string', example: 'Cập nhật lô hàng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lô hàng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lô hàng' },
                success: { type: 'boolean', example: false }
            }
        }
    })
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

    @Delete('batches/delete/many')
    @RequireOrgPermission('batch.delete')
    @ApiOperation({
        summary: 'Xóa nhiều lô hàng',
        description: 'Xóa nhiều lô hàng theo danh sách ID. Yêu cầu quyền `batch.delete`.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiBody({
        type: DeleteManyDto,
        description: 'Danh sách ID lô hàng cần xóa',
        examples: {
            example1: {
                summary: 'Xóa 2 lô hàng',
                value: {
                    ids: [
                        '550e8400-e29b-41d4-a716-446655440001',
                        '550e8400-e29b-41d4-a716-446655440002'
                    ]
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.delete_success' },
                message: { type: 'string', example: 'Xóa lô hàng thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null' }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Một hoặc nhiều lô hàng không tìm thấy',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lô hàng' },
                success: { type: 'boolean', example: false }
            }
        }
    })
    async deleteMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: DeleteManyDto,
        @CurrentActor() actorId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(orgId, dto.ids, actorId, lang);
        return new DeletedResponse(ResponseCode.BATCH_DELETE_SUCCESS, null);
    }

    @Delete('batches/:id')
    @RequireOrgPermission('batch.delete')
    @ApiOperation({
        summary: 'Xóa lô hàng',
        description: 'Xóa một lô hàng theo ID. Yêu cầu quyền `batch.delete`.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID của lô hàng (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Xóa thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.delete_success' },
                message: { type: 'string', example: 'Xóa lô hàng thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null' }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy lô hàng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'batch.not_found' },
                message: { type: 'string', example: 'Không tìm thấy lô hàng' },
                success: { type: 'boolean', example: false }
            }
        }
    })
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
