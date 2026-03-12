import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiPluginApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        const expectedApiKey =
            this.configService.get<string>('AI_PLUGIN_API_KEY')
            || this.configService.get<string>('COZE_PLUGIN_API_KEY');

        if (!expectedApiKey) return true;
        if (!apiKey) throw new UnauthorizedException('API key is required');
        if (apiKey !== expectedApiKey) throw new UnauthorizedException('Invalid API key');

        return true;
    }
}
