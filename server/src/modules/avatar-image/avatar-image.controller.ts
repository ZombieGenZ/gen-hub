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
  buildErrorSchema,
  buildSuccessSchema,
} from '../../common/swagger/master-data-swagger.helper';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses';
import { PrismaService } from '../../prisma/prisma.service';
import { AvatarImageService } from './avatar-image.service';
import {
  CreateAvatarImageDto,
  QueryAvatarImageDto,
  UpdateAvatarImageDto,
} from './dto';
import { IAvatarImage, IPaginatedResponse } from './types';

const avatarImageItemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'ID ảnh avatar',
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
    name: {
      type: 'string',
      description: 'Tên ảnh avatar',
      example: 'Avatar mặc định xanh ngọc',
    },
    description: {
      type: 'string',
      nullable: true,
      description: 'Mô tả ngắn về ảnh avatar',
      example: 'Ảnh mặc định dùng cho tài khoản mới',
    },
    image_url: {
      type: 'string',
      description: 'Đường dẫn ảnh avatar',
      example: 'https://cdn.genhub.dev/avatars/default-teal.png',
    },
    is_default: {
      type: 'boolean',
      description: 'Đánh dấu ảnh mặc định của hệ thống',
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
      description: 'Thời điểm tạo bản ghi',
      example: '2026-03-13T09:00:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'Thời điểm cập nhật gần nhất',
      example: '2026-03-13T10:15:00.000Z',
    },
  },
};

const avatarImageExample = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Avatar mặc định xanh ngọc',
  description: 'Ảnh mặc định dùng cho tài khoản mới',
  image_url: 'https://cdn.genhub.dev/avatars/default-teal.png',
  is_default: true,
  is_active: true,
  created_at: '2026-03-13T09:00:00.000Z',
  updated_at: '2026-03-13T10:15:00.000Z',
};

