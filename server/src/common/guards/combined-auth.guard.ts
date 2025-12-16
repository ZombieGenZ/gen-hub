import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OrganizationService } from '../../modules/organization/organization.service';
import { IApiKeyInfo } from '../decorators/current-actor.decorator';

/**
 * Guard hỗ trợ cả JWT và API key authentication
 * Ưu tiên JWT nếu có, nếu không thì fallback sang API key
 * Ít nhất một trong hai phải hợp lệ
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => OrganizationService))
        private readonly organizationService: OrganizationService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Kiểm tra public endpoint
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        // Thử JWT authentication trước
        const jwtToken = this.extractJwtToken(request);
        if (jwtToken) {
            try {
                const payload = await this.jwtService.verifyAsync(jwtToken, {
                    secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
                });
                request.user = payload;
                return true;
            } catch {
                // JWT không hợp lệ, thử API key
            }
        }

        // Fallback sang API key authentication
        const apiKey = this.extractApiKey(request);
        if (apiKey) {
            try {
                const lang = request.headers['accept-language'] || 'vi';
                const apiKeyInfo = await this.organizationService.getApiKeyByPlainKey(apiKey, lang);

                // Lấy danh sách permission keys
                const permissionKeys: string[] = [];

                if (apiKeyInfo.permissions) {
                    for (const p of apiKeyInfo.permissions) {
                        if (p.permission?.key) {
                            permissionKeys.push(p.permission.key);
                        }
                    }
                }

                if (apiKeyInfo.roles) {
                    for (const r of apiKeyInfo.roles) {
                        if ((r.role as unknown as { permissions?: { permission: { key: string } }[] })?.permissions) {
                            for (const rp of (r.role as unknown as { permissions: { permission: { key: string } }[] }).permissions) {
                                if (rp.permission?.key) {
                                    permissionKeys.push(rp.permission.key);
                                }
                            }
                        }
                    }
                }

                // Gắn thông tin API key vào request
                const apiKeyRequest: IApiKeyInfo = {
                    id: apiKeyInfo.id,
                    organization_id: apiKeyInfo.organization_id,
                    created_by_user_id: apiKeyInfo.created_by_user_id,
                    name: apiKeyInfo.name,
                    permissions: [...new Set(permissionKeys)],
                };

                request.apiKey = apiKeyRequest;
                return true;
            } catch {
                // API key không hợp lệ
            }
        }

        // Không có xác thực nào hợp lệ
        throw new UnauthorizedException('Yêu cầu xác thực bằng JWT hoặc API key');
    }

    /**
     * Trích xuất JWT token từ header Authorization
     */
    private extractJwtToken(request: { headers: Record<string, string> }): string | undefined {
        const authHeader = request.headers['authorization'];
        if (!authHeader) return undefined;

        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }

    /**
     * Trích xuất API key từ header X-API-Key
     */
    private extractApiKey(request: { headers: Record<string, string> }): string | undefined {
        return request.headers['x-api-key'];
    }
}
