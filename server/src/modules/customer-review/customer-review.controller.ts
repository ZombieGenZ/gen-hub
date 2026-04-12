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
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { I18nLang } from 'nestjs-i18n';

import { CustomerReviewService } from './customer-review.service';
import {
  CreateCustomerReviewDto,
  QueryCustomerReviewDto,
  UpdateCustomerReviewDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  CurrentUser,
  RequireAnyPermission,
  RequirePermission,
} from '../../common/decorators';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses/success.response';
import {
  buildErrorResponseSchema,
  buildPaginationDataSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';
import { PrismaService } from '../../prisma/prisma.service';

const CUSTOMER_REVIEW_ID = '550e8400-e29b-41d4-a716-446655440301';

const customerReviewItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: CUSTOMER_REVIEW_ID },
    customer_name: { type: 'string', example: 'Nguyễn Văn An' },
    customer_email: {
      type: 'string',
      nullable: true,
      example: 'an.nguyen@example.com',
    },
    customer_phone: { type: 'string', nullable: true, example: '+84901234567' },
    customer_company: {
      type: 'string',
      nullable: true,
      example: 'ABC Logistics',
    },
    customer_position: {
      type: 'string',
      nullable: true,
      example: 'Trưởng phòng vận hành',
    },
    customer_avatar: {
      type: 'string',
      nullable: true,
      example: 'https://cdn.example.com/avatar/customer-review-1.jpg',
    },
    rating: { type: 'number', example: 5 },
    title: {
      type: 'string',
      nullable: true,
      example: 'Dịch vụ rất chuyên nghiệp',
    },
    content: {
      type: 'string',
      example: 'Quy trình làm việc rõ ràng và đội ngũ hỗ trợ rất nhanh.',
    },
    reply: {
      type: 'string',
      nullable: true,
      example: 'Cảm ơn anh đã tin tưởng GEN-HUB.',
    },
    replied_at: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-03-24T08:00:00.000Z',
    },
    replied_by: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
    status: {
      type: 'string',
      enum: Object.values(ReviewStatus),
      example: ReviewStatus.APPROVED,
    },
    is_featured: { type: 'boolean', example: true },
    display_order: { type: 'number', example: 1 },
    is_active: { type: 'boolean', example: true },
    created_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-24T07:00:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-03-24T08:00:00.000Z',
    },
    created_by: {
      type: 'string',
      nullable: true,
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
    updated_by: {
      type: 'string',
      nullable: true,
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
  },
};

const notFoundSchema = buildErrorResponseSchema({
  code: 'customer-review.not_found',
  message: 'Không tìm thấy đánh giá khách hàng',
});

const createOrUpdateValidationSchema = buildErrorResponseSchema({
  code: 'error.validation',
  message: 'Dữ liệu đầu vào không hợp lệ',
  errors: [
    { field: 'customer_name', message: 'Tên khách hàng là bắt buộc' },
    {
      field: 'rating',
      message: 'Điểm đánh giá phải nằm trong khoảng từ 1 đến 5',
    },
  ],
});

const invalidDeleteManySchema = buildErrorResponseSchema({
  code: 'error.validation',
  message: 'Dữ liệu đầu vào không hợp lệ',
  errors: [{ field: 'ids', message: 'Danh sách ID đánh giá không hợp lệ' }],
});

@ApiTags('Customer Reviews')
@Controller('customer-reviews')
export class CustomerReviewController {
  constructor(
    private readonly customerReviewService: CustomerReviewService,
    private readonly prisma: PrismaService,
  ) {}

