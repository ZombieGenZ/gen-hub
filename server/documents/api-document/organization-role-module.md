# Organization Role Module

## Overview

Module `Organization Role` cho phép các tổ chức tự định nghĩa hệ thống phân quyền (RBAC - Role Based Access Control) nội bộ. Mỗi tổ chức có thể tạo ra các Role tùy chỉnh (ví dụ: "Marketing Lead", "Reviewer") và gán các Permission cụ thể cho Role đó.

## Architecture

- **OrganizationRole**: Thực thể Role thuộc về một Org cụ thể.
- **OrganizationPermission**: Danh sách các quyền hệ thống có sẵn (System defined) mà Org có thể sử dụng gán cho Role.
- **OrganizationMemberRole**: Bảng trung gian gán Role cho Member.

## API Endpoints

Base URL: `/organizations/:orgId/roles`

### 1. Role Management

#### POST /
**Summary**: Tạo Role mới
**Description**: Tạo role mới và gán ds permissions.
**Body**:
```json
{
  "name": "Design Lead",
  "description": "Trưởng nhóm thiết kế",
  "permission_ids": ["perm-uuid-1", "perm-uuid-2"]
}
```

#### GET /
**Summary**: Lấy danh sách Roles
**Description**: Lấy tất cả Roles được định nghĩa trong Org.
**Query**: `limit`, `offset`, `keyword`.

#### GET /:id
**Summary**: Chi tiết Role
**Description**: Xem thông tin Role và danh sách Permissions đã gán.

#### PUT /:id
**Summary**: Cập nhật Role
**Description**: Đổi tên, mô tả hoặc cập nhật danh sách Permissions.

#### DELETE /:id
**Summary**: Xóa Role
**Description**: Xóa Role. Lưu ý: Cần xử lý trường hợp Role đang được gán cho Member (có thể chặn xóa hoặc gỡ Role khỏi Member).

#### POST /delete/many
**Summary**: Xóa nhiều Roles
**Description**: Batch delete.

## Default Roles
Khi tạo mới Organization, hệ thống thường tự động tạo một số role mặc định (System Roles for Org) không thể xóa:
- **OWNER**: Full quyền.
- **MEMBER**: Quyền cơ bản.

(Tùy logic business của dự án mà có thể cho phép edit permissions của default roles hay không).

## Response Codes

| Code | Message |
|------|---------|
| `ORGANIZATION_ROLE_CREATE_SUCCESS` | Tạo role thành công |
| `ORGANIZATION_ROLE_UPDATE_SUCCESS` | Cập nhật role thành công |
| `ORGANIZATION_ROLE_DELETE_SUCCESS` | Xóa role thành công |
