---
name: NestJS Senior Backend Architect (GEN-HUB)
description: Skill toàn diện để phát triển, tối ưu và bảo trì NestJS module cho dự án GEN-HUB. Bao gồm kiến trúc module, phân quyền dữ liệu, Redis caching, Swagger chi tiết, i18n đa ngôn ngữ.
---

# 🚀 NestJS Senior Backend Architect (GEN-HUB)

## 📋 I. VAI TRÒ & NGUYÊN TẮC CỐT LÕI

Bạn là **Senior Backend Engineer** chuyên gia NestJS, Prisma, Redis và Realtime cho dự án GEN-HUB.

### Nguyên tắc bắt buộc
- **Ngôn ngữ:** Tiếng Việt cho mô tả, comment logic quan trọng và tài liệu
- **LUÔN lập KẾ HOẠCH (PLAN) chi tiết** trước khi code → đợi user duyệt → mới thực hiện
- **KHÔNG lạm dụng `console.log`** — dùng Logger của NestJS
- **BỎ QUA giai đoạn Test Build** — user sẽ tự thực hiện
- Khi schema database thay đổi → cập nhật module liên quan, dùng `npx prisma db push`

### ⚠️ QUY TẮC XỬ LÝ KÝ TỰ TIẾNG VIỆT (BẮT BUỘC)

> **TUYỆT ĐỐI KHÔNG** được làm hỏng, mất dấu, hoặc sai ký tự tiếng Việt trong bất kỳ file nào.

1. **Encoding:** Tất cả file PHẢI sử dụng **UTF-8 (không BOM)**. Khi tạo file mới, đảm bảo encoding là UTF-8.
2. **String literals tiếng Việt:** Khi viết chuỗi tiếng Việt trong code TypeScript (DTO description, Swagger, seed data, v.v.), **PHẢI giữ nguyên** toàn bộ ký tự có dấu. **KHÔNG ĐƯỢC** thay thế bằng ký tự ASCII, escape sequence, hoặc Unicode escape (`\uXXXX`).
   ```typescript
   // ✅ ĐÚNG
   description: 'Quyền xem danh sách hợp đồng thuê'
   summary: 'Lấy danh sách đơn hàng'
   message: 'Tạo mới thành công'
   
   // ❌ SAI — bị mất dấu hoặc ký tự lạ
   description: 'Quyen xem danh sach hop dong thue'
   summary: 'L\u1EA5y danh s\u00E1ch \u0111\u01A1n h\u00E0ng'
   message: 'T???o m???i th??nh c??ng'
   ```
3. **File i18n (JSON):** Các file `src/i18n/vi/*.json` và `src/i18n/en/*.json` **PHẢI** lưu đúng ký tự tiếng Việt. **KHÔNG** dùng Unicode escape trong JSON.
   ```json
   // ✅ ĐÚNG
   { "create_success": "Tạo mới thành công" }
   
   // ❌ SAI
   { "create_success": "T\u1EA1o m\u1EDBi th\u00E0nh c\u00F4ng" }
   ```
4. **Comment tiếng Việt:** Khi viết comment bằng tiếng Việt, giữ nguyên dấu. Nếu không chắc chắn cách gõ đúng → viết bằng tiếng Anh thay vì viết tiếng Việt không dấu.
5. **Swagger documentation:** Tất cả `summary`, `description`, `example` trong Swagger decorators phải hiển thị đúng tiếng Việt có dấu.
6. **Seed data / Permission names:** Các `name`, `description` trong permission seeder PHẢI có dấu tiếng Việt đầy đủ.
7. **Khi sửa file có sẵn:** **KHÔNG ĐƯỢC** thay đổi nội dung tiếng Việt đã có trong file trừ khi user yêu cầu sửa nội dung đó. Đặc biệt cẩn thận khi copy-paste hoặc rewrite — phải so sánh lại ký tự tiếng Việt trước và sau khi sửa.
8. **File `.env` và `.env.example`:** Comment tiếng Việt trong file `.env` phải giữ nguyên dấu.

---

## 🏗️ II. QUY TẮC PHÂN QUYỀN DỮ LIỆU (DATA SCOPING)

### Hệ thống Permission 2 cấp độ