  private async hasPermission(
    userId: string,
    permissionKey: string,
  ): Promise<boolean> {
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
    if (
      user.system_permissions.some(
        (item) => item.permission.key === permissionKey,
      )
    )
      return true;

    return user.system_roles.some((role) =>
      role.role.permissions.some(
        (item) => item.permission.key === permissionKey,
      ),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo đánh giá khách hàng',
    description:
      'Tạo mới một đánh giá khách hàng trong hệ thống quản trị. API này yêu cầu quyền `customer-review.create` và cho phép khai báo sẵn trạng thái duyệt, phản hồi nội bộ, cờ nổi bật và thứ tự hiển thị.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('customer-review.create')
  @ApiBody({
    type: CreateCustomerReviewDto,
    description: 'Dữ liệu đánh giá khách hàng cần tạo',
    examples: {
      approved_featured: {
        summary: 'Tạo đánh giá đã duyệt và nổi bật',
        description:
          'Phù hợp khi quản trị viên nhập dữ liệu đã được kiểm duyệt để hiển thị ngay trên website.',
        value: {
          customer_name: 'Nguyễn Văn An',
          customer_email: 'an.nguyen@example.com',
          customer_phone: '+84901234567',
          customer_company: 'ABC Logistics',
          customer_position: 'Trưởng phòng vận hành',
          customer_avatar:
            'https://cdn.example.com/avatar/customer-review-1.jpg',
          rating: 5,
          title: 'Dịch vụ rất chuyên nghiệp',
          content:
            'GEN-HUB hỗ trợ rất nhanh và quy trình thuê kho rõ ràng, minh bạch.',
          reply: 'Cảm ơn anh đã tin tưởng và sử dụng dịch vụ của GEN-HUB.',
          status: ReviewStatus.APPROVED,
          is_featured: true,
          display_order: 1,
          is_active: true,
        },
      },
      pending_review: {
        summary: 'Tạo đánh giá chờ duyệt',
        description:
          'Phù hợp khi nhập đánh giá mới cần biên tập hoặc xác minh trước khi công khai.',
        value: {
          customer_name: 'Trần Minh Quân',
          customer_company: 'Delta Supply Chain',
          rating: 4,
          title: 'Trải nghiệm tốt',
          content:
            'Dịch vụ ổn định, đội ngũ hỗ trợ nhiệt tình và phản hồi nhanh.',
          status: ReviewStatus.PENDING,
          is_featured: false,
          display_order: 0,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đánh giá khách hàng thành công',
    schema: buildSuccessResponseSchema({
      code: 'customer-review.created',
      message: 'Đã tạo đánh giá khách hàng thành công',
      dataSchema: customerReviewItemSchema,
    }),
  })
  @ApiResponse({
    status: 422,
    description: 'Dữ liệu tạo đánh giá không hợp lệ',
    schema: createOrUpdateValidationSchema,
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Body() dto: CreateCustomerReviewDto,
    @CurrentUser('userId') userId: string,
  ) {
    const review = await this.customerReviewService.create(dto, userId);
    return new CreatedResponse(
      'customer-review.created',
      review,
      'Đã tạo đánh giá khách hàng thành công',
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách đánh giá khách hàng',
    description:
      'Lấy danh sách đánh giá khách hàng có phân trang và bộ lọc. Người có quyền `customer-review.list.all` xem toàn bộ hệ thống, còn `customer-review.list` chỉ xem dữ liệu do chính mình tạo.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('customer-review.list', 'customer-review.list.all')
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
    description: 'Vị trí bắt đầu để phân trang, tính từ 0.',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description:
      'Từ khóa tìm kiếm theo tên, email, công ty, tiêu đề hoặc nội dung đánh giá.',
    example: 'ABC Logistics',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ReviewStatus,
    description: 'Lọc theo trạng thái duyệt của đánh giá.',
    example: ReviewStatus.APPROVED,
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    description: 'Lọc theo số sao của đánh giá.',
    example: 5,
  })
  @ApiQuery({
    name: 'is_featured',
    required: false,
    type: Boolean,
    description: 'Lọc các đánh giá đang được đánh dấu nổi bật.',
    example: true,
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc các đánh giá đang ở trạng thái hoạt động.',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách đánh giá khách hàng thành công',
    content: {
      'application/json': {
        example: {
          code: 'customer-review.list',
          message: 'Lấy danh sách đánh giá khách hàng thành công',
          success: true,
          data: {
            items: [
              {
                id: CUSTOMER_REVIEW_ID,
                customer_name: 'Nguyễn Văn An',
                customer_email: 'an.nguyen@example.com',
                customer_phone: '+84901234567',
                customer_company: 'ABC Logistics',
                customer_position: 'Trưởng phòng vận hành',
                customer_avatar:
                  'https://cdn.example.com/avatar/customer-review-1.jpg',
                rating: 5,
                title: 'Dịch vụ rất chuyên nghiệp',
                content:
                  'Quy trình làm việc rõ ràng và đội ngũ hỗ trợ rất nhanh.',
                reply: 'Cảm ơn anh đã tin tưởng GEN-HUB.',
                replied_at: '2026-03-24T08:00:00.000Z',
                replied_by: '550e8400-e29b-41d4-a716-446655440001',
                status: ReviewStatus.APPROVED,
                is_featured: true,
                display_order: 1,
                is_active: true,
                created_at: '2026-03-24T07:00:00.000Z',
                updated_at: '2026-03-24T08:00:00.000Z',
                created_by: '550e8400-e29b-41d4-a716-446655440001',
                updated_by: '550e8400-e29b-41d4-a716-446655440001',
              },
            ],
            total: 1,
            limit: 10,
            offset: 0,
            hasMore: false,
          },
        },
        schema: buildSuccessResponseSchema({
          code: 'customer-review.list',
          message: 'Lấy danh sách đánh giá khách hàng thành công',
          dataSchema: buildPaginationDataSchema(customerReviewItemSchema),
        }),
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async findAll(
    @Query() query: QueryCustomerReviewDto,
    @CurrentUser('userId') userId: string,
  ) {
    const hasListAllPermission = await this.hasPermission(
      userId,
      'customer-review.list.all',
    );
    const result = await this.customerReviewService.findAll(
      query,
      userId,
      hasListAllPermission,
    );
    return new GetResponse(
      'customer-review.list',
      result,
      'Lấy danh sách đánh giá khách hàng thành công',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết đánh giá khách hàng',
    description:
      'Lấy chi tiết một đánh giá khách hàng theo ID. Người có quyền `customer-review.read.all` xem được mọi bản ghi, còn `customer-review.read` chỉ xem dữ liệu do chính mình tạo.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiParam({
    name: 'id',
    description: 'ID đánh giá khách hàng',
    example: CUSTOMER_REVIEW_ID,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('customer-review.read', 'customer-review.read.all')
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết đánh giá khách hàng thành công',
    schema: buildSuccessResponseSchema({
      code: 'customer-review.read',
      message: 'Lấy chi tiết đánh giá khách hàng thành công',
      dataSchema: customerReviewItemSchema,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đánh giá khách hàng',
    schema: notFoundSchema,
  })
  @ApiAuthResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasReadAllPermission = await this.hasPermission(
      userId,
      'customer-review.read.all',
    );
    const review = await this.customerReviewService.findById(
      id,
      userId,
      hasReadAllPermission,
      lang,
    );
    return new GetResponse(
      'customer-review.read',
      review,
      'Lấy chi tiết đánh giá khách hàng thành công',
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật đánh giá khách hàng',
    description:
      'Cập nhật một phần hoặc toàn bộ thông tin đánh giá khách hàng. Người có quyền `customer-review.update.all` cập nhật được mọi bản ghi, còn `customer-review.update` chỉ cập nhật dữ liệu do chính mình tạo.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiParam({
    name: 'id',
    description: 'ID đánh giá khách hàng cần cập nhật',
    example: CUSTOMER_REVIEW_ID,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('customer-review.update', 'customer-review.update.all')
  @ApiBody({
    type: UpdateCustomerReviewDto,
    description: 'Dữ liệu đánh giá khách hàng cần cập nhật',
    examples: {
      approve_and_reply: {
        summary: 'Duyệt đánh giá và thêm phản hồi',
        description:
          'Phù hợp cho thao tác kiểm duyệt nội dung trước khi xuất bản.',
        value: {
          status: ReviewStatus.APPROVED,
          reply:
            'Cảm ơn anh đã phản hồi tích cực. GEN-HUB sẽ tiếp tục cải thiện dịch vụ.',
          is_featured: true,
          display_order: 1,
        },
      },
      deactivate_review: {
        summary: 'Ẩn tạm thời đánh giá',
        description:
          'Dùng khi cần ngừng hiển thị một đánh giá mà không xóa dữ liệu.',
        value: {
          is_active: false,
          is_featured: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đánh giá khách hàng thành công',
    schema: buildSuccessResponseSchema({
      code: 'customer-review.updated',
      message: 'Đã cập nhật đánh giá khách hàng thành công',
      dataSchema: customerReviewItemSchema,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đánh giá khách hàng',
    schema: notFoundSchema,
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerReviewDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasUpdateAllPermission = await this.hasPermission(
      userId,
      'customer-review.update.all',
    );
    const review = await this.customerReviewService.update(
      id,
      dto,
      userId,
      hasUpdateAllPermission,
      lang,
    );
    return new UpdatedResponse(
      'customer-review.updated',
      review,
      'Đã cập nhật đánh giá khách hàng thành công',
    );
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều đánh giá khách hàng',
    description:
      'Xóa mềm nhiều đánh giá khách hàng theo danh sách ID. Người có quyền `customer-review.delete.all` xóa được mọi bản ghi, còn `customer-review.delete` chỉ xóa dữ liệu do chính mình tạo.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiBody({
    description: 'Danh sách ID đánh giá khách hàng cần xóa',
    examples: {
      single: {
        summary: 'Xóa một đánh giá',
        value: {
          ids: [CUSTOMER_REVIEW_ID],
        },
      },
      multiple: {
        summary: 'Xóa nhiều đánh giá',
        value: {
          ids: [CUSTOMER_REVIEW_ID, '550e8400-e29b-41d4-a716-446655440302'],
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          example: [CUSTOMER_REVIEW_ID],
          minItems: 1,
        },
      },
      required: ['ids'],
    },
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('customer-review.delete', 'customer-review.delete.all')
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều đánh giá khách hàng thành công',
    schema: buildSuccessResponseSchema({
      code: 'customer-review.deletedMany',
      message: 'Đã xóa các đánh giá khách hàng thành công',
      dataSchema: { type: 'null', nullable: true },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 422,
    description: 'Danh sách ID không hợp lệ',
    schema: invalidDeleteManySchema,
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Body('ids') ids: string[],
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasDeleteAllPermission = await this.hasPermission(
      userId,
      'customer-review.delete.all',
    );
    await this.customerReviewService.deleteMany(
      ids,
      userId,
      hasDeleteAllPermission,
      lang,
    );
    return new DeletedResponse(
      'customer-review.deletedMany',
      null,
      'Đã xóa các đánh giá khách hàng thành công',
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa đánh giá khách hàng',
    description:
      'Xóa mềm một đánh giá khách hàng theo ID. Người có quyền `customer-review.delete.all` xóa được mọi bản ghi, còn `customer-review.delete` chỉ xóa dữ liệu do chính mình tạo.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Ngôn ngữ phản hồi (vi hoặc en)',
    required: false,
    example: 'vi',
  })
  @ApiParam({
    name: 'id',
    description: 'ID đánh giá khách hàng cần xóa',
    example: CUSTOMER_REVIEW_ID,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission('customer-review.delete', 'customer-review.delete.all')
  @ApiResponse({
    status: 200,
    description: 'Xóa đánh giá khách hàng thành công',
    schema: buildSuccessResponseSchema({
      code: 'customer-review.deleted',
      message: 'Đã xóa đánh giá khách hàng thành công',
      dataSchema: { type: 'null', nullable: true },
      dataExample: null,
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đánh giá khách hàng',
    schema: notFoundSchema,
  })
  @ApiAuthResponses()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const hasDeleteAllPermission = await this.hasPermission(
      userId,
      'customer-review.delete.all',
    );
    await this.customerReviewService.delete(
      id,
      userId,
      hasDeleteAllPermission,
      lang,
    );
    return new DeletedResponse(
      'customer-review.deleted',
      null,
      'Đã xóa đánh giá khách hàng thành công',
    );
  }
}
