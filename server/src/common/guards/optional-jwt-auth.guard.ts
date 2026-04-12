import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard xác thực JWT tùy chọn (optional/soft authentication)
 * Nếu có token hợp lệ -> attach user vào request
 * Nếu không có token hoặc token không hợp lệ -> tiếp tục xử lý mà không throw error
 * Dùng cho các endpoint công khai nhưng vẫn cần biết user nếu đã đăng nhập
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Luôn cho phép request đi qua
   * Nếu có token hợp lệ, user sẽ được attach vào request
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Không throw error nếu không có user
   * Trả về null thay vì throw UnauthorizedException
   */
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,

    _info: Error | undefined,
  ): TUser | null {
    // Nếu có lỗi hoặc không có user, trả về null thay vì throw error
    if (err || !user) {
      return null as TUser | null;
    }
    return user;
  }
}
