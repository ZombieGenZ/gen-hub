import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as argon2 from '@node-rs/argon2';
import { OrganizationApiKeyRepository } from '../organization-api-key/organization-api-key.repository';
import { IApiKey } from '../organization/interfaces';

@Injectable()
export class ApiKeyVerificationService {
    constructor(
        private readonly repository: OrganizationApiKeyRepository,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) { }

    /**
     * Lấy thông tin API key từ plain key
     * Dùng để verify API key và lấy thông tin permissions
     */
    async getApiKeyByPlainKey(plainKey: string, lang: string): Promise<IApiKey> {
        // Lấy prefix từ config
        const prefix = this.configService.get<string>('API_KEY_PREFIX') || 'GENHUB';

        // Validate format của key
        if (!plainKey.startsWith(`${prefix}-`)) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_invalid_format', {
                    lang,
                }),
            );
        }

        // Tính key_prefix (PREFIX + 8 ký tự đầu của phần random)
        const randomPart = plainKey.substring(prefix.length + 1);
        const keyPrefix = `${prefix}-${randomPart.substring(0, 8)}`;

        // Tìm các API key có key_prefix match
        const apiKeys = await this.repository.findApiKeysByKeyPrefix(keyPrefix);

        if (apiKeys.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', {
                    lang,
                }),
            );
        }

        // So sánh hash để tìm đúng API key
        let matchedKey: IApiKey | null = null;
        for (const apiKey of apiKeys) {
            const isMatch = await argon2.verify(apiKey.key_hash, plainKey);
            if (isMatch) {
                // Kiểm tra hết hạn
                if (apiKey.expires_at && new Date() > new Date(apiKey.expires_at)) {
                    throw new ForbiddenException(
                        await this.i18n.translate('organization.errors.apikey_expired', {
                            lang,
                        }),
                    );
                }
                matchedKey = apiKey;
                break;
            }
        }

        if (!matchedKey) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.apikey_not_found', {
                    lang,
                }),
            );
        }

        return matchedKey;
    }
}