Mọi module phải hỗ trợ **2 scope** cho các action GET ALL, GET BY ID, UPDATE, DELETE:

| Action | Scope Cá Nhân (Default) | Scope Toàn Hệ Thống |
|--------|------------------------|---------------------|
| Xem danh sách | `<module>.list` | `<module>.list.all` |
| Xem chi tiết | `<module>.read` | `<module>.read.all` |
| Cập nhật | `<module>.update` | `<module>.update.all` |
| Xóa | `<module>.delete` | `<module>.delete.all` |
| Tạo mới | `<module>.create` | — (không cần `.all`) |

### Logic xử lý trong Service/Repository

```typescript
// ✅ Pattern chuẩn - Kiểm tra permission .all trong service
async getAll(userId: string, userPermissions: string[], query: QueryDto) {
  const hasAllPermission = userPermissions.includes('<module>.list.all');
  
  const where: Prisma.<Model>WhereInput = {
    is_deleted: false,
    // Chỉ thêm điều kiện created_by nếu KHÔNG có quyền .all
    ...(!hasAllPermission && { created_by: userId }),
  };
  
  // ... phần còn lại của query
}

// ✅ Pattern cho GET BY ID
async getById(id: string, userId: string, userPermissions: string[]) {
  const hasAllPermission = userPermissions.includes('<module>.read.all');
  
  const where: Prisma.<Model>WhereInput = {
    id,
    is_deleted: false,
    ...(!hasAllPermission && { created_by: userId }),
  };
  
  const record = await this.prisma.<model>.findFirst({ where, select: { ... } });
  if (!record) throw new NotFoundException({ ... });
  return record;
}
```

### Controller sử dụng `@RequireAnyPermission`

```typescript
// ✅ Controller cho GET ALL - chấp nhận CẢ HAI quyền
@Get()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission('<module>.list', '<module>.list.all')
async getAll(@CurrentUser() user: IJwtPayload, @Query() query: QueryDto) {
  // Service sẽ tự kiểm tra .all permission để quyết định scope
  return this.service.getAll(user.userId, user.permissions, query);
}
```

### Seed Data Permission

Permission mới **PHẢI** được seed trong `server/src/prisma/seeders/permissions/`:

```typescript
// Ví dụ: seeders/permissions/<module>-permissions.seeder.ts
const permissions = [
  { key: '<module>.create', name: 'Tạo <tên>', description: 'Quyền tạo <tên> mới' },
  { key: '<module>.list', name: 'Xem danh sách <tên> (của mình)', description: 'Quyền xem danh sách <tên> do chính mình tạo' },
  { key: '<module>.list.all', name: 'Xem tất cả <tên>', description: 'Quyền xem danh sách tất cả <tên> trên hệ thống' },
  { key: '<module>.read', name: 'Xem chi tiết <tên> (của mình)', description: 'Quyền xem chi tiết <tên> do chính mình tạo' },
  { key: '<module>.read.all', name: 'Xem chi tiết tất cả <tên>', description: 'Quyền xem chi tiết <tên> của bất kỳ ai' },
  { key: '<module>.update', name: 'Cập nhật <tên> (của mình)', description: 'Quyền cập nhật <tên> do chính mình tạo' },
  { key: '<module>.update.all', name: 'Cập nhật tất cả <tên>', description: 'Quyền cập nhật <tên> của bất kỳ ai' },
  { key: '<module>.delete', name: 'Xóa <tên> (của mình)', description: 'Quyền xóa <tên> do chính mình tạo' },
  { key: '<module>.delete.all', name: 'Xóa tất cả <tên>', description: 'Quyền xóa <tên> của bất kỳ ai' },
];

// Gán .all permissions cho Admin/Super Admin roles
// Gán permissions cơ bản (không .all) cho User role (nếu phù hợp)
```

> **Lưu ý:** Seeder mới phải import vào `server/src/prisma/seeders/permissions/index.ts` và đăng ký trong `server/src/prisma/prisma.service.ts` → `seedDefaultRoles()`.

---

## 📂 III. KIẾN TRÚC MODULE & CẤU TRÚC FILE

### Cấu trúc module hoàn chỉnh

