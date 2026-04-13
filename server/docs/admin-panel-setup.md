# Hướng dẫn cấu hình Admin Panel (AdminJS)

## Tổng quan

Admin Panel được tích hợp vào hệ thống GEN-HUB sử dụng **AdminJS** với các tính năng:

- Truy cập qua route `/admin`
- Xác thực bằng email/password (session-based)
- Yêu cầu permission `server.admin` để truy cập
- Hỗ trợ đa ngôn ngữ tiếng Việt
- Giao diện tùy chỉnh với màu sắc **Deep Teal – Slate**
- Dark mode / Light mode tự động theo hệ thống
- Trang 404 tùy chỉnh khi admin panel bị disabled

## Cấu hình

### 1. Biến môi trường

Thêm các biến sau vào file `.env`:

```env
# Bật/tắt admin panel (true/false)
ADMIN_PANEL_ENABLED=true

# Khóa bí mật cho session cookie (tạo chuỗi ngẫu nhiên bảo mật)
ADMIN_COOKIE_SECRET=your-very-secure-random-string-here
```

**Lưu ý:** 
- Khi `ADMIN_PANEL_ENABLED=false` (mặc định), truy cập `/admin` sẽ hiển thị trang "Admin Panel Disabled"
- Khi `ADMIN_PANEL_ENABLED=true`, hệ thống sẽ khởi tạo AdminJS và yêu cầu đăng nhập

### 2. Tạo permission `server.admin`

Bạn cần tạo permission với `key = "server.admin"` trong database:

```typescript
// Sử dụng Prisma Client
await prisma.permission.create({
  data: {
    name: 'Quản trị hệ thống',
    key: 'server.admin',
    description: 'Quyền truy cập vào trang quản trị admin',
    is_active: true,
  },
});
```

### 3. Gán permission cho admin user

Có 2 cách:

#### Cách 1: Gán trực tiếp qua UserPermission

```typescript
await prisma.userPermission.create({
  data: {
    user_id: 'user-uuid-here',
    permission_id: 'permission-uuid-here',
    is_active: true,
  },
});
```

#### Cách 2: Gán qua Role

```typescript
// Tạo role
const role = await prisma.role.create({
  data: {
    name: 'System Administrator',
    description: 'Quản trị viên hệ thống',
    is_active: true,
    is_default: false,
  },
});

// Gán permission cho role
await prisma.rolePermission.create({
  data: {
    role_id: role.id,
    permission_id: 'permission-uuid-here',
    is_active: true,
  },
});

// Gán role cho user
await prisma.userRole.create({
  data: {
    user_id: 'user-uuid-here',
    role_id: role.id,
    is_active: true,
  },
});
```

### 4. Script mẫu để setup nhanh

Tạo file `scripts/setup-admin-permission.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupAdminPermission() {
  // 1. Tạo permission server.admin
  const permission = await prisma.permission.upsert({
    where: { key: 'server.admin' },
    update: {},
    create: {
      name: 'Quản trị hệ thống',
      key: 'server.admin',
      description: 'Quyền truy cập vào trang quản trị admin',
      is_active: true,
    },
  });

  console.log('✅ Permission created:', permission.key);

  // 2. Tạo role Admin
  const role = await prisma.role.upsert({
    where: { name: 'System Administrator' },
    update: {},
    create: {
      name: 'System Administrator',
      description: 'Quản trị viên hệ thống',
      is_active: true,
      is_default: false,
    },
  });

  console.log('✅ Role created:', role.name);

  // 3. Gán permission cho role
  await prisma.rolePermission.upsert({
    where: {
      role_id_permission_id: {
        role_id: role.id,
        permission_id: permission.id,
      },
    },
    update: {},
    create: {
      role_id: role.id,
      permission_id: permission.id,
      is_active: true,
    },
  });

  console.log('✅ Permission assigned to role');

  // 4. Gán role cho admin user (thay email bằng email của admin)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gen-hub.dev';
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (user) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: user.id,
          role_id: role.id,
        },
      },
      update: {},
      create: {
        user_id: user.id,
        role_id: role.id,
        is_active: true,
      },
    });

    console.log('✅ Role assigned to admin user:', user.email);
  } else {
    console.log('⚠️ Admin user not found. Please create user first.');
  }

  console.log('\n🎉 Admin panel setup complete!');
}

setupAdminPermission()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Chạy script:

```bash
cd server
npx ts-node scripts/setup-admin-permission.ts
```

## Sử dụng

### 1. Truy cập Admin Panel

1. Mở trình duyệt và truy cập: `http://localhost:4000/admin`
2. Nếu admin panel đang được bật, bạn sẽ thấy trang đăng nhập
3. Nhập **email** và **mật khẩu** của tài khoản admin
4. Hệ thống sẽ kiểm tra:
   - Thông tin đăng nhập có đúng không
   - User có permission `server.admin` không
