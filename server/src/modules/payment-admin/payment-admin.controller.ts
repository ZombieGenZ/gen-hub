import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { SepayService } from '../payment/sepay.service';
import { QueryPaymentDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';

/**
 * Admin Controller cho quản lý Payments
 */
@ApiTags('Payment Admin')
@Controller('admin/payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentAdminController {
    constructor(private readonly sepayService: SepayService) { }

    /**
     * Lấy danh sách tất cả payments (Admin only)
     */
    @Get()
    @RequirePermission('payment.list.all')
    @ApiOperation({ summary: 'Lấy danh sách tất cả payments (Admin only)' })
    @ApiResponse({ status: 200, description: 'Trả về danh sách payments' })
    async findAll(
        @Query() query: QueryPaymentDto,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.sepayService.findAllPayments({
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
            status: query.status,
            organizationId: query.organizationId,
        });

        return new GetResponse(
            ResponseCode.PAYMENT_LIST_SUCCESS,
            result,
            lang === 'vi' ? 'Lấy danh sách thanh toán thành công' : 'Payment list retrieved successfully',
        );
    }
}
