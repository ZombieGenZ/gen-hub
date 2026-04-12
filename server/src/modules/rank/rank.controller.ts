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
import { RankService } from './rank.service';
import { CreateRankDto, QueryRankDto, UpdateRankDto } from './dto';
import { IRank, IPaginatedResponse } from './types';

const rankItemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'ID hạng thành viên',
      example: '550e8400-e29b-41d4-a716-446655440201',
    },
    name: {
      type: 'string',
      description: 'Tên hạng',
      example: 'Thành viên Bạc',
    },
    description: {
      type: 'string',
      nullable: true,
      description: 'Mô tả hạng thành viên',
      example: 'Áp dụng cho khách hàng mới đạt từ 500 điểm',
    },
    is_default: {
      type: 'boolean',
      description: 'Đánh dấu hạng mặc định của hệ thống',
      example: false,
    },
    min_loyalty_points: {
      type: 'number',
      description: 'Điểm tích lũy tối thiểu để đạt hạng',
      example: 500,
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
      example: '2026-03-13T11:00:00.000Z',
    },
  },
};

const rankExample = {
  id: '550e8400-e29b-41d4-a716-446655440201',
  name: 'Thành viên Bạc',
  description: 'Áp dụng cho khách hàng mới đạt từ 500 điểm',
  is_default: false,
  min_loyalty_points: 500,
  is_active: true,
  created_at: '2026-03-13T09:00:00.000Z',
  updated_at: '2026-03-13T11:00:00.000Z',
};