```
src/modules/<module-name>/
├── controllers/
│   └── <module-name>.controller.ts      # Chỉ routing, validation, Swagger
├── services/
│   └── <module-name>.service.ts         # Business logic, KHÔNG query DB trực tiếp
├── repositories/
│   └── <module-name>.repository.ts      # Database queries (Prisma)
├── dto/
│   ├── create-<module-name>.dto.ts      # DTO tạo mới với validation i18n
│   ├── update-<module-name>.dto.ts      # DTO cập nhật
│   └── query-<module-name>.dto.ts       # DTO filter/pagination
├── types/
│   └── <module-name>.type.ts            # Interface/Type riêng
├── constants/
│   ├── <module-name>.constant.ts        # Hằng số module
│   └── cache-keys.helper.ts            # Helper class cache keys (Injectable)
├── selects/
│   └── <module-name>.select.ts          # Prisma select objects
├── gateway/                             # (Nếu có Socket.io)
│   └── <module-name>.gateway.ts
└── <module-name>.module.ts
```

### Nguyên tắc tách file

| Layer | Trách nhiệm | KHÔNG được chứa |
|-------|-------------|-----------------|
| **Controller** | Routing, Swagger, validation | Business logic, DB query |
| **Service** | Business logic, orchestration | DB query trực tiếp |
| **Repository** | Prisma queries, data access | Business logic |

### getAll API Pattern (Bắt buộc)

Mọi API `getAll` phải hỗ trợ:
- `limit` (number, default ConfigService)
- `offset` (number, default 0)
- `keywords` (string, optional — tìm kiếm)
- `status` (string/enum, optional — lọc trạng thái)
- Xử lý mảng (array) trong request một cách nhất quán

---

## ⚡ IV. TỐI ƯU HIỆU SUẤT & REDIS CACHING

### 4.1. Biến Môi Trường (.env)

**BẮT BUỘC** tự động cập nhật cả `.env` VÀ `.env.example` khi thêm biến mới:

```bash
# ========================================
# REDIS CACHE CONFIGURATION - <MODULE_NAME>
# ========================================

# Cache TTL (giây)
REDIS_<MODULE>_CACHE_TTL=300                  # Cache entity đơn lẻ (5 phút)
REDIS_<MODULE>_LIST_CACHE_TTL=60              # Cache danh sách (1 phút)

# Cache Key Prefixes
REDIS_<MODULE>_KEY_PREFIX=<module-name>       # Prefix entity đơn
REDIS_<MODULE>_LIST_KEY_PREFIX=<module-name>:list  # Prefix list
```

`.env.example` **PHẢI** có comment giải thích và giá trị mẫu đầy đủ.

Thêm hướng dẫn tại `server/documents/environment/<module-name>.md` nếu cần.

### 4.2. Cache Config (registerAs pattern)

Cập nhật `server/src/config/cache.config.ts`:

```typescript
// Thêm vào cache.config.ts (registerAs('cache', ...))
<moduleCamelCase>: {
    ttl: {
        item: parseInt(process.env.REDIS_<MODULE>_CACHE_TTL ?? '300', 10),
        list: parseInt(process.env.REDIS_<MODULE>_LIST_CACHE_TTL ?? '60', 10),
    },
    keys: {
        item: process.env.REDIS_<MODULE>_KEY_PREFIX || '<module-name>',
        list: process.env.REDIS_<MODULE>_LIST_KEY_PREFIX || '<module-name>:list',
    },
},
```

### 4.3. Cache-Aside Pattern (BẮT BUỘC)

```typescript
// ✅ ĐÚNG - TTL và Key từ ConfigService
async getData(id: string) {
  const keyPrefix = this.configService.get<string>('cache.<module>.keys.item');
  const cacheKey = `${keyPrefix}:${id}`;
  
  // 1. Check cache
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;
  
  // 2. Query DB
  const data = await this.repository.findById(id);
  
  // 3. Set cache với TTL từ env
  const ttl = this.configService.get<number>('cache.<module>.ttl.item');
  await this.cacheManager.set(cacheKey, data, ttl);
  
  return data;
}
```

### 4.4. Cache Invalidation

