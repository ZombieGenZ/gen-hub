# Notification, API & Plugin, FAQ & Feature Flag Modules Documentation

## Global Notification Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| POST | `/global-notifications` | `global-notification.create` | Tạo thông báo mới |
| GET | `/global-notifications` | Public | Danh sách thông báo |
| GET | `/global-notifications/active` | Public | Thông báo đang active |
| GET | `/global-notifications/:id` | Public | Chi tiết thông báo |
| PUT | `/global-notifications/:id` | `global-notification.update` | Cập nhật thông báo |
| DELETE | `/global-notifications/:id` | `global-notification.delete` | Xóa thông báo |
| DELETE | `/global-notifications/delete/many` | `global-notification.delete` | Xóa nhiều |

---

## API Key Verification Module

### Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api-keys/verify` | Public | Verify API key và lấy thông tin |

---

## Coze Plugin Module

### Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/coze-plugin/warehouse-pricing` | X-API-Key header | Tìm kiếm kho và giá |
| GET | `/coze-plugin/check-availability` | X-API-Key header | Kiểm tra tình trạng kho |
| GET | `/coze-plugin/rental-contract-terms` | X-API-Key header | Điều khoản hợp đồng |
| GET | `/coze-plugin/faq` | X-API-Key header | Lấy FAQ cho AI |

---

## FAQ Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| POST | `/faqs` | `faq.create` | Tạo FAQ |
| GET | `/faqs` | `faq.list` | Danh sách FAQ |
| GET | `/faqs/public` | Public | FAQ công khai |
| GET | `/faqs/:id` | `faq.read` | Chi tiết FAQ |
| PUT | `/faqs/:id` | `faq.update` | Cập nhật FAQ |
| DELETE | `/faqs/:id` | `faq.delete` | Xóa FAQ |
| DELETE | `/faqs/delete/many` | `faq.delete` | Xóa nhiều |

---

## Feature Flag Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/admin/feature-flags` | `featureflag.admin` | Danh sách flags |
| GET | `/admin/feature-flags/modules` | `featureflag.admin` | Danh sách modules |
| GET | `/admin/feature-flags/stats` | `featureflag.admin` | Thống kê |
| GET | `/admin/feature-flags/:id` | `featureflag.admin` | Chi tiết flag |
| GET | `/admin/feature-flags/:id/logs` | `featureflag.admin` | Logs của flag |
| PUT | `/admin/feature-flags/:id` | `featureflag.admin` | Toggle flag |
| PUT | `/admin/feature-flags/bulk/toggle` | `featureflag.admin` | Bulk toggle |