const avatarImageListExample = {
  items: [
    avatarImageExample,
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Avatar tối giản xám',
      description: 'Phù hợp cho hồ sơ doanh nghiệp',
      image_url: 'https://cdn.genhub.dev/avatars/minimal-gray.png',
      is_default: false,
      is_active: true,
      created_at: '2026-03-12T08:30:00.000Z',
      updated_at: '2026-03-12T08:30:00.000Z',
    },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

@ApiTags('Avatar Images')
@Controller('avatar-images')
export class AvatarImageController {
  constructor(
    private readonly service: AvatarImageService,
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
    summary: 'Tạo ảnh avatar mới',
    description:
      'Tạo một ảnh avatar mới để sử dụng trong hệ thống. Có thể đánh dấu ảnh vừa tạo là ảnh mặc định, khi đó ảnh mặc định cũ sẽ bị thay thế. Yêu cầu quyền `avatar-image.create`.',
  })
  @ApiBody({
    type: CreateAvatarImageDto,
    description: 'Thông tin ảnh avatar cần tạo',
    examples: {
      default_avatar: {
        summary: 'Tạo ảnh mặc định mới',
        description:
          'Dùng khi quản trị viên muốn đổi ảnh avatar mặc định của hệ thống',
        value: {
          name: 'Avatar mặc định xanh ngọc',
          description: 'Ảnh mặc định cho người dùng mới',
          image_url: 'https://cdn.genhub.dev/avatars/default-teal.png',
          is_default: true,
          is_active: true,
        },
      },
      normal_avatar: {
        summary: 'Tạo ảnh avatar thường',
        description: 'Ảnh có sẵn trong thư viện để người dùng tự chọn',
        value: {
          name: 'Avatar tối giản xám',
          description: 'Phong cách doanh nghiệp, nền trung tính',
          image_url: 'https://cdn.genhub.dev/avatars/minimal-gray.png',
          is_default: false,
          is_active: true,
        },
      },
      inactive_avatar: {
        summary: 'Tạo ảnh nhưng chưa kích hoạt',
        description: 'Dùng cho ảnh nháp hoặc ảnh chuẩn bị phát hành sau',
        value: {
          name: 'Avatar chiến dịch mùa hè',
          description: 'Sẽ bật vào chiến dịch truyền thông tháng 6',
          image_url: 'https://cdn.genhub.dev/avatars/summer-campaign.png',
          is_default: false,
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo ảnh avatar thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.create.success',
      message: 'Tạo ảnh avatar thành công',
      dataSchema: avatarImageItemSchema,
      dataExample: avatarImageExample,
    }),
  })
  @ApiResponse({
    status: 409,
    description:
      'Tên ảnh avatar đã tồn tại hoặc thao tác xung đột với ảnh mặc định hiện có',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Tên ảnh avatar đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('avatar-image.create')
  async create(
    @Body() dto: CreateAvatarImageDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IAvatarImage>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('avatar-image.create.success', result);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách ảnh avatar',
    description:
      'Lấy danh sách ảnh avatar có phân trang, hỗ trợ tìm kiếm theo tên hoặc mô tả và lọc theo trạng thái hoạt động. Người có quyền `avatar-image.list.all` sẽ xem toàn bộ dữ liệu, ngược lại chỉ xem dữ liệu do mình tạo.',
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
    description: 'Từ khóa tìm theo tên hoặc mô tả ảnh avatar',
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
    description: 'Lấy danh sách ảnh avatar thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.list.success',
      message: 'Lấy danh sách ảnh avatar thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: avatarImageItemSchema,
            description: 'Danh sách ảnh avatar',
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
      dataExample: avatarImageListExample,
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.list', 'avatar-image.list.all')
  async findAll(
    @Query() query: QueryAvatarImageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<IAvatarImage>>> {
    const hasListAll = await this.hasPermission(
      userId,
      'avatar-image.list.all',
    );
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('avatar-image.list.success', result);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Lấy danh sách ảnh avatar đang hoạt động',
    description:
      'API public trả về danh sách ảnh avatar đang bật để hiển thị cho ứng dụng client, form đăng ký hoặc màn chọn avatar. Hỗ trợ phân trang và lọc từ khóa.',
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
    description: 'Từ khóa tìm theo tên hoặc mô tả ảnh avatar',
    example: 'xám',
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
    description: 'Lấy danh sách ảnh avatar đang hoạt động thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.list.success',
      message: 'Lấy danh sách ảnh avatar đang hoạt động thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: avatarImageItemSchema,
            description: 'Danh sách ảnh avatar đang hoạt động',
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
      dataExample: avatarImageListExample,
    }),
  })
  @ApiValidationErrorResponse()
  async findAllActive(
    @Query() query: QueryAvatarImageDto,
  ): Promise<GetResponse<IPaginatedResponse<IAvatarImage>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('avatar-image.list.success', result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết ảnh avatar',
    description:
      'Lấy thông tin chi tiết của một ảnh avatar theo ID. Người có quyền `avatar-image.read.all` xem được mọi bản ghi, ngược lại chỉ xem được bản ghi do mình tạo.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID ảnh avatar cần lấy chi tiết',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết ảnh avatar thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.get.success',
      message: 'Lấy chi tiết ảnh avatar thành công',
      dataSchema: avatarImageItemSchema,
      dataExample: avatarImageExample,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID ảnh avatar không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh avatar',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh avatar',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.read', 'avatar-image.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IAvatarImage>> {
    const hasReadAll = await this.hasPermission(
      userId,
      'avatar-image.read.all',
    );
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('avatar-image.get.success', result);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật ảnh avatar',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin ảnh avatar. Có thể bật ảnh thành mặc định, nhưng không được bỏ trạng thái mặc định của ảnh mặc định hiện tại nếu chưa gán ảnh khác thay thế. Yêu cầu quyền `avatar-image.update` hoặc `avatar-image.update.all`.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID ảnh avatar cần cập nhật',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateAvatarImageDto,
    description: 'Các trường cần cập nhật cho ảnh avatar',
    examples: {
      update_name: {
        summary: 'Cập nhật tên và mô tả',
        description: 'Dùng khi đổi nội dung hiển thị của ảnh avatar',
        value: {
          name: 'Avatar doanh nghiệp màu bạc',
          description: 'Ảnh dùng cho tài khoản doanh nghiệp cao cấp',
        },
      },
      update_default: {
        summary: 'Đặt làm ảnh mặc định',
        description: 'Dùng khi muốn chuyển ảnh này thành avatar mặc định mới',
        value: {
          is_default: true,
          is_active: true,
        },
      },
      update_status: {
        summary: 'Tạm ngưng ảnh avatar',
        description: 'Ẩn ảnh khỏi thư viện chọn avatar nhưng vẫn giữ dữ liệu',
        value: {
          is_active: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ảnh avatar thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.update.success',
      message: 'Cập nhật ảnh avatar thành công',
      dataSchema: avatarImageItemSchema,
      dataExample: {
        ...avatarImageExample,
        name: 'Avatar doanh nghiệp màu bạc',
        description: 'Ảnh dùng cho tài khoản doanh nghiệp cao cấp',
        is_default: false,
        updated_at: '2026-03-13T11:20:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID ảnh avatar không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh avatar cần cập nhật',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh avatar',
    }),
  })
  @ApiResponse({
    status: 409,
    description:
      'Tên ảnh avatar đã tồn tại hoặc thao tác cập nhật xung đột với ảnh mặc định',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message:
        'Không thể bỏ trạng thái mặc định của ảnh avatar mặc định hiện tại',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.update', 'avatar-image.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvatarImageDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IAvatarImage>> {
    const hasUpdateAll = await this.hasPermission(
      userId,
      'avatar-image.update.all',
    );
    const result = await this.service.update(
      id,
      dto,
      userId,
      hasUpdateAll,
      lang,
    );
    return new UpdatedResponse('avatar-image.update.success', result);
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều ảnh avatar',
    description:
      'Soft delete nhiều ảnh avatar trong một request. Nếu danh sách chứa ảnh mặc định hiện tại, hệ thống sẽ từ chối để tránh mất cấu hình mặc định. Yêu cầu quyền `avatar-image.delete` hoặc `avatar-image.delete.all`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID ảnh avatar cần xóa',
    examples: {
      delete_selected: {
        summary: 'Xóa 2 ảnh avatar thường',
        description: 'Ví dụ xóa hàng loạt các ảnh không còn sử dụng',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều ảnh avatar thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.delete.success',
      message: 'Xóa nhiều ảnh avatar thành công',
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
    description: 'Không tìm thấy bất kỳ ảnh avatar nào phù hợp để xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh avatar',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Danh sách xóa chứa ảnh avatar mặc định đang được sử dụng',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể xóa ảnh avatar mặc định',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.delete', 'avatar-image.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(
      userId,
      'avatar-image.delete.all',
    );
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('avatar-image.delete.success', null);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa ảnh avatar',
    description:
      'Soft delete một ảnh avatar theo ID. Hệ thống không cho phép xóa ảnh avatar đang được đánh dấu mặc định. Yêu cầu quyền `avatar-image.delete` hoặc `avatar-image.delete.all`.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID ảnh avatar cần xóa',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa ảnh avatar thành công',
    schema: buildSuccessSchema({
      code: 'avatar-image.delete.success',
      message: 'Xóa ảnh avatar thành công',
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
      message: 'ID ảnh avatar không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ảnh avatar cần xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy ảnh avatar',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Ảnh avatar đang là ảnh mặc định nên không thể xóa',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể xóa ảnh avatar mặc định',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('avatar-image.delete', 'avatar-image.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(
      userId,
      'avatar-image.delete.all',
    );
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('avatar-image.delete.success', null);
  }
}
