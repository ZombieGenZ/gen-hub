import { Controller, Post, Body } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiExtraModels,
    ApiBody,
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
    constructor(private readonly service: PublicQuotationService) { }

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
    @ApiBody({
        type: CalculateQuotationDto,
        description: 'Thông tin tính báo giá',
        examples: {
            whole_rent: {
                summary: 'Thuê nguyên kho',
                description: 'Tính giá thuê nguyên kho trong 12 tháng',
                value: {
                    warehouse_template_id: '550e8400-e29b-41d4-a716-446655440000',
                    rental_type: 'whole',
                    duration_months: 12,
                    start_date: '2024-02-01',
                    selected_amenities: ['uuid-amenity-1', 'uuid-amenity-2'],
                    insurance_id: 'uuid-insurance-1',
                    coupon_code: 'WELCOME2024'
                }
            },
            shared_rent: {
                summary: 'Thuê theo dãy (Shared)',
                description: 'Tính giá thuê 2 dãy trong 6 tháng',
                value: {
                    warehouse_template_id: '550e8400-e29b-41d4-a716-446655440001',
                    rental_type: 'row',
                    duration_months: 6,
                    start_date: '2024-03-01',
                    row_ids: ['uuid-row-1', 'uuid-row-2'],
                    selected_amenities: ['uuid-amenity-3']
                }
            }
        }
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
                            example: '550e8400-e29b-41d4-a716-446655440000'
                        },
                        warehouse_name: {
                            type: 'string',
                            description: 'Tên kho',
                            example: 'Kho Quận 7 - A1'
                        },
                        rental_type: {
                            type: 'string',
                            enum: ['whole', 'row'],
                            description: 'Loại thuê: whole (nguyên kho) hoặc row (theo dãy)',
                            example: 'whole'
                        },
                        duration_months: {
                            type: 'number',
                            description: 'Số tháng thuê',
                            example: 12
                        },
                        base_price_per_month: {
                            type: 'number',
                            description: 'Giá gốc mỗi tháng (VND)',
                            example: 50000000
                        },
                        duration_discount_percent: {
                            type: 'number',
                            description: 'Phần trăm giảm giá theo thời gian',
                            example: 10
                        },
                        subtotal: {
                            type: 'number',
                            description: 'Tạm tính (VND) sau khi nhân số tháng',
                            example: 540000000
                        },
                        service_fee: {
                            type: 'number',
                            description: 'Phí dịch vụ (VND)',
                            example: 5000000
                        },
                        coupon_discount: {
                            type: 'number',
                            description: 'Giảm giá coupon (VND)',
                            example: 1000000
                        },
                        grand_total: {
                            type: 'number',
                            description: 'Tổng tiền thanh toán (VND)',
                            example: 600000000
                        },
                        deposit_amount: {
                            type: 'number',
                            description: 'Tiền cọc (VND)',
                            example: 50000000
                        },
                        is_warehouse_available: {
                            type: 'boolean',
                            description: 'Kho còn trống?',
                            example: true
                        },
                        start_date: {
                            type: 'string',
                            format: 'date',
                            description: 'Ngày bắt đầu thuê',
                            example: '2024-02-01'
                        },
                        end_date: {
                            type: 'string',
                            format: 'date',
                            description: 'Ngày kết thúc thuê',
                            example: '2025-01-31'
                        }
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
