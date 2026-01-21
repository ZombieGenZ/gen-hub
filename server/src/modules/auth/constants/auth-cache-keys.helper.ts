import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating Auth cache keys from environment variables
 * All cache key prefixes are configurable via .env
 */
@Injectable()
export class AuthCacheKeysHelper {
    constructor(private readonly configService: ConfigService) { }

    /** Session cache TTL - User data during login (default: 15 minutes) */
    get sessionTtl(): number {
        return this.configService.get<number>('REDIS_AUTH_SESSION_CACHE_TTL') || 900;
    }

    /** Refresh token cache TTL - Matches JWT_REFRESH_EXPIRATION (default: 7 days) */
    get refreshTokenTtl(): number {
        return this.configService.get<number>('REDIS_AUTH_REFRESH_TOKEN_CACHE_TTL') || 604800;
    }

    /** Permission check cache TTL (default: 5 minutes) */
    get permissionTtl(): number {
        return this.configService.get<number>('REDIS_AUTH_PERMISSION_CACHE_TTL') || 300;
    }

    /** Email verification cache TTL (default: 24 hours) */
    get emailVerifyTtl(): number {
        return this.configService.get<number>('REDIS_AUTH_EMAIL_VERIFY_CACHE_TTL') || 86400;
    }

    /** Forgot password cache TTL (default: 15 minutes) */
    get forgotPasswordTtl(): number {
        return this.configService.get<number>('REDIS_AUTH_FORGOT_PASSWORD_CACHE_TTL') || 900;
    }

    /**
     * Generate cache key for user session during login
     * @param identifier - Email or userId
     */
    session(identifier: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_SESSION_KEY_PREFIX') || 'auth:session';
        return `${prefix}:${identifier}`;
    }

    /**
     * Generate cache key for refresh token
     * Uses first 32 chars of token as hash for shorter key
     * @param token - Refresh token string
     */
    refreshToken(token: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_REFRESH_TOKEN_KEY_PREFIX') || 'auth:refresh';
        const hash = token.substring(0, 32);
        return `${prefix}:${hash}`;
    }

    /**
     * Generate cache key for refresh token by user ID
     * @param userId - User ID
     */
    refreshTokenByUser(userId: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_REFRESH_TOKEN_KEY_PREFIX') || 'auth:refresh';
        return `${prefix}:user:${userId}`;
    }

    /**
     * Generate cache key for user permissions
     * @param userId - User ID
     */
    permission(userId: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_PERMISSION_KEY_PREFIX') || 'auth:permission';
        return `${prefix}:${userId}`;
    }

    /**
     * Generate cache key for specific permission check
     * @param userId - User ID
     * @param permissionKey - Permission key to check
     */
    permissionCheck(userId: string, permissionKey: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_PERMISSION_KEY_PREFIX') || 'auth:permission';
        return `${prefix}:${userId}:${permissionKey}`;
    }

    /**
     * Generate cache key for email verification token
     * @param token - Email verification token
     */
    emailVerify(token: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_EMAIL_VERIFY_KEY_PREFIX') || 'auth:email:verify';
        return `${prefix}:${token}`;
    }

    /**
     * Generate cache key for forgot password token
     * @param token - Forgot password token
     */
    forgotPassword(token: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_FORGOT_PASSWORD_KEY_PREFIX') || 'auth:password:reset';
        return `${prefix}:${token}`;
    }

    /**
     * Generate cache key for temporary 2FA token
     * @param userId - User ID
     */
    temp2fa(userId: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_TEMP_2FA_KEY_PREFIX') || 'auth:2fa:temp';
        return `${prefix}:${userId}`;
    }

    /**
     * Generate cache key for brute force tracking
     * @param identifier - Email or IP address
     */
    bruteForce(identifier: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_BRUTE_FORCE_KEY_PREFIX') || 'auth:bruteforce';
        return `${prefix}:${identifier}`;
    }

    /**
     * Pattern to match all auth-related cache keys for a user
     * @param userId - User ID
     */
    userAllKeysPattern(userId: string): string {
        return `auth:*:${userId}*`;
    }

    /**
     * Pattern to match all refresh tokens for a user
     * @param userId - User ID
     */
    userRefreshTokenPattern(userId: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_REFRESH_TOKEN_KEY_PREFIX') || 'auth:refresh';
        return `${prefix}:user:${userId}:*`;
    }

    /**
     * Pattern to match all permission cache for a user
     * @param userId - User ID
     */
    userPermissionPattern(userId: string): string {
        const prefix = this.configService.get<string>('REDIS_AUTH_PERMISSION_KEY_PREFIX') || 'auth:permission';
        return `${prefix}:${userId}*`;
    }
}
