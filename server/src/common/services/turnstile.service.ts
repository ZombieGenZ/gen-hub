import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Turnstile Service
 * Xác minh Cloudflare Turnstile captcha token
 */
@Injectable()
export class TurnstileService {
  private readonly TURNSTILE_VERIFY_URL =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Kiểm tra xem captcha có được bật không
   */
  isEnabled(): boolean {
    return this.configService.get<string>('USE_CLOUDFLARE_CAPTCHA') === 'true';
  }

  /**
   * Xác minh Turnstile token
   * @param token - Token từ client
   * @param remoteip - IP của client (optional)
   * @param lang - Ngôn ngữ cho message
   */
  async verifyToken(
    token: string | undefined,
    remoteip?: string,
    lang = 'vi',
  ): Promise<void> {
    // Bypass nếu captcha bị tắt
    if (!this.isEnabled()) {
      return;
    }

    // Kiểm tra token có tồn tại không
    if (!token) {
      throw new BadRequestException(
        this.i18n.t('auth.captcha_required', { lang }),
      );
    }

    const secretKey = this.configService.get<string>(
      'CLOUDFLARE_TURNSTILE_SECRETKEY',
    );

    if (!secretKey) {
      // Nếu không có secret key, bypass
      console.warn('CLOUDFLARE_TURNSTILE_SECRETKEY not configured, bypassing');
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      if (remoteip) {
        formData.append('remoteip', remoteip);
      }

      const response = await fetch(this.TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const result: TurnstileVerifyResponse = await response.json();

      if (!result.success) {
        console.warn('Turnstile verification failed:', result['error-codes']);
        throw new BadRequestException(
          this.i18n.t('auth.captcha_invalid', { lang }),
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Turnstile verification error:', error);
      throw new BadRequestException(
        this.i18n.t('auth.captcha_invalid', { lang }),
      );
    }
  }
}
