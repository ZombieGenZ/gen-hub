import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CipherService } from '../../common/services/cipher.service';
import { EmailService } from '../notification/email.service';
import { SystemLogService } from '../system-log/system-log.service';
import { IOrganizationWithGoogleEmail } from './interfaces';

/**
 * Service kiểm tra Google Email credentials cho các Organizations
 * Chạy sau khi server khởi động xong để tránh downtime
 */
@Injectable()
export class OrganizationEmailValidatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrganizationEmailValidatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipherService: CipherService,
    private readonly emailService: EmailService,
    private readonly systemLogService: SystemLogService,
  ) {}

  /**
   * Chạy sau khi ứng dụng bootstrap xong
   */
  async onApplicationBootstrap(): Promise<void> {
    // Chạy validation trong background sau 5 giây để đảm bảo server đã khởi động hoàn toàn
    setTimeout(() => {
      this.validateAllOrganizationCredentials().catch((error) => {
        this.logger.error('Failed to validate organization credentials', error);
      });
    }, 5000);
  }

  /**
   * Kiểm tra credentials của tất cả organizations có is_using_google_email = true
   */
  async validateAllOrganizationCredentials(): Promise<void> {
    this.logger.log(
      'Bắt đầu kiểm tra Google Email credentials cho các tổ chức...',
    );

    const organizations = await this.findAllActiveWithGoogleEmail();

    if (organizations.length === 0) {
      this.logger.log('Không có tổ chức nào sử dụng Google Email.');
      return;
    }

    this.logger.log(`Tìm thấy ${organizations.length} tổ chức cần kiểm tra.`);

    let successCount = 0;
    let failCount = 0;

    for (const org of organizations) {
      try {
        await this.validateOrganizationCredentials(org);
        successCount++;
      } catch (error) {
        failCount++;
        this.logger.warn(
          `Tổ chức "${org.name}" có credentials không hợp lệ: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Hoàn tất kiểm tra: ${successCount} thành công, ${failCount} thất bại.`,
    );
  }

  /**
   * Lấy tất cả organizations có is_using_google_email = true và is_active = true
   */
  private async findAllActiveWithGoogleEmail(): Promise<
    IOrganizationWithGoogleEmail[]
  > {
    return this.prisma.organization.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        is_using_google_email: true,
      },
      select: {
        id: true,
        name: true,
        google_client_id: true,
        google_client_secret: true,
        google_refresh_token: true,
        email_primary_address: true,
        is_using_google_email: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            language: true,
          },
        },
      },
    }) as unknown as IOrganizationWithGoogleEmail[];
  }

  /**
   * Kiểm tra credentials của một organization
   * Nếu không hợp lệ: disable is_using_google_email và gửi email thông báo
   */
  private async validateOrganizationCredentials(
    org: IOrganizationWithGoogleEmail,
  ): Promise<void> {
    // Kiểm tra đủ thông tin
    if (
      !org.google_client_id ||
      !org.google_client_secret ||
      !org.google_refresh_token ||
      !org.email_primary_address
    ) {
      await this.handleInvalidCredentials(
        org,
        'Thiếu thông tin cấu hình Google Email',
      );
      return;
    }

    // Giải mã credentials
    let clientId: string;
    let clientSecret: string;
    let refreshToken: string;

    try {
      clientId = this.cipherService.decrypt(org.google_client_id);
      clientSecret = this.cipherService.decrypt(org.google_client_secret);
      refreshToken = this.cipherService.decrypt(org.google_refresh_token);
    } catch (error) {
      await this.handleInvalidCredentials(
        org,
        'Không thể giải mã thông tin xác thực',
      );
      return;
    }

    // Kiểm tra với Google OAuth
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      if (!response.data || !response.data.access_token) {
        throw new Error('No access token returned');
      }

      // Thành công - log
      this.systemLogService.info(
        'organization',
        'validate_google_email',
        `Tổ chức "${org.name}" đã xác thực Google Email thành công`,
        { metaData: { organizationId: org.id } },
      );
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error_description ||
        error?.response?.data?.error ||
        error?.message ||
        'Unknown error';
      await this.handleInvalidCredentials(org, errorMessage);
    }
  }

  /**
   * Xử lý khi credentials không hợp lệ:
   * 1. Disable is_using_google_email
   * 2. Gửi email thông báo cho owner
   * 3. Log lỗi
   */
  private async handleInvalidCredentials(
    org: IOrganizationWithGoogleEmail,
    errorMessage: string,
  ): Promise<void> {
    // Disable is_using_google_email
    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        is_using_google_email: false,
        updated_at: new Date(),
      },
    });

    // Log error
    this.systemLogService.error(
      'organization',
      'validate_google_email',
      `Tổ chức "${org.name}" có Google Email credentials không hợp lệ: ${errorMessage}`,
      { metaData: { organizationId: org.id, error: errorMessage } },
    );

    // Gửi email thông báo cho owner
    if (org.owner?.email) {
      const lang = org.owner.language || 'vi';
      try {
        await this.emailService.sendGoogleIntegrationErrorEmail(
          org.owner.email,
          org.owner.name,
          org.name,
          errorMessage,
          lang,
        );
        this.logger.log(
          `Đã gửi email thông báo lỗi tích hợp Google đến ${org.owner.email}`,
        );
      } catch (emailError) {
        this.logger.error(
          `Không thể gửi email thông báo cho ${org.owner.email}: ${emailError.message}`,
        );
      }
    }
  }
}
