import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { CozePluginService } from './coze-plugin.service';
import { GetWarehousePricingDto, CheckAvailabilityDto } from './dto';
import { GetResponse } from '../../common/responses/success.response';
import { CozePluginApiKeyGuard } from './guards';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Controller cho các API phục vụ Coze AI plugins
 * Yêu cầu API Key trong header X-API-Key
 */
@ApiTags('Coze Plugin')
@ApiHeader({
    name: 'X-API-Key',
    description: 'API Key cho Coze Plugin',
    required: true,
})
@Controller('coze-plugin')
@UseGuards(CozePluginApiKeyGuard)
@Public() // Bypass JWT auth, chỉ dùng API Key
export class CozePluginController {
    constructor(private readonly service: CozePluginService) { }

    /**
     * Tìm kiếm kho và lấy thông tin giá chi tiết
     * Bao gồm giá theo từng mốc thời gian, addon/insurance gifts
     * Nếu là kho chung sẽ bao gồm đầy đủ thông tin từng row
     */
    @Get('warehouse-pricing')
    @ApiOperation({
        summary: 'Tìm kiếm kho và lấy thông tin giá',
        description: 'Lấy danh sách kho với advanced search, pricing tiers, gifts, structure. Cho kho chung sẽ có đầy đủ info của từng row.',
    })
    @ApiResponse({ status: 200, description: 'Lấy thông tin giá kho thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    async getWarehousePricing(
        @Query() dto: GetWarehousePricingDto,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getWarehousePricing(dto);
        return new GetResponse('coze-plugin.warehouse_pricing_fetched', data);
    }

    /**
     * Kiểm tra tình trạng có sẵn của warehouse
     * Cho kho chung sẽ hiển thị rows nào còn trống
     */
    @Get('check-availability')
    @ApiOperation({
        summary: 'Kiểm tra tình trạng kho',
        description: 'Kiểm tra kho còn trống không, số hợp đồng đang active, và rows available (cho kho chung)',
    })
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

    /**
     * Lấy điều khoản hợp đồng từ file terms.md
     */
    @Get('rental-contract-terms')
    @ApiOperation({
        summary: 'Lấy điều khoản hợp đồng',
        description: 'Lấy nội dung điều khoản chung của hợp đồng dịch vụ kho bãi',
    })
    @ApiResponse({ status: 200, description: 'Lấy điều khoản thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    async getRentalContractTerms(@I18nLang() lang: string) {
        const data = await this.service.getRentalContractTerms(lang);
        return new GetResponse('coze-plugin.terms_fetched', data);
    }

    /**
     * Lấy danh sách FAQ cho AI tư vấn
     */
    @Get('faq')
    @ApiOperation({
        summary: 'Lấy FAQ',
        description: 'Lấy danh sách câu hỏi thường gặp để AI tư vấn khách hàng',
    })
    @ApiResponse({ status: 200, description: 'Lấy FAQ thành công' })
    @ApiResponse({ status: 401, description: 'API key không hợp lệ' })
    async getFaq() {
        const data = await this.service.getFaq();
        return new GetResponse('coze-plugin.faq_fetched', data);
    }
}
