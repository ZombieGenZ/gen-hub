import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { AnalyticsCacheHelper } from './constants/analytics-cache.helper';
import {
  CloudflareAnalyticsData,
  AnalyticsResponse,
} from './types/analytics.type';

/**
 * Cloudflare Analytics Service
 * Lấy thống kê traffic từ Cloudflare Zone Analytics
 */
@Injectable()
export class CloudflareAnalyticsService {
  private readonly logger = new Logger(CloudflareAnalyticsService.name);
  private readonly CLOUDFLARE_GRAPHQL_URL =
    'https://api.cloudflare.com/client/v4/graphql';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly cacheHelper: AnalyticsCacheHelper,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Lấy thống kê traffic từ Cloudflare
   * @param startDate - Ngày bắt đầu (YYYY-MM-DD)
   * @param endDate - Ngày kết thúc (YYYY-MM-DD)
   */
  async getTrafficAnalytics(
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsResponse> {
    // 1. Check cache first
    const cacheKey = this.cacheHelper.traffic(startDate, endDate);
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        return parsed;
      } catch (error) {
        this.logger.warn(
          `Failed to parse cached analytics data for key ${cacheKey}`,
        );
      }
    }

    const email = this.configService.get<string>('CLOUDFLARE_EMAIL');
    const apiKey = this.configService.get<string>('CLOUDFLARE_API_KEY');
    const zoneId = this.configService.get<string>('CLOUDFLARE_ZONE_ID');
    const minStartDate = this.configService.get<string>(
      'CLOUDFLARE_START_ANALYTICS_DATE',
    );

    if (!email || !apiKey || !zoneId) {
      const errorMsg = await this.i18n.translate(
        'analytics.errors.credentialsNotConfigured',
      );
      return {
        success: false,
        errors: [errorMsg],
        period: { startDate, endDate },
      };
    }

    // Đảm bảo startDate không sớm hơn minStartDate
    if (minStartDate && startDate < minStartDate) {
      startDate = minStartDate;
    }

    // Cloudflare API giới hạn chỉ cho phép truy vấn dữ liệu trong vòng 365 ngày
    const endDateObj = new Date(endDate);
    const startDateObj = new Date(startDate);
    const maxDaysBack = 365;
    const minAllowedDate = new Date(endDateObj);
    minAllowedDate.setDate(minAllowedDate.getDate() - maxDaysBack);

    if (startDateObj < minAllowedDate) {
      startDate = minAllowedDate.toISOString().split('T')[0];
    }

    const query = `
      query GetZoneAnalytics($zoneTag: String!, $since: String!, $until: String!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              limit: 100
              filter: { date_geq: $since, date_leq: $until }
            ) {
              sum {
                requests
                cachedRequests
                bytes
                cachedBytes
                threats
                pageViews
              }
              uniq {
                uniques
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.CLOUDFLARE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Email': email,
          'X-Auth-Key': apiKey,
        },
        body: JSON.stringify({
          query,
          variables: {
            zoneTag: zoneId,
            since: startDate,
            until: endDate,
          },
        }),
      });

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        return {
          success: false,
          errors: result.errors.map((e: { message: string }) => e.message),
          period: { startDate, endDate },
        };
      }

      const zones = result.data?.viewer?.zones;
      if (!zones || zones.length === 0) {
        const errorMsg = await this.i18n.translate(
          'analytics.errors.noZoneData',
        );
        return {
          success: false,
          errors: [errorMsg],
          period: { startDate, endDate },
        };
      }

      const groups = zones[0].httpRequests1dGroups;
      let responseData: AnalyticsResponse;

      if (!groups || groups.length === 0) {
        responseData = {
          success: true,
          data: {
            requests: { all: 0, cached: 0, uncached: 0 },
            bandwidth: { all: 0, cached: 0, uncached: 0 },
            threats: { all: 0 },
            pageviews: { all: 0 },
            uniques: { all: 0 },
          },
          period: { startDate, endDate },
        };
      } else {
        // Tổng hợp dữ liệu từ tất cả các ngày
        let totalRequests = 0;
        let cachedRequests = 0;
        let totalBytes = 0;
        let cachedBytes = 0;
        let totalThreats = 0;
        let totalPageViews = 0;
        let totalUniques = 0;

        for (const group of groups) {
          totalRequests += group.sum?.requests || 0;
          cachedRequests += group.sum?.cachedRequests || 0;
          totalBytes += group.sum?.bytes || 0;
          cachedBytes += group.sum?.cachedBytes || 0;
          totalThreats += group.sum?.threats || 0;
          totalPageViews += group.sum?.pageViews || 0;
          totalUniques += group.uniq?.uniques || 0;
        }

        responseData = {
          success: true,
          data: {
            requests: {
              all: totalRequests,
              cached: cachedRequests,
              uncached: totalRequests - cachedRequests,
            },
            bandwidth: {
              all: totalBytes,
              cached: cachedBytes,
              uncached: totalBytes - cachedBytes,
            },
            threats: { all: totalThreats },
            pageviews: { all: totalPageViews },
            uniques: { all: totalUniques },
          },
          period: { startDate, endDate },
        };
      }

      // Cache result if successful
      const ttl =
        this.configService.get<number>('REDIS_ANALYTICS_CACHE_TTL') || 300;
      await this.redisService.set(cacheKey, JSON.stringify(responseData), ttl);

      return responseData;
    } catch (error) {
      this.logger.error('Cloudflare Analytics error:', error);
      const errorMsg = await this.i18n.translate(
        'analytics.errors.fetchFailed',
      );
      return {
        success: false,
        errors: [errorMsg],
        period: { startDate, endDate },
      };
    }
  }
}
