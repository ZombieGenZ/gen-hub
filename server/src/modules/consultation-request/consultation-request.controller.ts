import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
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

import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  CurrentUser,
  Public,
  RequireAnyPermission,
  RequirePermission,
} from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses/success.response';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultationRequestService } from './consultation-request.service';
import { CreateConsultationRequestDto } from './dto/create-consultation-request.dto';
import { QueryConsultationRequestDto } from './dto/query-consultation-request.dto';
import { UpdateConsultationRequestDto } from './dto/update-consultation-request.dto';

@ApiTags('Consultation Request')
@Controller('consultation-request')
export class ConsultationRequestController {
  constructor(
    private readonly service: ConsultationRequestService,
    private readonly prisma: PrismaService,
  ) {}

  private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
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
    if (user.system_permissions.some((item) => item.permission.key === permissionKey)) return true;
    return user.system_roles.some((role) =>
      role.role.permissions.some((item) => item.permission.key === permissionKey),
    );
  }

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Tạo yêu cầu tư vấn',
    description:
      'Tạo mới một yêu cầu tư vấn công khai từ website hoặc kênh AI. Endpoint này dùng để ghi nhận thông tin liên hệ và nhu cầu ban đầu của khách hàng.',
  })
  @ApiBody({
    type: CreateConsultationRequestDto,
    description: 'Thông tin khách hàng và nhu cầu tư vấn cần ghi nhận.',
    examples: {
      default: {
        summary: 'Khách gửi nhu cầu thuê kho',
        value: {
          name: 'Nguyễn Thị Lan',
          email: 'lan.nguyen@example.com',
          phone: '0909888777',
          company: 'ABC Supply Chain',
          position: 'Trưởng phòng kho vận',
          subject: 'Tư vấn thuê kho lạnh',
          message: 'Cần thuê kho lạnh khoảng 200 m2 tại Long An trong quý 2.',
          warehouse_template_id: '550e8400-e29b-41d4-a716-446655440000',
          source: 'WEB_FORM',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'consultation-request.create_success',
        message: 'Tạo yêu cầu tư vấn thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          code: 'CR-1741779000000-123',
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  async create(@Body() dto: CreateConsultationRequestDto) {
    const data = await this.service.createRequest(dto, null);
    return new CreatedResponse('consultation-request.create_success', data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('consultation-request.list', 'consultation-request.list.all')
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu tư vấn',
    description:
      'Trả về danh sách yêu cầu tư vấn có phân trang và bộ lọc. Người có quyền `.list.all` xem toàn bộ hệ thống, còn quyền `.list` chỉ xem dữ liệu do mình tạo.',
  })
  @ApiAuthResponses()
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Trang hiện tại.', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi trên mỗi trang.', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Từ khóa tìm kiếm theo tên, email, số điện thoại hoặc mã yêu cầu.', example: 'Nguyễn Thị Lan' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Lọc theo trạng thái xử lý.', example: 'PENDING' })
  @ApiQuery({ name: 'source', required: false, type: String, description: 'Lọc theo nguồn tạo yêu cầu.', example: 'WEB_FORM' })
  @ApiQuery({ name: 'assigned_to', required: false, type: String, description: 'Lọc theo nhân viên phụ trách.', example: '660e8400-e29b-41d4-a716-446655440111' })
  @ApiQuery({ name: 'sort_by', required: false, type: String, description: 'Trường dùng để sắp xếp.', example: 'created_at' })
  @ApiQuery({ name: 'sort_order', required: false, type: String, description: 'Thứ tự sắp xếp.', example: 'desc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'consultation-request.list_success',
        message: 'Lấy danh sách yêu cầu tư vấn thành công',
        success: true,
        data: {
          items: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          },
        },
      },
    },
  })
  @ApiValidationErrorResponse()
  async findAll(
    @Query() query: QueryConsultationRequestDto,
    @CurrentUser('userId') userId: string,
  ) {
    const hasAll = await this.hasPermission(userId, 'consultation-request.list.all');
    return new GetResponse(
      'consultation-request.list_success',
      await this.service.findAllRequests(query, hasAll ? undefined : userId),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('consultation-request.read', 'consultation-request.read.all')
  @ApiOperation({
    summary: 'Lấy chi tiết yêu cầu tư vấn',
    description:
      'Lấy đầy đủ thông tin của một yêu cầu tư vấn. Người có quyền `.read.all` có thể xem mọi bản ghi, còn quyền `.read` chỉ xem dữ liệu do mình tạo.',
  })
  @ApiAuthResponses()
  @ApiParam({
    name: 'id',
    description: 'ID của yêu cầu tư vấn cần xem chi tiết.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'consultation-request.get_success',
        message: 'Lấy chi tiết yêu cầu tư vấn thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          code: 'CR-1741779000000-123',
          status: 'PENDING',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy yêu cầu tư vấn.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Không tìm thấy yêu cầu tư vấn',
        error: 'Not Found',
      },
    },
  })
  async findOne(@Param('id') id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
    const hasAll = await this.hasPermission(userId, 'consultation-request.read.all');
    return new GetResponse(
      'consultation-request.get_success',
      await this.service.findRequestById(
        id,
        req.headers['accept-language'] || 'vi',
        hasAll ? undefined : userId,
      ),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('consultation-request.update', 'consultation-request.update.all')
  @ApiOperation({
    summary: 'Cập nhật yêu cầu tư vấn',
    description:
      'Cập nhật trạng thái, người phụ trách hoặc thông tin bổ sung của yêu cầu tư vấn. Người có quyền `.update.all` có thể cập nhật toàn bộ bản ghi trong hệ thống.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'id',
    description: 'ID của yêu cầu tư vấn cần cập nhật.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateConsultationRequestDto,
    description: 'Thông tin cập nhật cho yêu cầu tư vấn.',
    examples: {
      contacted: {
        summary: 'Đánh dấu đã liên hệ',
        value: {
          status: 'CONTACTED',
          assigned_to: '660e8400-e29b-41d4-a716-446655440111',
          staff_notes: 'Đã gọi điện trao đổi và hẹn gửi báo giá trong ngày.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'consultation-request.update_success',
        message: 'Cập nhật yêu cầu tư vấn thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'CONTACTED',
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConsultationRequestDto,
    @CurrentUser('userId') userId: string,
    @Request() req: any,
  ) {
    const hasAll = await this.hasPermission(userId, 'consultation-request.update.all');
    return new UpdatedResponse(
      'consultation-request.update_success',
      await this.service.updateRequest(
        id,
        dto,
        userId,
        req.headers['accept-language'] || 'vi',
        hasAll ? undefined : userId,
      ),
    );
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermission('consultation-request.assign')
  @ApiOperation({
    summary: 'Phân công yêu cầu tư vấn',
    description:
      'Gán một nhân viên phụ trách cho yêu cầu tư vấn để theo dõi và xử lý. Endpoint này yêu cầu truyền `assigned_to` trong body.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'id',
    description: 'ID của yêu cầu tư vấn cần phân công.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['assigned_to'],
      properties: {
        assigned_to: {
          type: 'string',
          format: 'uuid',
          example: '660e8400-e29b-41d4-a716-446655440111',
          description: 'ID nhân viên được phân công xử lý yêu cầu.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Phân công yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'consultation-request.assign_success',
        message: 'Phân công yêu cầu tư vấn thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          assigned_to: '660e8400-e29b-41d4-a716-446655440111',
        },
      },
    },
  })
  async assign(
    @Param('id') id: string,
    @Body('assigned_to') assignedTo: string,
    @CurrentUser('userId') userId: string,
    @Request() req: any,
  ) {
    return new UpdatedResponse(
      'consultation-request.assign_success',
      await this.service.assignRequest(
        id,
        assignedTo,
        userId,
        req.headers['accept-language'] || 'vi',
      ),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @RequireAnyPermission('consultation-request.delete', 'consultation-request.delete.all')
  @ApiOperation({
    summary: 'Xóa mềm yêu cầu tư vấn',
    description:
      'Đánh dấu xóa mềm một yêu cầu tư vấn khỏi hệ thống. Người có quyền `.delete.all` có thể xóa toàn bộ bản ghi, còn quyền `.delete` chỉ xóa dữ liệu của mình.',
  })
  @ApiAuthResponses()
  @ApiParam({
    name: 'id',
    description: 'ID của yêu cầu tư vấn cần xóa mềm.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa yêu cầu tư vấn thành công.',
    schema: {
      example: {
        code: 'consultation-request.delete_success',
        message: 'Xóa yêu cầu tư vấn thành công',
        success: true,
        data: null,
      },
    },
  })
  async remove(@Param('id') id: string, @CurrentUser('userId') userId: string, @Request() req: any) {
    const hasAll = await this.hasPermission(userId, 'consultation-request.delete.all');
    await this.service.softDeleteRequest(
      id,
      userId,
      req.headers['accept-language'] || 'vi',
      hasAll ? undefined : userId,
    );
    return new DeletedResponse('consultation-request.delete_success');
  }
}
