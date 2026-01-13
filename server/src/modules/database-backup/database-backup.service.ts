import {
    Injectable,
    Logger,
    OnModuleInit,
    BadRequestException,
    NotFoundException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BackblazeB2Service } from '../backblaze-b2/backblaze-b2.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { I18nService } from 'nestjs-i18n';
import {
    IBackupResult,
    IBackupListItem,
    IBackupListQuery,
} from './interfaces';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import archiverZipEncrypted from 'archiver-zip-encrypted';
import { DiscordService } from '../discord/discord.service';

// Đăng ký format zip-encrypted cho mã hóa AES-256
archiver.registerFormat('zip-encrypted', archiverZipEncrypted);

/**
 * Service xử lý sao lưu database tự động
 * - Export tất cả tables qua Prisma thành JSON
 * - Nén thành file zip
 * - Upload lên Backblaze B2 + Cloudflare CDN
 * - Scheduled backup và manual trigger
 */
@Injectable()
export class DatabaseBackupService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseBackupService.name);
    private readonly backupDir: string;
    private readonly secretKey: string;
    private readonly maxBackups: number;
    private readonly intervalSeconds: number;
    private readonly compressionType: string;
    private readonly backupPassword: string;
    private readonly backupFolderName: string;
    private readonly downloadUrlTtlSeconds: number;
    private readonly cacheTtl: number;
    private readonly listCacheTtl: number;
    private isBackupRunning = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly prismaService: PrismaService,
        private readonly backblazeB2Service: BackblazeB2Service,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly i18n: I18nService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @Inject(forwardRef(() => DiscordService))
        private readonly discordService: DiscordService,
    ) {
        this.backupDir = path.join(process.cwd(), 'database', 'backups');
        this.secretKey = this.configService.get<string>('BACKUP_SECRET_KEY', '');
        this.maxBackups = this.configService.get<number>('BACKUP_MAX_COUNT', 30);
        this.intervalSeconds = this.configService.get<number>(
            'BACKUP_INTERVAL_SECONDS',
            86400,
        );
        this.compressionType = this.configService.get<string>(
            'BACKUP_COMPRESSION_TYPE',
            'zip',
        );
        this.backupPassword = this.configService.get<string>('BACKUP_PASSWORD', '');
        this.backupFolderName = this.configService.get<string>('BACKUP_FOLDER_NAME', 'backups');
        // Chuyển TTL từ ms sang giây
        const downloadUrlTtlMs = this.configService.get<number>('BACKUP_DOWNLOAD_URL_TTL_MS', 600000);
        this.downloadUrlTtlSeconds = Math.floor(downloadUrlTtlMs / 1000);
        this.cacheTtl = this.configService.get<number>(
            'REDIS_BACKUP_CACHE_TTL',
            300,
        );
        this.listCacheTtl = this.configService.get<number>(
            'REDIS_BACKUP_LIST_CACHE_TTL',
            60,
        );

        // Tạo thư mục backup nếu chưa tồn tại
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async onModuleInit() {
        // Schedule backup định kỳ
        if (this.intervalSeconds > 0 && this.backblazeB2Service.enabled) {
            this.scheduleNextBackup();
            this.logger.log(
                `📅 Scheduled backup every ${this.intervalSeconds} seconds`,
            );
        }
    }

    /**
     * Lên lịch cho backup tiếp theo
     */
    private scheduleNextBackup() {
        const timeout = setTimeout(async () => {
            await this.runScheduledBackup();
            // Lên lịch cho lần tiếp theo
            this.scheduleNextBackup();
        }, this.intervalSeconds * 1000);

        // Đăng ký với SchedulerRegistry để có thể quản lý
        try {
            this.schedulerRegistry.deleteTimeout('database-backup');
        } catch {
            // Ignore nếu chưa có
        }
        this.schedulerRegistry.addTimeout('database-backup', timeout);
    }

    /**
     * Chạy backup theo schedule
     */
    private async runScheduledBackup() {
        this.logger.log('🕐 Running scheduled backup...');
        await this.runBackup('SYSTEM', 'SCHEDULED');
    }

    /**
     * Main backup flow
     * @param triggeredBy User ID hoặc "SYSTEM"
     * @param backupType Loại backup
     */
    async runBackup(
        triggeredBy: string,
        backupType: 'SCHEDULED' | 'MANUAL_API' | 'MANUAL_DISCORD',
    ): Promise<IBackupResult | null> {
        // Prevent concurrent backups
        if (this.isBackupRunning) {
            this.logger.warn('⚠️ Backup is already running, skipping...');
            return null;
        }

        if (!this.backblazeB2Service.enabled) {
            this.logger.warn('⚠️ Backblaze B2 service is not enabled');
            return null;
        }

        this.isBackupRunning = true;
        const startTime = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportDir = path.join(this.backupDir, `backup-${timestamp}`);

        try {
            this.logger.log('📦 Starting database backup...');

            // 1. Tạo thư mục export
            fs.mkdirSync(exportDir, { recursive: true });

            // 2. Export tất cả tables
            await this.exportAllTables(exportDir);

            // 3. Nén thư mục
            const zipFileName = `backup-${timestamp}.${this.compressionType}`;
            const zipFilePath = path.join(this.backupDir, zipFileName);
            await this.compressBackup(exportDir, zipFilePath, backupType, triggeredBy);

            // 4. Upload lên Backblaze B2 (sử dụng folder name từ config)
            const uploadResult = await this.backblazeB2Service.uploadFile(
                zipFilePath,
                zipFileName,
                this.backupFolderName,
            );

            if (!uploadResult) {
                throw new Error('Failed to upload backup to Backblaze B2');
            }

            // 5. Lưu vào database
            const backup = await this.prismaService.databaseBackup.create({
                data: {
                    file_name: zipFileName,
                    file_size: BigInt(uploadResult.fileSize),
                    drive_file_id: uploadResult.key,
                    drive_file_url: uploadResult.friendlyUrl || null,
                    backup_type: backupType,
                    compression_type: this.compressionType,
                    triggered_by: triggeredBy,
                },
            });

            // 6. Cleanup local files
            fs.rmSync(exportDir, { recursive: true, force: true });
            fs.unlinkSync(zipFilePath);

            // 7. Cleanup old backups
            await this.cleanupOldBackups();

            // 8. Invalidate cache
            await this.invalidateListCache();

            // 9. Emit WebSocket event
            this.websocketGateway.server.to('admin_room').emit('backup:created', {
                id: backup.id,
                fileName: backup.file_name,
                fileSize: Number(backup.file_size),
                backupType: backup.backup_type,
                triggeredBy: backup.triggered_by,
                createdAt: backup.created_at,
                timestamp: new Date().toISOString(),
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.logger.log(
                `✅ Backup completed: ${zipFileName} (${duration}s, ${this.formatBytes(uploadResult.fileSize)})`,
            );

            // 10. Gửi Discord notification
            await this.discordService.sendBackupNotification(true, {
                id: backup.id,
                fileName: backup.file_name,
                fileSize: Number(backup.file_size),
                backupType: backup.backup_type,
                triggeredBy: backup.triggered_by || 'SYSTEM',
                duration,
            });

            return {
                id: backup.id,
                fileName: backup.file_name,
                fileSize: Number(backup.file_size),
                driveFileId: backup.drive_file_id,
                driveFileUrl: backup.drive_file_url || undefined,
                backupType: backup.backup_type,
                createdAt: backup.created_at,
                triggeredBy: backup.triggered_by || 'SYSTEM',
            };
        } catch (error) {
            this.logger.error('❌ Backup failed:', error);

            // Cleanup on error
            if (fs.existsSync(exportDir)) {
                fs.rmSync(exportDir, { recursive: true, force: true });
            }

            // Gửi Discord notification về lỗi
            await this.discordService.sendBackupNotification(false, {
                backupType,
                triggeredBy,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            return null;
        } finally {
            this.isBackupRunning = false;
        }
    }

    /**
     * Export tất cả tables qua Prisma thành JSON
     */
    private async exportAllTables(exportDir: string): Promise<void> {
        // Lấy danh sách tất cả models từ Prisma
        const models = Object.keys(this.prismaService).filter(
            (key) =>
                !key.startsWith('_') &&
                !key.startsWith('$') &&
                typeof (this.prismaService as unknown as Record<string, unknown>)[
                key
                ] === 'object' &&
                (this.prismaService as unknown as Record<string, { findMany?: unknown }>)[key]
                    ?.findMany,
        );

        this.logger.log(`📊 Exporting ${models.length} tables...`);

        for (const model of models) {
            try {
                const prismaModel = (
                    this.prismaService as unknown as Record<
                        string,
                        { findMany: () => Promise<unknown[]> }
                    >
                )[model];

                if (prismaModel && typeof prismaModel.findMany === 'function') {
                    const data = await prismaModel.findMany();
                    const filePath = path.join(exportDir, `${model}.json`);

                    // Convert BigInt to string for JSON serialization
                    const jsonData = JSON.stringify(
                        data,
                        (_, value) =>
                            typeof value === 'bigint' ? value.toString() : value,
                        2,
                    );

                    fs.writeFileSync(filePath, jsonData, 'utf8');
                    this.logger.debug(`  ✓ ${model}: ${data.length} records`);
                }
            } catch (error) {
                this.logger.warn(`  ⚠️ Failed to export ${model}:`, error);
            }
        }
    }

    /**
     * Nén thư mục backup với mã hóa AES-256
     * Thông tin metadata được lưu trong file BACKUP_INFO.txt thay vì archive comment
     */
    private async compressBackup(
        sourceDir: string,
        outputPath: string,
        backupType: 'SCHEDULED' | 'MANUAL_API' | 'MANUAL_DISCORD',
        triggeredBy: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);

            const appVersion = this.configService.get<string>('npm_package_version', '0.0.1');
            const brandName = this.configService.get<string>('BRAND_NAME', 'GEN-HUB');
            const createdAt = new Date().toISOString();

            // Tạo archive với mã hóa AES-256 nếu có password
            const archive = this.backupPassword
                ? archiver.create('zip-encrypted', {
                    zlib: { level: 9 },
                    encryptionMethod: 'aes256',
                    password: this.backupPassword,
                } as archiver.ArchiverOptions)
                : archiver('zip', {
                    zlib: { level: 9 },
                });

            output.on('close', () => {
                const encryptionStatus = this.backupPassword ? '🔐 Encrypted (AES-256)' : '⚠️ Not encrypted';
                this.logger.log(
                    `📦 Compressed: ${this.formatBytes(archive.pointer())} | ${encryptionStatus}`,
                );
                resolve();
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            // Thêm tất cả files trong thư mục
            archive.directory(sourceDir, false);

            // Tạo nội dung metadata
            const metadataContent = [
                `========================================`,
                `${brandName} - Database Backup`,
                `========================================`,
                `Created: ${createdAt}`,
                `Backup Type: ${backupType}`,
                `App Version: ${appVersion}`,
                `Triggered By: ${triggeredBy}`,
                `Encryption: ${this.backupPassword ? 'AES-256' : 'None'}`,
                `----------------------------------------`,
                `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
                `This backup contains confidential data.`,
                `Unauthorized access is strictly prohibited.`,
                `========================================`,
            ].join('\n');

            // Thêm file BACKUP_INFO.txt vào archive
            archive.append(metadataContent, { name: 'BACKUP_INFO.txt' });

            archive.finalize();
        });
    }

    /**
     * Cleanup các backups cũ khi vượt quá max
     */
    private async cleanupOldBackups(): Promise<void> {
        try {
            const backups = await this.prismaService.databaseBackup.findMany({
                where: { is_deleted: false },
                orderBy: { created_at: 'desc' },
            });

            if (backups.length <= this.maxBackups) return;

            const toDelete = backups.slice(this.maxBackups);
            this.logger.log(`🗑️ Cleaning up ${toDelete.length} old backups...`);

            for (const backup of toDelete) {
                try {
                    // Xóa trên Backblaze B2
                    const deleteResult = await this.backblazeB2Service.deleteFile(backup.drive_file_id);

                    if (!deleteResult) {
                        this.logger.warn(`⚠️ Failed to delete file ${backup.drive_file_id} from B2, but will mark as deleted in DB`);
                    }

                    // Soft delete trong database
                    await this.prismaService.databaseBackup.update({
                        where: { id: backup.id },
                        data: {
                            is_deleted: true,
                            deleted_at: new Date(),
                            is_active: false,
                        },
                    });

                    // Emit event
                    this.websocketGateway.server.to('admin_room').emit('backup:deleted', {
                        id: backup.id,
                        fileName: backup.file_name,
                        timestamp: new Date().toISOString(),
                    });

                    this.logger.log(`🗑️ Deleted old backup: ${backup.file_name}`);
                } catch (deleteError) {
                    this.logger.error(`❌ Failed to cleanup backup ${backup.id}:`, deleteError);
                    // Tiếp tục xử lý các file khác
                    continue;
                }
            }
        } catch (error) {
            this.logger.error('❌ Failed to cleanup old backups:', error);
        }
    }

    /**
     * Trigger backup thủ công qua API
     */
    async triggerBackup(
        key: string,
        userId: string,
        lang: string,
    ): Promise<IBackupResult> {
        // Validate key
        if (key !== this.secretKey) {
            throw new BadRequestException(
                this.i18n.t('database-backup.errors.invalid_key', { lang }),
            );
        }

        const result = await this.runBackup(userId, 'MANUAL_API');

        if (!result) {
            throw new BadRequestException(
                this.i18n.t('database-backup.errors.backup_failed', { lang }),
            );
        }

        return result;
    }

    /**
     * Trigger backup từ Discord
     */
    async triggerBackupFromDiscord(
        key: string,
        discordUserId: string,
    ): Promise<IBackupResult | null> {
        if (key !== this.secretKey) {
            return null;
        }

        return await this.runBackup(
            `discord:${discordUserId}`,
            'MANUAL_DISCORD',
        );
    }

    /**
     * Lấy danh sách backups
     */
    async listBackups(
        query: IBackupListQuery,
        lang: string,
    ): Promise<{ items: IBackupListItem[]; total: number }> {
        const { key, limit = 10, offset = 0, keywords } = query;

        // Validate key
        if (key !== this.secretKey) {
            throw new BadRequestException(
                this.i18n.t('database-backup.errors.invalid_key', { lang }),
            );
        }

        const cacheKey = `backup:list:${limit}:${offset}:${keywords || ''}`;


        // Check cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where = {
            is_deleted: false,
            ...(keywords && {
                file_name: { contains: keywords, mode: 'insensitive' as const },
            }),
        };

        const [items, total] = await Promise.all([
            this.prismaService.databaseBackup.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    file_name: true,
                    file_size: true,
                    backup_type: true,
                    created_at: true,
                    triggered_by: true,
                },
            }),
            this.prismaService.databaseBackup.count({ where }),
        ]);

        const result = {
            items: items.map((item) => ({
                id: item.id,
                fileName: item.file_name,
                fileSize: Number(item.file_size),
                backupType: item.backup_type,
                createdAt: item.created_at,
                triggeredBy: item.triggered_by || 'SYSTEM',
            })),
            total,
        };

        // Set cache
        await this.redisService.set(
            cacheKey,
            JSON.stringify(result),
            this.listCacheTtl,
        );

        return result;
    }

    /**
     * Lấy download URL của backup
     */
    async getDownloadUrl(
        id: string,
        key: string,
        lang: string,
    ): Promise<string> {
        // Validate key
        if (key !== this.secretKey) {
            throw new BadRequestException(
                this.i18n.t('database-backup.errors.invalid_key', { lang }),
            );
        }

        const backup = await this.prismaService.databaseBackup.findFirst({
            where: { id, is_deleted: false },
        });

        if (!backup) {
            throw new NotFoundException(
                this.i18n.t('database-backup.errors.not_found', { lang }),
            );
        }

        // Tạo pre-signed URL với TTL từ config
        const url = await this.backblazeB2Service.getDownloadUrl(
            backup.drive_file_id,
            this.downloadUrlTtlSeconds,
        );

        if (!url) {
            throw new BadRequestException(
                this.i18n.t('database-backup.errors.download_failed', { lang }),
            );
        }

        return url;
    }

    /**
     * Lấy thông tin backup theo ID
     */
    async getBackupById(id: string): Promise<IBackupListItem | null> {
        const backup = await this.prismaService.databaseBackup.findFirst({
            where: { id, is_deleted: false },
            select: {
                id: true,
                file_name: true,
                file_size: true,
                backup_type: true,
                created_at: true,
                triggered_by: true,
            },
        });

        if (!backup) return null;

        return {
            id: backup.id,
            fileName: backup.file_name,
            fileSize: Number(backup.file_size),
            backupType: backup.backup_type,
            createdAt: backup.created_at,
            triggeredBy: backup.triggered_by || 'SYSTEM',
        };
    }

    /**
     * Invalidate list cache
     */
    private async invalidateListCache(): Promise<void> {
        await this.redisService.delByPattern('backup:list:*');
    }

    /**
     * Format bytes to human readable
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
