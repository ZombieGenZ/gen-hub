/**
 * Interface kết quả upload file lên Backblaze B2
 */
export interface IB2UploadResult {
    key: string;
    fileName: string;
    fileSize: number;
    friendlyUrl: string;
}

/**
 * Interface thông tin file trên B2
 */
export interface IB2FileInfo {
    key: string;
    name: string;
    size: number;
    lastModified: Date;
}
