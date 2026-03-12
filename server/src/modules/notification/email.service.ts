import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { Transporter } from 'nodemailer';
import { AppConfigService } from '../../common/config/app-config.service';
import { I18nService } from 'nestjs-i18n';
import { IEmailOptions } from './interfaces';

/**
 * Service gửi email sử dụng Google OAuth2
 * Sử dụng Gmail API với OAuth2 để gửi email
 */
@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private oAuth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

  /**
   * Email translations for different languages
   */


  constructor(
    private readonly configService: ConfigService,
    private readonly appConfigService: AppConfigService,
    private readonly i18n: I18nService,
  ) {
    this.initializeOAuth2Client();
  }

  /**
   * Get translations for the specified language
   */


  private accessToken: string | null = null;
  private tokenExpires: number = 0;

  /**
   * Khởi tạo OAuth2 client
   */
  private initializeOAuth2Client(): void {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    if (clientId && clientSecret && refreshToken) {
      this.oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'https://developers.google.com/oauthplayground',
      );

      this.oAuth2Client.setCredentials({
        refresh_token: refreshToken,
      });
    }
  }

  /**
   * Tạo transporter với access token
   */
  private async createTransporter(): Promise<Transporter | null> {
    if (!this.oAuth2Client) {
      console.warn('[EmailService] OAuth2 client chưa được cấu hình');
      return null;
    }

    try {
      // Reuse cached token if valid (buffer 5 minutes)
      const now = Date.now();
      if (this.transporter && this.accessToken && this.tokenExpires > now + 300000) {
        return this.transporter;
      }

      // Get new access token
      const { token, res } = await this.oAuth2Client.getAccessToken();

      if (!token) {
        console.error('[EmailService] Không thể lấy access token');
        return null;
      }

      // Cache token
      this.accessToken = token;
      // Default expiry 1 hour if not provided
      const expiryDate = res?.data?.expiry_date;
      this.tokenExpires = expiryDate ? expiryDate : now + 3600 * 1000;

      const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: primaryEmail,
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          refreshToken: this.configService.get<string>('GOOGLE_REFRESH_TOKEN'),
          accessToken: token,
        },
      });

      return this.transporter;
    } catch (error) {
      console.error('[EmailService] Lỗi khi tạo transporter:', error);
      return null;
    }
  }

  /**
   * Gửi email
   * @param options - Thông tin email
   */
  async sendEmail(options: IEmailOptions): Promise<boolean> {
    const transporter = await this.createTransporter();

    if (!transporter) {
      console.warn('[EmailService] Không thể gửi email - transporter chưa được cấu hình');
      return false;
    }

    const sendEmail = this.configService.get<string>('EMAIL_SEND_ADDRESS');
    const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

    try {
      const appName = this.appConfigService.get('brandName');
      await transporter.sendMail({
        from: `"${appName}" <${sendEmail || primaryEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      console.error('[EmailService] Lỗi khi gửi email:', error);
      return false;
    }
  }

  /**
   * Tạo base template HTML cho email
   * @param content - Nội dung chính của email
   * @param appName - Tên ứng dụng
   * @param lang - Ngôn ngữ
   */
  private async createEmailTemplate(content: string, appName: string, lang: string = 'vi'): Promise<string> {
    const systemName = await this.i18n.t('email.template.systemName', { lang });
    const supportText = await this.i18n.t('email.footer.supportText', { lang });
    const copyright = await this.i18n.t('email.footer.copyright', { lang });
    const autoEmailText = await this.i18n.t('email.footer.autoEmailText', { lang });

    // Get colors and support info from config
    const colors = this.appConfigService.get('colors');
    const supportEmail = this.appConfigService.get('supportEmail');
    const supportPhone = this.appConfigService.get('supportPhone');

    return `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${appName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${colors.background}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: ${colors.cardSurface}; border-radius: 16px; box-shadow: 0 10px 40px ${colors.shadow}; overflow: hidden;">
                
                <!-- Header với gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 50%, ${colors.primaryLight} 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      ${appName}
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 400;">
                      ${systemName}
                    </p>
                  </td>
                </tr>
                
                <!-- Nội dung chính -->
                <tr>
                  <td style="padding: 40px 35px;">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: ${colors.gray100}; border-top: 1px solid ${colors.border}; padding: 30px 35px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="text-align: center;">
                          <!-- Thông tin liên hệ -->
                          <p style="margin: 0 0 15px; font-size: 13px; color: ${colors.gray500}; line-height: 1.6;">
                            ${supportText}
                          </p>
                          
                          <!-- Support Email & Phone -->
                          <p style="margin: 0 0 15px; font-size: 13px; color: ${colors.gray700}; line-height: 1.8;">
                            📧 <a href="mailto:${supportEmail}" style="color: ${colors.primary}; text-decoration: none;">${supportEmail}</a>
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            📞 <a href="tel:${supportPhone}" style="color: ${colors.primary}; text-decoration: none;">${supportPhone}</a>
                          </p>
                          
                          <!-- Copyright -->
                          <p style="margin: 0; font-size: 12px; color: ${colors.gray500};">
                            © ${new Date().getFullYear()} ${appName}. ${copyright}
                          </p>
                          <p style="margin: 8px 0 0; font-size: 11px; color: ${colors.gray300};">
                            ${autoEmailText}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Gửi email xác thực tài khoản
   * @param to - Email người nhận
   * @param token - Token xác thực
   * @param name - Tên người dùng
   * @param lang - Ngôn ngữ
   */
  async sendVerificationEmail(
    to: string,
    token: string,
    name: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    const appName = this.appConfigService.get('brandName');

    const greeting = await this.i18n.t('email.verification.greeting', { lang });
    const welcome = await this.i18n.t('email.verification.welcome', { lang });
    const emailLabel = await this.i18n.t('email.verification.emailLabel', { lang });
    const expirationLabel = await this.i18n.t('email.verification.expirationLabel', { lang });
    const expirationValue = await this.i18n.t('email.verification.expirationValue', { lang });
    const buttonText = await this.i18n.t('email.verification.buttonText', { lang });
    const copyLinkText = await this.i18n.t('email.verification.copyLinkText', { lang });
    const warningText = await this.i18n.t('email.verification.warningText', { lang });
    const subjectPrefix = await this.i18n.t('email.verification.subjectPrefix', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      
      <!-- Lời chào -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 👋
      </h2>
      
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${welcome} <strong style="color: ${colors.primaryDark};">${appName}</strong>. 
      </p>
      
      <!-- Thông tin tài khoản -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.info}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${emailLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: ${colors.gray900}; font-weight: 500;">${to}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${expirationLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: ${colors.warning}; font-weight: 500;">${expirationValue}</span>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Nút CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${verifyUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px ${colors.shadow}; transition: all 0.3s ease;">
          ${buttonText}
        </a>
      </div>
      
      <!-- Link backup -->
      <div style="background-color: ${colors.gray100}; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.gray500}; text-align: center;">
          ${copyLinkText}
        </p>
        <p style="margin: 0; font-size: 12px; word-break: break-all; color: ${colors.info}; text-align: center; background-color: ${colors.cardSurface}; padding: 12px; border-radius: 6px; border: 1px solid ${colors.border};">
          ${verifyUrl}
        </p>
      </div>
      
      <!-- Cảnh báo -->
      <div style="border-top: 1px solid ${colors.border}; padding-top: 25px; margin-top: 25px;">
        <p style="margin: 0; font-size: 13px; color: ${colors.gray500}; text-align: center; line-height: 1.6;">
          ${warningText}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subjectPrefix} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email đặt lại mật khẩu
   * @param to - Email người nhận
   * @param token - Token đặt lại mật khẩu
   * @param name - Tên người dùng
   * @param lang - Ngôn ngữ
   */
  async sendForgotPasswordEmail(
    to: string,
    token: string,
    name: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const title = await this.i18n.t('email.forgotPassword.title', { lang });
    const greeting = await this.i18n.t('email.forgotPassword.greeting', { lang });
    const message = await this.i18n.t('email.forgotPassword.message', { lang });
    const timeLabel = await this.i18n.t('email.forgotPassword.timeLabel', { lang });
    const timeWarning = await this.i18n.t('email.forgotPassword.timeWarning', { lang });
    const buttonText = await this.i18n.t('email.forgotPassword.buttonText', { lang });
    const copyLinkText = await this.i18n.t('email.forgotPassword.copyLinkText', { lang });
    const securityTitle = await this.i18n.t('email.forgotPassword.securityTitle', { lang });
    const securityMessage = await this.i18n.t('email.forgotPassword.securityMessage', { lang });
    const requestTime = await this.i18n.t('email.forgotPassword.requestTime', { lang });
    const subjectPrefix = await this.i18n.t('email.forgotPassword.subjectPrefix', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      
      <!-- Lời chào -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${title}
      </h2>
      
      <p style="margin: 0 0 10px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${greeting} <strong style="color: ${colors.primaryDark};">${name}</strong>,
      </p>
      
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: ${colors.primaryDark};">${appName}</strong>.
      </p>
      
      <!-- Cảnh báo thời gian -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.warning}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: ${colors.warning}; font-weight: 600;">
          ${timeLabel}
        </p>
        <p style="margin: 5px 0 0; font-size: 13px; color: ${colors.gray700};">
          ${timeWarning}
        </p>
      </div>
      
      <!-- Nút CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, ${colors.warning} 0%, ${colors.primaryDark} 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px ${colors.shadow};">
          ${buttonText}
        </a>
      </div>
      
      <!-- Link backup -->
      <div style="background-color: ${colors.gray100}; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.gray500}; text-align: center;">
          ${copyLinkText}
        </p>
        <p style="margin: 0; font-size: 12px; word-break: break-all; color: ${colors.info}; text-align: center; background-color: ${colors.cardSurface}; padding: 12px; border-radius: 6px; border: 1px solid ${colors.border};">
          ${resetUrl}
        </p>
      </div>
      
      <!-- Cảnh báo bảo mật -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${colors.error};">
        <p style="margin: 0; font-size: 13px; color: ${colors.error}; font-weight: 600;">
          ${securityTitle}
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: ${colors.gray700}; line-height: 1.6;">
          ${securityMessage}
        </p>
      </div>
      
      <!-- Thông tin IP/Device (optional) -->
      <div style="border-top: 1px solid ${colors.border}; padding-top: 25px; margin-top: 25px;">
        <p style="margin: 0; font-size: 12px; color: ${colors.gray500}; text-align: center; line-height: 1.6;">
          ${requestTime} ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subjectPrefix} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email chào mừng khi đăng ký tài khoản
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    const greeting = await this.i18n.t('email.welcome.greeting', { lang });
    const message = await this.i18n.t('email.welcome.message', { lang });
    const accountReady = await this.i18n.t('email.welcome.accountReady', { lang });
    const getStarted = await this.i18n.t('email.welcome.getStarted', { lang });
    const subject = await this.i18n.t('email.welcome.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 🎉
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: ${colors.primaryDark};">${appName}</strong>. ${accountReady}
      </p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${frontendUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
          ${getStarted}
        </a>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo đăng nhập mới
   */
  async sendLoginNotificationEmail(
    to: string,
    name: string,
    deviceInfo: { device?: string; ip?: string },
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const greeting = await this.i18n.t('email.loginNotification.greeting', { lang });
    const message = await this.i18n.t('email.loginNotification.message', { lang });
    const deviceLabel = await this.i18n.t('email.loginNotification.deviceLabel', { lang });
    const ipLabel = await this.i18n.t('email.loginNotification.ipLabel', { lang });
    const timeLabel = await this.i18n.t('email.loginNotification.timeLabel', { lang });
    const warningText = await this.i18n.t('email.loginNotification.warningText', { lang });
    const subject = await this.i18n.t('email.loginNotification.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 🔔
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message}
      </p>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.info}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: ${colors.gray900};"><strong>${deviceLabel}</strong> ${deviceInfo.device || 'Unknown'}</p>
        <p style="margin: 5px 0; font-size: 14px; color: ${colors.gray900};"><strong>${ipLabel}</strong> ${deviceInfo.ip || 'Unknown'}</p>
        <p style="margin: 5px 0; font-size: 14px; color: ${colors.gray900};"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid ${colors.error};">
        <p style="margin: 0; font-size: 13px; color: ${colors.error}; text-align: center;">
          ⚠️ ${warningText}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo thay đổi mật khẩu
   */
  async sendPasswordChangedEmail(
    to: string,
    name: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const greeting = await this.i18n.t('email.passwordChanged.greeting', { lang });
    const message = await this.i18n.t('email.passwordChanged.message', { lang });
    const timeLabel = await this.i18n.t('email.passwordChanged.timeLabel', { lang });
    const warningText = await this.i18n.t('email.passwordChanged.warningText', { lang });
    const subject = await this.i18n.t('email.passwordChanged.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 🔐
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message}
      </p>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.info}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: ${colors.gray900};"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid ${colors.error};">
        <p style="margin: 0; font-size: 13px; color: ${colors.error}; text-align: center;">
          ⚠️ ${warningText}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo liên kết nền tảng thành công
   */
  async sendPlatformLinkedEmail(
    to: string,
    name: string,
    platform: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const greeting = await this.i18n.t('email.platformLinked.greeting', { lang });
    const message = await this.i18n.t('email.platformLinked.message', { lang });
    const timeLabel = await this.i18n.t('email.platformLinked.timeLabel', { lang });
    const subject = await this.i18n.t('email.platformLinked.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 🔗
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: ${colors.primaryDark};">${platform}</strong>
      </p>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.success}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: ${colors.gray900};"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo gỡ liên kết nền tảng
   */
  async sendPlatformUnlinkedEmail(
    to: string,
    name: string,
    platform: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const greeting = await this.i18n.t('email.platformUnlinked.greeting', { lang });
    const message = await this.i18n.t('email.platformUnlinked.message', { lang });
    const timeLabel = await this.i18n.t('email.platformUnlinked.timeLabel', { lang });
    const warningText = await this.i18n.t('email.platformUnlinked.warningText', { lang });
    const subject = await this.i18n.t('email.platformUnlinked.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 🔓
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: ${colors.primaryDark};">${platform}</strong>
      </p>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.warning}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: ${colors.gray900};"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid ${colors.error};">
        <p style="margin: 0; font-size: 13px; color: ${colors.error}; text-align: center;">
          ⚠️ ${warningText}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email mời tham gia tổ chức
   * @param to - Email người nhận
   * @param token - Token mời
   * @param inviteeName - Tên người được mời
   * @param organizationName - Tên tổ chức
   * @param inviterName - Tên người mời
   * @param lang - Ngôn ngữ
   */
  async sendOrganizationInviteEmail(
    to: string,
    token: string,
    inviteeName: string,
    organizationName: string,
    inviterName: string,
    inviterEmail: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const acceptUrl = `${frontendUrl}/organizations/accept-invite?token=${token}`;
    const appName = this.appConfigService.get('brandName');

    const greeting = await this.i18n.t('email.organizationInvite.greeting', { lang });
    const inviteMessage = await this.i18n.t('email.organizationInvite.message', { lang });
    const invitedBy = await this.i18n.t('email.organizationInvite.invitedBy', { lang });
    const orgLabel = await this.i18n.t('email.organizationInvite.orgLabel', { lang });
    const expirationLabel = await this.i18n.t('email.organizationInvite.expirationLabel', { lang });
    const expirationValue = await this.i18n.t('email.organizationInvite.expirationValue', { lang });
    const buttonText = await this.i18n.t('email.organizationInvite.buttonText', { lang });
    const copyLinkText = await this.i18n.t('email.organizationInvite.copyLinkText', { lang });
    const warningText = await this.i18n.t('email.organizationInvite.warningText', { lang });
    const subjectPrefix = await this.i18n.t('email.organizationInvite.subjectPrefix', { lang, args: { organizationName } });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <!-- Lời chào -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${inviteeName}! 👋
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${inviteMessage} <strong style="color: ${colors.primaryDark};">${organizationName}</strong>
      </p>

      <!-- Thông tin lời mời -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.success}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${orgLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: ${colors.gray900}; font-weight: 500;">${organizationName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${invitedBy}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <a href="mailto:${inviterEmail}" style="font-size: 14px; color: ${colors.primaryDark}; font-weight: 500; text-decoration: none;">${inviterName}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${expirationLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: ${colors.warning}; font-weight: 500;">${expirationValue}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Nút CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${acceptUrl}"
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px ${colors.shadow};">
          ${buttonText}
        </a>
      </div>

      <!-- Link backup -->
      <div style="background-color: ${colors.gray100}; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.gray500}; text-align: center;">
          ${copyLinkText}
        </p>
        <p style="margin: 0; font-size: 12px; word-break: break-all; color: ${colors.info}; text-align: center; background-color: ${colors.cardSurface}; padding: 12px; border-radius: 6px; border: 1px solid ${colors.border};">
          ${acceptUrl}
        </p>
      </div>

      <!-- Cảnh báo -->
      <div style="border-top: 1px solid ${colors.border}; padding-top: 25px; margin-top: 25px;">
        <p style="margin: 0; font-size: 13px; color: ${colors.gray500}; text-align: center; line-height: 1.6;">
          ${warningText}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subjectPrefix} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo lỗi tích hợp Google Email cho tổ chức
   * @param to - Email người nhận (owner)
   * @param ownerName - Tên owner
   * @param organizationName - Tên tổ chức
   * @param errorMessage - Thông báo lỗi chi tiết
   * @param lang - Ngôn ngữ
   */
  async sendGoogleIntegrationErrorEmail(
    to: string,
    ownerName: string,
    organizationName: string,
    errorMessage: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const greeting = await this.i18n.t('email.googleIntegrationError.greeting', { lang });
    const title = await this.i18n.t('email.googleIntegrationError.title', { lang });
    const message = await this.i18n.t('email.googleIntegrationError.message', { lang });
    const orgLabel = await this.i18n.t('email.googleIntegrationError.orgLabel', { lang });
    const errorLabel = await this.i18n.t('email.googleIntegrationError.errorLabel', { lang });
    const timeLabel = await this.i18n.t('email.googleIntegrationError.timeLabel', { lang });
    const actionMessage = await this.i18n.t('email.googleIntegrationError.actionMessage', { lang });
    const disabledMessage = await this.i18n.t('email.googleIntegrationError.disabledMessage', { lang });
    const subject = await this.i18n.t('email.googleIntegrationError.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <!-- Tiêu đề -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.error}; text-align: center;">
        ⚠️ ${title}
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${greeting}, <strong style="color: ${colors.primaryDark};">${ownerName}</strong>
      </p>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message}
      </p>

      <!-- Thông tin lỗi -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.error}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${orgLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: ${colors.gray900}; font-weight: 500;">${organizationName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${timeLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: ${colors.gray900}; font-weight: 500;">${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px 0;">
              <span style="font-size: 13px; color: ${colors.gray500};">${errorLabel}</span>
              <p style="margin: 5px 0 0; font-size: 14px; color: ${colors.error}; font-weight: 500; background-color: ${colors.cardSurface}; padding: 10px; border-radius: 6px; border: 1px solid ${colors.border};">
                ${errorMessage}
              </p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Thông báo hành động cần làm -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${colors.warning};">
        <p style="margin: 0 0 10px; font-size: 14px; color: ${colors.warning}; font-weight: 600;">
          🔧 ${actionMessage}
        </p>
        <p style="margin: 0; font-size: 13px; color: ${colors.gray700}; line-height: 1.6;">
          ${disabledMessage}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo hủy hợp đồng cho chủ sở hữu tổ chức
   */
  async sendContractCancelledEmail(
    to: string,
    ownerName: string,
    contractCodes: string[],
    deletedBy: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');

    const subject = await this.i18n.t('email.contractCancelled.subject', { lang });
    const greeting = await this.i18n.t('email.contractCancelled.greeting', { lang });
    const message = await this.i18n.t('email.contractCancelled.message', { lang });
    const deletedByLabel = await this.i18n.t('email.contractCancelled.deletedBy', { lang });
    const contractListLabel = await this.i18n.t('email.contractCancelled.contractListLabel', { lang });
    const contactSupport = await this.i18n.t('email.contractCancelled.contactSupport', { lang });

    const colors = this.appConfigService.get('colors');

    const contractListHtml = contractCodes.map(code =>
      `<li style="margin-bottom: 5px; color: ${colors.gray900}; font-weight: 500;">${code}</li>`
    ).join('');

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.error}; text-align: center;">
        ${subject}
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${greeting}, <strong style="color: ${colors.primaryDark};">${ownerName}</strong>
      </p>

      <p style="margin: 0 0 10px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7;">
        ${message}
      </p>

      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.error}; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 14px; color: ${colors.gray500};">
          ${contractListLabel}
        </p>
        <ul style="margin: 0; padding-left: 20px;">
          ${contractListHtml}
        </ul>
      </div>

       <p style="margin: 0 0 10px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7;">
        <strong>${deletedByLabel}</strong> ${deletedBy}
      </p>
      
       <p style="margin: 20px 0 0; font-size: 14px; color: ${colors.gray500}; text-align: center; font-style: italic;">
        ${contactSupport}
      </p>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email cảnh báo bảo mật khi tài khoản bị khóa do brute force
   * @param to - Email người nhận
   * @param name - Tên người dùng
   * @param unlockCode - Mã mở khóa 6 số
   * @param ip - IP đã thực hiện đăng nhập sai
   * @param lang - Ngôn ngữ
   */
  async sendSecurityAlertEmail(
    to: string,
    name: string,
    unlockCode: string,
    ip: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    const greeting = await this.i18n.t('bruteForce.securityAlert.greeting', { lang });
    const title = await this.i18n.t('bruteForce.securityAlert.title', { lang });
    const message = await this.i18n.t('bruteForce.securityAlert.message', { lang });
    const lockMessage = await this.i18n.t('bruteForce.securityAlert.lockMessage', { lang });
    const unlockInstructions = await this.i18n.t('bruteForce.securityAlert.unlockInstructions', { lang });
    const codeLabel = await this.i18n.t('bruteForce.securityAlert.codeLabel', { lang });
    const warningText = await this.i18n.t('bruteForce.securityAlert.warningText', { lang });
    const expirationLabel = await this.i18n.t('bruteForce.securityAlert.expirationLabel', { lang });
    const expirationValue = await this.i18n.t('bruteForce.securityAlert.expirationValue', { lang });
    const subject = await this.i18n.t('bruteForce.securityAlert.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <!-- Tiêu đề -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.error}; text-align: center;">
        ⚠️ ${title}
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${greeting}, <strong style="color: ${colors.primaryDark};">${name}</strong>
      </p>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message}
      </p>

      <!-- Thông tin IP -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.error}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.error}; font-family: monospace;">
          ${ip}
        </p>
        <p style="margin: 10px 0 0; font-size: 13px; color: ${colors.gray500};">
          🕐 ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}
        </p>
      </div>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${lockMessage}
      </p>

      <!-- Mã mở khóa -->
      <div style="background: linear-gradient(135deg, ${colors.primaryLight} 0%, ${colors.primary} 100%); border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
          ${unlockInstructions}
        </p>
        <p style="margin: 0 0 5px; font-size: 12px; color: rgba(255, 255, 255, 0.7);">
          ${codeLabel}
        </p>
        <p style="margin: 0; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: monospace;">
          ${unlockCode}
        </p>
        <p style="margin: 15px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.7);">
          ${expirationLabel}: <strong>${expirationValue}</strong>
        </p>
      </div>

      <!-- Hướng dẫn -->
      <div style="background-color: ${colors.gray100}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 15px; font-size: 14px; color: ${colors.gray700}; text-align: center; line-height: 1.6;">
          📧 ${lang === 'vi' ? 'Gửi email đến' : 'Send email to'} <strong>${this.configService.get<string>('EMAIL_SUPPORT_ADDRESS') || 'support@gen-hub.dev'}</strong>
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 8px; font-size: 13px; color: ${colors.gray500}; text-align: right; width: 30%;">
              ${lang === 'vi' ? 'Tiêu đề:' : 'Subject:'}
            </td>
            <td style="padding: 8px;">
              <code style="display: inline-block; padding: 8px 16px; background-color: ${colors.cardSurface}; border: 1px solid ${colors.border}; border-radius: 6px; font-family: monospace; font-size: 14px; color: ${colors.primary};">
                [UNLOCK] ${to}
              </code>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; font-size: 13px; color: ${colors.gray500}; text-align: right;">
              ${lang === 'vi' ? 'Nội dung:' : 'Body:'}
            </td>
            <td style="padding: 8px;">
              <code style="display: inline-block; padding: 8px 16px; background-color: ${colors.cardSurface}; border: 1px solid ${colors.border}; border-radius: 6px; font-family: monospace; font-size: 14px; color: ${colors.primary};">
                UNLOCK ${unlockCode}
              </code>
            </td>
          </tr>
        </table>
      </div>

      <!-- Cảnh báo bảo mật -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid ${colors.warning};">
        <p style="margin: 0; font-size: 13px; color: ${colors.warning}; text-align: center;">
          ⚠️ ${warningText}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email thông báo mở khóa thành công
   * @param to - Email người nhận
   * @param name - Tên người dùng
   * @param lang - Ngôn ngữ
   */
  async sendUnlockSuccessEmail(
    to: string,
    name: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');

    const greeting = await this.i18n.t('bruteForce.unlockSuccess.greeting', { lang });
    const title = await this.i18n.t('bruteForce.unlockSuccess.title', { lang });
    const message = await this.i18n.t('bruteForce.unlockSuccess.message', { lang });
    const securityTip = await this.i18n.t('bruteForce.unlockSuccess.securityTip', { lang });
    const subject = await this.i18n.t('bruteForce.unlockSuccess.subject', { lang });

    // Get colors from config
    const colors = this.appConfigService.get('colors');

    const content = `
      <!-- Tiêu đề -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.success}; text-align: center;">
        ✅ ${title}
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${greeting}, <strong style="color: ${colors.primaryDark};">${name}</strong>
      </p>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${message}
      </p>

      <!-- Thông báo thành công -->
      <div style="background: linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%); border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; font-size: 48px;">
          🔓
        </p>
        <p style="margin: 15px 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">
          ${message}
        </p>
      </div>

      <!-- Gợi ý bảo mật -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${colors.info};">
        <p style="margin: 0; font-size: 13px; color: ${colors.info}; text-align: center; line-height: 1.6;">
          💡 ${securityTip}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `${subject} - ${appName}`,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  /**
   * Gửi email xác nhận đã nhận yêu cầu liên hệ
   * @param to - Email khách hàng
   * @param name - Tên khách hàng
   * @param ticketCode - Mã ticket
   * @param phone - Số điện thoại (optional)
   * @param subject - Tiêu đề yêu cầu
   * @param message - Nội dung yêu cầu
   * @param emailMessageId - Message-ID cho email threading
   * @param lang - Ngôn ngữ
   */
  async sendContactConfirmationEmail(
    to: string,
    name: string,
    ticketCode: string,
    phone?: string,
    subject?: string,
    message?: string,
    emailMessageId?: string,
    lang: string = 'vi',
  ): Promise<string | null> {
    const appName = 'GenHub'; // Hardcoded or fetch from config
    const colors = {
      primary: '#0070f3',
      background: '#ffffff',
      text: '#333333',
      gray100: '#f5f5f5',
      gray500: '#888888',
      gray700: '#444444',
      gray900: '#111111',
      info: '#3b82f6',
      border: '#e5e7eb',
    };

    const yourRequest = await this.i18n.t('contact.email.confirmation.yourRequest', { lang });
    const nameLabel = await this.i18n.t('contact.email.confirmation.nameLabel', { lang });
    const emailLabel = await this.i18n.t('contact.email.confirmation.emailLabel', { lang });
    const phoneLabel = await this.i18n.t('contact.email.confirmation.phoneLabel', { lang });
    const subjectLabel = await this.i18n.t('contact.email.confirmation.subjectLabel', { lang });
    const messageLabel = await this.i18n.t('contact.email.confirmation.messageLabel', { lang });
    const responseNote = await this.i18n.t('contact.email.confirmation.responseNote', { lang });
    const replyNote = await this.i18n.t('contact.email.confirmation.replyNote', { lang });
    const ticketCodeLabel = await this.i18n.t('contact.email.confirmation.ticketCode', { lang });
    const received = await this.i18n.t('contact.email.confirmation.received', { lang });
    const greeting = await this.i18n.t('contact.email.confirmation.greeting', { lang });
    const emailSubjectTitle = await this.i18n.t('contact.email.confirmation.subject', { lang, args: { code: ticketCode } });

    const content = `
      <!-- Lời chào -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 👋
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${received} <br/>
        ${ticketCodeLabel}: <strong style="color: ${colors.primary}; font-size: 16px;">#${ticketCode}</strong>
      </p>

      <!-- Thông tin yêu cầu -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.info}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0 0 15px; font-size: 14px; font-weight: 600; color: ${colors.gray900};">
          ${yourRequest}:
        </p>
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: ${colors.gray500};">${nameLabel}</td>
            <td style="padding: 5px 0; text-align: right; font-size: 14px; color: ${colors.gray900};">${name}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: ${colors.gray500};">${emailLabel}</td>
            <td style="padding: 5px 0; text-align: right; font-size: 14px; color: ${colors.gray900};">${to}</td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: ${colors.gray500};">${phoneLabel}</td>
            <td style="padding: 5px 0; text-align: right; font-size: 14px; color: ${colors.gray900};">${phone}</td>
          </tr>
          ` : ''}
          ${subject ? `
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: ${colors.gray500};">${subjectLabel}</td>
            <td style="padding: 5px 0; text-align: right; font-size: 14px; color: ${colors.gray900};">${subject}</td>
          </tr>
          ` : ''}
        </table>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${colors.border};">
          <p style="margin: 0 0 5px; font-size: 13px; color: ${colors.gray500};">${messageLabel}:</p>
          <p style="margin: 0; font-size: 14px; color: ${colors.gray700}; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
      </div>

      <!-- Notes -->
      <div style="background-color: ${colors.gray100}; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: ${colors.gray700}; text-align: center;">
          ${responseNote}
        </p>
        <p style="margin: 0; font-size: 12px; color: ${colors.gray500}; text-align: center;">
          💬 ${replyNote}
        </p>
      </div>
    `;

    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
    const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

    const transporter = await this.createTransporter();
    if (!transporter) {
      console.warn('[EmailService] Không thể gửi email - transporter chưa được cấu hình');
      return null;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${appName} Support" <${supportEmail || primaryEmail}>`,
        to,
        subject: emailSubjectTitle,
        html: await this.createEmailTemplate(content, appName, lang),
        messageId: emailMessageId, // Gmail may ignore this, but we try
        headers: {
          'X-Ticket-Code': ticketCode,
        },
      });
      return info.messageId || null;
    } catch (error) {
      console.error('[EmailService] Lỗi khi gửi email xác nhận liên hệ:', error);
      return null;
    }
  }

  /**
   * Gửi email reply từ staff
   * @param to - Email khách hàng
   * @param name - Tên khách hàng
   * @param ticketCode - Mã ticket
   * @param originalSubject - Tiêu đề ban đầu
   * @param replyContent - Nội dung reply
   * @param inReplyTo - Message-ID của email trước
   * @param references - Chuỗi references
   * @param emailMessageId - Message-ID cho email này
   * @param lang - Ngôn ngữ
   */
  async sendContactReplyEmail(
    to: string,
    name: string,
    ticketCode: string,
    originalSubject: string,
    replyContent: string,
    inReplyTo: string | undefined,
    references: string[],
    emailMessageId: string,
    lang: string = 'vi',
  ): Promise<string | null> {
    const appName = this.appConfigService.get('brandName');
    const colors = this.appConfigService.get('colors');

    const greeting = await this.i18n.t('contact.email.reply.greeting', { lang });
    const staffReply = await this.i18n.t('contact.email.reply.staffReply', { lang });
    const replyNote = await this.i18n.t('contact.email.reply.replyNote', { lang });
    const ticketCodeLabel = await this.i18n.t('contact.email.reply.ticketCode', { lang });

    // Lấy subject của email xác nhận để reply đúng vào thread
    const confirmationSubject = await this.i18n.t('contact.email.confirmation.subject', { lang, args: { code: ticketCode } });
    const emailSubject = `Re: ${confirmationSubject}`;

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${greeting}, ${name}! 👋
      </h2>

      <p style="margin: 0 0 20px; font-size: 15px; color: ${colors.gray700}; line-height: 1.7; text-align: center;">
        ${staffReply}
      </p>

      <!-- Ticket Code Badge -->
      <div style="text-align: center; margin: 15px 0;">
        <span style="display: inline-block; background-color: ${colors.gray100}; color: ${colors.gray700}; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
          ${ticketCodeLabel}: <strong>#${ticketCode}</strong>
        </span>
      </div>

      <!-- Reply Content -->
      <div style="background: linear-gradient(135deg, ${colors.gray100} 0%, ${colors.background} 100%); border-left: 4px solid ${colors.primary}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <div style="font-size: 14px; color: ${colors.gray700}; line-height: 1.8; white-space: pre-wrap;">${replyContent}</div>
      </div>

      <!-- Reply Note -->
      <div style="background-color: ${colors.gray100}; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-size: 12px; color: ${colors.gray500}; text-align: center;">
          💬 ${replyNote}
        </p>
      </div>
    `;

    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
    const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

    const transporter = await this.createTransporter();
    if (!transporter) {
      console.warn('[EmailService] Không thể gửi email - transporter chưa được cấu hình');
      return null;
    }

    try {
      const mailOptions: Record<string, unknown> = {
        from: `"${appName} Support" <${supportEmail || primaryEmail}>`,
        to,
        subject: emailSubject,
        html: await this.createEmailTemplate(content, appName, lang),
        messageId: emailMessageId,
        headers: {
          'X-Ticket-Code': ticketCode,
        },
      };

      // Add threading headers
      if (inReplyTo) {
        mailOptions['inReplyTo'] = inReplyTo;
      }
      if (references.length > 0) {
        mailOptions['references'] = references.join(' ');
      }

      const info = await transporter.sendMail(mailOptions);
      return info.messageId || null;
    } catch (error) {
      console.error('[EmailService] Lỗi khi gửi email reply:', error);
      return null;
    }
  }
  async sendContactClosedEmail(
    to: string,
    name: string,
    ticketCode: string,
    originalSubject: string,
    inReplyTo?: string,
    references: string[] = [],
    emailMessageId?: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = 'GenHub'; // Fallback as property might be missing or private
    const colors = {
      primary: '#0070f3',
      background: '#ffffff',
      text: '#333333',
      gray100: '#f5f5f5',
      gray500: '#888888',
      gray700: '#444444',
      gray900: '#111111',
      red500: '#ef4444',
    };

    const title = await this.i18n.t('contact.email.closed.title', { lang });
    const greeting = await this.i18n.t('contact.email.greeting', { lang, args: { name } });
    const messageTemplate = await this.i18n.t('contact.email.closed.message', { lang, args: { ticketCode } });
    const note = await this.i18n.t('contact.email.closed.note', { lang });
    const subjectPrefix = await this.i18n.t('contact.email.closed.subject_prefix', { lang, args: { code: ticketCode } });

    const finalTitle = title || 'Ticket Closed';
    const finalGreeting = greeting || `Hi ${name},`;
    const finalMessage = messageTemplate || `Your support ticket <strong>#${ticketCode}</strong> has been closed.`;
    const finalNote = note || 'If you need further assistance, please open a new ticket.';
    const confirmationSubject = await this.i18n.t('contact.email.confirmation.subject', { lang, args: { code: ticketCode } });
    const emailSubject = `Re: ${confirmationSubject}`;

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${finalTitle} 🔒
      </h2>

      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 16px; color: ${colors.gray700}; line-height: 1.6;">
          ${finalGreeting}<br/>
          ${finalMessage}
        </p>
      </div>

      <div style="background-color: ${colors.gray100}; border-left: 4px solid ${colors.red500}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: ${colors.gray700}; line-height: 1.6;">
          ${finalNote}
        </p>
      </div>
    `;

    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
    const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

    const transporter = await this.createTransporter();
    if (!transporter) return false;

    try {
      const mailOptions: Record<string, unknown> = {
        from: `"${appName} Support" <${supportEmail || primaryEmail}>`,
        to,
        subject: emailSubject,
        html: await this.createEmailTemplate(content, appName, lang),
        messageId: emailMessageId,
        headers: { 'X-Ticket-Code': ticketCode },
      };

      if (inReplyTo) mailOptions['inReplyTo'] = inReplyTo;
      if (references.length > 0) mailOptions['references'] = references.join(' ');

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send closed ticket email:', error);
      return false;
    }
  }

  async sendContactReopenedEmail(
    to: string,
    name: string,
    ticketCode: string,
    originalSubject: string,
    inReplyTo?: string,
    references: string[] = [],
    emailMessageId?: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = 'GenHub';
    const colors = {
      primary: '#0070f3',
      background: '#ffffff',
      text: '#333333',
      gray100: '#f5f5f5',
      gray500: '#888888',
      gray700: '#444444',
      gray900: '#111111',
      green500: '#10b981',
    };

    const title = await this.i18n.t('contact.email.reopened.title', { lang });
    const greeting = await this.i18n.t('contact.email.greeting', { lang, args: { name } });
    const messageTemplate = await this.i18n.t('contact.email.reopened.message', { lang, args: { ticketCode } });
    const subjectPrefix = await this.i18n.t('contact.email.reopened.subject_prefix', { lang, args: { code: ticketCode } });
    const replyNote = await this.i18n.t('contact.email.reopened.replyNote', { lang });

    const finalTitle = title || 'Ticket Reopened';
    const finalGreeting = greeting || `Hi ${name},`;
    const finalMessage = messageTemplate || `Your support ticket <strong>#${ticketCode}</strong> has been reopened.`;
    const confirmationSubject = await this.i18n.t('contact.email.confirmation.subject', { lang, args: { code: ticketCode } });
    const emailSubject = `Re: ${confirmationSubject}`;

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${colors.gray900}; text-align: center;">
        ${finalTitle} 🔓
      </h2>

      <div style="text-align: center; margin-bottom: 30px;">
        <p style="font-size: 16px; color: ${colors.gray700}; line-height: 1.6;">
          ${finalGreeting}<br/>
          ${finalMessage}
        </p>
      </div>

      <div style="background-color: ${colors.gray100}; border-left: 4px solid ${colors.green500}; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: ${colors.gray700}; line-height: 1.6;">
            ${replyNote}
        </p>
      </div>
    `;

    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
    const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

    const transporter = await this.createTransporter();
    if (!transporter) return false;

    try {
      const mailOptions: Record<string, unknown> = {
        from: `"${appName} Support" <${supportEmail || primaryEmail}>`,
        to,
        subject: emailSubject,
        html: await this.createEmailTemplate(content, appName, lang),
        messageId: emailMessageId,
        headers: { 'X-Ticket-Code': ticketCode },
      };

      if (inReplyTo) mailOptions['inReplyTo'] = inReplyTo;
      if (references.length > 0) mailOptions['references'] = references.join(' ');

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send reopened ticket email:', error);
      return false;
    }
  }

  /**
   * Gửi email mời tải xuống ứng dụng
   */
  async sendAppDownloadInviteEmail(
    to: string,
    downloadUrl: string,
    expiresAt?: Date,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

    // Hardcoded text for now until i18n keys are added
    const greeting = lang === 'vi' ? 'Xin chào' : 'Hello';
    const message = lang === 'vi'
      ? `Bạn đã được mời tải xuống ứng dụng <strong style="color: #6366f1;">${appName}</strong>.`
      : `You have been invited to download the <strong style="color: #6366f1;">${appName}</strong> application.`;
    const actionText = lang === 'vi' ? 'Tải xuống ngay' : 'Download Now';
    const expirationText = expiresAt
      ? (lang === 'vi' ? `Liên kết này sẽ hết hạn vào lúc: <strong>${expiresAt.toLocaleString(locale)}</strong>` : `This link will expire at: <strong>${expiresAt.toLocaleString(locale)}</strong>`)
      : '';
    const subject = lang === 'vi' ? `Mời tải xuống ứng dụng ${appName}` : `Invitation to download ${appName}`;

    // Get colors from config
    const colors = this.appConfigService.get('colors');
    // Fallback colors if not available
    const primary = colors?.primary || '#6366f1';
    const primaryDark = colors?.primaryDark || '#4f46e5';
    const gray700 = colors?.gray700 || '#374151';
    const gray500 = colors?.gray500 || '#6b7280';
    const gray100 = colors?.gray100 || '#f3f4f6';
    const info = colors?.info || '#3b82f6';
    const shadow = colors?.shadow || 'rgba(0, 0, 0, 0.1)';
    const cardSurface = colors?.cardSurface || '#ffffff';
    const border = colors?.border || '#e5e7eb';

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: ${primary}; text-align: center;">
        ${greeting}! 👋
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${gray700}; line-height: 1.7; text-align: center;">
        ${message}
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${downloadUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px ${shadow};">
          ${actionText}
        </a>
      </div>

      ${expirationText ? `
      <div style="background-color: ${gray100}; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: ${gray500};">
          ${expirationText}
        </p>
      </div>` : ''}
      
      <div style="background-color: ${gray100}; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: ${gray500}; text-align: center;">
          ${lang === 'vi' ? 'Hoặc sao chép liên kết này:' : 'Or copy this link:'}
        </p>
        <p style="margin: 0; font-size: 12px; word-break: break-all; color: ${info}; text-align: center; background-color: ${cardSurface}; padding: 12px; border-radius: 6px; border: 1px solid ${border};">
          ${downloadUrl}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  async sendVisitBookingApprovedEmail(
    to: string,
    visitorName: string,
    bookingCode: string,
    warehouseName: string,
    visitDate: Date,
    visitTimeStart: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const colors = this.appConfigService.get('colors');
    const subject = await this.i18n.t('warehouse_visit.email.approved.subject', { lang, args: { bookingCode } });
    const title = await this.i18n.t('warehouse_visit.email.approved.title', { lang });
    const greeting = await this.i18n.t('warehouse_visit.email.approved.greeting', { lang, args: { visitorName } });
    const message = await this.i18n.t('warehouse_visit.email.approved.message', { lang });
    const warehouseLabel = await this.i18n.t('warehouse_visit.email.approved.warehouse', { lang });
    const dateLabel = await this.i18n.t('warehouse_visit.email.approved.date', { lang });
    const timeLabel = await this.i18n.t('warehouse_visit.email.approved.time', { lang });
    const bookingCodeLabel = await this.i18n.t('warehouse_visit.email.approved.booking_code', { lang });

    const content = `
      <h2 style="margin:0 0 20px;color:${colors.gray900};text-align:center;">${title}</h2>
      <p style="margin:0 0 16px;color:${colors.gray700};text-align:center;">${greeting}</p>
      <p style="margin:0 0 24px;color:${colors.gray700};text-align:center;">${message}</p>
      <div style="background:${colors.gray100};border-radius:8px;padding:20px;">
        <p><strong>${bookingCodeLabel}:</strong> ${bookingCode}</p>
        <p><strong>${warehouseLabel}:</strong> ${warehouseName}</p>
        <p><strong>${dateLabel}:</strong> ${new Date(visitDate).toISOString().split('T')[0]}</p>
        <p><strong>${timeLabel}:</strong> ${visitTimeStart}</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }

  async sendVisitBookingRejectedEmail(
    to: string,
    visitorName: string,
    bookingCode: string,
    rejectionReason?: string,
    lang: string = 'vi',
  ): Promise<boolean> {
    const appName = this.appConfigService.get('brandName');
    const colors = this.appConfigService.get('colors');
    const subject = await this.i18n.t('warehouse_visit.email.rejected.subject', { lang, args: { bookingCode } });
    const title = await this.i18n.t('warehouse_visit.email.rejected.title', { lang });
    const greeting = await this.i18n.t('warehouse_visit.email.rejected.greeting', { lang, args: { visitorName } });
    const message = await this.i18n.t('warehouse_visit.email.rejected.message', { lang });
    const reasonLabel = await this.i18n.t('warehouse_visit.email.rejected.reason', { lang });

    const content = `
      <h2 style="margin:0 0 20px;color:${colors.gray900};text-align:center;">${title}</h2>
      <p style="margin:0 0 16px;color:${colors.gray700};text-align:center;">${greeting}</p>
      <p style="margin:0 0 24px;color:${colors.gray700};text-align:center;">${message}</p>
      <div style="background:${colors.gray100};border-radius:8px;padding:20px;">
        <p><strong>Code:</strong> ${bookingCode}</p>
        ${rejectionReason ? `<p><strong>${reasonLabel}:</strong> ${rejectionReason}</p>` : ''}
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html: await this.createEmailTemplate(content, appName, lang),
    });
  }
}


