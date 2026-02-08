import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppDownloadShare, AppDownloadInvite, Prisma } from '@prisma/client';

@Injectable()
export class AppDownloadRepository {
    constructor(private readonly prisma: PrismaService) { }

    async createShare(data: Prisma.AppDownloadShareCreateInput): Promise<AppDownloadShare> {
        return this.prisma.appDownloadShare.create({
            data,
        });
    }

    async createInvite(data: Prisma.AppDownloadInviteCreateInput): Promise<AppDownloadInvite> {
        return this.prisma.appDownloadInvite.create({
            data,
        });
    }

    async findAllShares(): Promise<AppDownloadShare[]> {
        return this.prisma.appDownloadShare.findMany({
            where: {
                is_deleted: false,
            },
            include: {
                invites: {
                    where: { is_deleted: false },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    async findShareById(id: string): Promise<AppDownloadShare | null> {
        return this.prisma.appDownloadShare.findUnique({
            where: { id },
            include: {
                invites: {
                    where: { is_deleted: false },
                },
            },
        });
    }

    async findShareByToken(token: string): Promise<AppDownloadShare | null> {
        return this.prisma.appDownloadShare.findUnique({
            where: { token },
            include: {
                invites: {
                    where: { is_deleted: false },
                },
            },
        });
    }

    async findInviteById(id: string): Promise<(AppDownloadInvite & { share: AppDownloadShare }) | null> {
        return this.prisma.appDownloadInvite.findUnique({
            where: { id },
            include: {
                share: true,
            },
        });
    }

    async updateShare(id: string, data: Prisma.AppDownloadShareUpdateInput): Promise<AppDownloadShare> {
        return this.prisma.appDownloadShare.update({
            where: { id },
            data,
        });
    }

    async updateInvite(id: string, data: Prisma.AppDownloadInviteUpdateInput): Promise<AppDownloadInvite> {
        return this.prisma.appDownloadInvite.update({
            where: { id },
            data,
        });
    }

    async deleteInvite(id: string, deletedBy?: string): Promise<AppDownloadInvite> {
        return this.prisma.appDownloadInvite.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async incrementDownloadCount(id: string): Promise<AppDownloadShare> {
        return this.prisma.appDownloadShare.update({
            where: { id },
            data: {
                current_download: {
                    increment: 1,
                },
            },
        });
    }

    async findExpiredShares(): Promise<AppDownloadShare[]> {
        return this.prisma.appDownloadShare.findMany({
            where: {
                is_deleted: false,
                is_permanent: false,
                expires_at: {
                    lte: new Date(),
                },
            },
        });
    }

    async findActiveSharesWithExpiration(): Promise<AppDownloadShare[]> {
        return this.prisma.appDownloadShare.findMany({
            where: {
                is_deleted: false,
                is_permanent: false,
                expires_at: {
                    gt: new Date(),
                },
            },
        });
    }

    async softDeleteShare(id: string, deletedBy?: string): Promise<AppDownloadShare> {
        return this.prisma.appDownloadShare.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
                is_active: false,
            },
        });
    }
}
