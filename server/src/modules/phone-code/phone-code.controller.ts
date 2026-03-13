import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { DeleteManyDto } from '../../common/dto';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  CurrentUser,
  RequireAnyPermission,
  RequirePermission,
} from '../../common/decorators';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { CreatedResponse, DeletedResponse, GetResponse, UpdatedResponse } from '../../common/responses';
import { buildErrorSchema, buildSuccessSchema } from '../../common/swagger/master-data-swagger.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneCodeService } from './phone-code.service';
import { CreatePhoneCodeDto, QueryPhoneCodeDto, UpdatePhoneCodeDto } from './dto';
import { IPhoneCode, IPaginatedResponse } from './types';

const phoneCodeItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', description: 'ID đầu số điện thoại', example: '550e8400-e29b-41d4-a716-446655440301' },
    name: { type: 'string', description: 'Tên quốc gia', example: 'Việt Nam' },
    description: { type: 'string', nullable: true, description: 'Mô tả bổ sung', example: 'Quốc gia Đông Nam Á' },
    code: { type: 'string', description: 'Đầu số điện thoại quốc gia', example: '+84' },
    flag_url: { type: 'string', nullable: true, description: 'Đường dẫn ảnh cờ quốc gia', example: 'https://cdn.genhub.dev/flags/vn.svg' },
    is_active: { type: 'boolean', description: 'Trạng thái hoạt động', example: true },
    created_at: { type: 'string', format: 'date-time', description: 'Thời điểm tạo', example: '2026-03-13T09:00:00.000Z' },
    updated_at: { type: 'string', format: 'date-time', nullable: true, description: 'Thời điểm cập nhật gần nhất', example: '2026-03-13T10:10:00.000Z' },
  },
};

const phoneCodeExample = {
  id: '550e8400-e29b-41d4-a716-446655440301',
  name: 'Việt Nam',
  description: 'Quốc gia Đông Nam Á',
  code: '+84',
  flag_url: 'https://cdn.genhub.dev/flags/vn.svg',
  is_active: true,
  created_at: '2026-03-13T09:00:00.000Z',
  updated_at: '2026-03-13T10:10:00.000Z',
};

