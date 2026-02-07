# Warning & Penalty Modules Documentation

## Warning Category Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| POST | `/admin/warning-categories` | `warning-category.create` | Tạo danh mục mới |
| GET | `/admin/warning-categories` | `warning-category.list` | Danh sách danh mục |
| GET | `/admin/warning-categories/all` | `warning-category.list` | Tất cả danh mục active |
| GET | `/admin/warning-categories/:id` | `warning-category.list` | Chi tiết danh mục |
| PUT | `/admin/warning-categories/:id` | `warning-category.update` | Cập nhật danh mục |
| DELETE | `/admin/warning-categories/:id` | `warning-category.delete` | Xóa danh mục |
| DELETE | `/admin/warning-categories` | `warning-category.delete` | Xóa nhiều |

---

## Warn Penalty Module

### Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| POST | `/admin/warn-penalties` | `warn-penalty.create` | Tạo quy tắc mới |
| GET | `/admin/warn-penalties` | `warn-penalty.list` | Danh sách quy tắc |
| GET | `/admin/warn-penalties/active` | `warn-penalty.list` | Quy tắc đang active |
| GET | `/admin/warn-penalties/:id` | `warn-penalty.read` | Chi tiết quy tắc |
| PUT | `/admin/warn-penalties/:id` | `warn-penalty.update` | Cập nhật quy tắc |
| DELETE | `/admin/warn-penalties/:id` | `warn-penalty.delete` | Xóa quy tắc |
| DELETE | `/admin/warn-penalties` | `warn-penalty.delete` | Xóa nhiều |