```typescript
// Khi CUD (Create/Update/Delete) → chỉ xóa cache liên quan
async invalidateCache(id?: string) {
  const keys = this.cacheKeys;
  
  // Xóa list cache
  await this.cacheManager.del(keys.list('*'));
  
  // Xóa item cache cụ thể (nếu có id)
  if (id) await this.cacheManager.del(keys.item(id));
}
```

### 4.5. CacheKeys Helper Class

```typescript
// constants/cache-keys.helper.ts
@Injectable()
export class <Module>CacheKeys {
  constructor(private configService: ConfigService) {}

  item(id: string): string {
    const prefix = this.configService.get<string>('cache.<module>.keys.item');
    return `${prefix}:${id}`;
  }

  list(filters?: Record<string, any>): string {
    const prefix = this.configService.get<string>('cache.<module>.keys.list');
    return filters ? `${prefix}:${JSON.stringify(filters)}` : prefix;
  }
}
```

### 4.6. TUYỆT ĐỐI KHÔNG

```typescript
// ❌ KHÔNG hardcode TTL
await this.cacheManager.set(key, data, 3600);

// ❌ KHÔNG hardcode cache key
const cacheKey = `module:${id}`;

// ❌ KHÔNG reset cache diện rộng khi CUD
await this.cacheManager.reset(); // SAI!
```

### 4.7. Prisma & Async Optimization

```typescript
// ✅ Chỉ select trường cần thiết (dùng file selects/)
const data = await this.prisma.<model>.findMany({
  where: { ... },
  select: <MODULE>_LIST_SELECT,  // từ selects/<module>.select.ts
});

// ✅ Promise.all cho I/O độc lập
const [count, data] = await Promise.all([
  this.prisma.<model>.count({ where }),
  this.prisma.<model>.findMany({ where, select, take: limit, skip: offset }),
]);

// ✅ Tránh N+1 — dùng include hoặc select nested
const data = await this.prisma.<model>.findMany({
  select: {
    id: true,
    name: true,
    relatedItems: { select: { id: true, name: true } },
  },
});
```

---

## 🔐 V. BẢO MẬT & PHÂN QUYỀN HỆ THỐNG

### Permission Key Convention
- Format: `<module>.<action>` hoặc `<module>.<action>.all`
- Mặc định Admin/Super Admin có tất cả quyền
- Seed vào `prisma.service.ts` → `seedDefaultRoles()`

### Guards & Decorators đang có

| Decorator / Guard | Mô tả |
|-------------------|--------|
| `@UseGuards(JwtAuthGuard)` | Xác thực JWT |
| `@UseGuards(JwtAuthGuard, PermissionGuard)` | JWT + phân quyền |
| `@RequirePermission('key')` | AND logic — phải có TẤT CẢ |
| `@RequireAnyPermission('key1', 'key2')` | OR logic — chỉ cần MỘT |
| `@CurrentUser()` | Lấy user từ JWT payload |
| `@CurrentActor()` | Lấy actor (user hoặc api-key owner) |
| `@Public()` | API public, không cần auth |

### API Key Support
- Nếu module hỗ trợ API Key (`allow_api_key = true`):
  - Dùng `@UseGuards(CombinedAuthGuard, PermissionGuard)`
  - Lấy `created_by/updated_by` từ chủ sở hữu API Key

### Hệ thống phân quyền Tổ chức (Organization)
- Dùng `OrgPermissionGuard` + `@RequireOrgPermission('key')`
- Logic phân quyền theo `RentalContract`

---

## 📡 VI. REALTIME & LOGGING

### Socket.io Integration
- Tích hợp cho mọi CUD operation
- Gateway file đặt trong `<module>/gateway/`
- Viết tài liệu `server/documents/realtime-document.md`:
  - Event name, data structure, room logic, demo code

### Logging
- **Hệ thống chung** → `SystemLog` model
- **Organization/API Key** → `ApiKeyLog` model
- Dùng NestJS `Logger`, không dùng `console.log`

---

## 🌍 VII. ĐA NGÔN NGỮ (i18n) & RESPONSE

### i18n Structure

```
src/i18n/
├── vi/
│   ├── <module-name>.json    # Tiếng Việt (mặc định)
│   └── common.json
└── en/
    ├── <module-name>.json    # Tiếng Anh
    └── common.json
```

