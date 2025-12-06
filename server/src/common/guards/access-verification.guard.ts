import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Interface cho payload của access verification token
 */
interface IAccessVerificationPayload {
    /** ID của user */
    userId: string;
    /** Mục đích của token */
    purpose: 'access_verification';
    /** Thời gian phát hành */
    iat: number;
    /** Thời gian hết hạn */
    exp: number;
}

/**
 * Guard xác thực access_verification_token cho các API nhạy cảm
 * Token này có thời gian sống ngắn (5 phút) và được cấp sau khi xác thực mật khẩu/2FA
 */
@Injectable()
export class AccessVerificationGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Kiểm tra xem request có access_verification_token hợp lệ không
     * @param context - ExecutionContext chứa thông tin request
     * @returns boolean cho biết request có được cho phép hay không
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Yêu cầu xác thực quyền truy cập');
        }

        try {
            const payload = await this.jwtService.verifyAsync<IAccessVerificationPayload>(token, {
                secret: this.configService.get<string>('ACCESS_VERIFICATION_TOKEN_SECRET'),
            });

            if (payload.purpose !== 'access_verification') {
                throw new UnauthorizedException('Token không hợp lệ');
            }

            const currentUser = request.user as { userId: string } | undefined;
            if (currentUser && currentUser.userId !== payload.userId) {
                throw new UnauthorizedException('Token không khớp với tài khoản');
            }

            (request as Request & { accessVerificationPayload: IAccessVerificationPayload }).accessVerificationPayload = payload;

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Token xác thực không hợp lệ hoặc đã hết hạn');
        }
    }

    /**
     * Trích xuất token từ header X-Access-Verification-Token
     * @param request - Request object
     * @returns Token string hoặc undefined
     */
    private extractTokenFromHeader(request: Request): string | undefined {
        const token = request.headers['x-access-verification-token'] as string;
        return token;
    }
}