const rankListExample = {
  items: [
    rankExample,
    {
      id: '550e8400-e29b-41d4-a716-446655440202',
      name: 'Thành viên Vàng',
      description: 'Khách hàng trung thành đạt từ 2000 điểm',
      is_default: false,
      min_loyalty_points: 2000,
      is_active: true,
      created_at: '2026-03-12T08:00:00.000Z',
      updated_at: '2026-03-12T08:00:00.000Z',
    },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

@ApiTags('Ranks')
@Controller('ranks')
export class RankController {
  constructor(
    private readonly service: RankService,
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
    summary: 'Tạo hạng thành viên mới',
    description:
      'Tạo mới một hạng thành viên để áp dụng cho chương trình loyalty. Có thể gắn hạng vừa tạo làm hạng mặc định, khi đó hạng mặc định cũ sẽ bị thay thế. Yêu cầu quyền `rank.create`.',
  })
  @ApiBody({
    type: CreateRankDto,
    description: 'Thông tin hạng thành viên cần tạo',
    examples: {
      silver_rank: {
        summary: 'Tạo hạng Bạc',
        value: {
          name: 'Thành viên Bạc',
          description: 'Áp dụng cho khách hàng đạt từ 500 điểm',
          is_default: false,
          min_loyalty_points: 500,
          is_active: true,
        },
      },
      default_rank: {
        summary: 'Tạo hạng mặc định',
        value: {
          name: 'Thành viên Mới',
          description: 'Hạng mặc định cho tài khoản mới đăng ký',
          is_default: true,
          min_loyalty_points: 0,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo hạng thành viên thành công',
    schema: buildSuccessSchema({
      code: 'rank.create.success',
      message: 'Tạo hạng thành viên thành công',
      dataSchema: rankItemSchema,
      dataExample: rankExample,
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Tên hạng đã tồn tại hoặc thao tác hạng mặc định gây xung đột',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Tên hạng đã tồn tại trong hệ thống',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('rank.create')
  async create(
    @Body() dto: CreateRankDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IRank>> {
    const result = await this.service.create(dto, userId, lang);
    return new CreatedResponse('rank.create.success', result);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách hạng thành viên',
    description:
      'Lấy danh sách hạng thành viên có phân trang, hỗ trợ tìm kiếm theo tên hoặc mô tả và lọc theo trạng thái hoạt động. Người có quyền `rank.list.all` xem được toàn bộ dữ liệu, ngược lại chỉ xem dữ liệu do mình tạo.',
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
    description: 'Từ khóa tìm theo tên hoặc mô tả hạng',
    example: 'bạc',
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
    description: 'Lấy danh sách hạng thành viên thành công',
    schema: buildSuccessSchema({
      code: 'rank.list.success',
      message: 'Lấy danh sách hạng thành viên thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: rankItemSchema,
            description: 'Danh sách hạng thành viên',
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
      dataExample: rankListExample,
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.list', 'rank.list.all')
  async findAll(
    @Query() query: QueryRankDto,
    @CurrentUser('userId') userId: string,
  ): Promise<GetResponse<IPaginatedResponse<IRank>>> {
    const hasListAll = await this.hasPermission(userId, 'rank.list.all');
    const result = await this.service.findAll(query, userId, hasListAll);
    return new GetResponse('rank.list.success', result);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Lấy danh sách hạng thành viên đang hoạt động',
    description:
      'API public trả về danh sách hạng đang được kích hoạt để ứng dụng client hiển thị trong các màn loyalty, profile hoặc bảng quyền lợi.',
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
    description: 'Từ khóa tìm theo tên hoặc mô tả hạng',
    example: 'vàng',
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
    description: 'Lấy danh sách hạng đang hoạt động thành công',
    schema: buildSuccessSchema({
      code: 'rank.list.success',
      message: 'Lấy danh sách hạng đang hoạt động thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: rankItemSchema,
            description: 'Danh sách hạng đang hoạt động',
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
      dataExample: rankListExample,
    }),
  })
  @ApiValidationErrorResponse()
  async findAllActive(
    @Query() query: QueryRankDto,
  ): Promise<GetResponse<IPaginatedResponse<IRank>>> {
    const result = await this.service.findAllActive(query);
    return new GetResponse('rank.list.success', result);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết hạng thành viên',
    description:
      'Lấy thông tin chi tiết của một hạng thành viên theo ID. Người có quyền `rank.read.all` xem được mọi bản ghi, ngược lại chỉ xem được dữ liệu do mình tạo.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID hạng thành viên cần lấy chi tiết',
    example: '550e8400-e29b-41d4-a716-446655440201',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết hạng thành viên thành công',
    schema: buildSuccessSchema({
      code: 'rank.get.success',
      message: 'Lấy chi tiết hạng thành viên thành công',
      dataSchema: rankItemSchema,
      dataExample: rankExample,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID hạng thành viên không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hạng thành viên',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy hạng thành viên',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.read', 'rank.read.all')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IRank>> {
    const hasReadAll = await this.hasPermission(userId, 'rank.read.all');
    const result = await this.service.findById(id, userId, hasReadAll, lang);
    return new GetResponse('rank.get.success', result);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật hạng thành viên',
    description:
      'Cập nhật thông tin hạng thành viên. Có thể điều chỉnh mốc điểm, mô tả hoặc đặt hạng thành mặc định mới. Hệ thống không cho phép bỏ cờ mặc định của hạng mặc định hiện tại nếu chưa có hạng khác thay thế.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID hạng thành viên cần cập nhật',
    example: '550e8400-e29b-41d4-a716-446655440201',
  })
  @ApiBody({
    type: UpdateRankDto,
    description: 'Các trường cần cập nhật cho hạng thành viên',
    examples: {
      update_points: {
        summary: 'Điều chỉnh mốc điểm',
        value: {
          min_loyalty_points: 750,
          description: 'Áp dụng cho khách hàng đạt từ 750 điểm',
        },
      },
      set_default: {
        summary: 'Đặt hạng làm mặc định',
        value: {
          is_default: true,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật hạng thành viên thành công',
    schema: buildSuccessSchema({
      code: 'rank.update.success',
      message: 'Cập nhật hạng thành viên thành công',
      dataSchema: rankItemSchema,
      dataExample: {
        ...rankExample,
        min_loyalty_points: 750,
        description: 'Áp dụng cho khách hàng đạt từ 750 điểm',
        updated_at: '2026-03-13T11:30:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'ID không đúng định dạng UUID',
    schema: buildErrorSchema({
      code: 'error.bad_request',
      message: 'ID hạng thành viên không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hạng thành viên cần cập nhật',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy hạng thành viên',
    }),
  })
  @ApiResponse({
    status: 409,
    description:
      'Tên hạng đã tồn tại hoặc thao tác cập nhật xung đột với hạng mặc định',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể bỏ trạng thái mặc định của hạng mặc định hiện tại',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.update', 'rank.update.all')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRankDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IRank>> {
    const hasUpdateAll = await this.hasPermission(userId, 'rank.update.all');
    const result = await this.service.update(
      id,
      dto,
      userId,
      hasUpdateAll,
      lang,
    );
    return new UpdatedResponse('rank.update.success', result);
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều hạng thành viên',
    description:
      'Soft delete nhiều hạng thành viên trong một request. Nếu danh sách chứa hạng mặc định hiện tại, hệ thống sẽ từ chối thao tác để đảm bảo luôn có hạng mặc định.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID hạng thành viên cần xóa',
    examples: {
      delete_selected: {
        summary: 'Xóa nhiều hạng thường',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440202',
            '550e8400-e29b-41d4-a716-446655440203',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều hạng thành viên thành công',
    schema: buildSuccessSchema({
      code: 'rank.delete.success',
      message: 'Xóa nhiều hạng thành viên thành công',
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
    description: 'Không tìm thấy hạng thành viên phù hợp để xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy hạng thành viên',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Danh sách xóa chứa hạng mặc định đang được sử dụng',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể xóa hạng mặc định',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.delete', 'rank.delete.all')
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'rank.delete.all');
    await this.service.deleteMany(dto.ids, userId, hasDeleteAll, lang);
    return new DeletedResponse('rank.delete.success', null);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa hạng thành viên',
    description:
      'Soft delete một hạng thành viên theo ID. Hệ thống không cho phép xóa hạng đang được đánh dấu mặc định.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID hạng thành viên cần xóa',
    example: '550e8400-e29b-41d4-a716-446655440202',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa hạng thành viên thành công',
    schema: buildSuccessSchema({
      code: 'rank.delete.success',
      message: 'Xóa hạng thành viên thành công',
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
      message: 'ID hạng thành viên không đúng định dạng UUID',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hạng thành viên cần xóa',
    schema: buildErrorSchema({
      code: 'error.not_found',
      message: 'Không tìm thấy hạng thành viên',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Hạng thành viên đang là mặc định nên không thể xóa',
    schema: buildErrorSchema({
      code: 'error.conflict',
      message: 'Không thể xóa hạng mặc định',
    }),
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('rank.delete', 'rank.delete.all')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    const hasDeleteAll = await this.hasPermission(userId, 'rank.delete.all');
    await this.service.delete(id, userId, hasDeleteAll, lang);
    return new DeletedResponse('rank.delete.success', null);
  }
}
