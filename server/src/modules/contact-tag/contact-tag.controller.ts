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
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ContactTagService } from './contact-tag.service';
import {
  CreateContactTagDto,
  UpdateContactTagDto,
  QueryContactTagDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  RequirePermission,
  CurrentUser,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
} from '../../common/responses/success.response';
import {
  buildErrorSchema,
  buildSuccessSchema,
} from '../../common/swagger/master-data-swagger.helper';

@ApiTags('Contact Tags')
@Controller('admin/contact-tags')
export class ContactTagController {
  constructor(private readonly contactTagService: ContactTagService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo ContactTag mới',
    description:
      'Tạo nhãn mới để gán cho ticket hoặc conversation chăm sóc khách hàng. Yêu cầu quyền `contact-tag.create`.',
  })
  @ApiBody({
    type: CreateContactTagDto,
    description: 'Thông tin tag cần tạo.',
    examples: {
      support: {
        summary: 'Tag hỗ trợ kỹ thuật',
        description:
          'Dùng để gắn cho các ticket liên quan lỗi kỹ thuật hoặc vận hành hệ thống.',
        value: {
          name: 'Hỗ trợ kỹ thuật',
          color: '#2563EB',
          description:
            'Các vấn đề liên quan đến lỗi kỹ thuật và vận hành hệ thống',
        },
      },
      vip: {
        summary: 'Tag khách hàng VIP',
        description: 'Dùng để đánh dấu ticket của khách hàng ưu tiên.',
        value: {
          name: 'VIP',
          color: '#DC2626',
          description: 'Khách hàng ưu tiên cần xử lý nhanh',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo ContactTag thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.created',
      message: 'Đã tạo tag thành công',
      dataSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          color: { type: 'string' },
          description: { type: 'string' },
          is_active: { type: 'boolean', example: true },
        },
      },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'VIP',
        color: '#DC2626',
        description: 'Khách hàng ưu tiên cần xử lý nhanh',
        is_active: true,
      },
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên tag đã tồn tại hoặc dữ liệu tạo mới bị xung đột.',
    schema: buildErrorSchema({
      code: 'error.contact_tag.conflict',
      message: 'Tag với tên này đã tồn tại',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.create')
  async create(
    @Body() dto: CreateContactTagDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const tag = await this.contactTagService.create(dto, userId, lang);
    return new CreatedResponse(
      'contact-tag.created',
      tag,
      'Đã tạo tag thành công',
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách ContactTag',
    description:
      'Trả về danh sách tag có phân trang, hỗ trợ tìm kiếm theo từ khóa và lọc theo trạng thái hoạt động. Yêu cầu quyền `contact-tag.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi trên mỗi trang.',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu để phân trang.',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên hoặc mô tả tag.',
    example: 'hỗ trợ',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động của tag.',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ContactTag thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.list',
      message: 'Lấy danh sách tag thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                color: { type: 'string' },
                is_active: { type: 'boolean' },
              },
            },
          },
          total: { type: 'number', example: 2 },
          limit: { type: 'number', example: 10 },
          offset: { type: 'number', example: 0 },
        },
      },
      dataExample: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440021',
            name: 'VIP',
            color: '#DC2626',
            is_active: true,
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      },
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.list')
  async findAll(@Query() query: QueryContactTagDto, @I18nLang() lang: string) {
    const result = await this.contactTagService.findAll(query);
    return new GetResponse(
      'contact-tag.list',
      result,
      'Lấy danh sách tag thành công',
    );
  }

  @Get('active')
  @ApiOperation({
    summary: 'Lấy danh sách ContactTag đang active',
    description:
      'Trả về toàn bộ tag đang hoạt động để phục vụ dropdown hoặc bộ lọc nhanh. Không phân trang. Yêu cầu quyền `contact-tag.list`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ContactTag đang active thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.active',
      message: 'Lấy danh sách tag active thành công',
      dataSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            color: { type: 'string' },
          },
        },
      },
      dataExample: [
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          name: 'VIP',
          color: '#DC2626',
        },
      ],
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.list')
  async findAllActive() {
    const result = await this.contactTagService.findAllActive();
    return new GetResponse(
      'contact-tag.active',
      result,
      'Lấy danh sách tag active thành công',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết ContactTag',
    description:
      'Trả về đầy đủ thông tin của một ContactTag theo ID. Yêu cầu quyền `contact-tag.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID tag cần xem chi tiết.',
    example: '550e8400-e29b-41d4-a716-446655440021',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết ContactTag thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.read',
      message: 'Lấy chi tiết tag thành công',
      dataSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          is_active: { type: 'boolean' },
        },
      },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'VIP',
        description: 'Khách hàng ưu tiên cần xử lý nhanh',
        color: '#DC2626',
        is_active: true,
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ContactTag theo ID được cung cấp.',
    schema: buildErrorSchema({
      code: 'error.contact_tag.not_found',
      message: 'Không tìm thấy tag',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.read')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const tag = await this.contactTagService.findById(id, lang);
    return new GetResponse(
      'contact-tag.read',
      tag,
      'Lấy chi tiết tag thành công',
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật ContactTag',
    description:
      'Cập nhật tên, mô tả, màu sắc hoặc trạng thái hoạt động của một tag. Chỉ các trường được gửi mới được thay đổi. Yêu cầu quyền `contact-tag.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID tag cần cập nhật.',
    example: '550e8400-e29b-41d4-a716-446655440021',
  })
  @ApiBody({
    type: UpdateContactTagDto,
    description: 'Thông tin tag cần cập nhật.',
    examples: {
      rename: {
        summary: 'Đổi tên tag',
        value: {
          name: 'Khách hàng VIP',
          description: 'Ticket của khách hàng có độ ưu tiên cao',
        },
      },
      deactivate: {
        summary: 'Ngừng sử dụng tag',
        value: {
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ContactTag thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.updated',
      message: 'Đã cập nhật tag thành công',
      dataSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          is_active: { type: 'boolean' },
        },
      },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Khách hàng VIP',
        description: 'Ticket của khách hàng có độ ưu tiên cao',
        color: '#DC2626',
        is_active: true,
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ContactTag cần cập nhật.',
    schema: buildErrorSchema({
      code: 'error.contact_tag.not_found',
      message: 'Không tìm thấy tag',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên tag cập nhật bị trùng với tag khác.',
    schema: buildErrorSchema({
      code: 'error.contact_tag.conflict',
      message: 'Tag với tên này đã tồn tại',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactTagDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const tag = await this.contactTagService.update(id, dto, userId, lang);
    return new UpdatedResponse(
      'contact-tag.updated',
      tag,
      'Đã cập nhật tag thành công',
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa ContactTag',
    description:
      'Xóa mềm một ContactTag khỏi hệ thống theo ID. Yêu cầu quyền `contact-tag.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID tag cần xóa.',
    example: '550e8400-e29b-41d4-a716-446655440021',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ContactTag thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.deleted',
      message: 'Đã xóa tag thành công',
      dataSchema: { type: 'null', nullable: true },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ContactTag cần xóa.',
    schema: buildErrorSchema({
      code: 'error.contact_tag.not_found',
      message: 'Không tìm thấy tag',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.delete')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.contactTagService.delete(id, userId, lang);
    return new DeletedResponse(
      'contact-tag.deleted',
      null,
      'Đã xóa tag thành công',
    );
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều ContactTag',
    description:
      'Xóa mềm nhiều tag cùng lúc bằng danh sách ID. Yêu cầu quyền `contact-tag.delete`.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
        },
      },
      example: {
        ids: [
          '550e8400-e29b-41d4-a716-446655440021',
          '550e8400-e29b-41d4-a716-446655440022',
        ],
      },
    },
    description: 'Danh sách ID tag cần xóa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều ContactTag thành công.',
    schema: buildSuccessSchema({
      code: 'contact-tag.deletedMany',
      message: 'Đã xóa các tag thành công',
      dataSchema: { type: 'null', nullable: true },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Một hoặc nhiều tag trong danh sách không tồn tại.',
    schema: buildErrorSchema({
      code: 'error.contact_tag.not_found',
      message: 'Không tìm thấy một hoặc nhiều tag',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('contact-tag.delete')
  async deleteMany(
    @Body('ids') ids: string[],
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.contactTagService.deleteMany(ids, userId, lang);
    return new DeletedResponse(
      'contact-tag.deletedMany',
      null,
      'Đã xóa các tag thành công',
    );
  }
}
