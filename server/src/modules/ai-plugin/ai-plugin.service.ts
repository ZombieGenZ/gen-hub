import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { RedisService } from '../redis/redis.service';
import { WarehouseVisitService } from '../warehouse-visit/warehouse-visit.service';
import { ConsultationRequestService } from '../consultation-request/consultation-request.service';
import { CreateWarehouseVisitBookingDto } from '../warehouse-visit/dto';
import { GeminiService } from '../ai-hub/services/gemini.service';
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
  IWarehouseRecommendationResponse,
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
    private readonly gemini: GeminiService,
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

  async recommendWarehouses(
    query: string,
  ): Promise<IWarehouseRecommendationResponse> {
    const appBaseUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:3000',
    );
    const cacheKey = `ai-plugin:recommend:${crypto.createHash('md5').update(query).digest('hex')}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filters = await this.gemini.extractWarehouseFilters(query);

    const pricingDto: GetWarehousePricingDto = {
      keywords: filters.keywords ?? undefined,
      province_name: filters.province_name ?? undefined,
      min_area: filters.area_min ?? undefined,
      max_area: filters.area_max ?? undefined,
      max_price: filters.budget_max_monthly ?? undefined,
      is_cold_storage: filters.is_cold_storage ?? undefined,
      is_shared_warehouse: filters.is_shared ?? undefined,
      limit: 20,
    };

    const { items } = await this.repository.getWarehousePricing(pricingDto);

    if (items.length === 0) {
      return {
        extracted_filters: filters,
        recommendations: [],
        ai_note:
          'Không tìm thấy kho phù hợp. Bạn có muốn nới lỏng điều kiện tìm kiếm?',
      };
    }

    const warehousesForRanking = items.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      area: w.area,
      price_per_month: w.base_price_per_month,
      is_cold_storage: w.is_cold_storage,
      is_shared_warehouse: w.is_shared_warehouse,
      amenities: w.amenities.map((a) => a.name),
    }));

    const ranked = await this.gemini.rankWarehouses(
      query,
      warehousesForRanking,
    );

    const itemMap = new Map(items.map((w) => [w.id, w]));
    const recommendations = ranked
      .filter((r) => itemMap.has(r.warehouse_id))
      .map((r) => {
        const w = itemMap.get(r.warehouse_id)!;
        return {
          warehouse_id: w.id,
          name: w.name,
          address: w.address,
          area: w.area,
          base_price_per_month: w.base_price_per_month,
          is_cold_storage: w.is_cold_storage,
          is_shared_warehouse: w.is_shared_warehouse,
          images: w.images,
          match_score: r.match_score,
          match_reason: r.match_reason,
          highlights: r.highlights,
          checkout_url: `${appBaseUrl}/kho-bai/${w.id}`,
        };
      });

    // Fire-and-forget: log impressions without blocking response
    const sessionHash = crypto.createHash('md5').update(query).digest('hex');
    void this.repository
      .logRecommendationImpressions(
        sessionHash,
        query,
        recommendations.map((r, idx) => ({
          warehouse_id: r.warehouse_id,
          match_score: r.match_score,
          match_reason: r.match_reason,
          rank_position: idx + 1,
        })),
      )
      .catch(() => {});

    let ai_note = '';
    if (recommendations.length === 0) {
      ai_note =
        'Không tìm thấy kho phù hợp cao. Bạn có muốn nới lỏng điều kiện?';
    } else if (recommendations.length < 3) {
      ai_note = `Chỉ tìm được ${recommendations.length} kho phù hợp. Bạn có muốn mở rộng khu vực tìm kiếm?`;
    }

    const result: IWarehouseRecommendationResponse = {
      extracted_filters: filters,
      recommendations,
      ai_note,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
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
