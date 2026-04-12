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
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses';
import {
  buildErrorSchema,
  buildSuccessSchema,
} from '../../common/swagger/master-data-swagger.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { CoverImageService } from './cover-image.service';
import {
  CreateCoverImageDto,
  QueryCoverImageDto,
  UpdateCoverImageDto,
} from './dto';
import { ICoverImage, IPaginatedResponse } from './types';

const coverImageItemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'ID ảnh bìa',
      example: '550e8400-e29b-41d4-a716-446655440101',
    },
    name: {
      type: 'string',
      description: 'Tên ảnh bìa',
      example: 'Cover mặc định xanh biển',
    },
    description: {
      type: 'string',
      nullable: true,
      description: 'Mô tả ngắn về ảnh bìa',
      example: 'Ảnh bìa mặc định cho hồ sơ người dùng',
    },
    image_url: {
      type: 'string',
      description: 'Đường dẫn ảnh bìa',
      example: 'https://cdn.genhub.dev/covers/default-ocean.png',
    },
    is_default: {
      type: 'boolean',
      description: 'Đánh dấu ảnh bìa mặc định',
      example: true,
    },
    is_active: {
      type: 'boolean',
      description: 'Trạng thái hoạt động',
      example: true,
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      description: 'Thời điểm tạo',
      example: '2026-03-13T09:00:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'Thời điểm cập nhật gần nhất',
      example: '2026-03-13T10:30:00.000Z',
    },
  },
};

const coverImageExample = {
  id: '550e8400-e29b-41d4-a716-446655440101',
  name: 'Cover mặc định xanh biển',
  description: 'Ảnh bìa mặc định cho hồ sơ người dùng',
  image_url: 'https://cdn.genhub.dev/covers/default-ocean.png',
  is_default: true,
  is_active: true,
  created_at: '2026-03-13T09:00:00.000Z',
  updated_at: '2026-03-13T10:30:00.000Z',
};

