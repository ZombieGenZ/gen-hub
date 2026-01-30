# Organization Module

## Overview

Module `Organization` quản lý toàn bộ các thực thể và nghiệp vụ liên quan đến tổ chức (Organization) trong hệ thống. Đây là module lõi, nơi người dùng có thể tạo, quản lý, và tương tác trong không gian làm việc của họ. Module này hỗ trợ mô hình Multi-tenancy, cho phép một người dùng thuộc về nhiều tổ chức với các vai trò khác nhau.

## Architecture

Module bao gồm các thành phần chính:
- **OrganizationController**: Xử lý các HTTP requests liên quan đến tổ chức và thành viên.
- **OrganizationService**: Chứa logic nghiệp vụ chính (tạo, sửa, xóa, mời thành viên).
- **OrganizationRepository**: (Nếu có) Lớp truy cập dữ liệu.
- **PrismaService**: Tương tác trực tiếp với database.

### Data Flow
1. **Request** từ Client (Web/Mobile) -> **Controller** (Validate Data & Permissions)
2. **Controller** -> **Service** (Business Logic)
3. **Service** -> **Database** (Prisma)
4. **Service** -> **Notification/Email Service** (Gửi mail mời, thông báo)

## API Endpoints

### 1. Management

#### POST /organizations
**Summary**: Tạo tổ chức mới
**Description**: Tạo một tổ chức mới. Người tạo sẽ tự động trở thành Owner.
**Permissions**: Authenticated User

##### Request Body
**Schema**: `CreateOrganizationDto`
```json
{
  "name": "Công ty Công Nghệ Mới",
  "description": "Chuyên về AI và Blockchain",
  "tax_code": "0101234567",
  "address": "123 Đường ABC, Hà Nội",
  "phone": "0987654321",
  "email": "contact@tech.com",
  "website": "https://tech.com"
}
```

##### Responses
**201 Created**: Tạo thành công
```json
{
  "code": "ORGANIZATION_CREATE_SUCCESS",
  "message": "Tạo tổ chức thành công",
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Công ty Công Nghệ Mới",
    "slug": "cong-ty-cong-nghe-moi",
    "role": "OWNER"
  }
}
```

#### GET /organizations
**Summary**: Lấy danh sách tổ chức
**Description**: Lấy danh sách tổ chức công khai hoặc có thể tìm kiếm được (tuỳ config).
**Query Parameters**:
- `limit`: number (default: 10)
- `offset`: number (default: 0)
- `keyword`: string

#### GET /organizations/mine
**Summary**: Lấy danh sách tổ chức của tôi
**Description**: Lấy danh sách các tổ chức mà người dùng hiện tại là thành viên.
**Responses**:
```json
{
  "data": [
    {
      "id": "...",
      "name": "Org A",
      "user_role": "OWNER"
    },
    {
      "id": "...",
      "name": "Org B",
      "user_role": "MEMBER"
    }
  ]
}
```

#### GET /organizations/:id
**Summary**: Lấy chi tiết tổ chức
**Description**: Xem thông tin chi tiết một tổ chức.
**Permissions**: Thành viên của tổ chức hoặc Admin.

#### PUT /organizations/:id
**Summary**: Cập nhật thông tin tổ chức
**Description**: Cập nhật tên, mô tả, thông tin liên hệ.
**Permissions**: `organization.update`

#### DELETE /organizations/:id
**Summary**: Xóa tổ chức
**Description**: Xóa mềm tổ chức.
**Permissions**: `organization.delete` (Thường chỉ Owner)

### 2. Members Management

#### POST /organizations/:id/invite
**Summary**: Mời thành viên mới
**Description**: Gửi email mời thành viên tham gia tổ chức.
**Body**:
```json
{
  "email": "new.member@example.com",
  "role_ids": ["role-uuid-1"]
}
```

#### GET /organizations/:id/members
**Summary**: Lấy danh sách thành viên
**Permissions**: `organization.read`

#### DELETE /organizations/:id/members/:memberId
**Summary**: Xóa thành viên
**Permissions**: `organization.remove_member`

#### PUT /organizations/:id/members/:memberId/roles
**Summary**: Gán vai trò cho thành viên
**Description**: Cập nhật danh sách roles của một thành viên.

### 3. Invitation Handling

#### POST /organizations/invite/accept/:token
**Summary**: Chấp nhận lời mời
**Description**: Endpoint public (hoặc auth) để user chấp nhận tham gia qua token email.

#### POST /organizations/invite/reject/:token
**Summary**: Từ chối lời mời

## Validation Rules

- **Name**: Required, min 3 chars.
- **Tax Code**: Optional, format regex.
- **Email**: Valid email format.
- **Phone**: Valid phone format (VN).

## Response Codes

| Code | Message |
|------|---------|
| `ORGANIZATION_CREATE_SUCCESS` | Tạo tổ chức thành công |
| `ORGANIZATION_UPDATE_SUCCESS` | Cập nhật thành công |
| `ORGANIZATION_NOT_FOUND` | Không tìm thấy tổ chức |
| `ORGANIZATION_PERMISSION_DENIED` | Không có quyền thực hiện |
