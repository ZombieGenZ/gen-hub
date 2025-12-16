import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Interface cho API Key info gắn vào request
 */
export interface IApiKeyInfo {
    /** ID của API key */
    id: string;
    /** ID tổ chức */
    organization_id: string;
    /** ID người tạo API key */
    created_by_user_id: string;
    /** Tên API key */
    name: string;
    /** Danh sách permission keys */
    permissions: string[];
}

/**
 * Decorator để lấy actor ID từ request
 * Hỗ trợ cả JWT user và API key authentication
 * - Nếu là JWT auth: lấy userId từ token
 * - Nếu là API key auth: lấy created_by_user_id của API key
 * 
 * @example
 * @CurrentActor() actorId: string
 */
export const CurrentActor = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();

        // Ưu tiên userId từ JWT
        if (request.user?.userId) {
            return request.user.userId;
        }

        // Fallback to API key creator
        if (request.apiKey?.created_by_user_id) {
            return request.apiKey.created_by_user_id;
        }

        throw new UnauthorizedException('Không thể xác định người thực hiện');
    },
);

/**
 * Decorator để lấy thông tin API key từ request (nếu có)
 * Trả về undefined nếu không có API key
 * 
 * @example
 * @CurrentApiKey() apiKey: IApiKeyInfo | undefined
 */
export const CurrentApiKey = createParamDecorator(
    (data: keyof IApiKeyInfo | undefined, ctx: ExecutionContext): IApiKeyInfo | unknown => {
        const request = ctx.switchToHttp().getRequest();
        const apiKey = request.apiKey as IApiKeyInfo | undefined;

        if (!apiKey) {
            return undefined;
        }

        // Nếu có chỉ định field cụ thể, trả về field đó
        if (data) {
            return apiKey[data];
        }

        return apiKey;
    },
);
