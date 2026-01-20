import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { I18nContext } from 'nestjs-i18n';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ResponseCode } from '../responses';

/**
 * Guard xác thực JWT access token
 * Sử dụng Passport JWT strategy để validate token
 * Hỗ trợ decorator @Public() để bỏ qua authentication cho các route công khai
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Kiểm tra xem request có thể được cho phép hay không
   * @param context - ExecutionContext chứa thông tin request
   * @returns boolean hoặc Promise<boolean>
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Xử lý lỗi khi xác thực thất bại
   * @param err - Lỗi từ Passport
   * @param user - Thông tin user (nếu có)
   * @param info - Thông tin bổ sung về lỗi
   */
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: Error | undefined,
  ): TUser {
    if (err || !user) {
      const i18n = I18nContext.current();

      // Mapping từ JWT error message sang i18n key và response code
      const errorMapping: Record<string, { i18nKey: string; code: ResponseCode }> = {
        'jwt expired': {
          i18nKey: 'common.errors.jwt_expired',
          code: ResponseCode.ERROR_UNAUTHORIZED_TOKEN_EXPIRED,
        },
        'invalid token': {
          i18nKey: 'common.errors.jwt_invalid',
          code: ResponseCode.ERROR_UNAUTHORIZED_TOKEN_INVALID,
        },
        'jwt malformed': {
          i18nKey: 'common.errors.jwt_malformed',
          code: ResponseCode.ERROR_UNAUTHORIZED_TOKEN_MALFORMED,
        },
        'No auth token': {
          i18nKey: 'common.errors.jwt_no_token',
          code: ResponseCode.ERROR_UNAUTHORIZED_TOKEN_MISSING,
        },
        'invalid signature': {
          i18nKey: 'common.errors.jwt_invalid_signature',
          code: ResponseCode.ERROR_UNAUTHORIZED_TOKEN_INVALID,
        },
      };

      let message: string;
      let code: ResponseCode;

      if (info?.message && errorMapping[info.message]) {
        const mapping = errorMapping[info.message];
        message = i18n?.t(mapping.i18nKey) as string || info.message;
        code = mapping.code;
      } else {
        message = i18n?.t('common.errors.unauthorized') as string || 'Không có quyền truy cập';
        code = ResponseCode.ERROR_UNAUTHORIZED_TOKEN_MISSING;
      }

      throw err || new UnauthorizedException({ code, message, success: false });
    }
    return user;
  }
}
