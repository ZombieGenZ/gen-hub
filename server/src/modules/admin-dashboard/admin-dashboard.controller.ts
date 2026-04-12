import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, ApiAuthResponses } from '../../common/decorators';
import { GetResponse } from '../../common/responses';

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('overview')
  @RequirePermission('revenue.analytics.view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lay tong quan Dashboard Admin',
    description:
      'Tra ve 4 chi so chinh cua he thong: Tong kho, Don cho duyet, Khach hang, Doanh thu thang nay. Du lieu duoc cache Redis 60 giay de toi uu hieu suat.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lay tong quan dashboard thanh cong',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'admin_dashboard.overview_success',
        },
        message: {
          type: 'string',
          example: 'Lay tong quan dashboard thanh cong',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalWarehouses: {
              type: 'number',
              example: 42,
              description: 'Tong so kho dang hoat dong trong he thong',
            },
            pendingApprovals: {
              type: 'number',
              example: 8,
              description:
                'Tong so don dang cho duyet (hop dong + tu van + cap nhat to chuc + lich hen)',
            },
            totalCustomers: {
              type: 'number',
              example: 1250,
              description: 'Tong so khach hang da dang ky tai khoan',
            },
            monthlyRevenue: {
              type: 'number',
              example: 48000000,
              description:
                'Doanh thu thang hien tai (VND) - tong giao dich da thanh toan',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-03T08:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiAuthResponses()
  async getOverview() {
    const data = await this.service.getOverview();
    return new GetResponse('admin_dashboard.overview_success', data);
  }
}
