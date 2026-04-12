import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyVerificationService } from '../../modules/api-key-verification/api-key-verification.service';
import { IApiKeyInfo } from '../decorators/current-actor.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseCode } from '../responses';

/**
 * Guard hỗ trợ cả JWT và API key authentication
 * Ưu tiên JWT nếu có, nếu không thì fallback sang API key
 * Sau khi xác thực JWT thành công, kiểm tra tài khoản tồn tại và đã xác minh
 * Ít nhất một trong hai phải hợp lệ
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly apiKeyVerificationService: ApiKeyVerificationService,
    private readonly prisma: PrismaService,
  ) {}

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
    let jwtWasInvalid = false;

    if (jwtToken) {
      try {
        const payload = await this.jwtService.verifyAsync(jwtToken, {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        });

        // Kiểm tra tài khoản tồn tại trong database
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            is_verified: true,
            is_deleted: true,
            is_banned: true,
            banned_end: true,
          },
        });

        if (!user || user.is_deleted) {
          throw new ForbiddenException({
            code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_FOUND,
            message: 'Tài khoản không tồn tại',
            success: false,
          });
        }

        if (
          user.is_banned &&
          (!user.banned_end || new Date(user.banned_end) > new Date())
        ) {
          throw new ForbiddenException({
            code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_BANNED,
            message: 'Tài khoản đã bị khóa',
            success: false,
          });
        }

        if (!user.is_verified) {
          throw new ForbiddenException({
            code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_VERIFIED,
            message:
              'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
            success: false,
          });
        }

        request.user = payload;
        return true;
      } catch (error) {
        // Re-throw nếu là lỗi tài khoản (ForbiddenException đã có code)
        if (error instanceof ForbiddenException) {
          throw error;
        }
        // JWT không hợp lệ (chữ ký sai, hết hạn, v.v.), thử API key
        jwtWasInvalid = true;
      }
    }

    // Fallback sang API key authentication
    const apiKey = this.extractApiKey(request);
    if (apiKey) {
      try {
        const lang = request.headers['accept-language'] || 'vi';
        const apiKeyInfo =
          await this.apiKeyVerificationService.getApiKeyByPlainKey(
            apiKey,
            lang,
          );

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
            if (
              (
                r.role as unknown as {
                  permissions?: { permission: { key: string } }[];
                }
              )?.permissions
            ) {
              for (const rp of (
                r.role as unknown as {
                  permissions: { permission: { key: string } }[];
                }
              ).permissions) {
                if (rp.permission?.key) {
                  permissionKeys.push(rp.permission.key);
                }
              }
            }
          }
        }

        // Kiểm tra trạng thái tài khoản của chủ sở hữu API key
        if (apiKeyInfo.created_by_user_id) {
          const ownerUser = await this.prisma.user.findUnique({
            where: { id: apiKeyInfo.created_by_user_id },
            select: {
              is_verified: true,
              is_banned: true,
              banned_end: true,
              is_deleted: true,
            },
          });
          if (!ownerUser || ownerUser.is_deleted) {
            throw new ForbiddenException({
              code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_FOUND,
              message: 'Tài khoản không tồn tại',
              success: false,
            });
          }
          if (
            ownerUser.is_banned &&
            (!ownerUser.banned_end ||
              new Date(ownerUser.banned_end) > new Date())
          ) {
            throw new ForbiddenException({
              code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_BANNED,
              message: 'Tài khoản đã bị khóa',
              success: false,
            });
          }
          if (!ownerUser.is_verified) {
            throw new ForbiddenException({
              code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_VERIFIED,
              message:
                'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
              success: false,
            });
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
      } catch (apiKeyError) {
        if (apiKeyError instanceof ForbiddenException) {
          throw apiKeyError;
        }
        // API key không hợp lệ
      }
    }

    // Không có xác thực nào hợp lệ
    if (jwtWasInvalid) {
      throw new UnauthorizedException({
        code: ResponseCode.ERROR_UNAUTHORIZED_TOKEN_INVALID,
        message: 'Token không hợp lệ',
        success: false,
      });
    }

    throw new UnauthorizedException({
      code: ResponseCode.ERROR_UNAUTHORIZED,
      message: 'Không có quyền truy cập',
      success: false,
    });
  }

  /**
   * Trích xuất JWT token từ header Authorization
   */
  private extractJwtToken(request: {
    headers: Record<string, string>;
  }): string | undefined {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * Trích xuất API key từ header X-API-Key
   */
  private extractApiKey(request: {
    headers: Record<string, string>;
  }): string | undefined {
    return request.headers['x-api-key'];
  }
}
