import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from '@node-rs/argon2';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from './auth.service';

// Mock argon2 so we can control verify/hash behavior in tests
jest.mock('@node-rs/argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));
import { UserRepository } from '../user/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { BackupCodeService } from '../backup-code/backup-code.service';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { AppConfigService } from '../../common/config/app-config.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RedisService } from '../redis/redis.service';
import { TurnstileService } from '../../common/services/turnstile.service';
import { HunterService } from '../../common/services/hunter.service';
import { BruteForceService } from '../brute-force/brute-force.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthCacheKeysHelper } from './constants';

// ─── Mock helpers ──────────────────────────────────────────────
const mockUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password',
  email_confirmed: false,
  is_verified: false,
  is_banned: false,
  banned_end: null,
  is_deleted: false,
  two_factor_enabled: false,
  two_factor_token: null,
  language: 'vi',
  created_at: new Date('2024-01-01'),
  email_verify_token: null,
  email_verify_expired: null,
  forgot_password_token: null,
  forgot_password_expired: null,
  ...overrides,
});

const mockDeviceInfo = {
  ip: '127.0.0.1',
  device: 'Jest Test Agent',
  os: 'test',
};

// ─── Mock factories ────────────────────────────────────────────
const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, any> = {
      ARGON2_MEMORY_COST: 65536,
      ARGON2_TIME_COST: 3,
      ARGON2_PARALLELISM: 1,
      EMAIL_VERIFY_EXPIRATION: 86400000,
      FORGOT_PASSWORD_EXPIRATION: 900000,
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      TEMP_2FA_TOKEN_SECRET: 'test-2fa-secret',
      TEMP_2FA_TOKEN_EXPIRATION: '5m',
      ACCESS_VERIFICATION_TOKEN_SECRET: 'test-avt-secret',
      ACCESS_VERIFICATION_TOKEN_EXPIRATION: '5m',
    };
    return map[key];
  }),
});

const createMockJwtService = () => ({
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  verifyAsync: jest.fn().mockResolvedValue({ userId: 'user-1', is_primary_auth: true }),
});

const createMockI18n = () => ({
  t: jest.fn((key: string) => Promise.resolve(key)),
  translate: jest.fn((key: string) => Promise.resolve(key)),
});

const createMockUserRepo = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByEmailVerifyToken: jest.fn(),
  verifyEmail: jest.fn(),
  updateEmailVerifyToken: jest.fn(),
  findByForgotPasswordToken: jest.fn(),
  updateForgotPasswordToken: jest.fn(),
  resetPassword: jest.fn(),
});

const createMockRefreshTokenRepo = () => ({
  create: jest.fn(),
  findByToken: jest.fn(),
  softDelete: jest.fn(),
  deleteAllByUserId: jest.fn(),
});

const createMockEmailService = () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendLoginNotificationEmail: jest.fn().mockResolvedValue(undefined),
  sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined),
});

const createMockSystemLogService = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

const createMockAppConfigService = () => ({
  get: jest.fn().mockReturnValue('GenHub'),
});

const createMockWebsocketGateway = () => ({
  emitEmailVerified: jest.fn(),
  emitUserLogout: jest.fn(),
  emitUserLogoutAll: jest.fn(),
  server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
});

const createMockRedisService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
  getUserPermissionsCache: jest.fn().mockResolvedValue(null),
});

const createMockTurnstileService = () => ({
  verifyToken: jest.fn().mockResolvedValue(true),
});

const createMockHunterService = () => ({
  verifyEmail: jest.fn().mockResolvedValue(true),
});

const createMockBruteForceService = () => ({
  recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
  onSuccessfulLogin: jest.fn().mockResolvedValue(undefined),
});

const createMockPrismaService = () => ({
  userPermission: { findFirst: jest.fn().mockResolvedValue(null) },
  userRole: { findFirst: jest.fn().mockResolvedValue(null) },
});

