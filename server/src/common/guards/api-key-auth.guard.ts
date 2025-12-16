import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Inject,
    forwardRef,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OrganizationService } from '../../modules/organization/organization.service';
import { RedisService } from '../../modules/redis/redis.service';
import { IApiKeyInfo } from '../decorators/current-actor.decorator';

/**
 * Guard xác thực API key từ header X-API-Key
 * Nếu API key hợp lệ, gắn thông tin vào request.apiKey
 * Tích hợp rate limiting per API key
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(forwardRef(() => OrganizationService))
        private readonly organizationService: OrganizationService,
        private readonly redisService: RedisService,
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

            // Kiểm tra rate limit
            await this.checkRateLimit(apiKeyInfo.id, apiKeyInfo.rate_limit_ttl, apiKeyInfo.rate_limit_max);

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
            if (error instanceof UnauthorizedException || error instanceof HttpException) {
                throw error;
            }
            throw new UnauthorizedException('API key không hợp lệ');
        }
    }

    /**
     * Kiểm tra rate limit cho API key
     * @param apiKeyId - ID của API key
     * @param ttlSeconds - Thời gian TTL (giây)
     * @param maxRequests - Số request tối đa trong TTL
     */
    private async checkRateLimit(apiKeyId: string, ttlSeconds: number, maxRequests: number): Promise<void> {
        const key = `rate_limit:apikey:${apiKeyId}`;

        try {
            const current = await this.redisService.incr(key);

            // Set TTL lần đầu tiên
            if (current === 1) {
                await this.redisService.expire(key, ttlSeconds);
            }

            if (current > maxRequests) {
                // Lấy TTL còn lại
                const remainingTtl = await this.redisService.ttl(key);

                throw new HttpException({
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: `Rate limit vượt quá. Thử lại sau ${remainingTtl} giây.`,
                    error: 'Too Many Requests',
                    retryAfter: remainingTtl,
                }, HttpStatus.TOO_MANY_REQUESTS);
            }
        } catch (error) {
            // Nếu là lỗi rate limit thì throw lại
            if (error instanceof HttpException) {
                throw error;
            }
            // Nếu Redis lỗi, log và cho qua (fail-open)
            console.error('Rate limit check failed:', error);
        }
    }

    /**
     * Trích xuất API key từ header X-API-Key
     */
    private extractApiKey(request: { headers: Record<string, string> }): string | undefined {
        return request.headers['x-api-key'];
    }
}
