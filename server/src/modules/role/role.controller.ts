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
  Req,
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
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { I18nLang } from 'nestjs-i18n';
import { DeleteManyDto } from '../../common/dto';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  CurrentUser,
  RequirePermission,
} from '../../common/decorators';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  ResponseCode,
  UpdatedResponse,
} from '../../common/responses';
import {
  buildErrorResponseSchema,
  buildPaginationDataSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto';
import { IRoleListResult, IRoleWithPermissions } from './interfaces';
import { RoleService } from './role.service';

const roleSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440001',
    },
    name: { type: 'string', example: 'Nhân viên kho' },
    description: {
      type: 'string',
      example: 'Role cho nhân viên thực hiện nghiệp vụ kho',
    },
    is_system: { type: 'boolean', example: false },
    is_default: { type: 'boolean', example: false },
    is_active: { type: 'boolean', example: true },
    created_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-13T09:30:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-03-13T10:00:00.000Z',
    },
  },
};

const permissionSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440101',
    },
    key: { type: 'string', example: 'warehouse.read' },
    name: { type: 'string', example: 'Xem kho' },
  },
};

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
  constructor(private readonly service: RoleService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('role.create')
  @ApiOperation({
    summary: 'Tạo role mới',
    description:
      'Tạo một role mới trong hệ thống với tên, mô tả, trạng thái mặc định và danh sách permission IDs. Yêu cầu quyền `role.create`.',
  })
  @ApiBody({
    type: CreateRoleDto,
    description: 'Thông tin role cần tạo',
    examples: {
      warehouse_staff: {
        summary: 'Role nhân viên kho',
        description: 'Tạo role cho nhân viên thực hiện nghiệp vụ kho',
        value: {
          name: 'Nhân viên kho',
          description: 'Role cho nhân viên thực hiện nghiệp vụ kho',
          is_default: false,
          permission_ids: [
            '550e8400-e29b-41d4-a716-446655440101',
            '550e8400-e29b-41d4-a716-446655440102',
          ],
        },
      },
      default_member: {
        summary: 'Role mặc định cho user mới',
        description: 'Tạo role được gán tự động cho user mới đăng ký',
        value: {
          name: 'Thành viên mặc định',
          description: 'Role gán tự động cho user mới',
          is_default: true,
          permission_ids: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo role thành công',
    schema: buildSuccessResponseSchema({
      code: 'role.create.success',
      message: 'Tạo role thành công',
      dataSchema: roleSchema,
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Nhân viên kho',
        description: 'Role cho nhân viên thực hiện nghiệp vụ kho',
        is_system: false,
        is_default: false,
        is_active: true,
        created_at: '2026-03-13T09:30:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên role đã tồn tại',
    schema: buildErrorResponseSchema({
      code: 'role.invalid_payload',
      message: 'Dữ liệu tạo role không hợp lệ',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Role bị xung đột tên hoặc thiết lập mặc định',
    schema: buildErrorResponseSchema({
      code: 'role.conflict',
      message: 'Role bị xung đột dữ liệu với cấu hình hiện có',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ): Promise<CreatedResponse<Role>> {
    const result = await this.service.create(dto, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new CreatedResponse(ResponseCode.ROLE_CREATE_SUCCESS, result);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('role.read')
  @ApiOperation({
    summary: 'Lấy danh sách roles',
    description:
      'Lấy danh sách roles với phân trang và tìm kiếm theo từ khóa. Yêu cầu quyền `role.read`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng role tối đa',
    example: 20,
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
    description: 'Tìm kiếm theo tên hoặc mô tả role',
    example: 'quản lý',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
    schema: buildSuccessResponseSchema({
      code: 'role.list.success',
      message: 'Lấy danh sách roles thành công',
      dataSchema: buildPaginationDataSchema(roleSchema),
      dataExample: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Nhân viên kho',
            description: 'Role cho nhân viên thực hiện nghiệp vụ kho',
            is_system: false,
            is_default: false,
            is_active: true,
            created_at: '2026-03-13T09:30:00.000Z',
            updated_at: '2026-03-13T10:00:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    }),
  })
  @ApiAuthResponses()
  async findMany(
    @Query() query: QueryRoleDto,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IRoleListResult>> {
    const result = await this.service.findMany(query, lang);
    return new GetResponse(ResponseCode.ROLE_LIST_SUCCESS, result);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('role.read')
  @ApiOperation({
    summary: 'Lấy chi tiết role',
    description:
      'Lấy thông tin chi tiết của một role bao gồm danh sách permissions được gán. Yêu cầu quyền `role.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của role',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết role thành công',
    schema: buildSuccessResponseSchema({
      code: 'role.get.success',
      message: 'Lấy chi tiết role thành công',
      dataSchema: {
        type: 'object',
        properties: {
          ...roleSchema.properties,
          permissions: {
            type: 'array',
            items: permissionSchema,
          },
        },
      },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Nhân viên kho',
        description: 'Role cho nhân viên thực hiện nghiệp vụ kho',
        is_system: false,
        is_default: false,
        is_active: true,
        created_at: '2026-03-13T09:30:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
        permissions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440101',
            key: 'warehouse.read',
            name: 'Xem kho',
          },
        ],
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy role',
    schema: buildErrorResponseSchema({
      code: 'role.not_found',
      message: 'Không tìm thấy role',
    }),
  })
  @ApiAuthResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IRoleWithPermissions>> {
    const result = await this.service.findById(id, lang);
    return new GetResponse(ResponseCode.ROLE_GET_SUCCESS, result);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('role.update')
  @ApiOperation({
    summary: 'Cập nhật role',
    description:
      'Cập nhật thông tin role và danh sách permission IDs. Role hệ thống không thể xóa nhưng vẫn có thể cập nhật thông tin hợp lệ. Yêu cầu quyền `role.update`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của role',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateRoleDto,
    description: 'Thông tin role cần cập nhật',
    examples: {
      update_name: {
        summary: 'Cập nhật tên role',
        description: 'Chỉ đổi tên role hiện tại',
        value: {
          name: 'Quản lý vận hành',
        },
      },
      update_permissions: {
        summary: 'Cập nhật permission IDs',
        description: 'Thay đổi danh sách permissions và trạng thái role',
        value: {
          permission_ids: [
            '550e8400-e29b-41d4-a716-446655440101',
            '550e8400-e29b-41d4-a716-446655440103',
          ],
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật role thành công',
    schema: buildSuccessResponseSchema({
      code: 'role.update.success',
      message: 'Cập nhật role thành công',
      dataSchema: roleSchema,
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Quản lý vận hành',
        description: 'Role cho nhân viên thực hiện nghiệp vụ kho',
        is_system: false,
        is_default: false,
        is_active: true,
        created_at: '2026-03-13T09:30:00.000Z',
        updated_at: '2026-03-13T10:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy role',
    schema: buildErrorResponseSchema({
      code: 'role.not_found',
      message: 'Không tìm thấy role',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Role cập nhật bị xung đột dữ liệu',
    schema: buildErrorResponseSchema({
      code: 'role.conflict',
      message: 'Role cập nhật bị xung đột dữ liệu với cấu hình hiện có',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ): Promise<UpdatedResponse<Role>> {
    const result = await this.service.update(id, dto, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new UpdatedResponse(ResponseCode.ROLE_UPDATE_SUCCESS, result);
  }

  @Delete('delete/many')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('role.delete')
  @ApiOperation({
    summary: 'Xóa nhiều roles',
    description:
      'Xóa nhiều role cùng lúc theo danh sách ID. Không thể xóa role hệ thống hoặc role đang được sử dụng. Yêu cầu quyền `role.delete`.',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID role cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa hai role',
        description: 'Ví dụ xóa đồng thời 2 role không phải role hệ thống',
        value: {
          ids: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều role thành công',
    schema: buildSuccessResponseSchema({
      code: 'role.delete.success',
      message: 'Xóa nhiều role thành công',
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa role hệ thống hoặc role đang được sử dụng',
    schema: buildErrorResponseSchema({
      code: 'role.delete_forbidden',
      message: 'Không thể xóa role hệ thống hoặc role đang được sử dụng',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async deleteMany(
    @Body() dto: DeleteManyDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ): Promise<DeletedResponse<null>> {
    await this.service.deleteMany(dto.ids, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new DeletedResponse(ResponseCode.ROLE_DELETE_SUCCESS, null);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('role.delete')
  @ApiOperation({
    summary: 'Xóa role',
    description:
      'Xóa một role theo ID. Không thể xóa role hệ thống hoặc role đang được gán cho người dùng. Yêu cầu quyền `role.delete`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của role',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa role thành công',
    schema: buildSuccessResponseSchema({
      code: 'role.delete.success',
      message: 'Xóa role thành công',
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa role hệ thống hoặc role đang được sử dụng',
    schema: buildErrorResponseSchema({
      code: 'role.delete_forbidden',
      message: 'Không thể xóa role hệ thống hoặc role đang được sử dụng',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy role',
    schema: buildErrorResponseSchema({
      code: 'role.not_found',
      message: 'Không tìm thấy role',
    }),
  })
  @ApiAuthResponses()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
    @Req() req: Request,
  ): Promise<DeletedResponse<null>> {
    await this.service.delete(id, userId, lang, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return new DeletedResponse(ResponseCode.ROLE_DELETE_SUCCESS, null);
  }
}
