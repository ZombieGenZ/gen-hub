import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { AppDownloadRepository } from './app-download.repository';
import { CreateShareInviteDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../notification/email.service';
import { RedisService } from '../redis/redis.service';
import { AppDownloadCacheKeys } from './constants/app-download-cache.helper';
import { InviteSchedulerService } from './invite-scheduler.service';
import { existsSync } from 'fs';
import * as path from 'path';

@Injectable()
export class AppDownloadService {
  private readonly SHARE_TTL: number;
  private readonly LIST_TTL: number;
  private readonly DEFAULT_RELEASE_PATH = 'app/GenHubApp.exe';

  constructor(
    private readonly repository: AppDownloadRepository,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
    private readonly cacheKeys: AppDownloadCacheKeys,
    private readonly schedulerService: InviteSchedulerService,
    private readonly i18n: I18nService,
  ) {
    this.SHARE_TTL =
      this.configService.get<number>('REDIS_APP_DOWNLOAD_SHARE_TTL') || 300;
    this.LIST_TTL =
      this.configService.get<number>('REDIS_APP_DOWNLOAD_LIST_TTL') || 60;
  }

  async getAllShares() {
    const cacheKey = this.cacheKeys.list();
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const shares = await this.repository.findAllShares();
    await this.redisService.set(
      cacheKey,
      JSON.stringify(shares),
      this.LIST_TTL,
    );
    return shares;
  }

  async getShareById(id: string) {
    const cacheKey = this.cacheKeys.share(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const share = await this.repository.findShareById(id);
    if (!share)
      throw new NotFoundException(
        await this.i18n.translate('app-download.errors.share_not_found'),
      );

    await this.redisService.set(
      cacheKey,
      JSON.stringify(share),
      this.SHARE_TTL,
    );
    return share;
  }

  async createShareInvite(dto: CreateShareInviteDto, userId?: string) {
    // Generate token
    const token = uuidv4();

    // Calculate expirationDate
    let expiresAt = dto.expires_at;
    if (!expiresAt && !dto.is_permanent && dto.expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expires_in_days);
    }

    // Create share
    const share = await this.repository.createShare({
      token,
      max_download: dto.max_download ?? -1,
      is_permanent: dto.is_permanent ?? false,
      expires_at: expiresAt,
      created_by: userId,
      invites: {
        create: {
          email: dto.email,
          created_by: userId,
          email_sent_at: new Date(),
          email_sent_count: 1,
        },
      },
    });

    // Invalidate list cache
    await this.redisService.del(this.cacheKeys.list());

    // Schedule expiration if needed
    if (!share.is_permanent && share.expires_at) {
      this.schedulerService.scheduleExpiration(
        share.id,
        share.expires_at,
        share.token,
      );
    }

    try {
      // Send email
      const downloadUrl = `${this.configService.get('APP_URL')}/api/app-download/download/${token}`;
      await this.emailService.sendAppDownloadInviteEmail(
        dto.email,
        downloadUrl,
        expiresAt ?? undefined,
      );
    } catch (error) {
      console.error('Failed to send invite email:', error);
      // We don't throw error here to allow share creation even if email fails
    }

    return share;
  }

  async resendInvite(inviteId: string) {
    const invite = await this.repository.findInviteById(inviteId);
    if (!invite)
      throw new NotFoundException(
        await this.i18n.translate('app-download.errors.invite_not_found'),
      );

    const share =
      invite.share || (await this.repository.findShareById(invite.share_id));
    if (!share)
      throw new NotFoundException(
        await this.i18n.translate('app-download.errors.share_not_found'),
      );

    const downloadUrl = `${this.configService.get('APP_URL')}/api/app-download/download/${share.token}`;
    await this.emailService.sendAppDownloadInviteEmail(
      invite.email,
      downloadUrl,
      share.expires_at ?? undefined,
    );

    const updatedInvite = await this.repository.updateInvite(inviteId, {
      email_sent_count: { increment: 1 },
      email_sent_at: new Date(),
    });

    // Invalidate share cache as invite details changed
    await this.redisService.del(this.cacheKeys.share(share.id));
    await this.redisService.del(this.cacheKeys.shareByToken(share.token));
    await this.redisService.del(this.cacheKeys.list());

    return updatedInvite;
  }

  async deleteInvite(inviteId: string, userId?: string) {
    const invite = await this.repository.findInviteById(inviteId);
    if (invite) {
      const result = await this.repository.deleteInvite(inviteId, userId);
      // Invalidate caches
      await this.redisService.del(this.cacheKeys.share(invite.share_id));
      // If this was the last invite or it affects share logic, we might need to clear more, but share detail is enough
      await this.redisService.del(this.cacheKeys.list());
      return result;
    }
    throw new NotFoundException(
      await this.i18n.translate('app-download.errors.invite_not_found'),
    );
  }

  async validateDownloadToken(token: string) {
    const cacheKey = this.cacheKeys.shareByToken(token);
    let share = await this.redisService
      .get(cacheKey)
      .then((res) => (res ? JSON.parse(res) : null));

    if (!share) {
      share = await this.repository.findShareByToken(token);
      if (share) {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(share),
          this.SHARE_TTL,
        );
      }
    }

    if (!share)
      throw new NotFoundException(
        await this.i18n.translate('app-download.errors.invalid_token'),
      );

    if (share.is_deleted || !share.is_active)
      throw new BadRequestException(
        await this.i18n.translate('app-download.errors.link_inactive'),
      );

    if (
      !share.is_permanent &&
      share.expires_at &&
      new Date() > new Date(share.expires_at)
    ) {
      throw new BadRequestException(
        await this.i18n.translate('app-download.errors.link_expired'),
      );
    }

    if (
      share.max_download !== -1 &&
      share.current_download >= share.max_download
    ) {
      throw new BadRequestException(
        await this.i18n.translate('app-download.errors.limit_reached'),
      );
    }

    return share;
  }

  async getReleaseFileOrThrow() {
    const configuredPath =
      this.configService.get<string>('APP_RELEASE_PATH')?.trim() ||
      this.DEFAULT_RELEASE_PATH;
    const resolvedPath = this.resolveReleaseFilePath(configuredPath);

    if (!existsSync(resolvedPath)) {
      throw new NotFoundException('Không tìm thấy file ứng dụng trên server');
    }

    return {
      filePath: resolvedPath,
      fileName: path.basename(resolvedPath),
    };
  }

  async trackDownload(shareId: string) {
    const result = await this.repository.incrementDownloadCount(shareId);

    // Invalidate caches
    await this.redisService.del(this.cacheKeys.share(shareId));
    await this.redisService.del(this.cacheKeys.shareByToken(result.token));
    // We probably don't need to invalidate list for download count update unless list shows download count,
    // but let's be safe or just skip list for performance if high volume.
    // User asked for performance, but accuracy is also important. Let's invalidate list too.
    await this.redisService.del(this.cacheKeys.list());

    return result;
  }

  private resolveReleaseFilePath(configuredPath: string): string {
    if (path.isAbsolute(configuredPath)) {
      return configuredPath;
    }

    const candidatePaths = [
      path.resolve(process.cwd(), configuredPath),
      path.resolve(process.cwd(), '..', configuredPath),
    ];

    return (
      candidatePaths.find((candidatePath) => existsSync(candidatePath)) ||
      candidatePaths[0]
    );
  }
}
