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
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentActor, RequireOrgPermission } from '../../common/decorators';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
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
@ApiHeader({
  name: 'X-API-Key',
  description: 'API Key for authentication (alternative to JWT)',
  required: false,
})
@Controller('organizations/:orgId/products')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Post()
  @RequireOrgPermission('product.create')
  @ApiOperation({
    summary: 'Tạo sản phẩm mới',
    description:
      'Tạo một sản phẩm mới trong tổ chức. Sản phẩm bao gồm thông tin cơ bản, kích thước, trọng lượng và hỗ trợ nhiều đơn vị tính quy đổi. Mã SKU phải duy nhất trong tổ chức. Yêu cầu quyền `product.create`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateProductDto,
    description: 'Thông tin sản phẩm cần tạo',
    examples: {
      full_product: {
        summary: 'Tạo sản phẩm đầy đủ thông tin',
        description:
          'Ví dụ tạo sản phẩm với đầy đủ thông tin bao gồm đơn vị tính quy đổi',
        value: {
          name: 'Nước suối Aquafina 500ml',
          sku: 'AQUA-500ML',
          description: 'Nước tinh khiết Aquafina chai 500ml',
          image_url: 'https://example.com/images/aquafina-500ml.jpg',
          barcode: '8934588012345',
          weight: 0.55,
          length: 6.5,
          width: 6.5,
          height: 21,
          cost_price: 5000,
          base_unit_id: '550e8400-e29b-41d4-a716-446655440010',
          units: [
            {
              unit_id: '550e8400-e29b-41d4-a716-446655440011',
              conversion_rate: 24,
              barcode: '8934588012346',
            },
            {
              unit_id: '550e8400-e29b-41d4-a716-446655440012',
              conversion_rate: 48,
              barcode: '8934588012347',
            },
          ],
          is_active: true,
        },
      },
      simple_product: {
        summary: 'Tạo sản phẩm đơn giản',
        description: 'Ví dụ tạo sản phẩm chỉ với thông tin cơ bản',
        value: {
          name: 'Bút bi Thiên Long TL-027',
          sku: 'TL-027',
          base_unit_id: '550e8400-e29b-41d4-a716-446655440010',
          cost_price: 3500,
          is_active: true,
        },
      },
      with_dimensions: {
        summary: 'Sản phẩm có kích thước',
        description:
          'Ví dụ tạo sản phẩm với thông tin kích thước và sức chịu tải',
        value: {
          name: 'Thùng carton 60x40x40',
          sku: 'CARTON-60-40-40',
          description: 'Thùng carton 5 lớp, kích thước 60x40x40cm',
          weight: 0.8,
          length: 60,
          width: 40,
          height: 40,
          max_weight_capacity: 30,
          base_unit_id: '550e8400-e29b-41d4-a716-446655440010',
          cost_price: 25000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo sản phẩm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.create_success' },
        message: { type: 'string', example: 'Tạo sản phẩm thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Nước suối Aquafina 500ml' },
            sku: { type: 'string', example: 'AQUA-500ML' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Nước tinh khiết Aquafina chai 500ml',
            },
            image_url: {
              type: 'string',
              nullable: true,
              example: 'https://example.com/images/aquafina-500ml.jpg',
            },
            barcode: {
              type: 'string',
              nullable: true,
              example: '8934588012345',
            },
            weight: {
              type: 'number',
              nullable: true,
              example: 0.55,
              description: 'Trọng lượng (kg)',
            },
            length: {
              type: 'number',
              nullable: true,
              example: 6.5,
              description: 'Chiều dài (cm)',
            },
            width: {
              type: 'number',
              nullable: true,
              example: 6.5,
              description: 'Chiều rộng (cm)',
            },
            height: {
              type: 'number',
              nullable: true,
              example: 21,
              description: 'Chiều cao (cm)',
            },
            max_weight_capacity: {
              type: 'number',
              nullable: true,
              example: null,
              description: 'Sức chịu tải tối đa (kg)',
            },
            cost_price: {
              type: 'number',
              nullable: true,
              example: 5000,
              description: 'Giá vốn (VND)',
            },
            base_unit_id: { type: 'string', format: 'uuid' },
            base_unit: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Chai' },
              },
            },
            units: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  product_id: { type: 'string', format: 'uuid' },
                  unit_id: { type: 'string', format: 'uuid' },
                  conversion_rate: { type: 'number', example: 24 },
                  barcode: { type: 'string', nullable: true },
                  is_active: { type: 'boolean' },
                  unit: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string', example: 'Thùng' },
                    },
                  },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                },
              },
            },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
            is_deleted: { type: 'boolean', example: false },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: { type: 'string', format: 'uuid', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức hoặc đơn vị tính',
    content: {
      'application/json': {
        examples: {
          org_not_found: {
            summary: 'Không tìm thấy tổ chức',
            value: {
              code: 'product.organization_not_found',
              message: 'Không tìm thấy tổ chức',
              success: false,
            },
          },
          base_unit_not_found: {
            summary: 'Không tìm thấy đơn vị tính cơ bản',
            value: {
              code: 'product.base_unit_not_found',
              message: 'Không tìm thấy đơn vị tính cơ bản',
              success: false,
            },
          },
          unit_not_found: {
            summary: 'Không tìm thấy đơn vị tính quy đổi',
            value: {
              code: 'product.unit_not_found',
              message: 'Không tìm thấy đơn vị tính',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã SKU đã tồn tại trong tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.sku_exists' },
        message: { type: 'string', example: 'Mã SKU đã tồn tại trong tổ chức' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateProductDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IProduct>> {
    const result = await this.service.create(orgId, dto, actorId, lang);
    return new CreatedResponse(ResponseCode.PRODUCT_CREATE_SUCCESS, result);
  }

  @Get('export')
  @RequireOrgPermission('product.export')
  @ApiOperation({
    summary: 'Xuất danh sách sản phẩm ra Excel',
    description:
      'Tải về file Excel chứa toàn bộ danh sách sản phẩm của tổ chức. Yêu cầu quyền `product.export`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  async export(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Res() res: Response,
    @I18nLang() lang: string,
  ) {
    const buffer = await this.service.exportProducts(orgId, lang);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=products-${orgId}.xlsx`,
    );
    res.send(buffer);
  }

  @Post('import')
  @RequireOrgPermission('product.import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Nhập sản phẩm từ file Excel',
    description:
      'Tải lên file Excel để nhập hàng loạt sản phẩm. Yêu cầu quyền `product.import`.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async import(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @UploadedFile() file: any,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ) {
    const result = await this.service.importProducts(
      orgId,
      file.buffer,
      actorId,
      lang,
    );
    return new GetResponse(ResponseCode.PRODUCT_LIST_SUCCESS, result);
  }

  @Get('template')
  @RequireOrgPermission('product.import')
  @ApiOperation({
    summary: 'Tải file mẫu nhập sản phẩm',
    description:
      'Tải về file Excel mẫu với các tiêu đề cột đúng định dạng để nhập hàng loạt sản phẩm. Yêu cầu quyền `product.import`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  async getTemplate(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.getImportTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=product-import-template.xlsx',
    );
    res.send(buffer);
  }

  @Get()
  @RequireOrgPermission('product.list')
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm',
    description:
      'Lấy danh sách sản phẩm của tổ chức với hỗ trợ phân trang và tìm kiếm. Có thể tìm theo tên, SKU hoặc barcode và lọc theo trạng thái hoạt động. Yêu cầu quyền `product.list`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng bản ghi tối đa trả về (mặc định: 20)',
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Vị trí bắt đầu lấy dữ liệu (mặc định: 0)',
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    description: 'Từ khóa tìm kiếm (tên, SKU, barcode)',
    type: String,
    example: 'Aquafina',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    description: 'Lọc theo trạng thái hoạt động',
    type: Boolean,
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách sản phẩm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.list_success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách sản phẩm thành công',
        },
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
                  organization_id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  sku: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  image_url: { type: 'string', nullable: true },
                  barcode: { type: 'string', nullable: true },
                  weight: { type: 'number', nullable: true },
                  length: { type: 'number', nullable: true },
                  width: { type: 'number', nullable: true },
                  height: { type: 'number', nullable: true },
                  max_weight_capacity: { type: 'number', nullable: true },
                  cost_price: { type: 'number', nullable: true },
                  base_unit_id: { type: 'string', format: 'uuid' },
                  base_unit: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                    },
                  },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  is_deleted: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number', example: 100 },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
          },
          example: {
            items: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                organization_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Nước suối Aquafina 500ml',
                sku: 'AQUA-500ML',
                description: 'Nước tinh khiết Aquafina chai 500ml',
                image_url: 'https://example.com/images/aquafina-500ml.jpg',
                barcode: '8934588012345',
                weight: 0.55,
                length: 6.5,
                width: 6.5,
                height: 21,
                max_weight_capacity: null,
                cost_price: 5000,
                base_unit_id: '550e8400-e29b-41d4-a716-446655440010',
                base_unit: {
                  id: '550e8400-e29b-41d4-a716-446655440010',
                  name: 'Chai',
                },
                is_active: true,
                created_at: '2026-02-01T09:00:00.000Z',
                updated_at: null,
                is_deleted: false,
              },
            ],
            total: 100,
            limit: 20,
            offset: 0,
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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
  @ApiOperation({
    summary: 'Lấy chi tiết sản phẩm',
    description:
      'Lấy thông tin chi tiết của một sản phẩm theo ID. Bao gồm thông tin đơn vị tính cơ bản và các đơn vị tính quy đổi. Yêu cầu quyền `product.read`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của sản phẩm (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin sản phẩm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.get_success' },
        message: {
          type: 'string',
          example: 'Lấy thông tin sản phẩm thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Nước suối Aquafina 500ml' },
            sku: { type: 'string', example: 'AQUA-500ML' },
            description: { type: 'string', nullable: true },
            image_url: { type: 'string', nullable: true },
            barcode: {
              type: 'string',
              nullable: true,
              example: '8934588012345',
            },
            weight: { type: 'number', nullable: true, example: 0.55 },
            length: { type: 'number', nullable: true, example: 6.5 },
            width: { type: 'number', nullable: true, example: 6.5 },
            height: { type: 'number', nullable: true, example: 21 },
            max_weight_capacity: { type: 'number', nullable: true },
            cost_price: { type: 'number', nullable: true, example: 5000 },
            base_unit_id: { type: 'string', format: 'uuid' },
            base_unit: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Chai' },
              },
            },
            units: {
              type: 'array',
              description: 'Danh sách đơn vị tính quy đổi',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  product_id: { type: 'string', format: 'uuid' },
                  unit_id: { type: 'string', format: 'uuid' },
                  conversion_rate: {
                    type: 'number',
                    example: 24,
                    description: 'Tỷ lệ quy đổi so với đơn vị cơ bản',
                  },
                  barcode: { type: 'string', nullable: true },
                  is_active: { type: 'boolean' },
                  unit: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string', example: 'Thùng' },
                    },
                  },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                },
              },
            },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
            is_deleted: { type: 'boolean', example: false },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: { type: 'string', format: 'uuid', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sản phẩm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.not_found' },
        message: { type: 'string', example: 'Không tìm thấy sản phẩm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
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
  @ApiOperation({
    summary: 'Cập nhật sản phẩm',
    description:
      'Cập nhật thông tin sản phẩm bao gồm cả đơn vị tính quy đổi. Tất cả các trường đều tùy chọn, chỉ các trường được gửi mới được cập nhật. Khi cập nhật danh sách đơn vị tính, danh sách cũ sẽ bị thay thế hoàn toàn. Yêu cầu quyền `product.update`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của sản phẩm (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateProductDto,
    description:
      'Thông tin sản phẩm cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_basic: {
        summary: 'Cập nhật thông tin cơ bản',
        description: 'Ví dụ cập nhật tên và mô tả sản phẩm',
        value: {
          name: 'Nước suối Aquafina 500ml - Mới',
          description: 'Nước tinh khiết Aquafina chai 500ml - Phiên bản mới',
        },
      },
      update_price: {
        summary: 'Cập nhật giá vốn',
        description: 'Ví dụ cập nhật giá vốn sản phẩm',
        value: {
          cost_price: 5500,
        },
      },
      update_dimensions: {
        summary: 'Cập nhật kích thước',
        description: 'Ví dụ cập nhật thông tin kích thước và trọng lượng',
        value: {
          weight: 0.6,
          length: 7,
          width: 7,
          height: 22,
        },
      },
      update_units: {
        summary: 'Cập nhật đơn vị tính quy đổi',
        description:
          'Ví dụ cập nhật danh sách đơn vị tính quy đổi (thay thế hoàn toàn)',
        value: {
          units: [
            {
              unit_id: '550e8400-e29b-41d4-a716-446655440011',
              conversion_rate: 24,
              barcode: '8934588012346',
            },
            {
              unit_id: '550e8400-e29b-41d4-a716-446655440012',
              conversion_rate: 48,
              barcode: '8934588012347',
            },
            {
              unit_id: '550e8400-e29b-41d4-a716-446655440013',
              conversion_rate: 120,
              barcode: '8934588012348',
            },
          ],
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Ví dụ vô hiệu hóa sản phẩm',
        value: {
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật sản phẩm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.update_success' },
        message: { type: 'string', example: 'Cập nhật sản phẩm thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description:
            'Thông tin sản phẩm sau khi cập nhật (cấu trúc giống response 201 của tạo sản phẩm)',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sản phẩm hoặc đơn vị tính',
    content: {
      'application/json': {
        examples: {
          product_not_found: {
            summary: 'Không tìm thấy sản phẩm',
            value: {
              code: 'product.not_found',
              message: 'Không tìm thấy sản phẩm',
              success: false,
            },
          },
          base_unit_not_found: {
            summary: 'Không tìm thấy đơn vị tính cơ bản',
            value: {
              code: 'product.base_unit_not_found',
              message: 'Không tìm thấy đơn vị tính cơ bản',
              success: false,
            },
          },
          unit_not_found: {
            summary: 'Không tìm thấy đơn vị tính quy đổi',
            value: {
              code: 'product.unit_not_found',
              message: 'Không tìm thấy đơn vị tính',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã SKU đã tồn tại trong tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.sku_exists' },
        message: { type: 'string', example: 'Mã SKU đã tồn tại trong tổ chức' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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

  @Delete('delete/many')
  @RequireOrgPermission('product.delete')
  @ApiOperation({
    summary: 'Xóa nhiều sản phẩm',
    description:
      'Xóa nhiều sản phẩm cùng lúc theo danh sách ID. Thao tác này sẽ soft delete các sản phẩm và các đơn vị tính quy đổi liên quan. Yêu cầu quyền `product.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các sản phẩm cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều sản phẩm',
        description: 'Ví dụ xóa 3 sản phẩm cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều sản phẩm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.delete_success' },
        message: { type: 'string', example: 'Xóa sản phẩm thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều sản phẩm không tìm thấy',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.not_found' },
        message: { type: 'string', example: 'Không tìm thấy sản phẩm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: DeleteManyDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.deleteMany(orgId, dto.ids, actorId, lang);
    return new DeletedResponse(ResponseCode.PRODUCT_DELETE_SUCCESS, null);
  }

  @Delete(':id')
  @RequireOrgPermission('product.delete')
  @ApiOperation({
    summary: 'Xóa sản phẩm',
    description:
      'Xóa một sản phẩm theo ID. Thao tác này sẽ soft delete sản phẩm và các đơn vị tính quy đổi liên quan (đánh dấu is_deleted = true). Yêu cầu quyền `product.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của sản phẩm cần xóa (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa sản phẩm thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.delete_success' },
        message: { type: 'string', example: 'Xóa sản phẩm thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sản phẩm',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'product.not_found' },
        message: { type: 'string', example: 'Không tìm thấy sản phẩm' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
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
