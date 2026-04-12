import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IIpInfoResult {
  country?: string;
  region?: string;
  city?: string;
}

/**
 * Service lấy thông tin địa lý từ IP qua ipinfo.io
 * Cấu hình IPINFO_TOKEN trong .env (free tier: 50k requests/tháng)
 */
@Injectable()
export class IpInfoService {
  private readonly logger = new Logger(IpInfoService.name);
  private readonly token: string | undefined;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('IPINFO_TOKEN');
    this.enabled = !!this.token;
    if (!this.enabled) {
      this.logger.debug('IpInfo disabled - IPINFO_TOKEN not set');
    }
  }

  /**
   * Lấy country, region (tỉnh/thành) từ IP
   * Không gọi API nếu không có token hoặc IP không hợp lệ (localhost, private)
   */
  async lookup(ip: string | undefined): Promise<IIpInfoResult> {
    if (!this.enabled || !ip?.trim()) return {};
    const trimmed = ip.trim();
    if (this.isPrivateOrLocal(trimmed)) return {};

    try {
      const url = `https://ipinfo.io/${encodeURIComponent(trimmed)}?token=${this.token}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return {};
      const data = (await res.json()) as {
        country?: string;
        region?: string;
        city?: string;
      };
      return {
        country: data.country ?? undefined,
        region: data.region ?? data.city ?? undefined,
        city: data.city ?? undefined,
      };
    } catch (err) {
      this.logger.warn(
        `IpInfo lookup failed for ${trimmed}: ${err instanceof Error ? err.message : err}`,
      );
      return {};
    }
  }

  private isPrivateOrLocal(ip: string): boolean {
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    if (
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.')
    )
      return true;
    return false;
  }
}
