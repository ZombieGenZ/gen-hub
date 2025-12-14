import { I18nResolver, I18nResolverOptions } from 'nestjs-i18n';
import { ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Custom resolver để parse Accept-Language header
 * và chỉ trả về ngôn ngữ được hỗ trợ (vi hoặc en)
 */
@Injectable()
export class CustomLanguageResolver implements I18nResolver {
    private readonly supportedLanguages = ['vi', 'en'];
    private readonly defaultLanguage = 'vi';

    resolve(context: ExecutionContext): string | undefined {
        const request = context.switchToHttp().getRequest();

        // Ưu tiên 1: Query param ?lang=vi hoặc ?lang=en
        const queryLang = request.query?.lang;
        if (queryLang && this.supportedLanguages.includes(queryLang)) {
            return queryLang;
        }

        // Ưu tiên 2: Header x-lang
        const headerLang = request.headers?.['x-lang'];
        if (headerLang && this.supportedLanguages.includes(headerLang)) {
            return headerLang;
        }

        // Ưu tiên 3: Parse Accept-Language header
        const acceptLanguage = request.headers?.['accept-language'];
        if (acceptLanguage) {
            const parsed = this.parseAcceptLanguage(acceptLanguage);
            for (const lang of parsed) {
                // Chỉ lấy phần đầu (vi-VN -> vi, en-US -> en)
                const shortLang = lang.split('-')[0].toLowerCase();
                if (this.supportedLanguages.includes(shortLang)) {
                    return shortLang;
                }
            }
        }

        // Fallback về ngôn ngữ mặc định
        return this.defaultLanguage;
    }

    /**
     * Parse Accept-Language header và sắp xếp theo priority (q value)
     * Input: "en-GB,en;q=0.9,vi;q=0.8,fr-FR;q=0.7"
     * Output: ["en-GB", "en", "vi", "fr-FR"]
     */
    private parseAcceptLanguage(header: string): string[] {
        return header
            .split(',')
            .map((part) => {
                const [lang, qPart] = part.trim().split(';');
                const q = qPart ? parseFloat(qPart.split('=')[1]) : 1;
                return { lang: lang.trim(), q };
            })
            .sort((a, b) => b.q - a.q)
            .map((item) => item.lang);
    }
}
