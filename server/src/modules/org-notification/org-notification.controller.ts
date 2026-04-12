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

import { OrgNotificationService } from './org-notification.service';
import {
  CreateOrgNotificationDto,
  UpdateOrgNotificationDto,
  QueryOrgNotificationDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import {
  CurrentActor,
  RequireOrgPermission,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  CreatedResponse,
  UpdatedResponse,
  GetResponse,
  DeletedResponse,
  ResponseCode,
} from '../../common/responses';
import { IOrgNotification, IPaginatedResponse } from './interfaces';

@ApiTags('Organization Notifications')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API Key for authentication (alternative to JWT)',
  required: false,
})
@Controller('organizations/:orgId/notifications')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class OrgNotificationController {
  constructor(private readonly service: OrgNotificationService) {}

  @Post()
  @RequireOrgPermission('organization.notification.create')
  @ApiOperation({
    summary: 'Tạo thông báo tổ chức mới',
    description:
      'Tạo thông báo nội bộ cho tổ chức. Có thể gửi thông báo cho toàn tổ chức hoặc cho một kho cụ thể. Hỗ trợ các loại thông báo: INFO, SUCCESS, WARNING, ERROR. Yêu cầu quyền `organization.notification.create`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateOrgNotificationDto,
    description: 'Thông tin thông báo cần tạo',
    examples: {
      info_notification: {
        summary: 'Thông báo thông tin chung',
        description: 'Ví dụ tạo thông báo thông tin cho toàn tổ chức',
        value: {
          title: 'Thông báo cập nhật hệ thống',
          content: 'Hệ thống sẽ bảo trì vào ngày 10/02/2026 từ 22:00 - 02:00.',
          type: 'INFO',
          is_active: true,
        },
      },
      warning_notification: {
        summary: 'Thông báo cảnh báo',
        description: 'Ví dụ tạo thông báo cảnh báo',
        value: {
          title: 'Cảnh báo hạn thanh toán',
          content:
            'Hợp đồng #HC-2026-001 sắp đến hạn thanh toán. Vui lòng thanh toán trước ngày 15/02/2026.',
          type: 'WARNING',
          is_active: true,
        },
      },
      warehouse_notification: {
        summary: 'Thông báo cho kho cụ thể',
        description: 'Ví dụ tạo thông báo cho một kho hàng cụ thể',
        value: {
          title: 'Thông báo kiểm kê kho',
          content: 'Kho ABC sẽ tiến hành kiểm kê vào ngày 12/02/2026.',
          type: 'INFO',
          warehouse_id: '550e8400-e29b-41d4-a716-446655440099',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thông báo thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'org-notification.create.success' },
        message: { type: 'string', example: 'Tạo thông báo thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            title: { type: 'string', example: 'Thông báo cập nhật hệ thống' },
            content: {
              type: 'string',
              example: 'Hệ thống sẽ bảo trì vào ngày 10/02/2026.',
            },
            type: {
              type: 'string',
              enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'],
              example: 'INFO',
            },
            warehouse_id: { type: 'string', nullable: true, example: null },
            is_active: { type: 'boolean', example: true },
            created_by: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-07T10:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: null,
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức hoặc kho hàng',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateOrgNotificationDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<CreatedResponse<IOrgNotification>> {
    const result = await this.service.create(orgId, dto, actorId, lang);
    return new CreatedResponse(
      ResponseCode.ORG_NOTIFICATION_CREATE_SUCCESS,
      result,
    );
  }

  @Get()
  @RequireOrgPermission('organization.notification.list')
  @ApiOperation({
    summary: 'Lấy danh sách thông báo tổ chức',
    description:
      'Lấy danh sách thông báo của tổ chức với phân trang và bộ lọc theo loại, trạng thái, kho hàng. Yêu cầu quyền `organization.notification.list`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng record trả về',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu (skip)',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tiêu đề/nội dung',
    example: 'bảo trì',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'],
    description: 'Lọc theo loại thông báo',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái hoạt động',
  })
  @ApiQuery({
    name: 'warehouse_id',
    required: false,
    type: String,
    description: 'Lọc theo kho hàng (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'org-notification.list.success' },
        message: {
          type: 'string',
          example: 'Lấy danh sách thông báo thành công',
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
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  title: {
                    type: 'string',
                    example: 'Thông báo cập nhật hệ thống',
                  },
                  content: {
                    type: 'string',
                    example: 'Hệ thống sẽ bảo trì...',
                  },
                  type: { type: 'string', example: 'INFO' },
                  is_active: { type: 'boolean', example: true },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-02-07T10:00:00.000Z',
                  },
                },
              },
            },
            total: { type: 'number', example: 50 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async findMany(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryOrgNotificationDto,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IPaginatedResponse<IOrgNotification>>> {
    const result = await this.service.findMany(orgId, query, lang);
    return new GetResponse(ResponseCode.ORG_NOTIFICATION_LIST_SUCCESS, result);
  }

  @Get(':id')
  @RequireOrgPermission('organization.notification.read')
  @ApiOperation({
    summary: 'Lấy chi tiết thông báo tổ chức',
    description:
      'Lấy thông tin chi tiết của một thông báo theo ID. Yêu cầu quyền `organization.notification.read`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của thông báo (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'org-notification.get.success' },
        message: { type: 'string', example: 'Lấy thông báo thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            title: { type: 'string', example: 'Thông báo cập nhật hệ thống' },
            content: { type: 'string', example: 'Nội dung chi tiết...' },
            type: { type: 'string', example: 'INFO' },
            warehouse_id: { type: 'string', nullable: true },
            is_active: { type: 'boolean', example: true },
            created_by: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  @ApiAuthResponses()
  async findById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ): Promise<GetResponse<IOrgNotification>> {
    const result = await this.service.findById(orgId, id, lang);
    return new GetResponse(ResponseCode.ORG_NOTIFICATION_GET_SUCCESS, result);
  }

  @Put(':id')
  @RequireOrgPermission('organization.notification.update')
  @ApiOperation({
    summary: 'Cập nhật thông báo tổ chức',
    description:
      'Cập nhật thông tin thông báo. Chỉ các trường được gửi sẽ được cập nhật. Yêu cầu quyền `organization.notification.update`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của thông báo (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateOrgNotificationDto,
    description: 'Thông tin cập nhật (partial update)',
    examples: {
      update_title: {
        summary: 'Cập nhật tiêu đề',
        value: { title: 'Tiêu đề mới' },
      },
      update_status: {
        summary: 'Ẩn thông báo',
        value: { is_active: false },
      },
      update_full: {
        summary: 'Cập nhật nhiều trường',
        value: {
          title: 'Thông báo quan trọng',
          content: 'Nội dung cập nhật',
          type: 'WARNING',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'org-notification.update.success' },
        message: { type: 'string', example: 'Cập nhật thông báo thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'object', description: 'Thông báo sau khi cập nhật' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrgNotificationDto,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<UpdatedResponse<IOrgNotification>> {
    const result = await this.service.update(orgId, id, dto, actorId, lang);
    return new UpdatedResponse(
      ResponseCode.ORG_NOTIFICATION_UPDATE_SUCCESS,
      result,
    );
  }

  @Delete('delete/many')
  @RequireOrgPermission('organization.notification.delete')
  @ApiOperation({
    summary: 'Xóa nhiều thông báo tổ chức',
    description:
      'Xóa nhiều thông báo cùng lúc theo danh sách ID. Yêu cầu quyền `organization.notification.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: DeleteManyDto,
    description: 'Danh sách ID thông báo cần xóa',
    examples: {
      delete_multiple: {
        summary: 'Xóa 3 thông báo',
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
    description: 'Xóa thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'org-notification.delete.success' },
        message: { type: 'string', example: 'Xóa thông báo thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy một hoặc nhiều thông báo',
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
    return new DeletedResponse(
      ResponseCode.ORG_NOTIFICATION_DELETE_SUCCESS,
      null,
    );
  }

  @Delete(':id')
  @RequireOrgPermission('organization.notification.delete')
  @ApiOperation({
    summary: 'Xóa thông báo tổ chức',
    description:
      'Xóa một thông báo theo ID. Yêu cầu quyền `organization.notification.delete`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của thông báo (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'org-notification.delete.success' },
        message: { type: 'string', example: 'Xóa thông báo thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', example: null },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  @ApiAuthResponses()
  async delete(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorId: string,
    @I18nLang() lang: string,
  ): Promise<DeletedResponse<null>> {
    await this.service.delete(orgId, id, actorId, lang);
    return new DeletedResponse(
      ResponseCode.ORG_NOTIFICATION_DELETE_SUCCESS,
      null,
    );
  }
}
