import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as fs from 'fs';
import * as path from 'path';

import { CozePluginRepository } from './coze-plugin.repository';
import { RedisService } from '../redis/redis.service';
import { GetWarehousePricingDto, CheckAvailabilityDto } from './dto';
import {
    IWarehousePricingResponse,
    IAvailabilityResponse,
    IRentalContractTermsResponse,
    IFaqForAiResponse,
    ITermsSection,
} from './interfaces';

/**
 * Service xử lý business logic cho Coze Plugin APIs
 * Tích hợp Redis caching để tối ưu hiệu suất
 */
@Injectable()
export class CozePluginService {
    private readonly pricingCacheTTL: number;
    private readonly availabilityCacheTTL: number;
    private readonly termsCacheTTL: number;
    private readonly faqCacheTTL: number;

    constructor(
        private readonly repository: CozePluginRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.pricingCacheTTL = this.configService.get<number>('REDIS_COZE_PRICING_TTL', 300); // 5 phút
        this.availabilityCacheTTL = this.configService.get<number>('REDIS_COZE_AVAILABILITY_TTL', 60); // 1 phút
        this.termsCacheTTL = this.configService.get<number>('REDIS_COZE_TERMS_TTL', 86400); // 24 giờ
        this.faqCacheTTL = this.configService.get<number>('REDIS_COZE_FAQ_TTL', 300); // 5 phút
    }

    /**
     * Lấy danh sách warehouse với pricing đầy đủ
     */
    async getWarehousePricing(dto: GetWarehousePricingDto): Promise<IWarehousePricingResponse> {
        // Tạo cache key từ query
        const cacheKey = this.getPricingCacheKey(dto);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const { items, total } = await this.repository.getWarehousePricing(dto);

        const result: IWarehousePricingResponse = {
            items,
            total,
            limit: dto.limit || 3,
        };

        // Cache nếu có kết quả
        if (items.length > 0) {
            await this.redisService.set(cacheKey, JSON.stringify(result), this.pricingCacheTTL);
        }

        return result;
    }

    /**
     * Kiểm tra tình trạng có sẵn của warehouse
     */
    async checkAvailability(dto: CheckAvailabilityDto, lang: string): Promise<IAvailabilityResponse> {
        const cacheKey = `coze:availability:${dto.warehouse_id}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.checkAvailability(dto.warehouse_id);

        if (!result) {
            throw new NotFoundException(
                this.i18n.t('coze-plugin.errors.warehouse_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(result), this.availabilityCacheTTL);

        return result;
    }

    /**
     * Lấy điều khoản hợp đồng từ file markdown
     */
    async getRentalContractTerms(lang: string): Promise<IRentalContractTermsResponse> {
        const cacheKey = 'coze:terms';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Đọc file terms.md
        const termsPath = path.join(process.cwd(), 'documents', 'contract', 'terms.md');

        if (!fs.existsSync(termsPath)) {
            throw new NotFoundException(
                this.i18n.t('coze-plugin.errors.terms_file_not_found', { lang }),
            );
        }

        const content = fs.readFileSync(termsPath, 'utf-8');
        const sections = this.parseMarkdownSections(content);

        const result: IRentalContractTermsResponse = {
            content,
            sections,
            last_updated: this.getFileLastModified(termsPath),
        };

        await this.redisService.set(cacheKey, JSON.stringify(result), this.termsCacheTTL);

        return result;
    }

    /**
     * Lấy danh sách FAQ cho AI tư vấn
     */
    async getFaq(): Promise<IFaqForAiResponse> {
        const cacheKey = 'coze:faq';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const items = await this.repository.getFaqs();

        const result: IFaqForAiResponse = {
            items,
            total: items.length,
        };

        await this.redisService.set(cacheKey, JSON.stringify(result), this.faqCacheTTL);

        return result;
    }

    /**
     * Parse markdown thành các sections
     */
    private parseMarkdownSections(content: string): ITermsSection[] {
        const sections: ITermsSection[] = [];
        const lines = content.split('\n');

        let currentTitle = '';
        let currentContent: string[] = [];

        for (const line of lines) {
            // Detect heading (### ĐIỀU X:...)
            const headingMatch = line.match(/^#{2,3}\s+\*{0,2}(ĐIỀU\s+\d+:.+?)\*{0,2}$/);

            if (headingMatch) {
                // Lưu section trước đó
                if (currentTitle) {
                    sections.push({
                        title: currentTitle,
                        content: currentContent.join('\n').trim(),
                    });
                }
                currentTitle = headingMatch[1].replace(/\*+/g, '').trim();
                currentContent = [];
            } else if (currentTitle) {
                currentContent.push(line);
            }
        }

        // Lưu section cuối cùng
        if (currentTitle) {
            sections.push({
                title: currentTitle,
                content: currentContent.join('\n').trim(),
            });
        }

        return sections;
    }

    /**
     * Lấy ngày sửa đổi file
     */
    private getFileLastModified(filePath: string): string {
        try {
            const stats = fs.statSync(filePath);
            return stats.mtime.toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }

    /**
     * Tạo cache key cho pricing query
     */
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
        return `coze:pricing:${JSON.stringify(key)}`;
    }
}
