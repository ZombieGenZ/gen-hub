# Organization Update Request Module

## Overview

Module `Organization Update Request` quản lý quy trình phê duyệt các thay đổi thông tin quan trọng của tổ chức (ví dụ: Tên công ty, Mã số thuế, Giấy phép kinh doanh). Thay vì cho phép cập nhật trực tiếp, các thay đổi nhạy cảm sẽ tạo ra một "Yêu cầu cập nhật" (Update Request) và cần được phê duyệt bởi Quản trị viên hệ thống (System Admin).

## Architecture

Components:
- **OrganizationUpdateRequestController**: Admin API để quản lý các requests.
- **OrganizationUpdateRequestService**: Logic xử lý approve/reject và áp dụng thay đổi vào Organization.

### Workflow
1. **User (Org Owner)** gửi yêu cầu cập nhật thông tin qua `OrganizationController` (hoặc endpoint chuyên biệt tạo request).
2. Hệ thống tạo bản ghi `OrganizationUpdateRequest` với trạng thái `PENDING`.
3. **System Admin** xem danh sách các requests.
4. **System Admin** gọi API `approve` hoặc `reject`.
   - Nếu `approve`: Dữ liệu từ request sẽ được cập nhật vào bảng `Organization`. Trạng thái chuyển thành `APPROVED`.
   - Nếu `reject`: Trạng thái chuyển thành `REJECTED`, kèm lý do.

## API Endpoints

### 1. Management (System Admin)

#### GET /organization-update-requests
**Summary**: Lấy danh sách yêu cầu
**Description**: Admin xem danh sách các yêu cầu đang chờ hoặc lịch sử xử lý.
**Query**: `status`, `limit`, `offset`, `keyword` (tên org).

#### GET /organization-update-requests/:id
**Summary**: Xem chi tiết yêu cầu
**Description**: Xem thông tin thay đổi (Before/After snapshot).

#### POST /organization-update-requests/:id/approve
**Summary**: Phê duyệt yêu cầu
**Description**: Chấp nhận thay đổi. Dữ liệu sẽ được merge vào Organization chính thức.
**Permissions**: `organization.update_request.approve`

#### POST /organization-update-requests/:id/reject
**Summary**: Từ chối yêu cầu
**Body**:
```json
{
  "reason": "Thông tin mã số thuế không khớp với giấy phép upload."
}
```
**Permissions**: `organization.update_request.reject`

## Response Codes

| Code | Message |
|------|---------|
| `ORGANIZATION_UPDATE_REQUEST_LIST_SUCCESS` | Lấy danh sách thành công |
| `ORGANIZATION_UPDATE_REQUEST_APPROVE_SUCCESS`| Phê duyệt thành công |
| `ORGANIZATION_UPDATE_REQUEST_REJECT_SUCCESS` | Từ chối thành công |
| `ORGANIZATION_UPDATE_REQUEST_NOT_FOUND` | Không tìm thấy yêu cầu |
