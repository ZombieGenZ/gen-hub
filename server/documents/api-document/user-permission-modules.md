# User & Permission Modules Documentation

## Roles Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| POST | `/roles` | `role.create` | Tạo role mới |
| GET | `/roles` | `role.read` | Danh sách roles |
| GET | `/roles/:id` | `role.read` | Chi tiết role |
| PUT | `/roles/:id` | `role.update` | Cập nhật role |
| DELETE | `/roles/:id` | `role.delete` | Xóa role |
| DELETE | `/roles/delete/many` | `role.delete` | Xóa nhiều |

---

## Permissions Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/permissions/modules` | `permission.read` | Danh sách modules |
| GET | `/permissions` | `permission.read` | Danh sách permissions |
| POST | `/permissions/by-roles` | `permission.read` | Permission IDs theo roles |

---

## User Management Module (Admin)

### Endpoints Quản Lý Users

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/admin/users` | `user-management.list` | Danh sách users |
| GET | `/admin/users/stats` | `user-management.list` | Thống kê |
| GET | `/admin/users/:id` | `user-management.read` | Chi tiết user |

### Endpoints Ban/Unban

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| POST | `/admin/users/:id/ban` | `user-management.ban` | Ban user |
| POST | `/admin/users/:id/unban` | `user-management.unban` | Unban user |
| POST | `/admin/users/bulk/ban` | `user-management.ban` | Ban nhiều |
| POST | `/admin/users/bulk/unban` | `user-management.unban` | Unban nhiều |

### Endpoints Warnings

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/admin/users/:id/warnings` | `user-management.warn` | Danh sách warnings |
| POST | `/admin/users/:id/warn` | `user-management.warn` | Thêm warning |
| POST | `/admin/users/:id/unwarn/:warningId` | `user-management.unwarn` | Gỡ warning |
| DELETE | `/admin/users/:id/warnings` | `user-management.unwarn` | Xóa tất cả warnings |

### Endpoints Sessions

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/admin/users/:id/sessions` | `user-management.sessions` | Danh sách sessions |
| DELETE | `/admin/users/:id/sessions/:sessionId` | `user-management.sessions` | Hủy session |
| DELETE | `/admin/users/:id/sessions` | `user-management.sessions` | Hủy tất cả |

### Endpoints Roles/Permissions

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/admin/users/:id/roles-permissions` | `user-management.read` | Lấy roles/permissions |
| PUT | `/admin/users/:id/roles-permissions` | `user-management.update` | Gán roles/permissions |

### Endpoints Delete/Download

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| DELETE | `/admin/users/:id` | `user-management.delete` | Xóa user |
| DELETE | `/admin/users/bulk/delete` | `user-management.delete` | Xóa nhiều |
| GET | `/admin/users/:id/download` | `user-management.download` | Download data |
| POST | `/admin/users/bulk/download` | `user-management.download` | Download nhiều |
| GET | `/admin/users/download/all` | `user-management.download` | Download tất cả |
