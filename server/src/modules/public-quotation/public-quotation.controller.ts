import { Controller, Post, Body } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiExtraModels,
} from '@nestjs/swagger';

import { PublicQuotationService } from './public-quotation.service';
import { CalculateQuotationDto } from './dto';
import { IQuotationResult } from './types';
import { GetResponse } from '../../common/responses';
import { Public, ApiValidationErrorResponse } from '../../common/decorators';

@ApiTags('Public Quotation')
@Controller('public/quotation')
@ApiExtraModels(CalculateQuotationDto)
export class PublicQuotationController {
    constructor(private readonly service: PublicQuotationService) {}

    /**
     * Tính báo giá thuê kho (Public API)
     */
    @Post('calculate')
    @Public()
    @ApiOperation({
        summary: 'Tính báo giá thuê kho',
        description:
            'API công khai để tính báo giá thuê kho. Dùng cho trang Checkout để lấy giá tính từ server. ' +
            'Bao gồm: giá gốc, giảm giá theo thời gian, addon, bảo hiểm, coupon, phí dịch vụ, và tiền cọc.',
    })
    @ApiResponse({
        status: 200,
        description: 'Tính báo giá thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'quotation.calculate_success' },
                message: { type: 'string', example: 'Tính báo giá thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        warehouse_template_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID kho',
                        },
                        warehouse_name: {
                            type: 'string',
                            description: 'Tên kho',
                        },
                        rental_type: {
                            type: 'string',
                            enum: ['whole', 'row'],
                            description: 'Loại thuê: whole (nguyên kho) hoặc row (theo dãy)',
                        },
                        duration_months: {
                            type: 'number',
                            description: 'Số tháng thuê',
                        },
                        base_price_per_month: {
                            type: 'number',
                            description: 'Giá gốc mỗi tháng (VND)',
                        },
                        duration_discount_percent: {
                            type: 'number',
                            description: 'Phần trăm giảm giá theo thời gian',
                        },
                        subtotal: {
                            type: 'number',
                            description: 'Tạm tính (VND)',
                        },
                        service_fee: {
                            type: 'number',
                            description: 'Phí dịch vụ (VND)',
                        },
                        coupon_discount: {
                            type: 'number',
                            description: 'Giảm giá coupon (VND)',
                        },
                        grand_total: {
                            type: 'number',
                            description: 'Tổng tiền (VND)',
                        },
                        deposit_amount: {
                            type: 'number',
                            description: 'Tiền cọc (VND)',
                        },
                        is_warehouse_available: {
                            type: 'boolean',
                            description: 'Kho còn trống?',
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu không hợp lệ',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'error.bad_request' },
                message: { type: 'string', example: 'Kho này không hỗ trợ thuê theo dãy' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy kho',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'error.not_found' },
                message: { type: 'string', example: 'Không tìm thấy kho' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiValidationErrorResponse()
    async calculate(@Body() dto: CalculateQuotationDto): Promise<GetResponse<IQuotationResult>> {
        const result = await this.service.calculateQuotation(dto);
        return new GetResponse(
            'quotation.calculate_success',
            result,
            'Tính báo giá thành công',
        );
    }
}
