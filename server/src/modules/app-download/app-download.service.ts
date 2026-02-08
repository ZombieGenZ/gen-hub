import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppDownloadRepository } from './app-download.repository';
import { CreateShareInviteDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../notification/email.service';

@Injectable()
export class AppDownloadService {
    constructor(
        private readonly repository: AppDownloadRepository,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
    ) { }

    async getAllShares() {
        return this.repository.findAllShares();
    }

    async getShareById(id: string) {
        const share = await this.repository.findShareById(id);
        if (!share) throw new NotFoundException('Share not found');
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
                }
            }
        });

        try {
            // Send email
            const downloadUrl = `${this.configService.get('APP_URL')}/api/app-download/download/${token}`;
            await this.emailService.sendAppDownloadInviteEmail(dto.email, downloadUrl, expiresAt ?? undefined);
        } catch (error) {
            console.error('Failed to send invite email:', error);
            // We don't throw error here to allow share creation even if email fails
        }

        return share;
    }

    async resendInvite(inviteId: string) {
        const invite = await this.repository.findInviteById(inviteId);
        if (!invite) throw new NotFoundException('Invite not found');

        const share = invite.share || await this.repository.findShareById(invite.share_id);
        if (!share) throw new NotFoundException('Share not found');

        const downloadUrl = `${this.configService.get('APP_URL')}/api/app-download/download/${share.token}`;
        await this.emailService.sendAppDownloadInviteEmail(invite.email, downloadUrl, share.expires_at ?? undefined);

        return this.repository.updateInvite(inviteId, {
            email_sent_count: { increment: 1 },
            email_sent_at: new Date(),
        });
    }

    async deleteInvite(inviteId: string, userId?: string) {
        return this.repository.deleteInvite(inviteId, userId);
    }

    async validateDownloadToken(token: string) {
        const share = await this.repository.findShareByToken(token);
        if (!share) throw new NotFoundException('Invalid token');

        if (share.is_deleted || !share.is_active) throw new BadRequestException('Link is no longer active');

        if (!share.is_permanent && share.expires_at && new Date() > share.expires_at) {
            throw new BadRequestException('Link has expired');
        }

        if (share.max_download !== -1 && share.current_download >= share.max_download) {
            throw new BadRequestException('Download limit reached');
        }

        return share;
    }

    async trackDownload(shareId: string) {
        return this.repository.incrementDownloadCount(shareId);
    }
}
