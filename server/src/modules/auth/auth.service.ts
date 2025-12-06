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
import * as QRCode from 'qrcode';
import { I18nService } from 'nestjs-i18n';

import { UserRepository } from '../user/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { BackupCodeService } from '../backup-code/backup-code.service';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { AppConfigService } from '../../common/config/app-config.service';
import {
    RegisterDto,
    LoginDto,
    VerifyAccessDto,
    VerifyEmailDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    VerifyForgotPasswordTokenDto,
    VerifyTwoFactorSetupDto,
    VerifyTwoFactorLoginDto,
    LogoutDto,
    GoogleAuthDto,
    FacebookAuthDto,
    LinkGoogleDto,
    LinkFacebookDto,
    UnlinkPlatformDto,
    ChangePasswordDto,
    UpdateProfileDto,
} from './dto';
import { PlatformProvider } from '@prisma/client';
import { google } from 'googleapis';

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
 * Xử lý toàn bộ logic nghiệp vụ liên quan đến authentication
 * Chỉ hỗ trợ email, không hỗ trợ phone
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

        await this.emailService.sendVerificationEmail(dto.email, emailVerifyToken, dto.name, lang);

        // Gửi email chào mừng
        await this.emailService.sendWelcomeEmail(dto.email, dto.name, lang);

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

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
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

            const isPasswordValid = await bcrypt.compare(dto.password, user.password || '');
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
     * Thiết lập 2FA (bước 1)
     */
    async setupTwoFactor(userId: string, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BadRequestException('User không tồn tại');
        }

        if (user.two_factor_enabled) {
            throw new BadRequestException(
                await this.i18n.t('auth.two_factor.already_enabled', { lang }),
            );
        }

        const appName = this.appConfigService.get('appName');
        const secret = speakeasy.generateSecret({
            name: `${appName}:${user.email}`,
            issuer: appName,
        });

        await this.userRepository.updateTwoFactorSecret(userId, secret.base32);

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

        const backupCodes = await this.backupCodeService.generateAndSaveBackupCodes(userId);

        this.systemLogService.info('auth', 'setup_2fa', `2FA setup initiated: ${user.email}`, {
            userId: user.id,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.two_factor.setup_in_progress', { lang }),
            secret: secret.base32,
            qr_code_url: qrCodeUrl,
            backup_codes: backupCodes,
        };
    }

    /**
     * Xác minh thiết lập 2FA (bước 2)
     */
    async verifyTwoFactorSetup(userId: string, dto: VerifyTwoFactorSetupDto, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.two_factor_token) {
            throw new BadRequestException('Chưa thiết lập 2FA');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.two_factor_token,
            encoding: 'base32',
            token: dto.two_factor_code,
        });

        if (!isValid) {
            throw new BadRequestException(
                await this.i18n.t('auth.two_factor.verify_failed', { lang }),
            );
        }

        await this.userRepository.enableTwoFactor(userId);

        this.systemLogService.info('auth', 'enable_2fa', `2FA enabled: ${user.email}`, {
            userId: user.id,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.two_factor.setup_success', { lang }),
        };
    }

    /**
     * Vô hiệu hóa 2FA
     */
    async disableTwoFactor(userId: string, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BadRequestException('User không tồn tại');
        }

        if (!user.two_factor_enabled) {
            throw new BadRequestException(
                await this.i18n.t('auth.two_factor.not_enabled', { lang }),
            );
        }

        await this.userRepository.disableTwoFactor(userId);

        await this.backupCodeService.deleteAllBackupCodes(userId);

        this.systemLogService.info('auth', 'disable_2fa', `2FA disabled: ${user.email}`, {
            userId: user.id,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.two_factor.disabled_success', { lang }),
        };
    }

    /**
     * Xác minh 2FA khi đăng nhập
     */
    async verifyTwoFactorLogin(dto: VerifyTwoFactorLoginDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
        let payload: { userId: string };
        try {
            payload = await this.jwtService.verifyAsync(dto.temp_token, {
                secret: this.configService.get<string>('TEMP_2FA_TOKEN_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
        }

        const user = await this.userRepository.findById(payload.userId);
        if (!user || !user.two_factor_token) {
            throw new UnauthorizedException('User không tồn tại');
        }

        let isValid = false;

        if (dto.two_factor_code) {
            isValid = speakeasy.totp.verify({
                secret: user.two_factor_token,
                encoding: 'base32',
                token: dto.two_factor_code,
            });
        } else if (dto.backup_code) {
            isValid = await this.backupCodeService.verifyBackupCode(user.id, dto.backup_code);
        }

        if (!isValid) {
            throw new UnauthorizedException(
                await this.i18n.t('auth.two_factor.verify_failed', { lang }),
            );
        }

        const tokens = await this.generateTokens(user.id, deviceInfo);

        this.systemLogService.info('auth', 'verify_2fa_login', `2FA login verified: ${user.email}`, {
            userId: user.id,
            ipAddress: deviceInfo?.ip,
            userAgent: deviceInfo?.device,
            metaData: { email: user.email },
        });

        return {
            message: await this.i18n.t('auth.two_factor.verify_success', { lang }),
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Tạo mới backup codes
     */
    async regenerateBackupCodes(userId: string, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.two_factor_enabled) {
            throw new BadRequestException(
                await this.i18n.t('auth.two_factor.not_enabled', { lang }),
            );
        }

        const backupCodes = await this.backupCodeService.generateAndSaveBackupCodes(userId);

        return {
            message: await this.i18n.t('auth.two_factor.backup_codes_generated', { lang }),
            backup_codes: backupCodes,
        };
    }

    /**
     * Lấy danh sách backup codes
     */
    async getBackupCodes(userId: string, lang = 'vi') {
        const codesList = await this.backupCodeService.getBackupCodesList(userId);

        return {
            message: await this.i18n.t('auth.backup_codes.list_success', { lang }),
            ...codesList,
        };
    }

    /**
     * Lấy thông tin profile
     */
    async getProfile(userId: string, lang = 'vi') {
        const user = await this.userRepository.getUserWithRolesAndPermissions(userId);
        if (!user) {
            throw new BadRequestException('User không tồn tại');
        }

        const roles = user.system_roles.map((ur) => ({
            id: ur.role.id,
            name: ur.role.name,
            description: ur.role.description,
        }));

        const rolePermissions = user.system_roles.flatMap((ur) =>
            ur.role.permissions.map((rp) => ({
                id: rp.permission.id,
                name: rp.permission.name,
                key: rp.permission.key,
                description: rp.permission.description,
            })),
        );

        const directPermissions = user.system_permissions.map((up) => ({
            id: up.permission.id,
            name: up.permission.name,
            key: up.permission.key,
            description: up.permission.description,
        }));

        const allPermissions = [...rolePermissions, ...directPermissions];
        const uniquePermissions = allPermissions.filter(
            (p, index, self) => index === self.findIndex((t) => t.id === p.id),
        );

        return {
            message: await this.i18n.t('auth.profile.get_success', { lang }),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                email_confirmed: user.email_confirmed,
                is_verified: user.is_verified,
                two_factor_enabled: user.two_factor_enabled,
                provider: user.provider,
                created_at: user.created_at,
            },
            roles,
            permissions: uniquePermissions,
        };
    }

    /**
     * Đăng xuất
     */
    async logout(dto: LogoutDto, lang = 'vi') {
        const refreshToken = await this.refreshTokenRepository.findByToken(dto.refresh_token);

        if (refreshToken) {
            await this.refreshTokenRepository.softDelete(refreshToken.id);

            this.systemLogService.info('auth', 'logout', `User logged out`, {
                userId: refreshToken.user_id,
            });
        }

        return {
            message: await this.i18n.t('auth.logout.success', { lang }),
        };
    }

    /**
     * Đăng xuất tất cả thiết bị
     */
    async logoutAll(userId: string, lang = 'vi') {
        await this.refreshTokenRepository.deleteAllByUserId(userId);

        this.systemLogService.info('auth', 'logout_all', `User logged out from all devices`, {
            userId: userId,
        });

        return {
            message: await this.i18n.t('auth.logout.all_devices', { lang }),
        };
    }



    /**
     * Tạo access và refresh tokens
     * @param isPrimaryAuth - true nếu đăng nhập bằng liên kết chính
     */
    private async generateTokens(userId: string, deviceInfo?: IDeviceInfo, isPrimaryAuth: boolean = true) {
        const config = this.appConfigService.getAll();
        const payload = {
            userId,
            is_primary_auth: isPrimaryAuth, // Xác định đăng nhập bằng liên kết chính hay phụ
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

    /**
     * Xác thực Google ID Token và lấy thông tin user
     */
    private async verifyGoogleToken(idToken: string) {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const oAuth2Client = new google.auth.OAuth2(clientId);

        const ticket = await oAuth2Client.verifyIdToken({
            idToken,
            audience: clientId,
        });

        const payload = ticket.getPayload();
        if (!payload) throw new BadRequestException('Invalid Google token');

        return {
            googleId: payload.sub,
            email: payload.email!,
            name: payload.name || payload.email!.split('@')[0],
        };
    }

    /**
     * Đăng nhập/đăng ký bằng Google
     */
    async googleAuth(dto: GoogleAuthDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
        const googlePayload = await this.verifyGoogleToken(dto.id_token);

        // Tìm user theo Google ID
        let user = await this.userRepository.findByGoogleId(googlePayload.googleId);
        let isNewUser = false;

        if (!user) {
            // Kiểm tra email đã tồn tại chưa
            const existingUser = await this.userRepository.findByEmail(googlePayload.email);
            if (existingUser) {
                throw new ConflictException(
                    await this.i18n.t('auth.register.email_exists', { lang }),
                );
            }

            // Tạo user mới
            user = await this.userRepository.createWithProvider({
                name: googlePayload.name,
                email: googlePayload.email,
                provider: PlatformProvider.GOOGLE,
                google_id: googlePayload.googleId,
                language: lang,
            });
            isNewUser = true;

            await this.emailService.sendWelcomeEmail(googlePayload.email, googlePayload.name, lang);
        }

        const tokens = await this.generateTokens(user.id, deviceInfo, user.provider === PlatformProvider.GOOGLE);

        // Gửi email thông báo đăng nhập
        if (user.email) {
            await this.emailService.sendLoginNotificationEmail(
                user.email,
                user.name,
                { device: deviceInfo?.device, ip: deviceInfo?.ip },
                user.language,
            );
        }

        this.systemLogService.info('auth', 'google_auth', `Google auth: ${user.email}`, {
            userId: user.id,
            ipAddress: deviceInfo?.ip,
            userAgent: deviceInfo?.device,
            metaData: { isNewUser },
        });

        return {
            message: await this.i18n.t('auth.login.success', { lang }),
            user: this.sanitizeUser(user),
            ...tokens,
        };
    }

    /**
     * Liên kết thêm tài khoản Google (liên kết phụ)
     */
    async linkGoogle(userId: string, dto: LinkGoogleDto, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new BadRequestException('User không tồn tại');

        if (user.google_id) {
            throw new ConflictException(
                await this.i18n.t('auth.platform_auth.already_linked_google', { lang }),
            );
        }

        const googlePayload = await this.verifyGoogleToken(dto.id_token);

        // Kiểm tra Google ID đã được liên kết với user khác chưa
        const existingUser = await this.userRepository.findByGoogleId(googlePayload.googleId);
        if (existingUser) {
            throw new ConflictException('Google account đã được liên kết với tài khoản khác');
        }

        await this.userRepository.linkGoogle(userId, googlePayload.googleId);

        if (user.email) {
            await this.emailService.sendPlatformLinkedEmail(user.email, user.name, 'Google', user.language);
        }

        this.systemLogService.info('auth', 'link_google', `Linked Google: ${user.email}`, {
            userId: user.id,
            metaData: { googleId: googlePayload.googleId },
        });

        return {
            message: await this.i18n.t('auth.platform_auth.link_google_success', { lang }),
        };
    }

    /**
     * Gỡ liên kết nền tảng phụ (chỉ cho phép từ liên kết chính)
     */
    async unlinkPlatform(userId: string, dto: UnlinkPlatformDto, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new BadRequestException('User không tồn tại');

        // Kiểm tra không được gỡ liên kết chính
        if (dto.platform === 'GOOGLE' && user.provider === PlatformProvider.GOOGLE) {
            throw new BadRequestException(
                await this.i18n.t('auth.platform_auth.cannot_unlink_primary', { lang }),
            );
        }
        if (dto.platform === 'FACEBOOK' && user.provider === PlatformProvider.FACEBOOK) {
            throw new BadRequestException(
                await this.i18n.t('auth.platform_auth.cannot_unlink_primary', { lang }),
            );
        }

        if (dto.platform === 'GOOGLE') {
            if (!user.google_id) throw new BadRequestException('Chưa liên kết Google');
            await this.userRepository.unlinkGoogle(userId);
        } else {
            if (!user.facebook_id) throw new BadRequestException('Chưa liên kết Facebook');
            await this.userRepository.unlinkFacebook(userId);
        }

        if (user.email) {
            await this.emailService.sendPlatformUnlinkedEmail(user.email, user.name, dto.platform, user.language);
        }

        this.systemLogService.info('auth', 'unlink_platform', `Unlinked ${dto.platform}: ${user.email}`, {
            userId: user.id,
            metaData: { platform: dto.platform },
        });

        return {
            message: await this.i18n.t('auth.platform_auth.unlink_success', { lang }),
        };
    }

    /**
     * Thay đổi mật khẩu (chỉ cho tài khoản đăng ký bằng email)
     */
    async changePassword(userId: string, dto: ChangePasswordDto, deviceInfo?: IDeviceInfo, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new BadRequestException('User không tồn tại');

        // Không cho phép đổi mật khẩu cho tài khoản Google/Facebook
        if (user.provider !== PlatformProvider.DEFAULT) {
            throw new BadRequestException(
                await this.i18n.t('auth.change_password.cannot_change_social_account', { lang }),
            );
        }

        if (!user.password) {
            throw new BadRequestException('Tài khoản không có mật khẩu');
        }

        const isPasswordValid = await bcrypt.compare(dto.current_password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException(
                await this.i18n.t('auth.change_password.incorrect_current_password', { lang }),
            );
        }

        if (dto.new_password !== dto.confirm_password) {
            throw new BadRequestException(
                await this.i18n.t('auth.change_password.password_mismatch', { lang }),
            );
        }

        const hashedPassword = await bcrypt.hash(dto.new_password, this.SALT_ROUNDS);
        await this.userRepository.updatePassword(userId, hashedPassword);

        if (dto.logout_all_devices) {
            await this.refreshTokenRepository.deleteAllByUserId(userId);
        }

        if (user.email) {
            await this.emailService.sendPasswordChangedEmail(user.email, user.name, user.language);
        }

        this.systemLogService.info('auth', 'change_password', `Password changed: ${user.email}`, {
            userId: user.id,
            ipAddress: deviceInfo?.ip,
            userAgent: deviceInfo?.device,
        });

        return {
            message: await this.i18n.t('auth.change_password.success', { lang }),
        };
    }

    /**
     * Cập nhật thông tin tài khoản (name, language)
     */
    async updateProfile(userId: string, dto: UpdateProfileDto, lang = 'vi') {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new BadRequestException('User không tồn tại');

        await this.userRepository.updateProfile(userId, {
            name: dto.name,
            language: dto.language,
        });

        this.systemLogService.info('auth', 'update_profile', `Profile updated: ${user.email}`, {
            userId: user.id,
            metaData: { name: dto.name, language: dto.language },
        });

        return {
            message: await this.i18n.t('auth.update_profile.success', { lang }),
        };
    }
}
