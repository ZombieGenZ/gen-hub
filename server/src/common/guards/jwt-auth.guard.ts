import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { I18nContext } from 'nestjs-i18n';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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

      // Mapping từ JWT error message sang i18n key
      const errorKeyMap: Record<string, string> = {
        'jwt expired': 'common.errors.jwt_expired',
        'invalid token': 'common.errors.jwt_invalid',
        'jwt malformed': 'common.errors.jwt_malformed',
        'No auth token': 'common.errors.jwt_no_token',
        'invalid signature': 'common.errors.jwt_invalid_signature',
      };

      let message: string;
      if (info?.message && errorKeyMap[info.message]) {
        message = i18n?.t(errorKeyMap[info.message]) as string || info.message;
      } else {
        message = i18n?.t('common.errors.unauthorized') as string || 'Không có quyền truy cập';
      }

      throw err || new UnauthorizedException(message);
    }
    return user;
  }
}
