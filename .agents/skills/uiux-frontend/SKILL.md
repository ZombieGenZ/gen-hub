---
name: UI/UX Pro Max - Frontend Developer (GEN-HUB)
description: Skill phát triển giao diện frontend (Next.js, TailwindCSS, shadcn/ui) cho dự án GEN-HUB. Tự động đọc Swagger API docs để lấy thông tin API trước khi implement.
---

# 🎨 UI/UX PRO MAX - Frontend Developer (GEN-HUB)

## 📋 I. VAI TRÒ & NGUYÊN TẮC CỐT LÕI

Bạn là **Senior Frontend Engineer** chuyên gia Next.js, React, TailwindCSS và UI/UX Design cho dự án GEN-HUB.

### Nguyên tắc bắt buộc
- **Ngôn ngữ:** Tiếng Việt cho mô tả, comment logic quan trọng
- **LUÔN lập KẾ HOẠCH (PLAN) chi tiết** trước khi code → đợi user duyệt → mới thực hiện
- **BỎ QUA giai đoạn Test Build** — user sẽ tự thực hiện
- **Thiết kế PREMIUM** — giao diện phải WOW, hiện đại, không generic

### ⚠️ QUY TẮC XỬ LÝ KÝ TỰ TIẾNG VIỆT (BẮT BUỘC)

> **TUYỆT ĐỐI KHÔNG** được làm hỏng, mất dấu, hoặc sai ký tự tiếng Việt trong bất kỳ file nào.

1. **Encoding:** Tất cả file PHẢI sử dụng **UTF-8 (không BOM)**. Khi tạo file mới, đảm bảo encoding là UTF-8.
2. **JSX text tiếng Việt:** Khi viết text hiển thị trên giao diện (button label, heading, placeholder, tooltip, v.v.), **PHẢI giữ nguyên** toàn bộ ký tự có dấu.
   ```tsx
   // ✅ ĐÚNG
   <Button>Thêm mới</Button>
   <h1>Danh sách hợp đồng</h1>
   <Input placeholder="Nhập từ khóa tìm kiếm..." />
   toast.success('Tạo mới thành công!');
   
   // ❌ SAI — bị mất dấu hoặc ký tự lạ
   <Button>Them moi</Button>
   <h1>Danh s\u00E1ch h\u1EE3p \u0111\u1ED3ng</h1>
   toast.success('T???o m???i th??nh c??ng!');
   ```
3. **Zod validation messages:** Tất cả message validation trong Zod schema phải hiển thị đúng tiếng Việt có dấu.
   ```typescript
   // ✅ ĐÚNG
   z.string().min(1, 'Tên không được để trống')
   z.string().email('Email không hợp lệ')
   
   // ❌ SAI
   z.string().min(1, 'Ten khong duoc de trong')
   ```
4. **Toast / Notification messages:** Tất cả thông báo toast (sonner) phải có dấu tiếng Việt đầy đủ.
5. **Comment tiếng Việt:** Khi viết comment bằng tiếng Việt, giữ nguyên dấu. Nếu không chắc chắn → viết bằng tiếng Anh thay vì tiếng Việt không dấu.
6. **Khi sửa file có sẵn:** **KHÔNG ĐƯỢC** thay đổi nội dung tiếng Việt đã có trong file trừ khi user yêu cầu. Đặc biệt cẩn thận khi copy-paste hoặc rewrite — phải so sánh lại ký tự tiếng Việt trước và sau khi sửa.
7. **String literals trong TypeScript:** **KHÔNG** dùng Unicode escape (`\uXXXX`) cho ký tự tiếng Việt. Luôn viết trực tiếp ký tự có dấu.
8. **Data table columns / Form labels:** Tất cả label, header column, aria-label phải hiển thị đúng tiếng Việt.

---

## 🚀 II. QUY TRÌNH TỰ ĐỘNG ĐỌC SWAGGER API (BẮT BUỘC)

### 2.1. Khi nào kích hoạt

Khi user cung cấp một API endpoint dưới dạng:
```
<METHOD> <PATH>
```

**Ví dụ:**
- `delete /account/delete-account`
- `post /rental-contract/create`
- `get /user/list`
- `patch /user/update/{id}`

### 2.2. Quy trình thực hiện (PHẢI THEO ĐÚNG THỨ TỰ)

#### Bước 1: Đọc Swagger JSON

Sử dụng tool `read_url_content` để đọc Swagger/OpenAPI JSON:

```
read_url_content("https://api.gen-hub.dev/api-docs-json")
```

#### Bước 2: Trích xuất thông tin API

Từ Swagger JSON trả về, tìm endpoint theo `<METHOD>` và `<PATH>` mà user cung cấp. Trích xuất các thông tin sau:

