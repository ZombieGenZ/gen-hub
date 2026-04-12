import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import * as path from 'path';

import { RedisService } from '../redis/redis.service';
import { WarehouseVisitService } from '../warehouse-visit/warehouse-visit.service';
import { ConsultationRequestService } from '../consultation-request/consultation-request.service';
import { CreateWarehouseVisitBookingDto } from '../warehouse-visit/dto';
import { AiPluginRepository } from './ai-plugin.repository';
import {
  GetWarehousePricingDto,
  CheckAvailabilityDto,
  CreateAiConsultationRequestDto,
  CreateAiVisitBookingDto,
} from './dto';
import {
  IWarehousePricingResponse,
  IAvailabilityResponse,
  IRentalContractTermsResponse,
  IFaqForAiResponse,
  ITermsSection,
} from './interfaces';

@Injectable()
export class AiPluginService {
  private readonly pricingCacheTTL: number;
  private readonly availabilityCacheTTL: number;
  private readonly termsCacheTTL: number;
  private readonly faqCacheTTL: number;

  constructor(
    private readonly repository: AiPluginRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly consultationRequestService: ConsultationRequestService,
    private readonly warehouseVisitService: WarehouseVisitService,
  ) {
    this.pricingCacheTTL = this.configService.get<number>(
      'REDIS_COZE_PRICING_TTL',
      300,
    );
    this.availabilityCacheTTL = this.configService.get<number>(
      'REDIS_COZE_AVAILABILITY_TTL',
      60,
    );
    this.termsCacheTTL = this.configService.get<number>(
      'REDIS_COZE_TERMS_TTL',
      86400,
    );
    this.faqCacheTTL = this.configService.get<number>(
      'REDIS_COZE_FAQ_TTL',
      300,
    );
  }

  async getWarehousePricing(
    dto: GetWarehousePricingDto,
  ): Promise<IWarehousePricingResponse> {
    const cacheKey = this.getPricingCacheKey(dto);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { items, total } = await this.repository.getWarehousePricing(dto);
    const result: IWarehousePricingResponse = {
      items,
      total,
      limit: dto.limit || 3,
    };
    if (items.length > 0) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        this.pricingCacheTTL,
      );
    }
    return result;
  }

  async checkAvailability(
    dto: CheckAvailabilityDto,
    lang: string,
  ): Promise<IAvailabilityResponse> {
    const cacheKey = `ai-plugin:availability:${dto.warehouse_id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.repository.checkAvailability(dto.warehouse_id);
    if (!result) {
      throw new NotFoundException(
        this.i18n.t('ai-plugin.errors.warehouse_not_found', { lang }),
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.availabilityCacheTTL,
    );
    return result;
  }

  async getRentalContractTerms(
    lang: string,
  ): Promise<IRentalContractTermsResponse> {
    const cacheKey = 'ai-plugin:terms';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const termsPath = path.join(
      process.cwd(),
      'documents',
      'contract',
      'terms.md',
    );
    if (!fs.existsSync(termsPath)) {
      throw new NotFoundException(
        this.i18n.t('ai-plugin.errors.terms_file_not_found', { lang }),
      );
    }

    const content = fs.readFileSync(termsPath, 'utf-8');
    const result = {
      content,
      sections: this.parseMarkdownSections(content),
      last_updated: this.getFileLastModified(termsPath),
    };
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.termsCacheTTL,
    );
    return result;
  }

  async getFaq(): Promise<IFaqForAiResponse> {
    const cacheKey = 'ai-plugin:faq';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const items = await this.repository.getFaqs();
    const result = { items, total: items.length };
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.faqCacheTTL,
    );
    return result;
  }

  async createConsultationRequest(dto: CreateAiConsultationRequestDto) {
    return this.consultationRequestService.createRequest(
      {
        ...dto,
        warehouse_template_id: dto.warehouse_id,
        source: 'AI_CHATBOT',
      },
      null,
    );
  }

  async createVisitBooking(dto: CreateAiVisitBookingDto) {
    const payload: CreateWarehouseVisitBookingDto = {
      warehouse_template_id: dto.warehouse_id,
      organization_id: dto.organization_id,
      visitor_name: dto.visitor_name,
      visitor_email: dto.visitor_email,
      visitor_phone: dto.visitor_phone,
      visitor_company: dto.visitor_company,
      visitor_position: dto.visitor_position,
      visit_date: dto.visit_date,
      visit_time_start: dto.visit_time_start,
      visit_time_end: dto.visit_time_end,
      purpose: dto.purpose,
      purpose_details: dto.purpose_details,
      number_of_visitors: dto.number_of_visitors,
    };

    return this.warehouseVisitService.createBooking(payload, null);
  }

  private parseMarkdownSections(content: string): ITermsSection[] {
    const sections: ITermsSection[] = [];
    const lines = content.split('\n');
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,3}\s+\*{0,2}(.+?)\*{0,2}\s*$/);
      if (headingMatch) {
        if (currentTitle)
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim(),
          });
        currentTitle = headingMatch[1].replace(/\*+/g, '').trim();
        currentContent = [];
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }

    if (currentTitle)
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    return sections;
  }

  private getFileLastModified(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private getPricingCacheKey(dto: GetWarehousePricingDto): string {
    const key = {
      k: dto.keywords,
      pn: dto.province_name,
      pc: dto.province_code,
      minP: dto.min_price,
      maxP: dto.max_price,
      minA: dto.min_area,
      maxA: dto.max_area,
      cold: dto.is_cold_storage,
      shared: dto.is_shared_warehouse,
      wid: dto.warehouse_id,
      l: dto.limit,
    };
    return `ai-plugin:pricing:${JSON.stringify(key)}`;
  }
}
