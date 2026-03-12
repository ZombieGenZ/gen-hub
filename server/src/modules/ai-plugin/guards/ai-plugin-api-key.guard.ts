import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard xác thực API key dành riêng cho các endpoint AI Plugin.
 * Cho phép nền tảng AI gọi các API public nhưng vẫn kiểm soát bằng khóa bí mật trong header `X-API-Key`.
 */
@Injectable()
export class AiPluginApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const expectedApiKey =
      this.configService.get<string>('AI_PLUGIN_API_KEY') ||
      this.configService.get<string>('COZE_PLUGIN_API_KEY');

    if (!expectedApiKey) return true;
    if (!apiKey) throw new UnauthorizedException('API key is required');
    if (apiKey !== expectedApiKey) throw new UnauthorizedException('Invalid API key');

    return true;
  }
}
