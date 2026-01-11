# Google Drive API Setup Guide

Hướng dẫn thiết lập Google Drive API để sử dụng tính năng upload file lên Google Drive.

## 1. Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Nhập tên project (ví dụ: "GEN-HUB Backup")
4. Click "Create"

## 2. Enable Google Drive API

1. Vào menu **APIs & Services** → **Library**
2. Tìm kiếm "Google Drive API"
3. Click **Enable**

## 3. Tạo Service Account

1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Điền thông tin:
   - Service account name: `gen-hub-backup-service`
   - Description: `Service account for gen-hub backup`
4. Click **Create and Continue**
5. Bỏ qua bước "Grant access" → Click **Done**

## 4. Tạo Key cho Service Account

1. Click vào service account vừa tạo
2. Vào tab **Keys**
3. Click **Add Key** → **Create new key**
4. Chọn **JSON** → Click **Create**
5. File JSON sẽ được download tự động

## 5. Lấy thông tin từ JSON Key

Mở file JSON, sao chép các giá trị sau:

```json
{
  "client_email": "backup-service@project-id.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

## 6. Tạo Folder trên Google Drive

1. Truy cập [Google Drive](https://drive.google.com/)
2. Tạo folder mới để lưu backups (ví dụ: "Database Backups")
3. Right-click folder → **Share**
4. Thêm email của Service Account (`backup-service@project-id.iam.gserviceaccount.com`)
5. Đặt quyền **Editor**
6. Lấy Folder ID từ URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```

## 7. Cấu hình .env

Thêm các biến sau vào file `.env`:

```env
# Google Drive Backup Configuration
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=backup-service@project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_BACKUP_FOLDER_ID=your_folder_id_here

# Backup Settings
BACKUP_INTERVAL_SECONDS=86400
BACKUP_MAX_COUNT=30
BACKUP_COMPRESSION_TYPE=zip
BACKUP_PASSWORD=your_secure_password

# Security Key for API/Discord trigger
BACKUP_TRIGGER_KEY=your_random_key_here

# Share backups with these emails (comma-separated)
BACKUP_SHARE_EMAILS=admin@company.com

# Discord Integration
DISCORD_BACKUP_CHANNEL_ID=your_channel_id
DISCORD_BACKUP_ROLE_IDS=role_id_1,role_id_2
```

## 8. Verify Setup

Khởi động server, nếu thấy log sau là thành công:

```
✅ Google Drive service initialized successfully
🔄 Syncing share permissions for backup files...
✅ Share permissions synced
📅 Scheduled backup every 86400 seconds
```

## Troubleshooting

### Error: "Failed to initialize Google Drive service"
- Kiểm tra `GOOGLE_DRIVE_PRIVATE_KEY` có đúng format không (escape `\n` characters)
- Đảm bảo service account email chính xác

### Error: "Failed to upload backup"
- Kiểm tra service account đã được share folder với quyền Editor chưa
- Kiểm tra `GOOGLE_DRIVE_BACKUP_FOLDER_ID` chính xác
