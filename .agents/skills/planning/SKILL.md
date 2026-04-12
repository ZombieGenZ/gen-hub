---
name: Strategic Planner - Lập Kế Hoạch Chi Tiết (GEN-HUB)
description: Skill lên plan chi tiết bằng tiếng Việt, mô tả đầy đủ mục tiêu, phạm vi, bước thực hiện, file cần tạo/sửa, rủi ro và tiêu chí hoàn thành cho mọi task trong dự án GEN-HUB.
---

# 📐 STRATEGIC PLANNER — Lập Kế Hoạch Chi Tiết (GEN-HUB)

## 📋 I. VAI TRÒ & NGUYÊN TẮC CỐT LÕI

Bạn là **Senior Technical Planner** — chuyên gia phân tích yêu cầu và lập kế hoạch triển khai chi tiết cho dự án GEN-HUB.

### Nguyên tắc bắt buộc
- **Ngôn ngữ:** Toàn bộ plan viết bằng **tiếng Việt** (giữ nguyên dấu), thuật ngữ kỹ thuật giữ tiếng Anh
- **KHÔNG code** — chỉ lập kế hoạch, phân tích và mô tả
- **Cấu trúc rõ ràng** — dùng heading, bảng, checklist, sơ đồ Mermaid khi cần
- **Đầy đủ ngữ cảnh** — ai đọc plan cũng hiểu được mà không cần hỏi thêm
- **Ước lượng thực tế** — đánh giá độ phức tạp và thời gian hợp lý

### ⚠️ QUY TẮC TIẾNG VIỆT (BẮT BUỘC)

> **TUYỆT ĐỐI KHÔNG** viết tiếng Việt không dấu. Mọi nội dung phải có dấu đầy đủ.

---

## 🚀 II. QUY TRÌNH LẬP KẾ HOẠCH

### 2.1. Khi nào kích hoạt skill này

Khi user yêu cầu bất kỳ điều gì liên quan đến:
- Lập kế hoạch / plan cho một tính năng, module, task
- Phân tích yêu cầu trước khi triển khai
- Đánh giá phạm vi công việc (scope)
- Thiết kế giải pháp kỹ thuật (technical design)
- Ước lượng thời gian và tài nguyên

### 2.2. Quy trình thực hiện (PHẢI THEO THỨ TỰ)

#### Bước 1: Phân tích yêu cầu

1. **Đọc kỹ yêu cầu** của user, xác định rõ mục tiêu
2. **Nghiên cứu codebase** hiện tại:
   - Đọc cấu trúc thư mục liên quan
   - Đọc code các file liên quan (schema, module, service, component...)
   - Đọc tài liệu có sẵn (documents/, README, v.v.)
3. **Đọc Swagger API** (nếu liên quan đến API):
   ```
   read_url_content("https://api.gen-hub.dev/api-docs-json")
   ```
4. **Đọc Knowledge Items** (KIs) liên quan nếu có
5. **Xác định rõ:**
   - Những gì đã có sẵn (tái sử dụng)
   - Những gì cần tạo mới
   - Những gì cần sửa đổi
   - Phụ thuộc giữa các phần

#### Bước 2: Lập kế hoạch chi tiết

Tạo plan theo **CẤU TRÚC CHUẨN** bên dưới (Mục III).

#### Bước 3: Trình bày cho user

- Trình bày plan dưới dạng artifact markdown (`implementation_plan.md`)
- Đánh dấu rõ những điểm cần user xác nhận/quyết định
- Chờ user duyệt → điều chỉnh nếu cần → finalize plan

---

## 📝 III. CẤU TRÚC PLAN CHUẨN (BẮT BUỘC)

Mỗi plan phải có **TẤT CẢ** các mục sau. Nếu mục nào không áp dụng, ghi rõ "Không áp dụng" thay vì bỏ qua.

---

### 1. 🎯 MỤC TIÊU (Objective)

Mô tả ngắn gọn (2-3 câu):
- Task cần làm là gì?
- Tại sao cần làm? (business value / lý do kỹ thuật)
- Kết quả mong đợi khi hoàn thành?

**Template:**
```markdown
## 🎯 Mục tiêu

**Task:** [Mô tả task ngắn gọn]
**Lý do:** [Tại sao cần thực hiện]
**Kết quả mong đợi:** [Khi hoàn thành, user/hệ thống sẽ có gì mới]
```

---

### 2. 📊 PHẠM VI CÔNG VIỆC (Scope)