const phoneCodeListExample = {
  items: [
    phoneCodeExample,
    {
      id: '550e8400-e29b-41d4-a716-446655440302',
      name: 'Singapore',
      description: 'Quốc đảo phát triển tại Đông Nam Á',
      code: '+65',
      flag_url: 'https://cdn.genhub.dev/flags/sg.svg',
      is_active: true,
      created_at: '2026-03-12T08:45:00.000Z',
      updated_at: '2026-03-12T08:45:00.000Z',
    },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

@ApiTags('Phone Codes')
@Controller('phone-codes')
export class PhoneCodeController {
  constructor(
    private readonly service: PhoneCodeService,
    private readonly prisma: PrismaService,
  ) {}

  private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
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

    const hasDirect = user.system_permissions.some((p) => p.permission.key === permissionKey);
    if (hasDirect) return true;

    return user.system_roles.some((ur) => ur.role.permissions.some((rp) => rp.permission.key === permissionKey));
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo đầu số điện thoại mới',
    description:
      'Tạo mới đầu số điện thoại quốc gia để sử dụng trong form đăng ký, hồ sơ người dùng và các luồng nhập số điện thoại. Hệ thống kiểm tra trùng cả tên quốc gia lẫn đầu số. Yêu cầu quyền `phone-code.create`.',
  })
  @ApiBody({
    type: CreatePhoneCodeDto,
    description: 'Thông tin đầu số điện thoại cần tạo',
    examples: {
      vietnam: {
        summary: 'Tạo đầu số Việt Nam',
        value: {
          name: 'Việt Nam',
          description: 'Quốc gia Đông Nam Á',
          code: '+84',
          flag_url: 'https://cdn.genhub.dev/flags/vn.svg',
          is_active: true,
        },
      },
      singapore: {
        summary: 'Tạo đầu số Singapore',
        value: {
          name: 'Singapore',
          description: 'Quốc đảo phát triển tại Đông Nam Á',
          code: '+65',
          flag_url: 'https://cdn.genhub.dev/flags/sg.svg',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đầu số điện thoại thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.create.success',
      message: 'Tạo đầu số điện thoại thành công',
      dataSchema: phoneCodeItemSchema,
      dataExample: phoneCodeExample,
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên quốc gia hoặc đầu số điện thoại đã tồn tại',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Tên quốc gia hoặc đầu số điện thoại đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('phone-code.create')
  async create(
    @Body() dto: CreatePhoneCodeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IPhoneCode>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('phone-code.create.success', result);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách đầu số điện thoại',
    description:
      'Lấy danh sách đầu số điện thoại có phân trang, hỗ trợ tìm kiếm theo tên quốc gia, mô tả hoặc đầu số, đồng thời lọc theo trạng thái hoạt động. Người có quyền `phone-code.list.all` xem được toàn bộ dữ liệu, ngược lại chỉ xem dữ liệu do mình tạo.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi tối đa trên một trang', example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu của danh sách', example: 0 })
  @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm theo tên quốc gia, mô tả hoặc đầu số', example: '+84' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái hoạt động', example: true })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách đầu số điện thoại thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.list.success',
      message: 'Lấy danh sách đầu số điện thoại thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: phoneCodeItemSchema, description: 'Danh sách đầu số điện thoại' },
          total: { type: 'number', description: 'Tổng số bản ghi phù hợp', example: 2 },
          limit: { type: 'number', description: 'Giới hạn số bản ghi mỗi trang', example: 10 },
          offset: { type: 'number', description: 'Vị trí bắt đầu', example: 0 },
        },
      },
      dataExample: phoneCodeListExample,
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.list', 'phone-code.list.all')
  async findAll(
    @Query() query: QueryPhoneCodeDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<IPhoneCode>>> {
    const hasListAll = await this.hasPermission(userId, 'phone-code.list.all');
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('phone-code.list.success', result);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Lấy danh sách đầu số điện thoại đang hoạt động',
    description:
      'API public trả về danh sách đầu số đang bật để client sử dụng trong dropdown chọn quốc gia hoặc mã vùng điện thoại.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi tối đa trên một trang', example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu của danh sách', example: 0 })
  @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm theo tên quốc gia, mô tả hoặc đầu số', example: 'Việt Nam' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Tham số lọc bổ sung, thông thường luôn là true với API này', example: true })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách đầu số đang hoạt động thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.list.success',
      message: 'Lấy danh sách đầu số đang hoạt động thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: phoneCodeItemSchema, description: 'Danh sách đầu số điện thoại đang hoạt động' },
          total: { type: 'number', description: 'Tổng số bản ghi phù hợp', example: 2 },
          limit: { type: 'number', description: 'Giới hạn số bản ghi mỗi trang', example: 10 },
          offset: { type: 'number', description: 'Vị trí bắt đầu', example: 0 },
        },
      },
      dataExample: phoneCodeListExample,
    }),
  })
  @ApiValidationErrorResponse()
  async findAllActive(@Query() query: QueryPhoneCodeDto): Promise<GetResponse<IPaginatedResponse<IPhoneCode>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('phone-code.list.success', result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết đầu số điện thoại',
    description:
      'Lấy thông tin chi tiết một đầu số điện thoại theo ID. Người có quyền `phone-code.read.all` xem được mọi bản ghi, ngược lại chỉ xem được dữ liệu do mình tạo.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID đầu số điện thoại cần lấy chi tiết', example: '550e8400-e29b-41d4-a716-446655440301' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết đầu số điện thoại thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.get.success',
      message: 'Lấy chi tiết đầu số điện thoại thành công',
      dataSchema: phoneCodeItemSchema,
      dataExample: phoneCodeExample,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID đầu số điện thoại không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đầu số điện thoại',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy đầu số điện thoại',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.read', 'phone-code.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPhoneCode>> {
    const hasReadAll = await this.hasPermission(userId, 'phone-code.read.all');
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('phone-code.get.success', result);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật đầu số điện thoại',
    description:
      'Cập nhật thông tin đầu số điện thoại quốc gia. Hệ thống kiểm tra trùng cả tên quốc gia và đầu số để tránh dữ liệu lặp.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID đầu số điện thoại cần cập nhật', example: '550e8400-e29b-41d4-a716-446655440301' })
  @ApiBody({
    type: UpdatePhoneCodeDto,
    description: 'Các trường cần cập nhật cho đầu số điện thoại',
    examples: {
      update_name: {
        summary: 'Cập nhật tên và mô tả',
        value: {
          name: 'Việt Nam (VN)',
          description: 'Quốc gia Đông Nam Á có mã vùng +84',
        },
      },
      update_code: {
        summary: 'Cập nhật cờ và trạng thái',
        value: {
          flag_url: 'https://cdn.genhub.dev/flags/vietnam.svg',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đầu số điện thoại thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.update.success',
      message: 'Cập nhật đầu số điện thoại thành công',
      dataSchema: phoneCodeItemSchema,
      dataExample: {
        ...phoneCodeExample,
        name: 'Việt Nam (VN)',
        description: 'Quốc gia Đông Nam Á có mã vùng +84',
        updated_at: '2026-03-13T11:25:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID đầu số điện thoại không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đầu số điện thoại cần cập nhật',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy đầu số điện thoại',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên quốc gia hoặc đầu số điện thoại đã tồn tại',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Tên quốc gia hoặc đầu số điện thoại đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.update', 'phone-code.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhoneCodeDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IPhoneCode>> {
    const hasUpdateAll = await this.hasPermission(userId, 'phone-code.update.all');
    const result = await this.service.update(id, dto, userId, hasUpdateAll, lang);
    return new UpdatedResponse('phone-code.update.success', result);
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều đầu số điện thoại',
    description:
      'Soft delete nhiều đầu số điện thoại trong một request. Thao tác phù hợp khi cần dọn dữ liệu mã vùng không còn sử dụng.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID đầu số điện thoại cần xóa',
    examples: {
      delete_selected: {
        summary: 'Xóa nhiều đầu số',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440302',
            '550e8400-e29b-41d4-a716-446655440303',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều đầu số điện thoại thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.delete.success',
      message: 'Xóa nhiều đầu số điện thoại thành công',
      dataSchema: { type: 'null', nullable: true, description: 'API hiện không trả thêm dữ liệu sau khi xóa' },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đầu số điện thoại phù hợp để xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy đầu số điện thoại',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.delete', 'phone-code.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'phone-code.delete.all');
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('phone-code.delete.success', null);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa đầu số điện thoại',
    description:
      'Soft delete một đầu số điện thoại theo ID.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID đầu số điện thoại cần xóa', example: '550e8400-e29b-41d4-a716-446655440302' })
  @ApiResponse({
    status: 200,
    description: 'Xóa đầu số điện thoại thành công',
    schema: buildSuccessSchema({
      code: 'phone-code.delete.success',
      message: 'Xóa đầu số điện thoại thành công',
      dataSchema: { type: 'null', nullable: true, description: 'API hiện không trả thêm dữ liệu sau khi xóa' },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID đầu số điện thoại không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đầu số điện thoại cần xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy đầu số điện thoại',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('phone-code.delete', 'phone-code.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'phone-code.delete.all');
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('phone-code.delete.success', null);
  }
}
