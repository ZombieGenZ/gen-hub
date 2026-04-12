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

import { PartnerService } from './partner.service';
import { CreatePartnerDto, UpdatePartnerDto, QueryPartnerDto } from './dto';
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
import { IPartner, IPaginatedResponse } from './interfaces';

@ApiTags('Partners')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API Key for authentication (alternative to JWT)',
  required: false,
})
@Controller('organizations/:orgId/partners')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class PartnerController {
  constructor(private readonly service: PartnerService) {}

  @Post()
  @RequireOrgPermission('partner.create')
  @ApiOperation({
    summary: 'Tạo đối tác mới',
    description:
      'Tạo một đối tác mới trong tổ chức. Đối tác có thể là khách hàng (CUSTOMER) hoặc nhà cung cấp (SUPPLIER). Mã đối tác phải duy nhất trong tổ chức. Yêu cầu quyền `partner.create`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreatePartnerDto,
    description: 'Thông tin đối tác cần tạo',
    examples: {
      customer: {
        summary: 'Tạo khách hàng',
        description: 'Ví dụ tạo đối tác loại khách hàng với đầy đủ thông tin',
        value: {
          name: 'Công ty TNHH ABC',
          code: 'KH001',
          type: 'CUSTOMER',
          phone: '0901234567',
          email: 'contact@abc.com',
          tax_code: '0123456789',
          address_detail: '123 Đường Nguyễn Huệ, Quận 1',
          ward_id: '550e8400-e29b-41d4-a716-446655440000',
          is_active: true,
        },
      },
      supplier: {
        summary: 'Tạo nhà cung cấp',
        description: 'Ví dụ tạo đối tác loại nhà cung cấp',
        value: {
          name: 'Nhà cung cấp XYZ',
          code: 'NCC001',
          type: 'SUPPLIER',
          phone: '0987654321',
          email: 'info@xyz.vn',
          is_active: true,
        },
      },
      minimal: {
        summary: 'Tạo với thông tin tối thiểu',
        description: 'Ví dụ tạo đối tác chỉ với các trường bắt buộc',
        value: {
          name: 'Đối tác mới',
          code: 'DT001',
          type: 'CUSTOMER',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đối tác thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.create_success' },
        message: { type: 'string', example: 'Tạo đối tác thành công' },
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
            name: { type: 'string', example: 'Công ty TNHH ABC' },
            code: { type: 'string', example: 'KH001' },
            type: {
              type: 'string',
              enum: ['CUSTOMER', 'SUPPLIER'],
              example: 'CUSTOMER',
            },
            phone: { type: 'string', nullable: true, example: '0901234567' },
            email: {
              type: 'string',
              nullable: true,
              example: 'contact@abc.com',
            },
            tax_code: { type: 'string', nullable: true, example: '0123456789' },
            address_detail: {
              type: 'string',
              nullable: true,
              example: '123 Đường Nguyễn Huệ, Quận 1',
            },
            ward_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            ward: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Phường Bến Nghé' },
                province: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string', example: 'TP. Hồ Chí Minh' },
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
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            is_deleted: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức hoặc phường/xã',
    content: {
      'application/json': {
        examples: {
          org_not_found: {
            summary: 'Không tìm thấy tổ chức',
            value: {
              code: 'partner.organization_not_found',
              message: 'Không tìm thấy tổ chức',
              success: false,
            },
          },
          ward_not_found: {
            summary: 'Không tìm thấy phường/xã',
            value: {
              code: 'partner.ward_not_found',
              message: 'Không tìm thấy phường/xã',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã đối tác đã tồn tại trong tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.code_exists' },
        message: {
          type: 'string',
          example: 'Mã đối tác đã tồn tại trong tổ chức',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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
  @ApiOperation({
    summary: 'Lấy danh sách đối tác',
    description:
      'Lấy danh sách đối tác của tổ chức với hỗ trợ phân trang và tìm kiếm. Có thể lọc theo loại đối tác (CUSTOMER/SUPPLIER) và trạng thái hoạt động. Yêu cầu quyền `partner.list`.',
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
    description: 'Từ khóa tìm kiếm (tên, mã, email, phone)',
    type: String,
    example: 'ABC',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Lọc theo loại đối tác',
    enum: ['CUSTOMER', 'SUPPLIER'],
    example: 'CUSTOMER',
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
    description: 'Lấy danh sách đối tác thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.list_success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách đối tác thành công',
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
                  code: { type: 'string' },
                  type: { type: 'string', enum: ['CUSTOMER', 'SUPPLIER'] },
                  phone: { type: 'string', nullable: true },
                  email: { type: 'string', nullable: true },
                  tax_code: { type: 'string', nullable: true },
                  address_detail: { type: 'string', nullable: true },
                  ward_id: { type: 'string', format: 'uuid', nullable: true },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  is_deleted: { type: 'boolean' },
                },
              },
            },
            total: { type: 'number', example: 50 },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
          },
          example: {
            items: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                organization_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Công ty TNHH ABC',
                code: 'KH001',
                type: 'CUSTOMER',
                phone: '0901234567',
                email: 'contact@abc.com',
                tax_code: '0123456789',
                address_detail: '123 Đường Nguyễn Huệ, Quận 1',
                ward_id: null,
                is_active: true,
                created_at: '2026-02-01T09:00:00.000Z',
                updated_at: '2026-02-01T09:00:00.000Z',
                is_deleted: false,
              },
            ],
            total: 50,
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
    @Query() query: QueryPartnerDto,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPaginatedResponse<IPartner>>> {
    const result = await this.service.findMany(orgId, query, lang);
    return new GetResponse(ResponseCode.PARTNER_LIST_SUCCESS, result);
  }

  @Get(':id')
  @RequireOrgPermission('partner.read')
  @ApiOperation({
    summary: 'Lấy chi tiết đối tác',
    description:
      'Lấy thông tin chi tiết của một đối tác theo ID. Bao gồm thông tin địa chỉ đầy đủ nếu có. Yêu cầu quyền `partner.read`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đối tác (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin đối tác thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.get_success' },
        message: {
          type: 'string',
          example: 'Lấy thông tin đối tác thành công',
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
            organization_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'Công ty TNHH ABC' },
            code: { type: 'string', example: 'KH001' },
            type: {
              type: 'string',
              enum: ['CUSTOMER', 'SUPPLIER'],
              example: 'CUSTOMER',
            },
            phone: { type: 'string', nullable: true, example: '0901234567' },
            email: {
              type: 'string',
              nullable: true,
              example: 'contact@abc.com',
            },
            tax_code: { type: 'string', nullable: true, example: '0123456789' },
            address_detail: {
              type: 'string',
              nullable: true,
              example: '123 Đường Nguyễn Huệ, Quận 1',
            },
            ward_id: { type: 'string', format: 'uuid', nullable: true },
            ward: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Phường Bến Nghé' },
                province: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string', example: 'TP. Hồ Chí Minh' },
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
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            is_deleted: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đối tác',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đối tác' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
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
  @ApiOperation({
    summary: 'Cập nhật đối tác',
    description:
      'Cập nhật thông tin đối tác. Tất cả các trường đều tùy chọn, chỉ các trường được gửi mới được cập nhật. Yêu cầu quyền `partner.update`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đối tác (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdatePartnerDto,
    description:
      'Thông tin đối tác cần cập nhật (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_contact: {
        summary: 'Cập nhật thông tin liên hệ',
        description: 'Ví dụ cập nhật số điện thoại và email',
        value: {
          phone: '0909123456',
          email: 'new-email@abc.com',
        },
      },
      update_address: {
        summary: 'Cập nhật địa chỉ',
        description: 'Ví dụ cập nhật địa chỉ chi tiết và phường/xã',
        value: {
          address_detail: '456 Đường Lê Lợi, Quận 1',
          ward_id: '550e8400-e29b-41d4-a716-446655440002',
        },
      },
      update_status: {
        summary: 'Thay đổi trạng thái',
        description: 'Ví dụ vô hiệu hóa đối tác',
        value: {
          is_active: false,
        },
      },
      update_full: {
        summary: 'Cập nhật toàn bộ',
        description: 'Ví dụ cập nhật nhiều thông tin cùng lúc',
        value: {
          name: 'Công ty TNHH ABC - Chi nhánh 2',
          phone: '0909123456',
          email: 'branch2@abc.com',
          tax_code: '0123456789-001',
          address_detail: '789 Đường Hai Bà Trưng, Quận 3',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đối tác thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.update_success' },
        message: { type: 'string', example: 'Cập nhật đối tác thành công' },
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
            name: { type: 'string', example: 'Công ty TNHH ABC - Chi nhánh 2' },
            code: { type: 'string', example: 'KH001' },
            type: {
              type: 'string',
              enum: ['CUSTOMER', 'SUPPLIER'],
              example: 'CUSTOMER',
            },
            phone: { type: 'string', nullable: true, example: '0909123456' },
            email: {
              type: 'string',
              nullable: true,
              example: 'branch2@abc.com',
            },
            tax_code: {
              type: 'string',
              nullable: true,
              example: '0123456789-001',
            },
            address_detail: {
              type: 'string',
              nullable: true,
              example: '789 Đường Hai Bà Trưng, Quận 3',
            },
            ward_id: { type: 'string', format: 'uuid', nullable: true },
            is_active: { type: 'boolean', example: true },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T09:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-01T10:30:00.000Z',
            },
            is_deleted: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đối tác hoặc phường/xã',
    content: {
      'application/json': {
        examples: {
          partner_not_found: {
            summary: 'Không tìm thấy đối tác',
            value: {
              code: 'partner.not_found',
              message: 'Không tìm thấy đối tác',
              success: false,
            },
          },
          ward_not_found: {
            summary: 'Không tìm thấy phường/xã',
            value: {
              code: 'partner.ward_not_found',
              message: 'Không tìm thấy phường/xã',
              success: false,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Mã đối tác đã tồn tại trong tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.code_exists' },
        message: {
          type: 'string',
          example: 'Mã đối tác đã tồn tại trong tổ chức',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
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

  @Delete('delete/many')
  @RequireOrgPermission('partner.delete')
  @ApiOperation({
    summary: 'Xóa nhiều đối tác',
    description:
      'Xóa nhiều đối tác cùng lúc theo danh sách ID. Thao tác này sẽ soft delete các đối tác. Yêu cầu quyền `partner.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID các đối tác cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa nhiều đối tác',
        description: 'Ví dụ xóa 3 đối tác cùng lúc',
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
    description: 'Xóa nhiều đối tác thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.delete_success' },
        message: { type: 'string', example: 'Xóa đối tác thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều đối tác không tìm thấy',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đối tác' },
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
    return new DeletedResponse(ResponseCode.PARTNER_DELETE_SUCCESS, null);
  }

  @Delete(':id')
  @RequireOrgPermission('partner.delete')
  @ApiOperation({
    summary: 'Xóa đối tác',
    description:
      'Xóa một đối tác theo ID. Thao tác này sẽ soft delete đối tác (đánh dấu is_deleted = true). Yêu cầu quyền `partner.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đối tác cần xóa (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa đối tác thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.delete_success' },
        message: { type: 'string', example: 'Xóa đối tác thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đối tác',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'partner.not_found' },
        message: { type: 'string', example: 'Không tìm thấy đối tác' },
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
    return new DeletedResponse(ResponseCode.PARTNER_DELETE_SUCCESS, null);
  }
}