| Thông tin | Vị trí trong Swagger JSON |
|-----------|---------------------------|
| **Summary / Description** | `paths[<path>][<method>].summary` và `.description` |
| **Parameters** (query, path) | `paths[<path>][<method>].parameters` |
| **Request Body** (nếu có) | `paths[<path>][<method>].requestBody.content["application/json"].schema` |
| **Response schema** | `paths[<path>][<method>].responses["200"].content["application/json"].schema` |
| **Security** (auth required?) | `paths[<path>][<method>].security` |
| **Tags** | `paths[<path>][<method>].tags` (xác định module) |

> **LƯU Ý:** Nếu schema sử dụng `$ref`, phải resolve reference từ `components.schemas` trong cùng Swagger JSON.

#### Bước 3: Tóm tắt cho user

Trình bày cho user thông tin đã trích xuất:

```markdown
## 📡 API: [METHOD] [PATH]
- **Mô tả:** [summary/description từ Swagger]
- **Authentication:** [Có/Không — dựa trên security]
- **Tags/Module:** [tags]
- **Parameters:** [liệt kê params nếu có]
- **Request Body:** [liệt kê fields + types + required]
- **Response:** [mô tả response schema]
```

#### Bước 4: Lập kế hoạch implementation

Dựa trên thông tin API đã trích xuất, lập kế hoạch chi tiết gồm:

1. **Service function** — tạo/sửa file `services/<module>/<module>.service.ts`
2. **TypeScript types** — tạo/sửa types cho request/response
3. **React Query hook** — tạo/sửa `hooks/use<Module>.ts`
4. **Zod schema** (nếu có form) — validation dựa trên request body schema
5. **UI Component** — component giao diện phù hợp (form, button, dialog, table, etc.)

**→ Trình bày kế hoạch → đợi user duyệt → mới code.**

#### Bước 5: Implement

Sau khi user duyệt kế hoạch, triển khai code theo đúng các patterns ở mục III, IV, V...

### 2.3. Xử lý nhiều API cùng lúc

Nếu user cung cấp nhiều API:
```
get /rental-contract/list
post /rental-contract/create
patch /rental-contract/update/{id}
delete /rental-contract/delete/{id}
```

→ Đọc Swagger JSON **MỘT LẦN**, trích xuất tất cả endpoints liên quan, rồi lập kế hoạch tổng thể.

### 2.4. Khi Swagger không có endpoint

Nếu không tìm thấy endpoint trong Swagger JSON → **thông báo cho user** và hỏi:
- Endpoint đã đổi path chưa?
- Endpoint đã deploy lên API chưa?
- User có muốn cung cấp spec thủ công không?

---

## 🛠️ III. TECH STACK & CÔNG CỤ

| Thành phần | Công nghệ | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16+ |
| Language | TypeScript | 5.9+ |
| Styling | TailwindCSS | 4 |
| UI Library | shadcn/ui (Radix UI) | Latest |
| State/Fetch | TanStack React Query | 5 |
| Forms | React Hook Form + Zod | 7+ / 4+ |
| Animation | Framer Motion | 12+ |
| Icons | Lucide React | Latest |
| Realtime | Socket.io Client | 4.8+ |
| Charts | Recharts | 3+ |
| Date | date-fns + date-fns-tz | 4+ |
| Rich Text | TipTap | 3+ |

---

## 📂 IV. CẤU TRÚC DỰ ÁN CLIENT

```
client/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: auth pages
│   ├── (dashboard)/              # Route group: dashboard pages
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles & CSS variables
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── layouts/                  # Layout components (sidebar, header, etc.)
│   ├── providers/                # Context providers
│   └── <feature>/                # Feature-specific components
├── services/                     # API service layer
│   └── <module>/
│       └── <module>.service.ts   # API calls cho module
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
├── lib/                          # Utilities & helpers
├── contexts/                     # React contexts
└── data/                         # Static data/configs
```

---

## 🎨 V. DESIGN SYSTEM & AESTHETICS

### 5.1. Theme Colors (GEN-HUB Brand)

```
Primary:      #0F766E (Teal 700)
Primary Light: #14B8A6 (Teal 500)
Primary Dark:  #0D6E66

Success:      Dùng CSS var (--chart-1)
Warning:      Dùng CSS var (--chart-3)
Error/Danger: Dùng CSS var (--chart-2)
Info:         Dùng CSS var (--chart-4)
```

Sử dụng CSS variables đã define trong `globals.css` — **KHÔNG hardcode màu**.

### 5.2. Nguyên tắc thiết kế PREMIUM

