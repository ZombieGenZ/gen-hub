/**
 * Interface cho kết quả backup
 */
export interface IBackupResult {
    id: string;
    fileName: string;
    fileSize: number;
    driveFileId: string;
    driveFileUrl?: string;
    backupType: 'SCHEDULED' | 'MANUAL_API' | 'MANUAL_DISCORD';
    createdAt: Date;
    triggeredBy: string;
}

/**
 * Interface cho item trong danh sách backups
 */
export interface IBackupListItem {
    id: string;
    fileName: string;
    fileSize: number;
    backupType: 'SCHEDULED' | 'MANUAL_API' | 'MANUAL_DISCORD';
    createdAt: Date;
    triggeredBy: string;
}

/**
 * Interface cho query lấy danh sách backups
 */
export interface IBackupListQuery {
    limit?: number;
    offset?: number;
    keywords?: string;
}

/**
 * Interface cho kết quả export table
 */
export interface ITableExportResult {
    tableName: string;
    recordCount: number;
    filePath: string;
}
