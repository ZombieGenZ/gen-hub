import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard kiểm tra user đang đăng nhập bằng liên kết chính
 * Liên kết chính là nền tảng user đăng ký lần đầu tiên
 * Chỉ cho phép thao tác khi is_primary_auth = true trong JWT payload
 */
@Injectable()
export class PrimaryAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không có thông tin xác thực');
    }

    // Kiểm tra is_primary_auth từ JWT payload
    if (user.is_primary_auth !== true) {
      throw new ForbiddenException(
        'Chỉ đăng nhập bằng liên kết chính mới có thể thực hiện thao tác này',
      );
    }

    return true;
  }
}
