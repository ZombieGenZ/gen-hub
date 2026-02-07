import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { SepayService } from '../payment/sepay.service';
import { QueryPaymentDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
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
    @ApiOperation({
        summary: 'Lấy danh sách tất cả payments (Admin only)',
        description: 'Truy vấn danh sách tất cả giao dịch thanh toán trong hệ thống với phân trang và bộ lọc. Chỉ dành cho Admin với quyền `payment.list.all`. Bao gồm cả thanh toán hợp đồng thuê và nạp tiền.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng tối đa', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo mã thanh toán hoặc nội dung' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'], description: 'Lọc theo trạng thái' })
    @ApiQuery({ name: 'organizationId', required: false, type: String, description: 'Lọc theo ID tổ chức (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách payments với phân trang',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'payment.list.success' },
                message: { type: 'string', example: 'Lấy danh sách thanh toán thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
                                    payment_code: { type: 'string', description: 'Mã thanh toán', example: 'PAY-2026-00001' },
                                    amount: { type: 'number', description: 'Số tiền', example: 5000000 },
                                    status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'], example: 'COMPLETED' },
                                    payment_method: { type: 'string', example: 'TRANSFER' },
                                    organization_id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
                                    organization: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            name: { type: 'string', example: 'Công ty ABC' },
                                        },
                                    },
                                    reference_type: { type: 'string', description: 'Loại đối tượng liên quan', example: 'RentalContract' },
                                    reference_id: { type: 'string', description: 'ID đối tượng liên quan', example: '550e8400-e29b-41d4-a716-446655440010' },
                                    description: { type: 'string', example: 'Thanh toán hợp đồng thuê kho' },
                                    paid_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-02-07T08:30:00.000Z' },
                                    created_at: { type: 'string', format: 'date-time', example: '2026-02-07T08:00:00.000Z' },
                                },
                            },
                        },
                        total: { type: 'number', description: 'Tổng số giao dịch', example: 150 },
                        limit: { type: 'number', example: 20 },
                        offset: { type: 'number', example: 0 },
                        hasMore: { type: 'boolean', example: true },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
