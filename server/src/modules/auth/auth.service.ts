import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import { I18nService } from 'nestjs-i18n';

import { UserRepository } from '../user/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { BackupCodeService } from '../backup-code/backup-code.service';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { AppConfigService } from '../../common/config/app-config.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
    RegisterDto,
    LoginDto,
    VerifyAccessDto,
    VerifyEmailDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    VerifyForgotPasswordTokenDto,
    LogoutDto,
} from './dto';

/**
 * Interface cho device info từ request
 */
interface IDeviceInfo {
    ip?: string;
    location?: string;
    device?: string;
    os?: string;
}

/**
 * Auth Service
 * Xử lý logic nghiệp vụ liên quan đến authentication
 */
@Injectable()
export class AuthService {
    /** Số vòng hash bcrypt (mặc định 12) */
    private get SALT_ROUNDS(): number {
        return Number(this.configService.get<number>('SALT_ROUNDS')) || 12;
    }
    /** Thời gian hết hạn token xác thực email (mặc định 24 giờ = 86400000ms) */
    private get EMAIL_VERIFY_EXPIRATION(): number {
        return Number(this.configService.get<number>('EMAIL_VERIFY_EXPIRATION')) || 24 * 60 * 60 * 1000;
    }
    /** Thời gian hết hạn forgot password token (mặc định 15 phút = 900000ms) */
    private get FORGOT_PASSWORD_EXPIRATION(): number {
        return Number(this.configService.get<number>('FORGOT_PASSWORD_EXPIRATION')) || 15 * 60 * 1000;
    }

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly i18n: I18nService,
        private readonly userRepository: UserRepository,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly backupCodeService: BackupCodeService,
        private readonly emailService: EmailService,
        private readonly systemLogService: SystemLogService,
        private readonly appConfigService: AppConfigService,
        private readonly websocketGateway: WebsocketGateway,
    ) { }

    /**
     * Đăng ký tài khoản mới bằng email
     */
    async register(dto: RegisterDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
        const existingEmail = await this.userRepository.findByEmail(dto.email);
        if (existingEmail) {
            throw new ConflictException(
                await this.i18n.t('auth.register.email_exists', { lang }),
            );
        }

        const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

        const emailVerifyToken = this.generateToken();
        const emailVerifyExpired = new Date(Date.now() + this.EMAIL_VERIFY_EXPIRATION);

        const user = await this.userRepository.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            language: lang,
            email_verify_token: emailVerifyToken,
            email_verify_expired: emailVerifyExpired,
        });

        Promise.all([
            this.emailService.sendVerificationEmail(dto.email, emailVerifyToken, dto.name, lang),
            this.emailService.sendWelcomeEmail(dto.email, dto.name, lang),
        ]).catch((error) => {
            this.systemLogService.error('auth', 'send_email_failed', `Failed to send registration emails: ${dto.email}`, {
                metaData: { email: dto.email, error: error.message },
            });
        });

        const tokens = await this.generateTokens(user.id, deviceInfo, true);

        this.systemLogService.info('auth', 'register', `User registered: ${user.email}`, {
            userId: user.id,
            ipAddress: deviceInfo?.ip,
            userAgent: deviceInfo?.device,
            metaData: { email: user.email, name: user.name },
        });

        return {
            message: await this.i18n.t('auth.register.success', { lang }),
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Đăng nhập bằng email
     */
    async login(dto: LoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
        const user = await this.userRepository.findByEmail(dto.email);

        if (!user || !user.password) {
            this.systemLogService.warn('auth', 'login_failed', `Login failed: user not found - ${dto.email}`, {
                ipAddress: deviceInfo?.ip,
                userAgent: deviceInfo?.device,
                metaData: { email: dto.email, reason: 'user_not_found' },
            });
            throw new UnauthorizedException(
                await this.i18n.t('auth.login.invalid_credentials', { lang }),
            );
        }

        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(dto.password, user.password);
        } catch {
            // Password hash is invalid format
            this.systemLogService.warn('auth', 'login_failed', `Login failed: invalid password hash format - ${dto.email}`, {
                userId: user.id,
                ipAddress: deviceInfo?.ip,
                userAgent: deviceInfo?.device,
                metaData: { email: dto.email, reason: 'invalid_password_hash' },
            });
            throw new UnauthorizedException(
                await this.i18n.t('auth.login.invalid_credentials', { lang }),
            );
        }
        if (!isPasswordValid) {
            this.systemLogService.warn('auth', 'login_failed', `Login failed: invalid password - ${dto.email}`, {
                userId: user.id,
                ipAddress: deviceInfo?.ip,
                userAgent: deviceInfo?.device,
                metaData: { email: dto.email, reason: 'invalid_password' },
            });
            throw new UnauthorizedException(
                await this.i18n.t('auth.login.invalid_credentials', { lang }),
            );
        }

        if (user.is_banned) {
            if (!user.banned_end || new Date(user.banned_end) > new Date()) {
                throw new UnauthorizedException(
                    await this.i18n.t('auth.login.account_banned', { lang }),
                );
            }
        }

        if (user.two_factor_enabled) {
            const tempToken = await this.generateTempToken(user.id);
            return {
                message: await this.i18n.t('auth.login.two_factor_required', { lang }),
                requires_2fa: true,
                temp_token: tempToken,
            };
        }

        const tokens = await this.generateTokens(user.id, deviceInfo);

        if (user.email) {
            this.emailService.sendLoginNotificationEmail(
                user.email,
                user.name,
                { device: deviceInfo?.device, ip: deviceInfo?.ip },
                user.language,
            ).catch((error) => {
                this.systemLogService.error('auth', 'send_email_failed', `Failed to send login notification email: ${user.email}`, {
                    userId: user.id,
                    metaData: { error: error.message },
                });
            });
        }

        this.systemLogService.info('auth', 'login', `User logged in: ${user.email}`, {
            userId: user.id,
            ipAddress: deviceInfo?.ip,
            userAgent: deviceInfo?.device,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.login.success', { lang }),
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Xác thực email
     */
    async verifyEmail(dto: VerifyEmailDto, lang = 'vi') {
        const user = await this.userRepository.findByEmailVerifyToken(dto.token);
        if (!user) {
            throw new BadRequestException(
                await this.i18n.t('auth.verification.invalid_token', { lang }),
            );
        }

        await this.userRepository.verifyEmail(user.id);

        this.systemLogService.info('auth', 'verify_email', `Email verified: ${user.email}`, {
            userId: user.id,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.verification.email_verified', { lang }),
        };
    }

    /**
     * Gửi lại email xác thực
     */
    async resendVerificationEmail(userId: string, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BadRequestException('User không tồn tại');
        }

        if (!user.email) {
            throw new BadRequestException('User không có email');
        }
        if (user.email_confirmed) {
            throw new BadRequestException(
                await this.i18n.t('auth.verification.already_verified', { lang }),
            );
        }

        const token = this.generateToken();
        const expiredAt = new Date(Date.now() + this.EMAIL_VERIFY_EXPIRATION);

        await this.userRepository.updateEmailVerifyToken(user.id, token, expiredAt);
        await this.emailService.sendVerificationEmail(user.email, token, user.name, lang);

        return {
            message: await this.i18n.t('auth.verification.email_sent', { lang }),
        };
    }

    /**
     * Xác thực quyền truy cập trước khi thực hiện thao tác nhạy cảm
     */
    async verifyAccess(userId: string, dto: VerifyAccessDto, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BadRequestException('User không tồn tại');
        }

        if (!user.two_factor_enabled) {
            if (!dto.password) {
                throw new BadRequestException('Password là bắt buộc');
            }

            if (!user.password) {
                throw new UnauthorizedException(
                    await this.i18n.t('auth.access_verification.invalid_password', { lang }),
                );
            }

            let isPasswordValid = false;
            try {
                isPasswordValid = await bcrypt.compare(dto.password, user.password);
            } catch {
                throw new UnauthorizedException(
                    await this.i18n.t('auth.access_verification.invalid_password', { lang }),
                );
            }
            if (!isPasswordValid) {
                throw new UnauthorizedException(
                    await this.i18n.t('auth.access_verification.invalid_password', { lang }),
                );
            }
        } else {
            if (dto.two_factor_code) {
                const isValid = speakeasy.totp.verify({
                    secret: user.two_factor_token || '',
                    encoding: 'base32',
                    token: dto.two_factor_code,
                });

                if (!isValid) {
                    throw new UnauthorizedException(
                        await this.i18n.t('auth.access_verification.invalid_2fa_code', { lang }),
                    );
                }
            } else if (dto.backup_code) {
                const isValid = await this.backupCodeService.verifyBackupCode(userId, dto.backup_code);
                if (!isValid) {
                    throw new UnauthorizedException(
                        await this.i18n.t('auth.access_verification.invalid_backup_code', { lang }),
                    );
                }
            } else {
                throw new BadRequestException('2FA code hoặc backup code là bắt buộc');
            }
        }

        const accessVerificationToken = await this.jwtService.signAsync(
            { userId, purpose: 'access_verification' },
            {
                secret: this.configService.get<string>('ACCESS_VERIFICATION_TOKEN_SECRET'),
                expiresIn: this.configService.get('ACCESS_VERIFICATION_TOKEN_EXPIRATION') || '5m',
            },
        );

        return {
            message: await this.i18n.t('auth.access_verification.success', { lang }),
            access_verification_token: accessVerificationToken,
        };
    }

    /**
     * Yêu cầu đặt lại mật khẩu qua email
     */
    async forgotPassword(dto: ForgotPasswordDto, lang = 'vi') {
        const user = await this.userRepository.findByEmail(dto.email);

        if (!user) {
            return {
                message: await this.i18n.t('auth.forgot_password.email_sent', { lang }),
            };
        }

        const token = this.generateToken();
        const expiredAt = new Date(Date.now() + this.FORGOT_PASSWORD_EXPIRATION);

        await this.userRepository.updateForgotPasswordToken(user.id, token, expiredAt);
        await this.emailService.sendForgotPasswordEmail(user.email!, token, user.name, lang);

        this.systemLogService.info('auth', 'forgot_password', `Password reset requested: ${user.email}`, {
            userId: user.id,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.forgot_password.email_sent', { lang }),
        };
    }

    /**
     * Xác thực token quên mật khẩu
     */
    async verifyForgotPasswordToken(dto: VerifyForgotPasswordTokenDto, lang = 'vi') {
        const user = await this.userRepository.findByForgotPasswordToken(dto.token);

        return {
            valid: !!user,
            message: user
                ? await this.i18n.t('auth.forgot_password.token_valid', { lang })
                : await this.i18n.t('auth.forgot_password.invalid_token', { lang }),
        };
    }

    /**
     * Đặt lại mật khẩu
     */
    async resetPassword(dto: ResetPasswordDto, lang = 'vi') {
        const user = await this.userRepository.findByForgotPasswordToken(dto.token);
        if (!user) {
            throw new BadRequestException(
                await this.i18n.t('auth.forgot_password.invalid_token', { lang }),
            );
        }

        if (dto.new_password !== dto.confirm_password) {
            throw new BadRequestException(
                await this.i18n.t('auth.reset_password.password_mismatch', { lang }),
            );
        }

        const hashedPassword = await bcrypt.hash(dto.new_password, this.SALT_ROUNDS);

        await this.userRepository.resetPassword(user.id, hashedPassword);

        if (dto.logout_all_devices) {
            await this.refreshTokenRepository.deleteAllByUserId(user.id);
        }

        this.systemLogService.info('auth', 'reset_password', `Password reset completed: ${user.email}`, {
            userId: user.id,
            metaData: { email: user.email, logoutAllDevices: dto.logout_all_devices },
        });

        return {
            message: await this.i18n.t('auth.reset_password.success', { lang }),
        };
    }

    /**
     * Đăng xuất
     */
    async logout(dto: LogoutDto, lang = 'vi') {
        const refreshToken = await this.refreshTokenRepository.findByToken(dto.refresh_token);
        const message = await this.i18n.t('auth.logout.success', { lang });

        if (refreshToken) {
            await this.refreshTokenRepository.softDelete(refreshToken.id);

            // Emit realtime logout event
            this.websocketGateway.emitUserLogout(
                refreshToken.user_id,
                refreshToken.id,
                message,
            );

            this.systemLogService.info('auth', 'logout', `User logged out`, {
                userId: refreshToken.user_id,
            });
        }

        return { message };
    }

    /**
     * Đăng xuất tất cả thiết bị
     */
    async logoutAll(userId: string, lang = 'vi') {
        await this.refreshTokenRepository.deleteAllByUserId(userId);
        const message = await this.i18n.t('auth.logout.all_devices', { lang });

        // Emit realtime logout all event
        this.websocketGateway.emitUserLogoutAll(userId, message);

        this.systemLogService.info('auth', 'logout_all', `User logged out from all devices`, {
            userId: userId,
        });

        return { message };
    }

    /**
     * Refresh token - Cấp lại access token mới từ refresh token
     */
    async refreshToken(refreshTokenValue: string, deviceInfo?: IDeviceInfo, lang = 'vi') {
        const storedToken = await this.refreshTokenRepository.findByToken(refreshTokenValue);

        if (!storedToken) {
            throw new UnauthorizedException(
                await this.i18n.t('auth.refresh_token.invalid', { lang }),
            );
        }

        try {
            const payload = await this.jwtService.verifyAsync(refreshTokenValue, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            const user = await this.userRepository.findById(payload.userId);
            if (!user) {
                await this.refreshTokenRepository.softDelete(storedToken.id);
                throw new UnauthorizedException(
                    await this.i18n.t('auth.refresh_token.invalid', { lang }),
                );
            }

            if (user.is_banned) {
                if (!user.banned_end || new Date(user.banned_end) > new Date()) {
                    await this.refreshTokenRepository.softDelete(storedToken.id);
                    throw new UnauthorizedException(
                        await this.i18n.t('auth.login.account_banned', { lang }),
                    );
                }
            }

            await this.refreshTokenRepository.softDelete(storedToken.id);

            const tokens = await this.generateTokens(user.id, deviceInfo, payload.is_primary_auth ?? true);

            this.systemLogService.info('auth', 'refresh_token', `Token refreshed for user: ${user.email}`, {
                userId: user.id,
                ipAddress: deviceInfo?.ip,
                userAgent: deviceInfo?.device,
            });

            return {
                message: await this.i18n.t('auth.refresh_token.success', { lang }),
                ...tokens,
            };
        } catch (error) {
            await this.refreshTokenRepository.softDelete(storedToken.id);

            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new UnauthorizedException(
                await this.i18n.t('auth.refresh_token.expired', { lang }),
            );
        }
    }




    /**
     * Tạo access và refresh tokens
     * @param isPrimaryAuth - true nếu đăng nhập bằng liên kết chính
     */
    private async generateTokens(userId: string, deviceInfo?: IDeviceInfo, isPrimaryAuth: boolean = true) {
        const config = this.appConfigService.getAll();
        const payload = {
            userId,
            is_primary_auth: isPrimaryAuth,
            project: config.appName,
            team: config.teamName,
            version: config.appVersion,
            copyright: config.copyright,
        };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
        });

        await this.refreshTokenRepository.create(userId, refreshToken, deviceInfo);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    /**
     * Tạo temp token cho 2FA
     */
    private async generateTempToken(userId: string): Promise<string> {
        return this.jwtService.signAsync(
            { userId, purpose: 'temp_2fa' },
            {
                secret: this.configService.get<string>('TEMP_2FA_TOKEN_SECRET'),
                expiresIn: this.configService.get('TEMP_2FA_TOKEN_EXPIRATION') || '5m',
            },
        );
    }

    /**
     * Tạo token ngẫu nhiên (cho email verification, forgot password)
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Loại bỏ các field nhạy cảm từ user object
     */
    private sanitizeUser(user: {
        id: string;
        name: string;
        email?: string | null;
        email_confirmed: boolean;
        is_verified?: boolean | null;
        two_factor_enabled: boolean;
        provider: string;
        created_at: Date;
    }) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            email_confirmed: user.email_confirmed,
            is_verified: user.is_verified,
            two_factor_enabled: user.two_factor_enabled,
            provider: user.provider,
            created_at: user.created_at,
        };
    }
}