const coverImageListExample = {
  items: [
    coverImageExample,
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      name: 'Cover thành phố đêm',
      description: 'Ảnh bìa cho chiến dịch thương hiệu hiện đại',
      image_url: 'https://cdn.genhub.dev/covers/city-night.png',
      is_default: false,
      is_active: true,
      created_at: '2026-03-12T08:15:00.000Z',
      updated_at: '2026-03-12T08:15:00.000Z',
    },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

@ApiTags('Cover Images')
@Controller('cover-images')
export class CoverImageController {
  constructor(
    private readonly service: CoverImageService,
    private readonly prisma: PrismaService,
  ) {}

  private async hasPermission(
    userId: string,
    permissionKey: string,
  ): Promise<boolean> {
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

    const hasDirect = user.system_permissions.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirect) return true;

    return user.system_roles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo ảnh bìa mới',
    description:
      'Tạo một ảnh bìa mới cho hệ thống. Có thể gắn ảnh vừa tạo làm ảnh bìa mặc định, khi đó ảnh mặc định cũ sẽ bị thay thế. Yêu cầu quyền `cover-image.create`.',
  })
  @ApiBody({
    type: CreateCoverImageDto,
    description: 'Thông tin ảnh bìa cần tạo',
    examples: {
      default_cover: {
        summary: 'Tạo ảnh bìa mặc định',
        value: {
          name: 'Cover mặc định xanh biển',
          description: 'Ảnh bìa mặc định cho hồ sơ người dùng',
          image_url: 'https://cdn.genhub.dev/covers/default-ocean.png',
          is_default: true,
          is_active: true,
        },
      },
      campaign_cover: {
        summary: 'Tạo ảnh bìa chiến dịch',
        value: {
          name: 'Cover chiến dịch mùa hè',
          description: 'Dùng cho landing page mùa hè',
          image_url: 'https://cdn.genhub.dev/covers/summer-2026.png',
          is_default: false,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo ảnh bìa thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.create.success',
      message: 'Tạo ảnh bìa thành công',
      dataSchema: coverImageItemSchema,
      dataExample: coverImageExample,
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên ảnh bìa đã tồn tại hoặc thao tác mặc định gây xung đột',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Tên ảnh bìa đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('cover-image.create')
  async create(
    @Body() dto: CreateCoverImageDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<ICoverImage>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('cover-image.create.success', result);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách ảnh bìa',
    description:
      'Lấy danh sách ảnh bìa có phân trang, hỗ trợ tìm kiếm theo tên hoặc mô tả và lọc theo trạng thái hoạt động. Người có quyền `cover-image.list.all` xem được toàn bộ dữ liệu, ngược lại chỉ xem dữ liệu do mình tạo.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa trên một trang',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu của danh sách',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm theo tên hoặc mô tả ảnh bìa',
    example: 'mặc định',
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
    description: 'Lấy danh sách ảnh bìa thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.list.success',
      message: 'Lấy danh sách ảnh bìa thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: coverImageItemSchema,
            description: 'Danh sách ảnh bìa',
          },
          total: {
            type: 'number',
            description: 'Tổng số bản ghi phù hợp',
            example: 2,
          },
          limit: {
            type: 'number',
            description: 'Giới hạn số bản ghi mỗi trang',
            example: 10,
          },
          offset: { type: 'number', description: 'Vị trí bắt đầu', example: 0 },
        },
      },
      dataExample: coverImageListExample,
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('cover-image.list', 'cover-image.list.all')
  async findAll(
    @Query() query: QueryCoverImageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<ICoverImage>>> {
    const hasListAll = await this.hasPermission(userId, 'cover-image.list.all');
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('cover-image.list.success', result);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Lấy danh sách ảnh bìa đang hoạt động',
    description:
      'API public trả về danh sách ảnh bìa đang bật để ứng dụng client hiển thị trong phần lựa chọn ảnh bìa hồ sơ hoặc giao diện trang cá nhân.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa trên một trang',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu của danh sách',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm theo tên hoặc mô tả ảnh bìa',
    example: 'thành phố',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Tham số lọc bổ sung, thông thường luôn là true với API này',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ảnh bìa đang hoạt động thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.list.success',
      message: 'Lấy danh sách ảnh bìa đang hoạt động thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: coverImageItemSchema,
            description: 'Danh sách ảnh bìa đang hoạt động',
          },
          total: {
            type: 'number',
            description: 'Tổng số bản ghi phù hợp',
            example: 2,
          },
          limit: {
            type: 'number',
            description: 'Giới hạn số bản ghi mỗi trang',
            example: 10,
          },
          offset: { type: 'number', description: 'Vị trí bắt đầu', example: 0 },
        },
      },
      dataExample: coverImageListExample,
    }),
  })
  @ApiValidationErrorResponse()
  async findAllActive(
    @Query() query: QueryCoverImageDto,
  ): Promise<GetResponse<IPaginatedResponse<ICoverImage>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('cover-image.list.success', result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết ảnh bìa',
    description:
      'Lấy thông tin chi tiết một ảnh bìa theo ID. Người có quyền `cover-image.read.all` xem được mọi bản ghi, ngược lại chỉ xem được dữ liệu do mình tạo.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID ảnh bìa cần lấy chi tiết',
    example: '550e8400-e29b-41d4-a716-446655440101',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết ảnh bìa thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.get.success',
      message: 'Lấy chi tiết ảnh bìa thành công',
      dataSchema: coverImageItemSchema,
      dataExample: coverImageExample,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID ảnh bìa không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh bìa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh bìa',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('cover-image.read', 'cover-image.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<ICoverImage>> {
    const hasReadAll = await this.hasPermission(userId, 'cover-image.read.all');
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('cover-image.get.success', result);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật ảnh bìa',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin ảnh bìa. Có thể đặt ảnh thành mặc định mới, nhưng không được bỏ cờ mặc định của ảnh mặc định hiện tại nếu chưa có ảnh khác thay thế.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID ảnh bìa cần cập nhật',
    example: '550e8400-e29b-41d4-a716-446655440101',
  })
  @ApiBody({
    type: UpdateCoverImageDto,
    description: 'Các trường cần cập nhật cho ảnh bìa',
    examples: {
      update_info: {
        summary: 'Cập nhật tên và mô tả',
        value: {
          name: 'Cover hồ sơ doanh nghiệp',
          description: 'Ảnh bìa chuyên dụng cho tổ chức lớn',
        },
      },
      set_default: {
        summary: 'Đặt làm ảnh bìa mặc định',
        value: {
          is_default: true,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ảnh bìa thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.update.success',
      message: 'Cập nhật ảnh bìa thành công',
      dataSchema: coverImageItemSchema,
      dataExample: {
        ...coverImageExample,
        name: 'Cover hồ sơ doanh nghiệp',
        description: 'Ảnh bìa chuyên dụng cho tổ chức lớn',
        updated_at: '2026-03-13T11:45:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID ảnh bìa không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh bìa cần cập nhật',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh bìa',
    }),
  })
  @ApiResponse({
    status: 409,
    description:
      'Tên ảnh bìa đã tồn tại hoặc thao tác cập nhật xung đột với ảnh mặc định',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể bỏ trạng thái mặc định của ảnh bìa mặc định hiện tại',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('cover-image.update', 'cover-image.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCoverImageDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<ICoverImage>> {
    const hasUpdateAll = await this.hasPermission(
      userId,
      'cover-image.update.all',
    );
    const result = await this.service.update(
      id,
      dto,
      userId,
      hasUpdateAll,
      lang,
    );
    return new UpdatedResponse('cover-image.update.success', result);
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều ảnh bìa',
    description:
      'Soft delete nhiều ảnh bìa trong một request. Nếu danh sách chứa ảnh bìa mặc định đang được dùng, hệ thống sẽ từ chối thao tác để giữ cấu hình mặc định.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID ảnh bìa cần xóa',
    examples: {
      delete_selected: {
        summary: 'Xóa 2 ảnh bìa thường',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440102',
            '550e8400-e29b-41d4-a716-446655440103',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều ảnh bìa thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.delete.success',
      message: 'Xóa nhiều ảnh bìa thành công',
      dataSchema: {
        type: 'null',
        nullable: true,
        description: 'API hiện không trả thêm dữ liệu sau khi xóa',
      },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh bìa phù hợp để xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh bìa',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Danh sách xóa chứa ảnh bìa mặc định đang được sử dụng',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể xóa ảnh bìa mặc định',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('cover-image.delete', 'cover-image.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(
      userId,
      'cover-image.delete.all',
    );
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('cover-image.delete.success', null);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa ảnh bìa',
    description:
      'Soft delete một ảnh bìa theo ID. Hệ thống không cho phép xóa ảnh bìa đang là ảnh mặc định hiện tại.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID ảnh bìa cần xóa',
    example: '550e8400-e29b-41d4-a716-446655440102',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ảnh bìa thành công',
    schema: buildSuccessSchema({
      code: 'cover-image.delete.success',
      message: 'Xóa ảnh bìa thành công',
      dataSchema: {
        type: 'null',
        nullable: true,
        description: 'API hiện không trả thêm dữ liệu sau khi xóa',
      },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID ảnh bìa không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh bìa cần xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh bìa',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Ảnh bìa đang là ảnh mặc định nên không thể xóa',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể xóa ảnh bìa mặc định',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('cover-image.delete', 'cover-image.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(
      userId,
      'cover-image.delete.all',
    );
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('cover-image.delete.success', null);
  }
}
