import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import type { Request } from 'express';

import { OrganizationBalanceAdminService } from './organization-balance-admin.service';
import { AdjustBalanceDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  RequirePermission,
} from '../../common/decorators';
import { GetResponse, OkResponse } from '../../common/responses';
import type {
  IOrganizationBalance,
  IOrganizationBalanceTransaction,
  IPaginatedResponse,
} from './interfaces';

@ApiTags('Admin - Organization Balance')
@Controller('admin/organization-balances')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationBalanceAdminController {
  constructor(private readonly service: OrganizationBalanceAdminService) {}

  @Get()
  @RequirePermission('organization-balance.list.all')
  @ApiOperation({
    summary: 'Xem danh sách số dư tất cả tổ chức (Admin)',
    description:
      'Lấy danh sách số dư hiện tại của tất cả tổ chức trên hệ thống, hỗ trợ phân trang và tìm kiếm theo từ khóa. Yêu cầu quyền `organization-balance.list.all`.',
  })
  @ApiQuery({
    name: 'limit',
    required: true,
    type: Number,
    description: 'Số bản ghi tối đa trên một trang.',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: true,
    type: Number,
    description: 'Vị trí bắt đầu của danh sách phân trang.',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: true,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên tổ chức hoặc thông tin liên quan.',
    example: 'Logistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách số dư thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.list' },
        message: {
          type: 'string',
          example: 'Lấy danh sách số dư tổ chức thành công',
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
                  organization_id: {
                    type: 'string',
                    example: '550e8400-e29b-41d4-a716-446655440000',
                  },
                  organization_name: {
                    type: 'string',
                    example: 'Công ty ABC Logistics',
                  },
                  balance: { type: 'number', example: 152000000 },
                  updated_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-03-13T08:00:00.000Z',
                  },
                },
              },
            },
            total: { type: 'number', example: 48 },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
      example: {
        code: 'organization-balance.list',
        message: 'Lấy danh sách số dư tổ chức thành công',
        success: true,
        data: {
          items: [
            {
              organization_id: '550e8400-e29b-41d4-a716-446655440000',
              organization_name: 'Công ty ABC Logistics',
              balance: 152000000,
              updated_at: '2026-03-13T08:00:00.000Z',
            },
          ],
          total: 48,
          limit: 20,
          offset: 0,
          hasMore: true,
        },
      },
    },
  })
  @ApiAuthResponses()
  async findAll(
    @Req() req: Request,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('keywords') keywords?: string,
  ): Promise<GetResponse<IPaginatedResponse<IOrganizationBalance>>> {
    const adminId = (req.user as any).id;
    const lang = (req.user as any).language || 'vi';
    const data = await this.service.findAll(
      { limit, offset, keywords },
      adminId,
      lang,
    );
    return new GetResponse('organization-balance.list', data);
  }

  @Get(':organizationId')
  @RequirePermission('organization-balance.list.all')
  @ApiOperation({
    summary: 'Xem số dư của tổ chức cụ thể (Admin)',
    description:
      'Lấy thông tin số dư hiện tại của một tổ chức cụ thể theo `organizationId`, phục vụ đối soát hoặc kiểm tra lịch sử điều chỉnh. Yêu cầu quyền `organization-balance.list.all`.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'ID của tổ chức cần xem số dư.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy số dư tổ chức thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.get' },
        message: { type: 'string', example: 'Lấy số dư tổ chức thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            organization_name: {
              type: 'string',
              example: 'Công ty ABC Logistics',
            },
            balance: { type: 'number', example: 152000000 },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-15T02:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-13T08:00:00.000Z',
            },
          },
        },
      },
      example: {
        code: 'organization-balance.get',
        message: 'Lấy số dư tổ chức thành công',
        success: true,
        data: {
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          organization_name: 'Công ty ABC Logistics',
          balance: 152000000,
          created_at: '2026-01-15T02:00:00.000Z',
          updated_at: '2026-03-13T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức hoặc số dư tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.not_found' },
        message: {
          type: 'string',
          example: 'Không tìm thấy số dư của tổ chức',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  async findByOrganizationId(
    @Param('organizationId') organizationId: string,
    @Req() req: Request,
  ): Promise<GetResponse<IOrganizationBalance>> {
    const adminId = (req.user as any).id;
    const lang = (req.user as any).language || 'vi';
    const data = await this.service.findByOrganizationId(
      organizationId,
      adminId,
      lang,
    );
    return new GetResponse('organization-balance.get', data);
  }

  @Post(':organizationId/adjust')
  @RequirePermission('organization-balance.adjust')
  @ApiOperation({
    summary: 'Điều chỉnh số dư tổ chức (Admin)',
    description:
      'Điều chỉnh số dư của tổ chức theo các loại nghiệp vụ `ADJUSTMENT`, `BONUS` hoặc `REFUND`. API dùng cho các thao tác bù trừ, thưởng hoặc hoàn tiền thủ công từ phía quản trị viên. Yêu cầu quyền `organization-balance.adjust`.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'ID của tổ chức cần điều chỉnh số dư.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: AdjustBalanceDto,
    description: 'Thông tin điều chỉnh số dư của tổ chức.',
    examples: {
      bonus: {
        summary: 'Thưởng số dư',
        description: 'Cộng thêm số dư cho khách hàng VIP.',
        value: {
          amount: 50000,
          type: 'BONUS',
          description: 'Thưởng khách hàng VIP',
          notes: 'Ưu đãi tháng 03/2026',
        },
      },
      refund: {
        summary: 'Hoàn tiền',
        description: 'Hoàn tiền thủ công sau khi xử lý khiếu nại.',
        value: {
          amount: 125000,
          type: 'REFUND',
          description: 'Hoàn tiền do chấm dứt dịch vụ sớm',
          notes: 'Đã xác nhận với bộ phận CSKH',
        },
      },
      adjustment: {
        summary: 'Bù trừ số dư',
        description: 'Điều chỉnh kế toán nội bộ.',
        value: {
          amount: 30000,
          type: 'ADJUSTMENT',
          description: 'Điều chỉnh chênh lệch đối soát',
          notes: 'Đối soát ngày 13/03/2026',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Điều chỉnh số dư thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.adjust' },
        message: {
          type: 'string',
          example: 'Điều chỉnh số dư tổ chức thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            balance: {
              type: 'object',
              properties: {
                organization_id: {
                  type: 'string',
                  example: '550e8400-e29b-41d4-a716-446655440000',
                },
                balance: { type: 'number', example: 152050000 },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-03-13T08:20:00.000Z',
                },
              },
            },
            transaction: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '550e8400-e29b-41d4-a716-446655440099',
                },
                amount: { type: 'number', example: 50000 },
                type: { type: 'string', example: 'BONUS' },
                description: {
                  type: 'string',
                  example: 'Thưởng khách hàng VIP',
                },
                notes: { type: 'string', example: 'Ưu đãi tháng 03/2026' },
              },
            },
          },
        },
      },
      example: {
        code: 'organization-balance.adjust',
        message: 'Điều chỉnh số dư tổ chức thành công',
        success: true,
        data: {
          balance: {
            organization_id: '550e8400-e29b-41d4-a716-446655440000',
            balance: 152050000,
            updated_at: '2026-03-13T08:20:00.000Z',
          },
          transaction: {
            id: '550e8400-e29b-41d4-a716-446655440099',
            amount: 50000,
            type: 'BONUS',
            description: 'Thưởng khách hàng VIP',
            notes: 'Ưu đãi tháng 03/2026',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức hoặc số dư tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.not_found' },
        message: {
          type: 'string',
          example: 'Không tìm thấy số dư của tổ chức',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async adjustBalance(
    @Param('organizationId') organizationId: string,
    @Body() dto: AdjustBalanceDto,
    @Req() req: Request,
  ): Promise<
    OkResponse<{
      balance: IOrganizationBalance;
      transaction: IOrganizationBalanceTransaction;
    }>
  > {
    const adminId = (req.user as any).id;
    const lang = (req.user as any).language || 'vi';
    const data = await this.service.adjustBalance(
      organizationId,
      dto,
      adminId,
      lang,
    );
    return new OkResponse('organization-balance.adjust', data);
  }
}
