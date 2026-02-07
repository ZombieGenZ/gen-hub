import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiHeader,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { CozePluginService } from './coze-plugin.service';
import { GetWarehousePricingDto, CheckAvailabilityDto } from './dto';
import { GetResponse } from '../../common/responses/success.response';
import { CozePluginApiKeyGuard } from './guards';
import { Public, ApiValidationErrorResponse } from '../../common/decorators';

/**
 * Controller cho các API phục vụ Coze AI plugins
 * Yêu cầu API Key trong header X-API-Key
 */
@ApiTags('Coze Plugin')
@ApiHeader({
    name: 'X-API-Key',
    description: 'API Key cho Coze Plugin (được cấp riêng cho Coze AI)',
    required: true,
    example: 'COZE-PLUGIN-KEY-123456',
})
@Controller('coze-plugin')
@UseGuards(CozePluginApiKeyGuard)
@Public() // Bypass JWT auth, chỉ dùng API Key
export class CozePluginController {
    constructor(private readonly service: CozePluginService) { }

    @Get('warehouse-pricing')
    @ApiOperation({
        summary: 'Tìm kiếm kho và lấy thông tin giá',
        description: 'Lấy danh sách kho với advanced search, pricing tiers, gifts, structure. Cho kho chung sẽ có đầy đủ info của từng row. Được sử dụng bởi Coze AI để tư vấn khách hàng về giá thuê kho.',
    })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo tên kho' })
    @ApiQuery({ name: 'min_area', required: false, type: Number, description: 'Diện tích tối thiểu (m²)' })
    @ApiQuery({ name: 'max_area', required: false, type: Number, description: 'Diện tích tối đa (m²)' })
    @ApiQuery({ name: 'type', required: false, type: String, description: 'Loại kho: PRIVATE, SHARED' })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin giá kho thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'coze-plugin.warehouse_pricing_fetched' },
                success: { type: 'boolean', example: true },
                data: { type: 'array', items: { type: 'object' } },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    @ApiValidationErrorResponse()
    async getWarehousePricing(
        @Query() dto: GetWarehousePricingDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getWarehousePricing(dto);
        return new GetResponse('coze-plugin.warehouse_pricing_fetched', data);
    }

    @Get('check-availability')
    @ApiOperation({
        summary: 'Kiểm tra tình trạng kho',
        description: 'Kiểm tra kho còn trống không, số hợp đồng đang active, và rows available (cho kho chung). Được sử dụng bởi Coze AI để xác nhận tình trạng kho trước khi tư vấn.',
    })
    @ApiQuery({ name: 'warehouse_id', required: true, type: String, description: 'ID kho cần kiểm tra' })
    @ApiResponse({ status: 200, description: 'Kiểm tra tình trạng thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kho' })
    async checkAvailability(
        @Query() dto: CheckAvailabilityDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.checkAvailability(dto, lang);
        return new GetResponse('coze-plugin.availability_checked', data);
    }

    @Get('rental-contract-terms')
    @ApiOperation({
        summary: 'Lấy điều khoản hợp đồng',
        description: 'Lấy nội dung điều khoản chung của hợp đồng dịch vụ kho bãi từ file terms.md. Được sử dụng bởi Coze AI để giải đáp thắc mắc về điều khoản.',
    })
    @ApiResponse({ status: 200, description: 'Lấy điều khoản thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    async getRentalContractTerms(@I18nLang() lang: string) {
        const data = await this.service.getRentalContractTerms(lang);
        return new GetResponse('coze-plugin.terms_fetched', data);
    }

    @Get('faq')
    @ApiOperation({
        summary: 'Lấy FAQ',
        description: 'Lấy danh sách câu hỏi thường gặp để AI tư vấn khách hàng. FAQ được phân loại và sắp xếp theo priority.',
    })
    @ApiResponse({ status: 200, description: 'Lấy FAQ thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    async getFaq() {
        const data = await this.service.getFaq();
        return new GetResponse('coze-plugin.faq_fetched', data);
    }
}