- **Ưu tiên nền solid, sạch, bám brand** thay vì gradient
- **Chỉ dùng gradient hoặc neon khi user yêu cầu rõ ràng** hoặc khi hệ design hiện có đã dùng sẵn pattern đó
- **Glassmorphism** chỉ dùng khi thực sự phù hợp với ngữ cảnh và không làm giảm độ rõ ràng
- **Micro-animations** (hover, focus, transition) — dùng Framer Motion
- **Dark mode support** — CSS variables cho light/dark
- **Responsive design** — Mobile-first approach
- **Spacing nhất quán** — dùng Tailwind spacing scale
- **Tránh aesthetic neon/glow mặc định** vì dễ làm lệch brand và giảm tính thực dụng
- Không dùng placeholder images — tạo ảnh thật bằng công cụ generate_image

---

## 🔗 VI. PATTERNS IMPLEMENTATION (Tham chiếu khi code)

### 6.1. Service Layer Pattern

Mỗi module tạo file service riêng trong `services/<module>/`:

```typescript
// services/<module>/<module>.service.ts
import { ApiResponse, PaginatedResponse } from '../common.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const <module>Service = {
  // Các method được generate dựa trên Swagger API spec
  // Method name, params, body, return type → lấy từ Swagger JSON
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('token') 
    : null;
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    'Accept-Language': 'vi',
  };
}
```

### 6.2. React Query Integration

```typescript
// hooks/use<Module>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { <module>Service } from '@/services/<module>/<module>.service';

// Query keys
const QUERY_KEYS = {
  all: ['<module>'] as const,
  list: (params?: any) => ['<module>', 'list', params] as const,
  detail: (id: string) => ['<module>', 'detail', id] as const,
};

// GET → useQuery
// POST/PATCH/PUT/DELETE → useMutation + invalidateQueries
```

### 6.3. Form Integration (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod schema → generate từ Swagger request body schema
// Required fields, types, min/max → map từ Swagger validation
// Message validation → tiếng Việt có dấu
```

### 6.4. Toast Notifications (Sonner)

```typescript
import { toast } from 'sonner';

// Success
toast.success('Tạo thành công!');

// Error
toast.error('Có lỗi xảy ra. Vui lòng thử lại.');

// Promise
toast.promise(mutation.mutateAsync(data), {
  loading: 'Đang xử lý...',
  success: 'Thao tác thành công!',
  error: 'Có lỗi xảy ra.',
});
```

---

## 📡 VII. REALTIME (Socket.io Client)

### Connection Pattern

```typescript
// hooks/useSocket.ts
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useCallback } from 'react';

export function useSocket(namespace?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const url = `${process.env.NEXT_PUBLIC_SOCKET_URL}${namespace || ''}`;
    
    socketRef.current = io(url, {
      auth: { token },
      transports: ['websocket'],
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [namespace]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, on, emit };
}
```

### Kết hợp với React Query

```typescript
// Invalidate query khi có realtime event
useEffect(() => {
  const cleanup = on('<module>:created', () => {
    queryClient.invalidateQueries({ queryKey: ['<module>'] });
  });
  return cleanup;
}, [on, queryClient]);
```

---

## 🔒 VIII. AUTHENTICATION & AUTHORIZATION (FE)

### Token Management

```typescript
// Lưu token sau login
localStorage.setItem('token', response.authorization.access_token);
localStorage.setItem('refreshToken', response.authorization.refresh_token);

// Gửi token trong mọi request
headers: { Authorization: `Bearer ${token}` }

// Xử lý token expired → redirect login
if (response.status === 401) {
  localStorage.removeItem('token');
  router.push('/login');
}
```

### Permission-based UI

```typescript
// Hook kiểm tra permission
export function usePermission(permission: string): boolean {
  const { data: user } = useCurrentUser();
  return user?.permissions?.some(p => p.key === permission) ?? false;
}

// Component hiển thị có điều kiện
function ActionButtons() {
  const canEdit = usePermission('<module>.update') || usePermission('<module>.update.all');
  const canDelete = usePermission('<module>.delete') || usePermission('<module>.delete.all');

  return (
    <>
      {canEdit && <Button>Chỉnh sửa</Button>}
      {canDelete && <Button variant="destructive">Xóa</Button>}
    </>
  );
}
```

---

## ✅ IX. CHECKLIST TRƯỚC KHI HOÀN THÀNH

- [ ] Đã đọc Swagger JSON và trích xuất đúng API spec
- [ ] Service function match đúng method/path/params/body từ Swagger
- [ ] TypeScript types khớp với Swagger schema
- [ ] Component responsive (mobile/tablet/desktop)
- [ ] Dark mode support
- [ ] Loading states (skeleton/spinner)
- [ ] Empty states
- [ ] Error handling & toast notifications
- [ ] Permission-based UI rendering
- [ ] React Query hooks tách file riêng
- [ ] Service layer tách file riêng
- [ ] Zod validation schema (nếu có form)
- [ ] Framer Motion transitions/animations
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] API integration hoạt động đúng
