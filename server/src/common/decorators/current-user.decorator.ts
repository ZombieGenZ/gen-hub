import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Interface cho user payload từ JWT
 */
export interface ICurrentUser {
    /** ID của user */
    userId: string;
    /** Email của user */
    email?: string;
    /** Số điện thoại của user */
    phone?: string;
}

/**
 * Decorator để lấy thông tin user hiện tại từ request
 * Sử dụng: @CurrentUser() user: ICurrentUser
 */
export const CurrentUser = createParamDecorator(
    (data: keyof ICurrentUser | undefined, ctx: ExecutionContext): ICurrentUser | unknown => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as ICurrentUser;

        // Nếu có chỉ định field cụ thể, trả về field đó
        if (data) {
            return user?.[data];
        }

        return user;
    },
);
