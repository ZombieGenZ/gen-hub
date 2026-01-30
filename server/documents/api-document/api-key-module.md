# Admin API Key Module

## Overview

Module `Admin API Key` cung cấp công cụ cho Quản trị viên hệ thống (System Admin) quản lý toàn bộ API Keys trên hệ thống. Admin có quyền xem, giám sát, điều chỉnh giới hạn (Rate Limit) hoặc thu hồi (Delete/Block) bất kỳ API Key nào của bất kỳ tổ chức nào.

## Architecture

Đây là module quản trị tập trung.
- **Scope**: Toàn hệ thống (Global).
- **Users**: System Admins.

## API Endpoints

Base URL: `/admin/api-keys`

### 1. Key Moderation

#### GET /
**Summary**: Danh sách toàn bộ API Keys
**Description**: Tìm kiếm và lọc API Keys trên toàn hệ thống.
**Query Parameters**:
- `organization_id`: Lọc key của một tổ chức cụ thể.
- `is_active`: Lọc theo trạng thái.
- `keyword`: Tìm theo tên, key prefix.
- `limit`/`offset`.

#### GET /:id
**Summary**: Chi tiết API Key
**Description**: Xem đầy đủ thông tin metadata của Key (trừ secret full).

#### PUT /:id
**Summary**: Cập nhật API Key
**Description**: Admin có thể cưỡng chế cập nhật trạng thái (Block key), hoặc thay đổi Rate Limit nếu phát hiện lạm dụng.

#### DELETE /:id
**Summary**: Xóa API Key
**Description**: Thu hồi key vĩnh viễn.

#### DELETE /delete/many
**Summary**: Xóa nhiều Keys

## Response Codes

| Code | Message |
|------|---------|
| `APIKEY_LIST_SUCCESS` | Lấy danh sách thành công |
| `APIKEY_UPDATE_SUCCESS` | Cập nhật thành công |
| `APIKEY_DELETE_SUCCESS` | Xóa thành công |
