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
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { AmenityService } from './amenity.service';
import { CreateAmenityDto, UpdateAmenityDto, QueryAmenityDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses';
import { IAmenity, IPaginatedResponse } from './types';

@ApiTags('Amenities')
@Controller('amenities')
export class AmenityController {
  constructor(private readonly amenityService: AmenityService) { }

  @ApiOperation({
    summary: 'Tạo tiện ích mới',
    description:
      'Tạo một tiện ích mới trong hệ thống. Tiện ích có thể được áp dụng cho các warehouse template. Yêu cầu quyền `amenity.create`.',
  })
  @ApiBody({
    type: CreateAmenityDto,
    description: 'Dữ liệu tiện ích cần tạo',
    examples: {
      basic: {
        summary: 'Tạo tiện ích cơ bản',
        description: 'Ví dụ tạo tiện ích với thông tin tối thiểu',
        value: {
          name: 'WiFi',
        },
      },
      with_description: {
        summary: 'Tạo tiện ích đầy đủ',
        description: 'Ví dụ tạo tiện ích với mô tả và trạng thái',
        value: {
          name: 'Hệ thống điều hòa',
          description:
            'Hệ thống điều hòa trung tâm, duy trì nhiệt độ ổn định 20-25°C',
          is_active: true,
        },
      },
      inactive: {
        summary: 'Tạo tiện ích không hoạt động',
        description: 'Ví dụ tạo tiện ích với trạng thái không hoạt động',
        value: {
          name: 'Hệ thống PCCC',
          description: 'Hệ thống phòng cháy chữa cháy tự động',
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo tiện ích thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.create.success' },
        message: { type: 'string', example: 'Tạo tiện ích thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'WiFi' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Internet tốc độ cao',
            },
            is_active: { type: 'boolean', example: true },
            is_deleted: { type: 'boolean', example: false },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T07:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T07:00:00.000Z',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: null,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên tiện ích đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.errors.name_exists' },
        message: { type: 'string', example: 'Tên tiện ích đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('amenity.create')
  @Post()
  async create(
    @Body() dto: CreateAmenityDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IAmenity>> {
    const result = await this.amenityService.create(dto, userId, lang);
    return new CreatedResponse('amenity.create.success', result);
  }

  @ApiOperation({
    summary: 'Lấy danh sách tiện ích',
    description:
      'Lấy danh sách tiện ích với phân trang và bộ lọc. Hỗ trợ tìm kiếm theo từ khóa và lọc theo trạng thái hoạt động. Yêu cầu quyền `amenity.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi mỗi trang',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm (tên, mô tả)',
    example: 'WiFi',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tiện ích thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách tiện ích thành công',
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
                  id: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440000',
                  },
                  name: { type: 'string', example: 'WiFi' },
                  description: {
                    type: 'string',
                    nullable: true,
                    example: 'Internet tốc độ cao',
                  },
                  is_active: { type: 'boolean', example: true },
                  is_deleted: { type: 'boolean', example: false },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  created_by: { type: 'string', format: 'uuid' },
                  updated_by: {
                    type: 'string',
                    format: 'uuid',
                    nullable: true,
                  },
                },
              },
            },
            total: { type: 'number', example: 25 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('amenity.list')
  @Get()
  async findAll(
    @Query() query: QueryAmenityDto,
  ): Promise<GetResponse<IPaginatedResponse<IAmenity>>> {
    const result = await this.amenityService.findAll(query);
    return new GetResponse('amenity.list.success', result);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết tiện ích',
    description:
      'Lấy thông tin chi tiết của một tiện ích theo ID. Yêu cầu quyền `amenity.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của tiện ích cần lấy thông tin',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết tiện ích thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.get.success' },
        message: {
          type: 'string',
          example: 'Lấy chi tiết tiện ích thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'WiFi' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Internet tốc độ cao',
            },
            is_active: { type: 'boolean', example: true },
            is_deleted: { type: 'boolean', example: false },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T07:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-21T07:00:00.000Z',
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            updated_by: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: null,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tiện ích',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tiện ích' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('amenity.read')
  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IAmenity>> {
    const result = await this.amenityService.findById(id, lang);
    return new GetResponse('amenity.get.success', result);
  }

  @ApiOperation({
    summary: 'Cập nhật tiện ích',
    description:
      'Cập nhật thông tin của một tiện ích. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `amenity.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của tiện ích cần cập nhật',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateAmenityDto,
    description: 'Dữ liệu cập nhật tiện ích (chỉ gửi các trường muốn thay đổi)',
    examples: {
      update_name: {
        summary: 'Cập nhật tên',
        description: 'Ví dụ cập nhật tên tiện ích',
        value: {
          name: 'WiFi 5G',
        },
      },
      update_description: {
        summary: 'Cập nhật mô tả',
        description: 'Ví dụ cập nhật mô tả tiện ích',
        value: {
          description: 'Internet tốc độ cao 1Gbps, hỗ trợ WiFi 6',
        },
      },
      toggle_status: {
        summary: 'Bật/tắt trạng thái',
        description: 'Ví dụ tắt trạng thái hoạt động của tiện ích',
        value: {
          is_active: false,
        },
      },
      update_full: {
        summary: 'Cập nhật đầy đủ',
        description: 'Ví dụ cập nhật tất cả các trường',
        value: {
          name: 'Hệ thống điều hòa VRV',
          description:
            'Hệ thống điều hòa VRV tiết kiệm năng lượng, duy trì nhiệt độ 18-28°C',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tiện ích thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.update.success' },
        message: { type: 'string', example: 'Cập nhật tiện ích thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: { type: 'string', example: 'WiFi 5G' },
            description: {
              type: 'string',
              nullable: true,
              example: 'Internet tốc độ cao 1Gbps',
            },
            is_active: { type: 'boolean', example: true },
            is_deleted: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            updated_by: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tiện ích',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tiện ích' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tên tiện ích đã tồn tại',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.errors.name_exists' },
        message: { type: 'string', example: 'Tên tiện ích đã tồn tại' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('amenity.update')
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAmenityDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IAmenity>> {
    const result = await this.amenityService.update(id, dto, userId, lang);
    return new UpdatedResponse('amenity.update.success', result);
  }

  @ApiOperation({
    summary: 'Xóa nhiều tiện ích',
    description:
      'Xóa mềm (soft delete) nhiều tiện ích cùng lúc theo danh sách ID. Các mapping liên quan cũng sẽ bị xóa mềm. Yêu cầu quyền `amenity.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID tiện ích cần xóa',
    examples: {
      delete_two: {
        summary: 'Xóa 2 tiện ích',
        description: 'Ví dụ xóa 2 tiện ích cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
        },
      },
      delete_multiple: {
        summary: 'Xóa nhiều tiện ích',
        description: 'Ví dụ xóa 5 tiện ích cùng lúc',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
            '550e8400-e29b-41d4-a716-446655440004',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều tiện ích thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.delete.success' },
        message: { type: 'string', example: 'Xóa nhiều tiện ích thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tiện ích',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tiện ích' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('amenity.delete')
  @Delete('delete/many')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.amenityService.deleteMany(dto.ids, userId, lang);
    return new DeletedResponse('amenity.delete.success', null);
  }

  @ApiOperation({
    summary: 'Xóa tiện ích',
    description:
      'Xóa mềm (soft delete) một tiện ích theo ID. Các mapping liên quan đến tiện ích này cũng sẽ bị xóa mềm. Yêu cầu quyền `amenity.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID của tiện ích cần xóa',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa tiện ích thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.delete.success' },
        message: { type: 'string', example: 'Xóa tiện ích thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tiện ích',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'amenity.errors.not_found' },
        message: { type: 'string', example: 'Không tìm thấy tiện ích' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('amenity.delete')
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.amenityService.delete(id, userId, lang);
    return new DeletedResponse('amenity.delete.success', null);
  }
}
