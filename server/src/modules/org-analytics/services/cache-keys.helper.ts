    import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrgAnalyticsCacheKeys {
    constructor(private configService: ConfigService) { }

    item(id: string): string {
        const prefix = this.configService.get<string>('cache.orgAnalytics.keys.item') || 'orgAnalytics:item';
        return `${prefix}:${id}`;
    }

    list(filters?: Record<string, any>): string {
        const prefix = this.configService.get<string>('cache.orgAnalytics.keys.list') || 'orgAnalytics:list';
        return filters ? `${prefix}:${JSON.stringify(filters)}` : prefix;
    }

    overview(orgId: string): string {
        const prefix = this.configService.get<string>('cache.orgAnalytics.keys.overview') || 'orgAnalytics:overview';
        return `${prefix}:${orgId}`;
    }

    flow(orgId: string, days: number): string {
        return `${this.overview(orgId)}:flow:${days}`;
    }

    topProducts(orgId: string): string {
        return `${this.overview(orgId)}:top-products`;
    }

    alerts(orgId: string): string {
        return `${this.overview(orgId)}:alerts`;
    }

    shipments(orgId: string): string {
        return `${this.overview(orgId)}:shipments`;
    }
}