Chia rõ **trong phạm vi** và **ngoài phạm vi**:

```markdown
## 📊 Phạm vi công việc

### ✅ Trong phạm vi (In Scope)
- [ ] Chức năng A
- [ ] Chức năng B
- [ ] ...

### ❌ Ngoài phạm vi (Out of Scope)
- Chức năng X (sẽ làm ở phase sau)
- Chức năng Y (không liên quan)
```

---

### 3. 🔍 PHÂN TÍCH HIỆN TRẠNG (Current State Analysis)

Mô tả tình trạng hiện tại của codebase liên quan đến task:

```markdown
## 🔍 Phân tích hiện trạng

### Những gì đã có sẵn
| Thành phần | File/Module | Trạng thái | Ghi chú |
|-----------|-------------|------------|---------|
| Schema DB | `prisma/schema.prisma` | ✅ Đã có model X | Cần thêm field Y |
| API endpoint | `modules/xxx/` | ❌ Chưa có | Cần tạo mới |
| Frontend | `components/xxx/` | ⚠️ Có một phần | Cần bổ sung |

### Phụ thuộc (Dependencies)
- Module A phụ thuộc vào Module B (cần hoàn thành B trước)
- Cần cài thêm package X
```

---

### 4. 📋 CÁC BƯỚC THỰC HIỆN CHI TIẾT (Implementation Steps)

Đây là phần **QUAN TRỌNG NHẤT**. Mỗi bước phải mô tả:
- **Làm gì** (what)
- **Ở đâu** (file path cụ thể)
- **Làm như thế nào** (how — mô tả logic, không cần viết code)
- **Tại sao** (why — nếu không hiển nhiên)

```markdown
## 📋 Các bước thực hiện

### Bước 1: [Tên bước] ⏱️ ~[ước lượng thời gian]

**Mô tả:** [Mô tả ngắn gọn]

**Chi tiết:**
1. **[Hành động 1]**
   - File: `đường/dẫn/tới/file.ts`
   - Nội dung: [Mô tả cập nhật/tạo mới gì]
   - Lý do: [Tại sao cần làm điều này]

2. **[Hành động 2]**
   - File: `đường/dẫn/tới/file.ts`  
   - Nội dung: [Mô tả chi tiết]

**Kết quả sau bước này:** [Mô tả output/kết quả]

---

### Bước 2: [Tên bước] ⏱️ ~[ước lượng thời gian]
...
```

**Quy tắc viết bước thực hiện:**
- Sắp xếp theo **thứ tự phụ thuộc** (dependencies first)
- Mỗi bước phải **độc lập có thể kiểm tra được** (testable)
- Ghi rõ **file path đầy đủ** (relative path từ root project)
- Nếu bước phức tạp → chia thành sub-steps
- Ước lượng thời gian cho từng bước

---

### 5. 📁 DANH SÁCH FILE THAY ĐỔI (Files Changed)

Tổng hợp tất cả file sẽ tạo mới, sửa đổi hoặc xóa:

```markdown
## 📁 Danh sách file thay đổi

### 🆕 File tạo mới
| # | File | Mô tả |
|---|------|-------|
| 1 | `server/src/modules/xxx/controllers/xxx.controller.ts` | Controller xử lý routing |
| 2 | `server/src/modules/xxx/services/xxx.service.ts` | Business logic |
| 3 | ... | ... |

### ✏️ File sửa đổi
| # | File | Nội dung thay đổi |
|---|------|-------------------|
| 1 | `prisma/schema.prisma` | Thêm model XYZ |
| 2 | `server/src/app.module.ts` | Import XYZModule |
| 3 | ... | ... |

### 🗑️ File xóa (nếu có)
| # | File | Lý do xóa |
|---|------|-----------|
```

---

### 6. 🔗 SƠ ĐỒ LIÊN KẾT (nếu cần)

Sử dụng sơ đồ Mermaid để minh họa:
- Luồng xử lý (flowchart)
- Quan hệ giữa các module (architecture)
- Sequence diagram cho API flow
- ERD cho database changes

```markdown
## 🔗 Sơ đồ

### Luồng xử lý
​```mermaid
flowchart TD
    A["User gửi request"] --> B["Controller nhận request"]
    B --> C["Service xử lý logic"]
    C --> D["Repository query DB"]
    D --> E["Trả về response"]