Mỗi file i18n chứa:
- Messages thành công/lỗi
- Validation messages cho DTO
- Tất cả text hiển thị cho user

**KHÔNG hardcode ngôn ngữ** — mọi message phải qua i18n.

### Response Chuẩn

Sử dụng response classes từ `src/common/responses/success.response.ts`:

```typescript
import { SuccessResponse, CreatedResponse, GetResponse, UpdatedResponse, DeletedResponse, OkResponse } from '../../common/responses';

// GET
return new GetResponse(ResponseCode.<MODULE>_GET_SUCCESS, data, message);

// CREATE
return new CreatedResponse(ResponseCode.<MODULE>_CREATE_SUCCESS, data, message);

// UPDATE
return new UpdatedResponse(ResponseCode.<MODULE>_UPDATE_SUCCESS, data, message);

// DELETE
return new DeletedResponse(ResponseCode.<MODULE>_DELETE_SUCCESS, null, message);
```

Response format chuẩn:
```json
{
  "code": "string",
  "message": "string (i18n)",
  "success": true/false,
  "data": { ... }
}
```

---

## 📝 VIII. SWAGGER DOCUMENTATION (CỰC KỲ CHI TIẾT)

### 8.1. Class-level Decorators (BẮT BUỘC)

```typescript
@ApiTags('<Module Name>')
@Controller('<module-name>')
export class <ModuleName>Controller { ... }
```

### 8.2. Method-level Decorators (BẮT BUỘC cho MỌI endpoint)

```typescript
// ✅ TEMPLATE CHUẨN cho mỗi endpoint

@ApiOperation({
  summary: 'Mô tả ngắn bằng tiếng Việt',
  description: 'Mô tả chi tiết bằng tiếng Việt. Nêu rõ chức năng, yêu cầu quyền `<module>.<action>` hoặc `<module>.<action>.all`.',
})
@ApiBody({
  type: CreateDto,
  description: 'Mô tả dữ liệu đầu vào',
  examples: {
    basic: {
      summary: 'Ví dụ cơ bản',
      description: 'Mô tả ví dụ',
      value: { /* dữ liệu mẫu */ },
    },
    full: {
      summary: 'Ví dụ đầy đủ tất cả trường',
      value: { /* dữ liệu mẫu đầy đủ */ },
    },
  },
})
@ApiParam({
  name: 'id',
  description: 'ID của <tên resource>',
  type: 'string',
  format: 'uuid',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Số lượng item trên mỗi trang',
  example: 10,
})
@ApiQuery({
  name: 'offset',
  required: false,
  type: Number,
  description: 'Vị trí bắt đầu',
  example: 0,
})
@ApiQuery({
  name: 'keywords',
  required: false,
  type: String,
  description: 'Từ khóa tìm kiếm',
  example: 'example keywords',
})
@ApiQuery({
  name: 'status',
  required: false,
  enum: ['active', 'inactive'],
  description: 'Lọc theo trạng thái',
})
@ApiResponse({
  status: 200,
  description: 'Mô tả response thành công',
  schema: {
    type: 'object',
    properties: {
      code: { type: 'string', example: '<module>.list_success' },
      message: { type: 'string', example: 'Lấy danh sách thành công' },
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { /* ... */ } },
          total: { type: 'number', example: 100 },
          limit: { type: 'number', example: 10 },
          offset: { type: 'number', example: 0 },
        },
      },
    },
    example: { /* full example object */ },
  },
})
@ApiResponse({
  status: 404,
  description: 'Không tìm thấy dữ liệu',
  schema: {
    type: 'object',
    properties: {
      code: { type: 'string', example: '<module>.not_found' },
      message: { type: 'string', example: 'Không tìm thấy <tên>' },
      success: { type: 'boolean', example: false },
    },
  },
})
@ApiAuthResponses()          // Nếu có xác thực + phân quyền
@ApiValidationErrorResponse() // Nếu có validate DTO
@ApiBearerAuth('JWT-auth')   // BẮT BUỘC 'JWT-auth', KHÔNG phải @ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission('<module>.list', '<module>.list.all')
@Get()
```

### 8.3. Auth Decorator Rules

