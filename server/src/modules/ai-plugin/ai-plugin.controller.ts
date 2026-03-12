import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
    ApiBody,
    ApiHeader,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { GetResponse, CreatedResponse } from '../../common/responses/success.response';
import { ApiValidationErrorResponse, Public } from '../../common/decorators';
import { AiPluginService } from './ai-plugin.service';
import { GetWarehousePricingDto, CheckAvailabilityDto, CreateAiConsultationRequestDto, CreateAiVisitBookingDto } from './dto';
import { AiPluginApiKeyGuard } from './guards';

@ApiTags('AI Plugin')
@ApiHeader({
    name: 'X-API-Key',
    description: 'API key used by AI platforms to call public AI endpoints',
    required: true,
    example: 'AI-PLUGIN-KEY-123456',
})
@Controller('ai-plugin')
@UseGuards(AiPluginApiKeyGuard)
@Public()
export class AiPluginController {
    constructor(private readonly service: AiPluginService) { }

    @Get('warehouse-pricing')
    @ApiOperation({ summary: 'Get warehouse pricing' })
    @ApiQuery({ name: 'keywords', required: false, type: String })
    @ApiQuery({ name: 'min_area', required: false, type: Number })
    @ApiQuery({ name: 'max_area', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Warehouse pricing fetched successfully' })
    @ApiValidationErrorResponse()
    async getWarehousePricing(@Query() dto: GetWarehousePricingDto) {
        const data = await this.service.getWarehousePricing(dto);
        return new GetResponse('ai-plugin.warehouse_pricing_fetched', data);
    }

    @Get('check-availability')
    @ApiOperation({ summary: 'Check warehouse availability' })
    @ApiResponse({ status: 200, description: 'Availability checked successfully' })
    async checkAvailability(@Query() dto: CheckAvailabilityDto, @I18nLang() lang: string) {
        const data = await this.service.checkAvailability(dto, lang);
        return new GetResponse('ai-plugin.availability_checked', data);
    }

    @Get('rental-contract-terms')
    @ApiOperation({ summary: 'Get rental contract terms' })
    @ApiResponse({ status: 200, description: 'Contract terms fetched successfully' })
    async getRentalContractTerms(@I18nLang() lang: string) {
        const data = await this.service.getRentalContractTerms(lang);
        return new GetResponse('ai-plugin.terms_fetched', data);
    }

    @Get('faq')
    @ApiOperation({ summary: 'Get FAQ' })
    @ApiResponse({ status: 200, description: 'FAQ fetched successfully' })
    async getFaq() {
        const data = await this.service.getFaq();
        return new GetResponse('ai-plugin.faq_fetched', data);
    }

    @Post('consultation-request')
    @ApiOperation({ summary: 'Create consultation request' })
    @ApiBody({ type: CreateAiConsultationRequestDto })
    @ApiResponse({ status: 201, description: 'Consultation request created successfully' })
    async createConsultationRequest(@Body() dto: CreateAiConsultationRequestDto) {
        const data = await this.service.createConsultationRequest(dto);
        return new CreatedResponse('ai-plugin.consultation_created', data);
    }

    @Post('visit-booking')
    @ApiOperation({ summary: 'Create warehouse visit booking' })
    @ApiBody({ type: CreateAiVisitBookingDto })
    @ApiResponse({ status: 201, description: 'Warehouse visit booking created successfully' })
    async createVisitBooking(@Body() dto: CreateAiVisitBookingDto) {
        const data = await this.service.createVisitBooking(dto);
        return new CreatedResponse('ai-plugin.visit_booking_created', data);
    }
}