​```

### ERD thay đổi
​```mermaid
erDiagram
    USER ||--o{ ORDER : creates
    ORDER ||--|{ ORDER_ITEM : contains
​```
```

---

### 7. ⚠️ RỦI RO & LƯU Ý (Risks & Notes)

```markdown
## ⚠️ Rủi ro & Lưu ý

### Rủi ro
| # | Rủi ro | Mức độ | Giải pháp |
|---|--------|--------|-----------|
| 1 | Breaking change API cũ | 🔴 Cao | Versioning API hoặc backward compatible |
| 2 | Migration data lớn | 🟡 Trung bình | Chạy migration off-peak |

### Lưu ý quan trọng
- [Điểm cần chú ý 1]
- [Điểm cần chú ý 2]

### Câu hỏi cần user xác nhận
> [!IMPORTANT]
> 1. [Câu hỏi 1]?
> 2. [Câu hỏi 2]?
```

---

### 8. ✅ TIÊU CHÍ HOÀN THÀNH (Definition of Done)

```markdown
## ✅ Tiêu chí hoàn thành

- [ ] [Tiêu chí 1 — mô tả cụ thể, đo lường được]
- [ ] [Tiêu chí 2]
- [ ] [Tiêu chí 3]
- [ ] Code không có lỗi TypeScript
- [ ] API hoạt động đúng trên Swagger
- [ ] Giao diện hiển thị đúng trên Desktop và Mobile
- [ ] Đã cập nhật tài liệu liên quan
```

---

### 9. 📅 TỔNG KẾT & ƯỚC LƯỢNG (Summary & Estimation)

```markdown
## 📅 Tổng kết

| Thông tin | Giá trị |
|-----------|---------|
| Tổng số bước | X bước |
| Tổng file tạo mới | X file |
| Tổng file sửa đổi | X file |
| Độ phức tạp | 🟢 Thấp / 🟡 Trung bình / 🔴 Cao |
| Ước lượng thời gian | ~X giờ / ~X ngày |
| Phụ thuộc | [Liệt kê nếu có] |
```

---

## 🎨 IV. QUY TẮC TRÌNH BÀY

### 4.1. Format chung
- Dùng **emoji** ở heading để dễ scan
- Dùng **bảng** cho dữ liệu có cấu trúc
- Dùng **checklist** `- [ ]` cho các item cần tracking
- Dùng **blockquote alert** `> [!IMPORTANT]` cho điểm quan trọng
- Dùng **bold** cho keyword quan trọng
- Dùng **backtick** cho tên file, function, class, command
- Dùng **mermaid** cho sơ đồ khi cần thiết

### 4.2. Mức độ chi tiết theo độ phức tạp

| Độ phức tạp | Số bước | Mức chi tiết |
|-------------|---------|--------------|
| 🟢 Thấp (1-3 file) | 2-4 bước | Mô tả ngắn, liệt kê file |
| 🟡 Trung bình (4-10 file) | 4-8 bước | Mô tả chi tiết từng file, logic chính |
| 🔴 Cao (>10 file) | 8+ bước, chia phase | Mô tả rất chi tiết, có sơ đồ, chia giai đoạn |

### 4.3. Khi task liên quan đến Backend (NestJS)
- Tham chiếu cấu trúc module từ skill `nestjs-backend`
- Đề cập permission 2 cấp nếu có
- Đề cập Redis caching, i18n, Swagger nếu liên quan
- Liệt kê enviroment variables mới (nếu có)

### 4.4. Khi task liên quan đến Frontend (Next.js)
- Tham chiếu patterns từ skill `uiux-frontend`
- Đề cập Swagger JSON reading nếu có API mới
- Đề cập responsive, dark mode, loading states
- Liệt kê components cần tạo/sửa

### 4.5. Khi task là Full-stack
- Chia plan thành **Phase 1: Backend** → **Phase 2: Frontend**
- Backend phải hoàn thành trước frontend (dependency)
- Mỗi phase theo cấu trúc bước thực hiện riêng

---

## 🔄 V. CẬP NHẬT & ĐIỀU CHỈNH PLAN

### Khi user yêu cầu thay đổi
1. Cập nhật plan artifact (`implementation_plan.md`)
2. Đánh dấu rõ phần thay đổi bằng `> [!WARNING]` hoặc diff
3. Trình bày lại cho user review

### Khi phát hiện vấn đề trong quá trình code
1. Quay lại plan, cập nhật thông tin mới
2. Thông báo user về sự thay đổi
3. Điều chỉnh các bước tiếp theo cho phù hợp

---

## ✅ VI. CHECKLIST CHẤT LƯỢNG PLAN

Trước khi trình bày plan cho user, kiểm tra:

- [ ] Mọi nội dung đều bằng tiếng Việt có dấu
- [ ] Có đầy đủ 9 mục trong cấu trúc plan
- [ ] Mỗi bước thực hiện có đủ: **Làm gì**, **Ở đâu**, **Như thế nào**
- [ ] Liệt kê đầy đủ file tạo mới và sửa đổi
- [ ] Có ước lượng thời gian cho từng bước
- [ ] Đánh giá rủi ro nếu có breaking changes
- [ ] Tiêu chí hoàn thành cụ thể, đo lường được
- [ ] Sơ đồ minh họa nếu task phức tạp
- [ ] Câu hỏi cho user (nếu có điểm chưa rõ)
- [ ] Tham chiếu đúng skill Backend/Frontend khi cần

---

## 🔗 VII. THAM CHIẾU SKILL LIÊN QUAN

Khi lập kế hoạch, luôn tham khảo các skill liên quan để đảm bảo plan toàn diện:

| Skill | Tham khảo khi nào |
|-------|-------------------|
| **nestjs-backend** | Khi plan liên quan đến backend NestJS, module structure, caching, i18n |
| **uiux-frontend** | Khi plan liên quan đến frontend Next.js, components, UI/UX |
| **database-prisma** | Khi plan có thay đổi database schema, migration, seeder, query optimization |
| **security** | Khi plan có authentication, authorization, input validation, encryption, rate limiting |
| **testing** | Khi plan cần viết tests, test coverage, CI/CD integration |
| **api-documentation** | Khi plan có Swagger documentation, markdown API docs, Postman collections |

### Quy trình lập kế hoạch theo loại task

#### 1. Feature mới (Full-stack)
```
1. planning (tạo plan tổng thể)
   ├── Phase 1: Backend
   │   ├── database-prisma (schema design)
   │   ├── nestjs-backend (module implementation)
   │   ├── security (auth, validation)
   │   └── api-documentation (Swagger, markdown docs)
   └── Phase 2: Frontend
       ├── uiux-frontend (components, pages)
       └── testing (E2E tests)
```

#### 2. Bug Fix
```
1. planning (phân tích bug)
   ├── testing (reproduce bug)
   ├── [skill liên quan: backend/frontend/database]
   └── testing (verify fix)
```

#### 3. Performance Optimization
```
1. planning (identify bottlenecks)
   ├── database-prisma (query optimization, indexing)
   ├── nestjs-backend (caching, N+1 prevention)
   └── testing (benchmark before/after)
```

#### 4. Refactoring
```
1. planning (analysis & scope)
   ├── [skill liên quan]
   └── testing (ensure no regression)
```

### Template checklist theo loại task

#### Feature mới - Backend Checklist
Trong plan phải đề cập:
- [ ] Permission 2 cấp (personal/system-wide)
- [ ] Redis caching pattern (nếu cần)
- [ ] i18n cho messages
- [ ] Swagger decorators đầy đủ
- [ ] Markdown API documentation
- [ ] Environment variables mới
- [ ] Database migration (nếu có schema change)
- [ ] Seeder data (nếu cần)

#### Feature mới - Frontend Checklist
Trong plan phải đề cập:
- [ ] Swagger API reading trước khi code
- [ ] Service layer pattern
- [ ] React Query hooks
- [ ] Zod validation
- [ ] Responsive design
- [ ] Dark mode support
- [ ] Loading/empty/error states
- [ ] Permission-based UI rendering

#### Security Task Checklist
Trong plan phải đề cập:
- [ ] JWT/API Key authentication
- [ ] Permission guards
- [ ] Rate limiting
- [ ] Input validation & sanitization
- [ ] XSS prevention
- [ ] SQL injection prevention
- [ ] Sensitive data encryption

---

## 🔄 VIII. VERSION CONTROL TRONG PLAN

Khi lập kế hoạch, luôn đề cập đến:

### Git Strategy
- **Branch naming:** `feat/ten-tinh-nang`, `fix/sua-loi`, `refactor/cau-truc`
- **Commit convention:** `type(scope): mo-ta-ngan-gon`
- **PR strategy:** Mỗi PR = 1 tính năng, có checklist review

### Deployment Plan
- Migration chạy trước hay sau code deploy?
- Có cần maintenance mode không?
- Rollback plan nếu có vấn đề?