5. Nếu thành công, bạn sẽ được chuyển vào bảng điều khiển admin

### 2. Các resources quản lý

Admin Panel cho phép quản lý các models:

#### Quản lý hệ thống
- **Người dùng** (Users) - Xem, chỉnh sửa, khóa/mở khóa tài khoản
- **Tổ chức** (Organizations) - Quản lý các tổ chức trong hệ thống

#### Phân quyền
- **Vai trò** (Roles) - Tạo và quản lý các vai trò
- **Quyền hạn** (Permissions) - Định nghĩa các quyền hạn
- **Vai trò người dùng** (User Roles) - Gán vai trò cho người dùng
- **Quyền hạn người dùng** (User Permissions) - Gán quyền trực tiếp cho user

#### Nhật ký
- **Nhật ký hệ thống** (System Logs) - Chỉ xem, không sửa/xóa
- **Nhật ký database** (Database Logs) - Chỉ xem, không sửa/xóa

### 3. Admin Panel Disabled

Khi `ADMIN_PANEL_ENABLED=false`:
- Truy cập `/admin` sẽ hiển thị trang thông báo "Admin Panel Disabled"
- Không có form đăng nhập nào được hiển thị
- AdminJS không được khởi tạo (tiết kiệm tài nguyên)

## Giao diện và màu sắc

Admin Panel sử dụng bảng màu **Deep Teal – Slate**:

| Loại | Mã màu |
|------|--------|
| Primary | `#0F766E` |
| Primary Light | `#14B8A6` |
| Primary Dark | `#0D5A52` |
| Background | `#F8FAFC` |
| Card/Surface | `#FFFFFF` |
| Sidebar BG | `#F1F5F9` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |
| Info | `#0EA5E9` |

### Dark Mode / Light Mode

AdminJS tự động phát hiện chế độ màu sắc của hệ thống (`prefers-color-scheme`) và chuyển đổi giao diện cho phù hợp.

## Bảo mật

1. **Session-based authentication**: AdminJS sử dụng express-session với cookie được mã hóa
2. **HttpOnly cookie**: Cookie không thể truy cập từ JavaScript (chống XSS)
3. **Secure cookie**: Trong production, cookie chỉ được gửi qua HTTPS
4. **Permission check**: Mỗi lần đăng nhập đều kiểm tra permission `server.admin`
5. **Environment variable**: Có thể bật/tắt hoàn toàn admin panel qua `.env`

## Xử lý sự cố

### Không thể đăng nhập

1. Kiểm tra `ADMIN_PANEL_ENABLED=true` trong `.env`
2. Đảm bảo user có mật khẩu đã được hash (bcrypt)
3. Kiểm tra user có permission `server.admin` (trực tiếp hoặc qua role)

### Lỗi "Admin Panel Disabled"

- Đặt `ADMIN_PANEL_ENABLED=true` trong `.env`
- Khởi động lại server

### Lỗi database

- Đảm bảo Prisma schema đã được migrate
- Kiểm tra kết nối database qua `DATABASE_URL`

## Tài liệu tham khảo

- [AdminJS Documentation](https://docs.adminjs.co/)
- [AdminJS NestJS Plugin](https://github.com/SoftwareBrothers/adminjs-nestjs)
- [AdminJS Prisma Adapter](https://github.com/SoftwareBrothers/adminjs-prisma)
