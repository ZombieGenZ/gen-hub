import { SetMetadata } from '@nestjs/common';

/**
 * Key để đánh dấu route là public, không cần xác thực
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator đánh dấu endpoint là public, không cần JWT authentication
 * Sử dụng: @Public() trước controller method
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
