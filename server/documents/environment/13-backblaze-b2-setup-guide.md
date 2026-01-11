# Hướng dẫn cấu hình Backblaze B2 + Cloudflare CDN cho Database Backup

## Giới thiệu

Backblaze B2 kết hợp với Cloudflare CDN là giải pháp lưu trữ hiệu quả về chi phí:
- **Backblaze B2**: Chi phí lưu trữ cực thấp ($0.006/GB/tháng)
- **Cloudflare CDN**: Bandwidth miễn phí khi kết hợp với B2 (Bandwidth Alliance)
- **S3-compatible API**: Dễ dàng tích hợp với AWS SDK

## Bước 1: Tạo Backblaze B2 Account

1. Truy cập [Backblaze B2](https://www.backblaze.com/b2/sign-up.html)
2. Đăng ký tài khoản (10GB miễn phí)
3. Vào **B2 Cloud Storage** trong dashboard

## Bước 2: Tạo B2 Bucket

1. Click **Create a Bucket**
2. Cấu hình bucket:
   - **Bucket Name**: `genhub-backups` (phải unique toàn cầu)
   - **Files in Bucket Are**: `Private`
   - **Default Encryption**: `Enable`
   - **Object Lock**: `Disable`
3. Click **Create a Bucket**
4. Ghi lại **Endpoint** từ Bucket Details (ví dụ: `s3.us-west-004.backblazeb2.com`)

## Bước 3: Tạo Application Key

1. Vào **App Keys** trong sidebar
2. Click **Add a New Application Key**
3. Cấu hình key:
   - **Name of Key**: `genhub-backup-key`
   - **Allow access to Bucket(s)**: Chọn bucket vừa tạo
   - **Type of Access**: `Read and Write`
   - **File name prefix**: Để trống
4. Click **Create New Key**
5. **Lưu lại ngay**:
   - `keyID` → `B2_KEY_ID`
   - `applicationKey` → `B2_APPLICATION_KEY`

> ⚠️ **Lưu ý**: Application Key chỉ hiển thị một lần!

## Bước 4: Cấu hình Cloudflare CDN (Tùy chọn nhưng khuyến nghị)

### 4.1. Thêm domain vào Cloudflare
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Thêm subdomain cho backup (ví dụ: `backups.yourdomain.com`)

### 4.2. Cấu hình CNAME cho B2
1. Vào DNS settings
2. Thêm CNAME record:
   - **Type**: CNAME
   - **Name**: `backups` (hoặc subdomain bạn chọn)
   - **Target**: `f004.backblazeb2.com` (kiểm tra endpoint từ B2)
   - **Proxy status**: Proxied (đám mây cam)

### 4.3. Cấu hình Bucket cho Public Access
1. Vào B2 Bucket Settings
2. Thay đổi **Bucket Settings**:
   - Files in Bucket Are: `Public`
3. Ghi lại **Friendly URL**: `https://f004.backblazeb2.com/file/your-bucket-name`

### 4.4. Cấu hình Cloudflare Rules (Transform Rules)
Để URL đẹp hơn, tạo rewrite rule:
- Từ: `backups.yourdomain.com/*`
- Đến: `f004.backblazeb2.com/file/your-bucket-name/*`

## Bước 5: Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Backblaze B2 Configuration
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_BUCKET_NAME=genhub-backups
B2_CDN_URL=https://backups.yourdomain.com
```

### Giải thích các biến:

| Biến | Mô tả |
|------|-------|
| `B2_KEY_ID` | Application Key ID từ B2 |
| `B2_APPLICATION_KEY` | Application Key secret từ B2 |
| `B2_ENDPOINT` | S3-compatible endpoint (từ Bucket details) |
| `B2_BUCKET_NAME` | Tên bucket đã tạo |
| `B2_CDN_URL` | (Optional) Cloudflare CDN URL để download nhanh hơn |

## Bước 6: Kiểm tra kết nối

Khởi động server:

```bash
npm run start:dev
```

Nếu cấu hình đúng, bạn sẽ thấy:
```
✅ Backblaze B2 service initialized successfully
📦 Bucket: genhub-backups
🌐 CDN URL: https://backups.yourdomain.com
```

## Chi phí ước tính

### Backblaze B2 Pricing:
| Loại | Chi phí |
|------|---------|
| Storage | $0.006/GB/tháng |
| Downloads | $0.01/GB (miễn phí qua Cloudflare) |
| Class A Transactions | $0.004/10,000 requests |
| Class B Transactions | Miễn phí |

### Ví dụ chi phí:
- 30 bản backup x 100MB = 3GB storage
- Chi phí hàng tháng: **$0.018** (~420 VND)

## Troubleshooting

### Lỗi "Missing credentials"
- Kiểm tra B2_KEY_ID và B2_APPLICATION_KEY có đúng không
- Đảm bảo không có dấu cách thừa

### Lỗi "Access Denied"
- Kiểm tra Application Key có quyền Read/Write cho bucket
- Kiểm tra B2_ENDPOINT đúng region

### Lỗi "Bucket not found"
- Kiểm tra B2_BUCKET_NAME chính xác
- Bucket phải tồn tại trước khi server khởi động

### Download chậm
- Kiểm tra Cloudflare CDN đã được cấu hình đúng
- Kiểm tra DNS record đã propagate
