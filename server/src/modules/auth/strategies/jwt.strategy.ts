import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../user/user.repository';

/**
 * Interface cho JWT payload
 */
export interface IJwtPayload {
  /** ID của user */
  userId: string;
  /** Email của user */
  email?: string;
  /** Thời gian phát hành token */
  iat?: number;
  /** Thời gian hết hạn token */
  exp?: number;
}

/**
 * Passport JWT Strategy
 * Xác thực access token cho các API yêu cầu đăng nhập
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    const secretKey =
      configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretKey,
    });
  }

  /**
   * Validate JWT payload và trả về user
   * @param payload - JWT payload đã được decode
   * @returns User object để gắn vào request
   */
  async validate(payload: IJwtPayload): Promise<IJwtPayload | null> {
    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      return null;
    }

    if (user.is_banned) {
      if (user.banned_end && new Date(user.banned_end) > new Date()) {
        return null;
      }
    }

    return {
      userId: payload.userId,
      email: user.email || undefined,
    };
  }
}
