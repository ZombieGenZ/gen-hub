import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard xác thực API key cho Coze Plugin
 * Kiểm tra header X-API-Key khớp với COZE_PLUGIN_API_KEY trong env
 */
@Injectable()
export class CozePluginApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        const expectedApiKey = this.configService.get<string>('COZE_PLUGIN_API_KEY');

        if (!expectedApiKey) {
            // Nếu chưa cấu hình API key, cho phép truy cập (development mode)
            return true;
        }

        if (!apiKey) {
            throw new UnauthorizedException('API key không được cung cấp');
        }

        if (apiKey !== expectedApiKey) {
            throw new UnauthorizedException('API key không hợp lệ');
        }

        return true;
    }
}
