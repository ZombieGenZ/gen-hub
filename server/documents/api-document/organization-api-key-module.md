# Organization API Key Module

## Overview

Module `Organization API Key` cung cấp khả năng tạo và quản lý API Keys cho tổ chức. Các API Key này được sử dụng cho việc tích hợp hệ thống (Server-to-Server integration), cho phép các ứng dụng bên thứ 3 truy cập tài nguyên của tổ chức thay mặt cho tổ chức đó với các quyền hạn được giới hạn.

## Security Best Practices
- **Secret Key hiển thị 1 lần**: Key đầy đủ chỉ được trả về ngay sau khi tạo thành công. Sau đó hệ thống chỉ lưu hash hoặc hiển thị mask (ví dụ: `sk_live_...a1b2`).
- **Permissions**: API Key phải được gán quyền cụ thể (Least Privilege).
- **Rate Limit**: Mỗi Key có thể cấu hình giới hạn số request (RPM/RPS).
- **Allowed Origins/IPs**: (Advanced) Giới hạn nguồn gọi API.

## API Endpoints

Base URL: `/organizations/:orgId/api-keys`

### 1. Key Management

#### POST /
**Summary**: Tạo API Key mới
**Description**: Tạo key mới. Response trả về `key` string **duy nhất một lần này**. Client cần lưu lại ngay.
**Body**:
```json
{
  "name": "Integration Server A",
  "description": "Key cho server sync data",
  "permission_ids": ["perm-read-data"],
  "rate_limit_ttl": 60,
  "rate_limit_max": 1000
}
```
**Response**:
```json
{
  "id": "...",
  "key": "sk_live_very_long_secret_string",
  "..."
}
```

#### GET /
**Summary**: Lấy danh sách Keys
**Description**: Trả về danh sách keys (Masked key secret).

#### GET /:id
**Summary**: Chi tiết Key
**Description**: Xem thông tin metadata, permissions, rate limits. Không trả về full secret key.

#### PUT /:id
**Summary**: Cập nhật Key
**Description**: Update name, description, permissions, rate limits, status (Active/Inactive).

#### POST /:id/reset
**Summary**: Tạo lại Secret Key (Roll keys)
**Description**: Vô hiệu hóa secret cũ và sinh secret mới cho Key ID này. Dùng khi nghi ngờ lộ key.

#### DELETE /:id
**Summary**: Xóa Key
**Description**: Thu hồi hoàn toàn Key. Requests sử dụng key này sẽ bị 401 Unauthorized ngay lập tức.

## Response Codes

| Code | Message |
|------|---------|
| `APIKEY_CREATE_SUCCESS` | Tạo key thành công |
| `APIKEY_UPDATE_SUCCESS` | Cập nhật key thành công |
| `APIKEY_DELETE_SUCCESS` | Xóa key thành công |
