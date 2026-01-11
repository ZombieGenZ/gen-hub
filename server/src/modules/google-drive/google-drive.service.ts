import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface kết quả upload file lên Google Drive
 */
export interface IUploadResult {
    fileId: string;
    fileName: string;
    fileSize: number;
    webViewLink?: string;
    webContentLink?: string;
}

/**
 * Interface thông tin file trên Google Drive
 */
export interface IDriveFileInfo {
    id: string;
    name: string;
    size: string;
    createdTime: string;
    webViewLink?: string;
    webContentLink?: string;
}

/**
 * Service xử lý tích hợp Google Drive API
 * Sử dụng Service Account để upload, quản lý file backup
 */
@Injectable()
export class GoogleDriveService implements OnModuleInit {
    private readonly logger = new Logger(GoogleDriveService.name);
    private drive: drive_v3.Drive;
    private isEnabled = false;
    private backupFolderId: string;
    private shareEmails: string[] = [];

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        await this.initialize();
    }

    /**
     * Khởi tạo Google Drive client với Service Account
     */
    private async initialize() {
        const serviceAccountEmail = this.configService.get<string>(
            'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL',
        );
        const privateKey = this.configService.get<string>(
            'GOOGLE_DRIVE_PRIVATE_KEY',
        );
        this.backupFolderId = this.configService.get<string>(
            'GOOGLE_DRIVE_BACKUP_FOLDER_ID',
            '',
        );

        // Parse share emails từ env
        const shareEmailsStr = this.configService.get<string>(
            'BACKUP_SHARE_EMAILS',
            '',
        );
        this.shareEmails = shareEmailsStr
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e);

        if (!serviceAccountEmail || !privateKey || !this.backupFolderId) {
            this.logger.warn(
                '⚠️ Google Drive service disabled: Missing credentials or folder ID',
            );
            return;
        }

        try {
            // Tạo JWT client với Service Account
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: serviceAccountEmail,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/drive'],
            });

            this.drive = google.drive({ version: 'v3', auth });
            this.isEnabled = true;

            this.logger.log('✅ Google Drive service initialized successfully');

            // Sync share permissions khi khởi động
            await this.syncSharePermissions();
        } catch (error) {
            this.logger.error('❌ Failed to initialize Google Drive service:', error);
        }
    }

    /**
     * Kiểm tra xem service có được enable không
     */
    get enabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Upload file lên Google Drive
     * @param filePath Đường dẫn file local
     * @param fileName Tên file trên Drive (optional, mặc định lấy từ filePath)
     */
    async uploadFile(
        filePath: string,
        fileName?: string,
    ): Promise<IUploadResult | null> {
        if (!this.isEnabled) {
            this.logger.warn('Google Drive service is not enabled');
            return null;
        }

        try {
            const fileStats = fs.statSync(filePath);
            const name = fileName || path.basename(filePath);

            const fileMetadata: drive_v3.Schema$File = {
                name,
                parents: [this.backupFolderId],
            };

            const media = {
                mimeType: 'application/zip',
                body: fs.createReadStream(filePath),
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media,
                fields: 'id, name, size, webViewLink, webContentLink',
            });

            const file = response.data;

            this.logger.log(`✅ Uploaded file: ${name} (ID: ${file.id})`);

            // Share file với các emails được cấu hình
            if (file.id) {
                await this.shareFileWithEmails(file.id);
            }

            return {
                fileId: file.id!,
                fileName: file.name!,
                fileSize: fileStats.size,
                webViewLink: file.webViewLink || undefined,
                webContentLink: file.webContentLink || undefined,
            };
        } catch (error) {
            this.logger.error(`❌ Failed to upload file ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Liệt kê files trong folder backup
     */
    async listFiles(): Promise<IDriveFileInfo[]> {
        if (!this.isEnabled) return [];

        try {
            const response = await this.drive.files.list({
                q: `'${this.backupFolderId}' in parents and trashed = false`,
                fields: 'files(id, name, size, createdTime, webViewLink, webContentLink)',
                orderBy: 'createdTime desc',
            });

            return (response.data.files || []).map((file) => ({
                id: file.id!,
                name: file.name!,
                size: file.size || '0',
                createdTime: file.createdTime!,
                webViewLink: file.webViewLink || undefined,
                webContentLink: file.webContentLink || undefined,
            }));
        } catch (error) {
            this.logger.error('❌ Failed to list files:', error);
            return [];
        }
    }

    /**
     * Xóa file trên Google Drive
     * @param fileId ID của file trên Drive
     */
    async deleteFile(fileId: string): Promise<boolean> {
        if (!this.isEnabled) return false;

        try {
            await this.drive.files.delete({ fileId });
            this.logger.log(`✅ Deleted file: ${fileId}`);
            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to delete file ${fileId}:`, error);
            return false;
        }
    }

    /**
     * Share file với một email
     */
    async shareFile(fileId: string, email: string): Promise<boolean> {
        if (!this.isEnabled) return false;

        try {
            await this.drive.permissions.create({
                fileId,
                requestBody: {
                    type: 'user',
                    role: 'reader',
                    emailAddress: email,
                },
                sendNotificationEmail: false,
            });
            this.logger.log(`✅ Shared file ${fileId} with ${email}`);
            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to share file with ${email}:`, error);
            return false;
        }
    }

    /**
     * Share file với tất cả emails được cấu hình
     */
    private async shareFileWithEmails(fileId: string): Promise<void> {
        for (const email of this.shareEmails) {
            await this.shareFile(fileId, email);
        }
    }

    /**
     * Lấy danh sách permissions của file
     */
    async getFilePermissions(
        fileId: string,
    ): Promise<drive_v3.Schema$Permission[]> {
        if (!this.isEnabled) return [];

        try {
            const response = await this.drive.permissions.list({
                fileId,
                fields: 'permissions(id, type, emailAddress, role)',
            });
            return response.data.permissions || [];
        } catch (error) {
            this.logger.error(`❌ Failed to get permissions for ${fileId}:`, error);
            return [];
        }
    }

    /**
     * Xóa permission share của file
     */
    async removeShare(fileId: string, permissionId: string): Promise<boolean> {
        if (!this.isEnabled) return false;

        try {
            await this.drive.permissions.delete({ fileId, permissionId });
            return true;
        } catch (error) {
            this.logger.error(
                `❌ Failed to remove permission ${permissionId}:`,
                error,
            );
            return false;
        }
    }

    /**
     * Lấy download URL trực tiếp của file
     * @param fileId ID của file trên Drive
     */
    async getDownloadUrl(fileId: string): Promise<string | null> {
        if (!this.isEnabled) return null;

        try {
            const response = await this.drive.files.get({
                fileId,
                fields: 'webContentLink',
            });
            return response.data.webContentLink || null;
        } catch (error) {
            this.logger.error(`❌ Failed to get download URL for ${fileId}:`, error);
            return null;
        }
    }

    /**
     * Sync share permissions khi server khởi động
     * - Thêm permissions cho emails mới trong config
     * - Xóa permissions của emails không còn trong config
     */
    async syncSharePermissions(): Promise<void> {
        if (!this.isEnabled || this.shareEmails.length === 0) return;

        this.logger.log('🔄 Syncing share permissions for backup files...');

        try {
            const files = await this.listFiles();

            for (const file of files) {
                const permissions = await this.getFilePermissions(file.id);
                const existingEmails = new Set(
                    permissions
                        .filter((p) => p.type === 'user' && p.emailAddress)
                        .map((p) => p.emailAddress!.toLowerCase()),
                );

                // Thêm permissions cho emails mới
                for (const email of this.shareEmails) {
                    if (!existingEmails.has(email.toLowerCase())) {
                        await this.shareFile(file.id, email);
                    }
                }

                // Xóa permissions của emails không còn trong config
                const configEmailsLower = new Set(
                    this.shareEmails.map((e) => e.toLowerCase()),
                );
                for (const perm of permissions) {
                    if (
                        perm.type === 'user' &&
                        perm.emailAddress &&
                        perm.role === 'reader' &&
                        !configEmailsLower.has(perm.emailAddress.toLowerCase())
                    ) {
                        await this.removeShare(file.id, perm.id!);
                        this.logger.log(
                            `🗑️ Removed share for ${perm.emailAddress} from ${file.name}`,
                        );
                    }
                }
            }

            this.logger.log('✅ Share permissions synced');
        } catch (error) {
            this.logger.error('❌ Failed to sync share permissions:', error);
        }
    }
}
