import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CloudflareAnalyticsData {
    requests: {
        all: number;
        cached: number;
        uncached: number;
    };
    bandwidth: {
        all: number;
        cached: number;
        uncached: number;
    };
    threats: {
        all: number;
    };
    pageviews: {
        all: number;
    };
    uniques: {
        all: number;
    };
}

export interface AnalyticsResponse {
    success: boolean;
    data?: CloudflareAnalyticsData;
    errors?: string[];
    period: {
        startDate: string;
        endDate: string;
    };
}

/**
 * Cloudflare Analytics Service
 * Lấy thống kê traffic từ Cloudflare Zone Analytics
 */
@Injectable()
export class CloudflareAnalyticsService {
    private readonly CLOUDFLARE_GRAPHQL_URL =
        'https://api.cloudflare.com/client/v4/graphql';

    constructor(private readonly configService: ConfigService) { }

    /**
     * Lấy thống kê traffic từ Cloudflare
     * @param startDate - Ngày bắt đầu (YYYY-MM-DD)
     * @param endDate - Ngày kết thúc (YYYY-MM-DD)
     */
    async getTrafficAnalytics(
        startDate: string,
        endDate: string,
    ): Promise<AnalyticsResponse> {
        const email = this.configService.get<string>('CLOUDFLARE_EMAIL');
        const apiKey = this.configService.get<string>('CLOUDFLARE_API_KEY');
        const zoneId = this.configService.get<string>('CLOUDFLARE_ZONE_ID');
        const minStartDate = this.configService.get<string>(
            'CLOUDFLARE_START_ANALYTICS_DATE',
        );

        if (!email || !apiKey || !zoneId) {
            return {
                success: false,
                errors: ['Cloudflare credentials not configured'],
                period: { startDate, endDate },
            };
        }

        // Đảm bảo startDate không sớm hơn minStartDate
        if (minStartDate && startDate < minStartDate) {
            startDate = minStartDate;
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
                return {
                    success: false,
                    errors: ['No zone data found'],
                    period: { startDate, endDate },
                };
            }

            const groups = zones[0].httpRequests1dGroups;
            if (!groups || groups.length === 0) {
                return {
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
            }

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

            return {
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
        } catch (error) {
            console.error('Cloudflare Analytics error:', error);
            return {
                success: false,
                errors: ['Failed to fetch analytics data'],
                period: { startDate, endDate },
            };
        }
    }
}
