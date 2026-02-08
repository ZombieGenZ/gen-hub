import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InventoryRequestCacheKeys {
    constructor(private configService: ConfigService) { }

    private getPrefix(type: 'inbound' | 'outbound'): string {
        if (type === 'inbound') {
            return this.configService.get<string>('REDIS_INBOUND_KEY_PREFIX') || 'inventory:inbound';
        }
        return this.configService.get<string>('REDIS_OUTBOUND_KEY_PREFIX') || 'inventory:outbound';
    }

    inboundList(orgId: string, params?: string): string {
        return `${this.getPrefix('inbound')}:list:${orgId}:${params || ''}`;
    }

    inboundDetail(id: string): string {
        return `${this.getPrefix('inbound')}:detail:${id}`;
    }

    outboundList(orgId: string, params?: string): string {
        return `${this.getPrefix('outbound')}:list:${orgId}:${params || ''}`;
    }

    outboundDetail(id: string): string {
        return `${this.getPrefix('outbound')}:detail:${id}`;
    }
}
