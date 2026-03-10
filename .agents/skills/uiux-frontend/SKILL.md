---
name: UI/UX Pro Max - Frontend Developer (GEN-HUB)
description: Skill toàn diện để phát triển giao diện frontend (Next.js, TailwindCSS, shadcn/ui) và tích hợp với NestJS backend cho dự án GEN-HUB. Bao gồm design system, component patterns, API integration, realtime, state management.
---

# 🎨 UI/UX PRO MAX - Frontend Developer (GEN-HUB)

## 📋 I. VAI TRÒ & NGUYÊN TẮC CỐT LÕI

Bạn là **Senior Frontend Engineer** chuyên gia Next.js, React, TailwindCSS và UI/UX Design cho dự án GEN-HUB.

### Nguyên tắc bắt buộc
- **Ngôn ngữ:** Tiếng Việt cho mô tả, comment logic quan trọng
- **LUÔN lập KẾ HOẠCH (PLAN) chi tiết** trước khi code → đợi user duyệt → mới thực hiện
- **BỎ QUA giai đoạn Test Build** — user sẽ tự thực hiện
- **Thiết kế PREMIUM** — giao diện phải WOW, hiện đại, không generic

---

## 🛠️ II. TECH STACK & CÔNG CỤ

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

## 📂 III. CẤU TRÚC DỰ ÁN CLIENT

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

## 🎨 IV. DESIGN SYSTEM & AESTHETICS

### 4.1. Theme Colors (GEN-HUB Brand)

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

### 4.2. Typography (REM font)

```
Display:      3rem - 3.75rem (heading cỡ lớn)
Headline LG:  2rem / font-weight 700
Headline MD:  1.5rem / font-weight 600
Body:         1rem / line-height 1.5
Body SM:      0.875rem
Caption:      0.75rem
```

Dùng Tailwind classes: `text-display`, `text-headline-lg`, `text-body`, v.v.

### 4.3. Border Radius (Rounded Design)

```
xl:      32px
lg:      24px
md:      16px
sm/default: 12px
full:    9999px
```

### 4.4. Nguyên tắc thiết kế PREMIUM

- **Glassmorphism** cho cards/modals khi phù hợp
- **Smooth gradients** thay vì solid colors cho backgrounds
- **Micro-animations** (hover, focus, transition) — dùng Framer Motion
- **Dark mode support** — CSS variables cho light/dark
- **Responsive design** — Mobile-first approach
- **Spacing nhất quán** — dùng Tailwind spacing scale
- Không dùng placeholder images — tạo ảnh thật bằng công cụ generate_image

---

## 🔗 V. TÍCH HỢP BACKEND (API Integration)

### 5.1. Service Layer Pattern

Mỗi module tạo file service riêng trong `services/<module>/`:

```typescript
// services/<module>/<module>.service.ts
import { ApiResponse, PaginatedResponse } from '../common.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const <module>Service = {
  // GET ALL
  getAll: async (params: {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: string;
  }): Promise<PaginatedResponse<ItemType>> => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    if (params.keywords) searchParams.set('keywords', params.keywords);
    if (params.status) searchParams.set('status', params.status);

    const res = await fetch(`${API_URL}/<module>?${searchParams}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // GET BY ID
  getById: async (id: string): Promise<ApiResponse<ItemType>> => {
    const res = await fetch(`${API_URL}/<module>/${id}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // CREATE
  create: async (data: CreateDto): Promise<ApiResponse<ItemType>> => {
    const res = await fetch(`${API_URL}/<module>`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // UPDATE
  update: async (id: string, data: UpdateDto): Promise<ApiResponse<ItemType>> => {
    const res = await fetch(`${API_URL}/<module>/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // DELETE
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await fetch(`${API_URL}/<module>/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
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

### 5.2. React Query Integration

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

// GET ALL Hook
export function use<Module>List(params?: QueryParams) {
  return useQuery({
    queryKey: QUERY_KEYS.list(params),
    queryFn: () => <module>Service.getAll(params ?? {}),
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}

// GET BY ID Hook
export function use<Module>Detail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => <module>Service.getById(id),
    enabled: !!id,
  });
}

// CREATE Mutation
export function useCreate<Module>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: <module>Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

// UPDATE Mutation
export function useUpdate<Module>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDto }) =>
      <module>Service.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.id) });
    },
  });
}

// DELETE Mutation
export function useDelete<Module>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: <module>Service.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}
```

### 5.3. Form Integration (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema validation
const createSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type CreateFormValues = z.infer<typeof createSchema>;

// Trong component
const form = useForm<CreateFormValues>({
  resolver: zodResolver(createSchema),
  defaultValues: { name: '', status: 'active' },
});

const createMutation = useCreate<Module>();

const onSubmit = (values: CreateFormValues) => {
  createMutation.mutate(values, {
    onSuccess: () => toast.success('Tạo thành công!'),
    onError: (error) => toast.error(error.message),
  });
};
```

---

## 📡 VI. REALTIME (Socket.io Client)

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

## 🧩 VII. COMPONENT PATTERNS

### 7.1. Data Table (TanStack Table + shadcn)

```typescript
// Pattern cho DataTable component
- Columns definition file riêng: columns.tsx
- Hỗ trợ sorting, filtering, pagination
- Loading skeleton
- Empty state với message
- Responsive (collapse columns trên mobile)
```

### 7.2. Form Component Pattern

```typescript
// Pattern chuẩn cho form
- shadcn Form component (FormField, FormItem, FormLabel, FormMessage)
- Zod schema validation
- Loading state trên submit button
- Error handling với toast (sonner)
- Reset form sau khi thành công
```

### 7.3. Modal/Dialog Pattern

```typescript
// Dùng shadcn Dialog
- Controlled open/close state
- Confirmation dialog cho delete actions
- Form dialog cho create/edit
- Loading overlay khi submitting
```

### 7.4. Toast Notifications (Sonner)

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

## 🌍 IX. ĐA NGÔN NGỮ (FE)

- Header `Accept-Language: vi | en` gửi kèm mọi request
- UI text hardcode minimal, ưu tiên lấy message từ API response
- Date/time format theo locale: `date-fns` với locale tương ứng

---

## ✅ X. CHECKLIST TRƯỚC KHI HOÀN THÀNH

- [ ] Component responsive (mobile/tablet/desktop)
- [ ] Dark mode support
- [ ] Loading states (skeleton/spinner)
- [ ] Empty states
- [ ] Error handling & toast notifications
- [ ] Permission-based UI rendering
- [ ] React Query hooks tách file riêng
- [ ] Service layer tách file riêng
- [ ] Zod validation schema
- [ ] TypeScript types đầy đủ (không `any`)
- [ ] Framer Motion transitions/animations
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] SEO (title, meta, semantic HTML)
- [ ] API integration hoạt động đúng
- [ ] Realtime events handled (nếu có)

---

## 📚 REFERENCE: SERVICES & TYPES PATTERN

```
client/services/
├── common.types.ts               # ApiResponse, PaginatedResponse
├── auth/
│   ├── auth.service.ts
│   └── auth.types.ts
├── <module>/
│   ├── <module>.service.ts       # API calls
│   └── <module>.types.ts         # Module-specific types (nếu cần)

client/types/
├── <module>.ts                   # Shared type definitions

client/hooks/
├── use<Module>.ts                # React Query hooks
```
