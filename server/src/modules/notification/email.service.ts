import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { Transporter } from 'nodemailer';
import { AppConfigService } from '../../common/config/app-config.service';
import { I18nService } from 'nestjs-i18n';

/**
 * Interface cho thông tin email
 */
interface IEmailOptions {
  /** Địa chỉ email người nhận */
  to: string;
  /** Tiêu đề email */
  subject: string;
  /** Nội dung text */
  text?: string;
  /** Nội dung HTML */
  html?: string;
}

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
   * Tạo transporter với access token mới
   */
  private async createTransporter(): Promise<Transporter | null> {
    if (!this.oAuth2Client) {
      console.warn('[EmailService] OAuth2 client chưa được cấu hình');
      return null;
    }

    try {
      const { token } = await this.oAuth2Client.getAccessToken();

      if (!token) {
        console.error('[EmailService] Không thể lấy access token');
        return null;
      }

      const primaryEmail = this.configService.get<string>('EMAIL_PRIMARY_ADDRESS');

      return nodemailer.createTransport({
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

    return `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${appName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header với gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab3 100%); padding: 40px 30px; text-align: center;">
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
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 30px 35px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="text-align: center;">
                          <!-- Thông tin liên hệ -->
                          <p style="margin: 0 0 15px; font-size: 13px; color: #64748b; line-height: 1.6;">
                            ${supportText}
                          </p>
                          

                          
                          <!-- Copyright -->
                          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            © ${new Date().getFullYear()} ${appName}. ${copyright}
                          </p>
                          <p style="margin: 8px 0 0; font-size: 11px; color: #cbd5e1;">
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

    const content = `
      
      <!-- Lời chào -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${greeting}, ${name}! 👋
      </h2>
      
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${welcome} <strong style="color: #1e3a5f;">${appName}</strong>. 
      </p>
      
      <!-- Thông tin tài khoản -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0284c7; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: #64748b;">${emailLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: #0f172a; font-weight: 500;">${to}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">
              <span style="font-size: 13px; color: #64748b;">${expirationLabel}</span>
            </td>
            <td style="padding: 5px 0; text-align: right;">
              <span style="font-size: 14px; color: #ea580c; font-weight: 500;">${expirationValue}</span>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Nút CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${verifyUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
          ${buttonText}
        </a>
      </div>
      
      <!-- Link backup -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; text-align: center;">
          ${copyLinkText}
        </p>
        <p style="margin: 0; font-size: 12px; word-break: break-all; color: #0284c7; text-align: center; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          ${verifyUrl}
        </p>
      </div>
      
      <!-- Cảnh báo -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 25px;">
        <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.6;">
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

    const content = `
      
      <!-- Lời chào -->
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${title}
      </h2>
      
      <p style="margin: 0 0 10px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${greeting} <strong style="color: #1e3a5f;">${name}</strong>,
      </p>
      
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: #1e3a5f;">${appName}</strong>.
      </p>
      
      <!-- Cảnh báo thời gian -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
          ${timeLabel}
        </p>
        <p style="margin: 5px 0 0; font-size: 13px; color: #a16207;">
          ${timeWarning}
        </p>
      </div>
      
      <!-- Nút CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
          ${buttonText}
        </a>
      </div>
      
      <!-- Link backup -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; text-align: center;">
          ${copyLinkText}
        </p>
        <p style="margin: 0; font-size: 12px; word-break: break-all; color: #0284c7; text-align: center; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
          ${resetUrl}
        </p>
      </div>
      
      <!-- Cảnh báo bảo mật -->
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: 600;">
          ${securityTitle}
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #b91c1c; line-height: 1.6;">
          ${securityMessage}
        </p>
      </div>
      
      <!-- Thông tin IP/Device (optional) -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 25px;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
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

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${greeting}, ${name}! 🎉
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: #1e3a5f;">${appName}</strong>. ${accountReady}
      </p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${frontendUrl}" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
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

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${greeting}, ${name}! 🔔
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${message}
      </p>
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0284c7; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: #0f172a;"><strong>${deviceLabel}</strong> ${deviceInfo.device || 'Unknown'}</p>
        <p style="margin: 5px 0; font-size: 14px; color: #0f172a;"><strong>${ipLabel}</strong> ${deviceInfo.ip || 'Unknown'}</p>
        <p style="margin: 5px 0; font-size: 14px; color: #0f172a;"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; text-align: center;">
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

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${greeting}, ${name}! 🔐
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${message}
      </p>
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0284c7; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: #0f172a;"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; text-align: center;">
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

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${greeting}, ${name}! 🔗
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: #1e3a5f;">${platform}</strong>
      </p>
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: #0f172a;"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
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

    const content = `
      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1e293b; text-align: center;">
        ${greeting}, ${name}! 🔓
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.7; text-align: center;">
        ${message} <strong style="color: #1e3a5f;">${platform}</strong>
      </p>
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <p style="margin: 5px 0; font-size: 14px; color: #0f172a;"><strong>${timeLabel}</strong> ${new Date().toLocaleString(locale, { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
      <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 15px; margin: 25px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; text-align: center;">
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
}
