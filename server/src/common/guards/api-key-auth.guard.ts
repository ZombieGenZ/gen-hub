import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OrganizationService } from '../../modules/organization/organization.service';
import { IApiKeyInfo } from '../decorators/current-actor.decorator';

/**
 * Guard xác thực API key từ header X-API-Key
 * Nếu API key hợp lệ, gắn thông tin vào request.apiKey
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
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
        const apiKey = this.extractApiKey(request);

        if (!apiKey) {
            throw new UnauthorizedException('API key không được cung cấp');
        }

        try {
            // Verify API key và lấy thông tin
            const lang = request.headers['accept-language'] || 'vi';
            const apiKeyInfo = await this.organizationService.getApiKeyByPlainKey(apiKey, lang);

            // Lấy danh sách permission keys từ API key
            const permissionKeys: string[] = [];

            // Từ direct permissions
            if (apiKeyInfo.permissions) {
                for (const p of apiKeyInfo.permissions) {
                    if (p.permission?.key) {
                        permissionKeys.push(p.permission.key);
                    }
                }
            }

            // Từ roles
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
                permissions: [...new Set(permissionKeys)], // Remove duplicates
            };

            request.apiKey = apiKeyRequest;

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('API key không hợp lệ');
        }
    }

    /**
     * Trích xuất API key từ header X-API-Key
     */
    private extractApiKey(request: { headers: Record<string, string> }): string | undefined {
        return request.headers['x-api-key'];
    }
}