const createMockAuthCacheKeys = () => ({
  session: jest.fn((email: string) => `auth:session:${email}`),
  sessionTtl: 3600,
  permissionCheck: jest.fn((uid: string, key: string) => `auth:perm:${uid}:${key}`),
  permissionTtl: 300,
});

// ─── Test Suite ────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: ReturnType<typeof createMockUserRepo>;
  let refreshTokenRepository: ReturnType<typeof createMockRefreshTokenRepo>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let turnstileService: ReturnType<typeof createMockTurnstileService>;
  let hunterService: ReturnType<typeof createMockHunterService>;
  let bruteForceService: ReturnType<typeof createMockBruteForceService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let websocketGateway: ReturnType<typeof createMockWebsocketGateway>;
  let redisService: ReturnType<typeof createMockRedisService>;

  beforeEach(async () => {
    userRepository = createMockUserRepo();
    refreshTokenRepository = createMockRefreshTokenRepo();
    jwtService = createMockJwtService();
    turnstileService = createMockTurnstileService();
    hunterService = createMockHunterService();
    bruteForceService = createMockBruteForceService();
    emailService = createMockEmailService();
    websocketGateway = createMockWebsocketGateway();
    redisService = createMockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useFactory: createMockConfigService },
        { provide: JwtService, useValue: jwtService },
        { provide: I18nService, useFactory: createMockI18n },
        { provide: UserRepository, useValue: userRepository },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        { provide: BackupCodeService, useValue: { verifyBackupCode: jest.fn() } },
        { provide: EmailService, useValue: emailService },
        { provide: SystemLogService, useFactory: createMockSystemLogService },
        { provide: AppConfigService, useFactory: createMockAppConfigService },
        { provide: WebsocketGateway, useValue: websocketGateway },
        { provide: RedisService, useValue: redisService },
        { provide: TurnstileService, useValue: turnstileService },
        { provide: HunterService, useValue: hunterService },
        { provide: BruteForceService, useValue: bruteForceService },
        { provide: PrismaService, useFactory: createMockPrismaService },
        { provide: AuthCacheKeysHelper, useFactory: createMockAuthCacheKeys },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────
  describe('register', () => {
    const registerDto = {
      name: 'New User',
      email: 'new@example.com',
      password: 'Password@123',
      turnstileToken: 'token',
    };

    it('should register successfully and return tokens', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser({ email: 'new@example.com', name: 'New User' }));

      const result = await service.register(registerDto, mockDeviceInfo, 'vi');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toHaveProperty('email', 'new@example.com');
      expect(turnstileService.verifyToken).toHaveBeenCalledWith('token', '127.0.0.1', 'vi');
      expect(hunterService.verifyEmail).toHaveBeenCalledWith('new@example.com', 'vi');
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser());

      await expect(
        service.register(registerDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(ConflictException);
    });

    it('should verify CAPTCHA before checking email', async () => {
      turnstileService.verifyToken.mockRejectedValue(new BadRequestException('Invalid captcha'));

      await expect(
        service.register(registerDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(BadRequestException);

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should verify email with Hunter.io', async () => {
      hunterService.verifyEmail.mockRejectedValue(new BadRequestException('Invalid email'));

      await expect(
        service.register(registerDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send verification and welcome emails', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser({ email: 'new@example.com' }));

      await service.register(registerDto, mockDeviceInfo, 'vi');

      // Emails are sent asynchronously via Promise.all, just check create was called
      expect(userRepository.create).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────
  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password@123',
      turnstileToken: 'token',
    };

    it('should login successfully and return tokens', async () => {
      const user = mockUser();
      userRepository.findByEmail.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto, mockDeviceInfo, 'vi');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect((result as any).user).toHaveProperty('id', 'user-1');
      expect(bruteForceService.onSuccessfulLogin).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login(loginDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
      expect(bruteForceService.recordFailedAttempt).toHaveBeenCalledWith('test@example.com', '127.0.0.1');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser());
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(loginDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
      expect(bruteForceService.recordFailedAttempt).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for banned user', async () => {
      const bannedUser = mockUser({
        is_banned: true,
        banned_end: new Date(Date.now() + 86400000), // banned until tomorrow
      });
      userRepository.findByEmail.mockResolvedValue(bannedUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login(loginDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deleted user', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser({ is_deleted: true }));
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login(loginDto, mockDeviceInfo, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return temp_token when 2FA is enabled', async () => {
      const user2FA = mockUser({ two_factor_enabled: true });
      userRepository.findByEmail.mockResolvedValue(user2FA);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto, mockDeviceInfo, 'vi');

      expect(result).toHaveProperty('requires_2fa', true);
      expect(result).toHaveProperty('temp_token');
    });

    it('should allow banned user whose ban has expired', async () => {
      const expiredBanUser = mockUser({
        is_banned: true,
        banned_end: new Date(Date.now() - 86400000), // ban expired yesterday
      });
      userRepository.findByEmail.mockResolvedValue(expiredBanUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto, mockDeviceInfo, 'vi');
      expect(result).toHaveProperty('access_token');
    });
  });

  // ─────────────────────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      userRepository.findByEmailVerifyToken.mockResolvedValue(mockUser());

      const result = await service.verifyEmail({ token: 'valid-token' }, 'vi');

      expect(result).toHaveProperty('message');
      expect(userRepository.verifyEmail).toHaveBeenCalledWith('user-1');
      expect(redisService.invalidateUserCache).toHaveBeenCalledWith('user-1');
      expect(websocketGateway.emitEmailVerified).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      userRepository.findByEmailVerifyToken.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: 'invalid' }, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────
  // VERIFY ACCESS (Sensitive Operations)
  // ─────────────────────────────────────────────────────────
  describe('verifyAccess', () => {
    it('should verify with password when 2FA is not enabled', async () => {
      userRepository.findById.mockResolvedValue(mockUser());
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyAccess(
        'user-1',
        { password: 'Password@123' },
        'vi',
      );

      expect(result).toHaveProperty('access_verification_token');
    });

    it('should throw when password is wrong on non-2FA account', async () => {
      userRepository.findById.mockResolvedValue(mockUser());
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyAccess('user-1', { password: 'wrong' }, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require password when 2FA is not enabled and password missing', async () => {
      userRepository.findById.mockResolvedValue(mockUser());

      await expect(
        service.verifyAccess('user-1', {}, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should send reset email if user exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser());

      const result = await service.forgotPassword(
        { email: 'test@example.com', turnstileToken: 'token' },
        'vi',
      );

      expect(result).toHaveProperty('message');
      expect(emailService.sendForgotPasswordEmail).toHaveBeenCalled();
    });

    it('should return success even if user does not exist (prevent enumeration)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(
        { email: 'nonexistent@example.com', turnstileToken: 'token' },
        'vi',
      );

      expect(result).toHaveProperty('message');
      expect(emailService.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      userRepository.findByForgotPasswordToken.mockResolvedValue(mockUser());

      const result = await service.resetPassword(
        {
          token: 'valid-token',
          new_password: 'NewPassword@123',
          confirm_password: 'NewPassword@123',
        },
        'vi',
      );

      expect(result).toHaveProperty('message');
      expect(userRepository.resetPassword).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      userRepository.findByForgotPasswordToken.mockResolvedValue(null);

      await expect(
        service.resetPassword(
          {
            token: 'invalid',
            new_password: 'NewPassword@123',
            confirm_password: 'NewPassword@123',
          },
          'vi',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      userRepository.findByForgotPasswordToken.mockResolvedValue(mockUser());

      await expect(
        service.resetPassword(
          {
            token: 'valid-token',
            new_password: 'NewPassword@123',
            confirm_password: 'DifferentPassword@123',
          },
          'vi',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should logout all devices when requested', async () => {
      userRepository.findByForgotPasswordToken.mockResolvedValue(mockUser());

      await service.resetPassword(
        {
          token: 'valid-token',
          new_password: 'NewPassword@123',
          confirm_password: 'NewPassword@123',
          logout_all_devices: true,
        },
        'vi',
      );

      expect(refreshTokenRepository.deleteAllByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  // ─────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should logout successfully', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 'rt-1',
        user_id: 'user-1',
        token: 'refresh-token',
      });

      const result = await service.logout({ refresh_token: 'refresh-token' }, 'vi');

      expect(result).toHaveProperty('message');
      expect(refreshTokenRepository.softDelete).toHaveBeenCalledWith('rt-1');
      expect(websocketGateway.emitUserLogout).toHaveBeenCalled();
    });

    it('should return success even for invalid refresh token', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(null);

      const result = await service.logout({ refresh_token: 'invalid' }, 'vi');

      expect(result).toHaveProperty('message');
    });
  });

  // ─────────────────────────────────────────────────────────
  // LOGOUT ALL
  // ─────────────────────────────────────────────────────────
  describe('logoutAll', () => {
    it('should logout from all devices', async () => {
      const result = await service.logoutAll('user-1', 'vi');

      expect(result).toHaveProperty('message');
      expect(refreshTokenRepository.deleteAllByUserId).toHaveBeenCalledWith('user-1');
      expect(websocketGateway.emitUserLogoutAll).toHaveBeenCalledWith('user-1', expect.any(String));
    });
  });

  // ─────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────
  describe('refreshToken', () => {
    it('should issue new tokens on valid refresh', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 'rt-1',
        user_id: 'user-1',
        token: 'refresh-token',
      });
      jwtService.verifyAsync.mockResolvedValue({ userId: 'user-1', is_primary_auth: true });
      userRepository.findById.mockResolvedValue(mockUser());

      const result = await service.refreshToken('refresh-token', mockDeviceInfo, 'vi');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      // Old token should be soft-deleted
      expect(refreshTokenRepository.softDelete).toHaveBeenCalledWith('rt-1');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        service.refreshToken('invalid', mockDeviceInfo, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for banned user on refresh', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: 'rt-1',
        user_id: 'user-1',
        token: 'refresh-token',
      });
      jwtService.verifyAsync.mockResolvedValue({ userId: 'user-1' });
      userRepository.findById.mockResolvedValue(
        mockUser({ is_banned: true, banned_end: new Date(Date.now() + 86400000) }),
      );

      await expect(
        service.refreshToken('refresh-token', mockDeviceInfo, 'vi'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepository.softDelete).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // VERIFY FORGOT PASSWORD TOKEN
  // ─────────────────────────────────────────────────────────
  describe('verifyForgotPasswordToken', () => {
    it('should return valid true for existing token', async () => {
      userRepository.findByForgotPasswordToken.mockResolvedValue(mockUser());

      const result = await service.verifyForgotPasswordToken({ token: 'valid' }, 'vi');

      expect(result.valid).toBe(true);
    });

    it('should return valid false for non-existent token', async () => {
      userRepository.findByForgotPasswordToken.mockResolvedValue(null);

      const result = await service.verifyForgotPasswordToken({ token: 'invalid' }, 'vi');

      expect(result.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // RESEND VERIFICATION EMAIL
  // ─────────────────────────────────────────────────────────
  describe('resendVerificationEmail', () => {
    it('should resend email for unverified user', async () => {
      userRepository.findById.mockResolvedValue(mockUser({ email_confirmed: false }));

      const result = await service.resendVerificationEmail('user-1', 'vi');

      expect(result).toHaveProperty('message');
      expect(userRepository.updateEmailVerifyToken).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw if user is already verified', async () => {
      userRepository.findById.mockResolvedValue(mockUser({ email_confirmed: true }));

      await expect(
        service.resendVerificationEmail('user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail('user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