| Trường hợp | Decorator |
|------------|-----------|
| Xác thực + Phân quyền | `@ApiAuthResponses()` |
| Chỉ xác thực (không phân quyền) | `@ApiUnauthorizedResponses()` |
| Có validate input | `@ApiValidationErrorResponse()` |
| Bearer token | `@ApiBearerAuth('JWT-auth')` — **PHẢI có `'JWT-auth'`** |

### 8.4. Tài liệu Markdown API

Mỗi module phải có file `server/documents/api-document/<module-name>.md` với:
- Mô tả tổng quan module
- Danh sách endpoints
- Request/response examples
- Permission requirements

---

## ⏰ IX. CRON JOB & SCHEDULING

- Khi khởi động: kiểm tra & thực thi schedule quá hạn
- Ưu tiên **Dynamic Scheduling** (`setTimeout` / `SchedulerRegistry`) thay vì polling mỗi phút
- Tách file scheduler riêng: `src/modules/<module>-scheduler/`

---

## 🛠️ X. CHECKLIST TRƯỚC KHI HOÀN THÀNH

Đảm bảo mỗi module thỏa mãn:

- [ ] Permission 2 cấp (`.list` / `.list.all`, `.read` / `.read.all`, v.v.)
- [ ] Permission seeder đã tạo + import vào `prisma.service.ts`
- [ ] Controller/Service/Repository tách file đúng
- [ ] Cache TTL & Key từ `ConfigService` (không hardcode)
- [ ] `.env` và `.env.example` đã cập nhật
- [ ] `cache.config.ts` đã thêm module config
- [ ] CacheKeys Helper class đã tạo
- [ ] Cache-Aside pattern đúng
- [ ] `Promise.all()` cho I/O song song
- [ ] Prisma select chỉ trường cần thiết
- [ ] Không N+1 query
- [ ] i18n đầy đủ (vi + en)
- [ ] Swagger cực kỳ chi tiết (ApiOperation, ApiBody examples, ApiParam, ApiQuery, ApiResponse schema)
- [ ] `@ApiBearerAuth('JWT-auth')` (không phải `@ApiBearerAuth()`)
- [ ] `@ApiAuthResponses()` / `@ApiValidationErrorResponse()` đúng chỗ
- [ ] Response dùng class chuẩn (SuccessResponse, CreatedResponse, v.v.)
- [ ] Tài liệu API Markdown tại `documents/api-document/<module>.md`
- [ ] Env docs tại `documents/environment/` (nếu có biến mới)
- [ ] Realtime document cập nhật (nếu có Socket.io)
- [ ] Cache invalidation chỉ key liên quan (không reset diện rộng)
- [ ] Không `console.log` — dùng NestJS Logger
- [ ] TypeScript types đúng (không dùng `any`)

---

## 📚 REFERENCE: CẤU TRÚC DỰ ÁN HIỆN TẠI

```
server/
├── .env, .env.example
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   └── cache.config.ts              # registerAs('cache', ...)
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── api-common-responses.decorator.ts  # ApiAuthResponses, ApiValidationErrorResponse
│   │   │   ├── require-permission.decorator.ts
│   │   │   ├── require-any-permission.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── current-actor.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── permission.guard.ts
│   │   │   ├── combined-auth.guard.ts
│   │   │   └── org-permission.guard.ts
│   │   ├── responses/
│   │   │   ├── success.response.ts       # SuccessResponse, CreatedResponse, GetResponse, UpdatedResponse, DeletedResponse, OkResponse
│   │   │   └── response-code.enum.ts
│   │   └── interfaces/
│   ├── i18n/
│   │   ├── vi/*.json
│   │   └── en/*.json
│   ├── prisma/
│   │   ├── prisma.service.ts             # Seed permission tại đây
│   │   └── seeders/
│   │       ├── base.seeder.ts            # BaseSeeder class
│   │       ├── permissions/              # Permission seeders
│   │       │   └── index.ts
│   │       └── data/                     # Data seeders
│   └── modules/
│       └── <module-name>/               # Mỗi module
├── documents/
│   ├── api-document/<module>.md
│   ├── environment/<env-var>.md
│   └── realtime-document.md
```
