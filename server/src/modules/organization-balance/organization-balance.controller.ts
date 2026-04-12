import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { OrganizationBalanceService } from './organization-balance.service';
import { SepayService } from '../payment/sepay.service';
import { CreateDepositDto, QueryBalanceTransactionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { GetResponse, CreatedResponse } from '../../common/responses';
import type {
  IOrganizationBalance,
  IOrganizationBalanceTransaction,
  IPaginatedResponse,
} from './interfaces';

/**
 * Controller cho số dư tài khoản tổ chức
 */
@ApiTags('Organization Balance')
@Controller('organizations/:orgId/balance')
@UseGuards(JwtAuthGuard, OrgPermissionGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationBalanceController {
  constructor(
    private readonly service: OrganizationBalanceService,
    private readonly sepayService: SepayService,
  ) {}

  /**
   * Xem số dư của tổ chức
   */
  @Get()
  @ApiOperation({
    summary: 'Xem số dư tài khoản của tổ chức',
    description:
      'Lấy thông tin chi tiết số dư tài khoản của tổ chức bao gồm: số dư hiện tại, tổng nạp, tổng chi, tổng hoàn tiền. Yêu cầu quyền `organization.balance.read`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin số dư tài khoản tổ chức',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.get' },
        message: { type: 'string', example: 'Lấy số dư thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID số dư',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            organization_id: {
              type: 'string',
              description: 'ID tổ chức',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            balance: {
              type: 'number',
              description: 'Số dư hiện tại (VND)',
              example: 5000000,
            },
            total_deposited: {
              type: 'number',
              description: 'Tổng tiền đã nạp',
              example: 10000000,
            },
            total_spent: {
              type: 'number',
              description: 'Tổng tiền đã chi',
              example: 4500000,
            },
            total_refunded: {
              type: 'number',
              description: 'Tổng tiền đã hoàn',
              example: 500000,
            },
            is_active: {
              type: 'boolean',
              description: 'Trạng thái hoạt động',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-15T10:30:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-07T08:00:00.000Z',
            },
            organization: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '550e8400-e29b-41d4-a716-446655440000',
                },
                name: { type: 'string', example: 'Công ty TNHH ABC' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức hoặc số dư',
  })
  @ApiAuthResponses()
  @RequireOrgPermission('organization.balance.read')
  async getOrganizationBalance(
    @Param('orgId') orgId: string,
    @Req() req: Request,
  ): Promise<GetResponse<IOrganizationBalance>> {
    const lang = (req.user as any)?.language || 'vi';
    const data = await this.service.getOrganizationBalance(orgId, lang);
    return new GetResponse('organization-balance.get', data);
  }

  /**
   * Xem lịch sử giao dịch của tổ chức
   */
  @Get('transactions')
  @ApiOperation({
    summary: 'Xem lịch sử giao dịch số dư tổ chức',
    description:
      'Lấy danh sách các giao dịch số dư của tổ chức với phân trang và bộ lọc. Bao gồm các loại giao dịch: nạp tiền, thanh toán, hoàn tiền, điều chỉnh. Yêu cầu quyền `organization.balance.read`.',
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
    description: 'Số lượng items trả về (1-100)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu (skip)',
    example: 0,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['DEPOSIT', 'PAYMENT', 'REFUND', 'ADJUSTMENT'],
    description: 'Lọc theo loại giao dịch',
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Tìm kiếm trong mô tả giao dịch',
    example: 'nạp tiền',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách giao dịch với phân trang',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'organization-balance.transactions' },
        message: {
          type: 'string',
          example: 'Lấy danh sách giao dịch thành công',
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
                    example: '550e8400-e29b-41d4-a716-446655440002',
                  },
                  organization_id: {
                    type: 'string',
                    example: '550e8400-e29b-41d4-a716-446655440000',
                  },
                  type: {
                    type: 'string',
                    enum: ['DEPOSIT', 'PAYMENT', 'REFUND', 'ADJUSTMENT'],
                    example: 'DEPOSIT',
                  },
                  amount: {
                    type: 'number',
                    description: 'Số tiền giao dịch',
                    example: 1000000,
                  },
                  balance_before: {
                    type: 'number',
                    description: 'Số dư trước giao dịch',
                    example: 4000000,
                  },
                  balance_after: {
                    type: 'number',
                    description: 'Số dư sau giao dịch',
                    example: 5000000,
                  },
                  description: {
                    type: 'string',
                    description: 'Mô tả giao dịch',
                    example: 'Nạp tiền qua SePay',
                  },
                  notes: {
                    type: 'string',
                    description: 'Ghi chú',
                    example: 'Nạp tiền tháng 2',
                  },
                  reference_type: {
                    type: 'string',
                    description: 'Loại tham chiếu',
                    example: 'Payment',
                  },
                  reference_id: {
                    type: 'string',
                    description: 'ID tham chiếu',
                    example: '550e8400-e29b-41d4-a716-446655440099',
                  },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-02-07T08:00:00.000Z',
                  },
                  performed_by_user: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '550e8400-e29b-41d4-a716-446655440003',
                      },
                      name: { type: 'string', example: 'Nguyễn Văn A' },
                    },
                  },
                },
              },
            },
            total: {
              type: 'number',
              description: 'Tổng số giao dịch',
              example: 150,
            },
            limit: { type: 'number', example: 20 },
            offset: { type: 'number', example: 0 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @RequireOrgPermission('organization.balance.read')
  async getOrganizationTransactions(
    @Param('orgId') orgId: string,
    @Req() req: Request,
    @Query() query: QueryBalanceTransactionDto,
  ): Promise<GetResponse<IPaginatedResponse<IOrganizationBalanceTransaction>>> {
    const lang = (req.user as any)?.language || 'vi';
    const data = await this.service.getOrganizationTransactions(
      orgId,
      query,
      lang,
    );
    return new GetResponse('organization-balance.transactions', data);
  }

  /**
   * Tạo yêu cầu nạp tiền cho tổ chức
   */
  @Post('deposit')
  @ApiOperation({
    summary: 'Tạo yêu cầu nạp tiền vào tài khoản tổ chức',
    description:
      'Tạo yêu cầu nạp tiền mới cho tổ chức. Hệ thống sẽ tạo mã giao dịch và thông tin chuyển khoản qua SePay. Số tiền tối thiểu 10,000 VND, tối đa 100,000,000 VND. Yêu cầu quyền `organization.balance.deposit`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: CreateDepositDto,
    description: 'Thông tin yêu cầu nạp tiền',
    examples: {
      deposit_100k: {
        summary: 'Nạp 100,000 VND',
        description: 'Ví dụ nạp số tiền tối thiểu',
        value: {
          amount: 100000,
          notes: 'Nạp tiền lần đầu',
        },
      },
      deposit_1m: {
        summary: 'Nạp 1,000,000 VND',
        description: 'Ví dụ nạp 1 triệu đồng',
        value: {
          amount: 1000000,
          notes: 'Nạp tiền thanh toán hợp đồng',
        },
      },
      deposit_10m: {
        summary: 'Nạp 10,000,000 VND',
        description: 'Ví dụ nạp số tiền lớn',
        value: {
          amount: 10000000,
          notes: 'Nạp tiền dự trữ cho quý 1/2026',
        },
      },
      deposit_no_notes: {
        summary: 'Nạp tiền không ghi chú',
        description: 'Ví dụ nạp tiền mà không có ghi chú',
        value: {
          amount: 500000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Tạo yêu cầu nạp tiền thành công, trả về thông tin chuyển khoản',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'organization-balance.deposit.created',
        },
        message: { type: 'string', example: 'Tạo yêu cầu nạp tiền thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              description: 'ID giao dịch thanh toán',
              example: '550e8400-e29b-41d4-a716-446655440010',
            },
            transaction_code: {
              type: 'string',
              description: 'Mã giao dịch để ghi vào nội dung chuyển khoản',
              example: 'GH1234567890',
            },
            amount: {
              type: 'number',
              description: 'Số tiền cần chuyển',
              example: 1000000,
            },
            bank_info: {
              type: 'object',
              description: 'Thông tin tài khoản ngân hàng',
              properties: {
                bank_name: { type: 'string', example: 'Vietcombank' },
                account_number: { type: 'string', example: '1234567890' },
                account_name: { type: 'string', example: 'CONG TY GEN-HUB' },
                branch: { type: 'string', example: 'Chi nhánh Hồ Chí Minh' },
              },
            },
            qr_code_url: {
              type: 'string',
              description: 'URL mã QR để quét thanh toán',
              example: 'https://api.sepay.vn/qr/...',
            },
            expires_at: {
              type: 'string',
              format: 'date-time',
              description: 'Thời gian hết hạn giao dịch',
              example: '2026-02-07T09:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ (số tiền ngoài phạm vi cho phép)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tổ chức',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @RequireOrgPermission('organization.balance.deposit')
  async createDeposit(
    @Param('orgId') orgId: string,
    @Req() req: Request,
    @Body() dto: CreateDepositDto,
  ): Promise<CreatedResponse<any>> {
    const userId = (req.user as any).id;
    const result = await this.sepayService.createDepositPayment({
      organizationId: orgId,
      userId,
      amount: dto.amount,
      notes: dto.notes,
    });
    return new CreatedResponse(
      'organization-balance.deposit.created',
      result,
      'Tạo yêu cầu nạp tiền thành công',
    );
  }
}
