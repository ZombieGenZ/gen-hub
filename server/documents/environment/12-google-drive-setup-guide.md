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

## 6. Tạo Folder và Cấp Quyền cho Service Account

### 6.1. Tạo Folder trên Google Drive

1. Truy cập [Google Drive](https://drive.google.com/)
2. Tạo folder mới để lưu backups (ví dụ: "Database Backups")

### 6.2. Cấp Quyền cho Service Account

> **⚠️ QUAN TRỌNG**: Service Account cần được cấp quyền **Editor** (hoặc cao hơn) trên folder để có thể upload, sửa, xóa file.

1. Right-click vào folder vừa tạo → **Share** (hoặc **Chia sẻ**)
2. Trong ô "Add people and groups", nhập **email của Service Account**:
   - Email có dạng: `backup-service@project-id.iam.gserviceaccount.com`
   - Lấy email này từ file JSON key đã download (trường `client_email`)
3. **Chọn quyền truy cập**:
   | Quyền | Mô tả | Có thể dùng? |
   |-------|-------|--------------|
   | **Viewer** (Người xem) | Chỉ xem file | ❌ Không đủ quyền |
   | **Commenter** (Người nhận xét) | Xem và bình luận | ❌ Không đủ quyền |
   | **Editor** (Người chỉnh sửa) | Xem, upload, sửa, xóa file | ✅ **Cần thiết** |

4. Click **Send** (hoặc **Gửi**) để hoàn tất việc chia sẻ

> **💡 Lưu ý**: 
> - Service Account là một "tài khoản ảo", không có inbox email nên không nhận được thông báo chia sẻ
> - Sau khi share, Service Account có thể truy cập folder ngay lập tức
> - Nếu bạn muốn Service Account có toàn quyền quản lý (bao gồm thay đổi quyền), hãy tick vào "Make owner" - nhưng **Editor** là đủ cho backup

### 6.3. Lấy Folder ID

Lấy Folder ID từ URL của folder:
```
https://drive.google.com/drive/folders/FOLDER_ID_HERE
                                        ^^^^^^^^^^^^^^
                                        Đây là Folder ID
```

Ví dụ: URL là `https://drive.google.com/drive/folders/1ABc_dEfGhIjKlMnOpQrStUvWxYz`
→ Folder ID là: `1ABc_dEfGhIjKlMnOpQrStUvWxYz`

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

### Error: "Service Accounts do not have storage quota"

> **⚠️ QUAN TRỌNG**: Service Accounts không có storage quota riêng. Khi upload file, file sẽ được tạo với owner là Service Account - mà Service Account không có quota!

**Giải pháp: Sử dụng Shared Drive (Team Drive)**

1. Truy cập [Google Drive](https://drive.google.com/)
2. Ở sidebar bên trái, click vào **Shared drives** (hoặc **Drive của nhóm**)
3. Click **New** → Tạo Shared Drive mới (ví dụ: "Database Backups")
4. Sau khi tạo xong, click vào biểu tượng **Manage members** (quản lý thành viên)
5. Thêm **email của Service Account** với role **Content Manager** hoặc **Contributor**
6. Copy **Folder ID** của Shared Drive từ URL:
   ```
   https://drive.google.com/drive/u/0/folders/SHARED_DRIVE_ID
                                              ^^^^^^^^^^^^^^^
                                              Đây là Shared Drive ID
   ```
7. Cập nhật `GOOGLE_DRIVE_BACKUP_FOLDER_ID` trong `.env` với Shared Drive ID này

> **💡 Lưu ý**: 
> - Shared Drive (Team Drive) chỉ có trong Google Workspace (không có trong tài khoản Google cá nhân miễn phí)
> - Nếu bạn dùng tài khoản cá nhân, bạn cần tạo folder trong Drive của bạn và share với Service Account - file sẽ được tính vào quota của bạn
