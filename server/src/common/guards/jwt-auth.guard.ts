import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
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
      throw (
        err ||
        new UnauthorizedException(info?.message || 'Không có quyền truy cập')
      );
    }
    return user;
  }
}
