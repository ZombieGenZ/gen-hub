import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

interface HunterVerifyResponse {
  data?: {
    status:
      | 'valid'
      | 'invalid'
      | 'accept_all'
      | 'webmail'
      | 'disposable'
      | 'unknown';
    result: 'deliverable' | 'undeliverable' | 'risky';
    score: number;
    email: string;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
  };
  errors?: Array<{ id: string; code: number; details: string }>;
}

export interface HunterVerificationResult {
  isValid: boolean;
  result: 'deliverable' | 'undeliverable' | 'risky';
  score: number;
  isDisposable: boolean;
}

/**
 * Hunter Service
 * Xác minh email deliverability qua Hunter.io API
 */
@Injectable()
export class HunterService {
  private readonly HUNTER_VERIFY_URL =
    'https://api.hunter.io/v2/email-verifier';

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Kiểm tra xem Hunter verification có được bật không
   */
  isEnabled(): boolean {
    return (
      this.configService.get<string>('USE_HUNTER_EMAIL_VERIFICATION') === 'true'
    );
  }

  /**
   * Xác minh email qua Hunter.io
   * @param email - Email cần xác minh
   * @param lang - Ngôn ngữ cho message
   * @returns Kết quả xác minh hoặc throw exception nếu undeliverable
   */
  async verifyEmail(
    email: string,
    lang = 'vi',
  ): Promise<HunterVerificationResult | null> {
    // Bypass nếu Hunter verification bị tắt
    if (!this.isEnabled()) {
      return null;
    }

    const apiKey = this.configService.get<string>('HUNTER_API_KEY');

    if (!apiKey) {
      console.warn(
        'HUNTER_API_KEY not configured, bypassing email verification',
      );
      return null;
    }

    try {
      const url = new URL(this.HUNTER_VERIFY_URL);
      url.searchParams.append('email', email);
      url.searchParams.append('api_key', apiKey);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const result: HunterVerifyResponse = await response.json();

      if (result.errors && result.errors.length > 0) {
        console.warn('Hunter API error:', result.errors);
        // Không block đăng ký nếu API lỗi
        return null;
      }

      if (!result.data) {
        return null;
      }

      const verificationResult: HunterVerificationResult = {
        isValid: result.data.result !== 'undeliverable',
        result: result.data.result,
        score: result.data.score,
        isDisposable: result.data.disposable,
      };

      // Block email không thể giao (undeliverable)
      if (result.data.result === 'undeliverable') {
        throw new BadRequestException(
          this.i18n.t('auth.email_undeliverable', { lang }),
        );
      }

      return verificationResult;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Hunter verification error:', error);
      // Không block đăng ký nếu API lỗi
      return null;
    }
  }
}
