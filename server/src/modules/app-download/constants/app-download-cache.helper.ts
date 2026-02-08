import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppDownloadCacheKeys {
    constructor(private configService: ConfigService) { }

    private getPrefix(type: 'share' | 'list'): string {
        if (type === 'share') {
            return this.configService.get<string>('REDIS_APP_DOWNLOAD_SHARE_KEY_PREFIX') || 'app-download:share';
        }
        return this.configService.get<string>('REDIS_APP_DOWNLOAD_LIST_KEY_PREFIX') || 'app-download:list';
    }

    share(id: string): string {
        return `${this.getPrefix('share')}:${id}`;
    }

    shareByToken(token: string): string {
        return `${this.getPrefix('share')}:token:${token}`;
    }

    list(): string {
        return `${this.getPrefix('list')}:all`;
    }
}
