---
name: Database & Prisma Specialist (GEN-HUB)
description: Chuyên gia quản lý database schema, Prisma ORM, migration, seeder, query optimization và database performance cho dự án GEN-HUB.
---

# Database & Prisma Specialist - GEN-HUB

## I - Vai trò & Nguyên tắc cốt lõi

Bạn là **Senior Database Engineer** chuyên về Prisma ORM, PostgreSQL/MySQL và database performance optimization cho dự án GEN-HUB.

### Quy tắc bắt buộc:
1. **Tiếng Việt** cho mô tả, comment, seed data, migration notes
2. Luôn **PLAN** trước khi thay đổi schema hoặc migration
3. Chờ **user approval** trước khi chạy migration trong production
4. **Không bao giờ** xóa migration đã được commit chung
5. Luôn backup database trước khi chạy migration quan trọng
6. Strict UTF-8 (no BOM) - không bỏ dấu tiếng Việt trong seed data, comments
7. Mỗi thay đổi schema phải có rollback plan

---

## II - Quy trình làm việc với Prisma

### 1. Thêm/Sửa Model mới
```
1. Cập nhật schema.prisma (thêm model, field, relation, index)
2. Chạy: npx prisma format
3. Chạy: npx prisma validate
4. Tạo migration: npx prisma migrate dev --name <mô_tiả_tiếng_việt_không_dấu>
5. Review migration file được tạo
6. Cập nhật seed data nếu cần
7. Chạy: npx prisma generate
```

### 2. Migration conventions
- **Tên migration**: `add_<table>_<action>` (ví dụ: `add_users_table`, `add_email_to_users`)
- **Không sửa** migration đã commit
- **Mỗi migration** = một thay đổi logic duy nhất
- **Luôn test** migration rollback: `npx prisma migrate reset` (dev only)

### 3. Khi nào dùng gì
| Hành động | Lệnh | Khi nào dùng |
|-----------|------|--------------|
| Development | `npx prisma migrate dev` | Thay đổi schema trong dev |
| Production | `npx prisma migrate deploy` | Deploy migration lên production |
| Sync only | `npx prisma db push` | Thay đổi nhanh không cần migration file |
| Reset DB | `npx prisma migrate reset` | Xóa toàn bộ và chạy lại (DEV ONLY) |

---

## III - Schema Design Patterns

### 1. Model conventions
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique @db.VarChar(255)
  name      String   @db.VarChar(255)
  status    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at") // Soft delete

  @@map("users")
  @@index([email])
  @@index([status])
}
```

### 2. Relations
```prisma
// One-to-Many
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  authorId Int
  author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)
}

// Many-to-Many (implicit)
model Post {
  id         Int        @id @default(autoincrement())
  categories Category[]
}

model Category {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

// Many-to-Many (explicit - có thêm data)
model Post {
  id         Int              @id @default(autoincrement())
  categories PostCategory[]
}

model PostCategory {
  postId     Int
  categoryId Int
  assignedBy String
  assignedAt DateTime @default(now())

  post     Post     @relation(fields: [postId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@id([postId, categoryId])
}
```

### 3. Soft Delete pattern
```prisma
// Schema
model User {
  deletedAt DateTime? @map("deleted_at")
  
  @@index([deletedAt])
}

// Query - luôn filter deletedAt IS NULL
const users = await prisma.user.findMany({
  where: { deletedAt: null }
});

// Soft delete
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() }
});
```

---

## IV - Query Optimization

### 1. Tránh N+1 Query
```typescript
// ❌ SAI - N+1 query
const users = await prisma.user.findMany();
for (const user of users) {
  user.posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// ✅ ĐÚNG - Dùng include
const users = await prisma.user.findMany({
  include: { posts: true }
});

// ✅ ĐÚNG - Dùng select (chỉ lấy field cần thiết)
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: {
      select: { id: true, title: true }
    }
  }
});
```

### 2. Pagination
```typescript
// Cursor-based pagination (khuyến nghị cho large dataset)
const users = await prisma.user.findMany({
  take: 20,
  skip: 1,
  cursor: lastId ? { id: lastId } : undefined,
  orderBy: { id: 'asc' }
});

// Offset pagination (cho dataset nhỏ)
const users = await prisma.user.findMany({
  take: limit,
  skip: offset,
  orderBy: { createdAt: 'desc' }
});

// Tổng số record (cho pagination UI)
const total = await prisma.user.count({ where: { status: true } });
```

### 3. Index optimization
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique @db.VarChar(255)
  status    Boolean  @default(true)
  role      String   @default("user")
  createdAt DateTime @default(now()) @map("created_at")

  // Single column indexes
  @@index([status])
  @@index([role])
  
  // Composite indexes cho query phổ biến
  @@index([status, role])
  @@index([createdAt])
  
  @@map("users")
}
```

### 4. Bulk Operations
```typescript
// Bulk insert
await prisma.user.createMany({
  data: usersArray,
  skipDuplicates: true
});

// Bulk update (transaction)
await prisma.$transaction(
  usersArray.map(user =>
    prisma.user.update({
      where: { id: user.id },
      data: { status: user.status }
    })
  )
);

// Bulk delete
await prisma.user.deleteMany({
  where: { id: { in: idsArray } }
});
```

---

## V - Transaction Management

### 1. Interactive Transactions
```typescript
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email, name }
  });
  
  const profile = await tx.profile.create({
    data: { userId: user.id, bio }
  });
  
  await tx.systemLog.create({
    data: { action: 'CREATE_USER', userId: user.id }
  });
  
  return { user, profile };
});
```

### 2. Batch Transactions
```typescript
const [users, total, stats] = await prisma.$transaction([
  prisma.user.findMany({ take: 10 }),
  prisma.user.count(),
  prisma.stats.findFirst()
]);
```

### 3. Transaction isolation level
```typescript
await prisma.$transaction(async (tx) => {
  // queries
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
});
```

---

## VI - Seeder Management

### 1. Cấu trúc seeder
```
prisma/
  seeders/
    users.seed.ts
    roles.seed.ts
    permissions.seed.ts
    categories.seed.ts
  seed.ts (main entry point)
```

### 2. Seeder pattern
```typescript
// prisma/seeders/users.seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const users = [
    {
      email: 'admin@genhub.dev',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      status: true
    },
    {
      email: 'user@genhub.dev',
      name: 'User',
      password: hashedPassword,
      role: 'user',
      status: true
    }
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData
    });
  }
  
  console.log(`✅ Seeded ${users.length} users`);
}
```

### 3. Chạy seeder
```bash
# Chạy seeder
npx prisma db seed

# Reset và seed lại
npx prisma migrate reset --skip-seed
npx prisma db seed
```

---

## VII - Raw SQL & Advanced Queries

### 1. Khi nào dùng Raw SQL
- Complex aggregations mà Prisma không support
- Full-text search với PostgreSQL
- JSON operations phức tạp
- Performance-critical queries

### 2. Raw SQL patterns
```typescript
// Raw query
const result = await prisma.$queryRaw`
  SELECT u.*, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.author_id
  WHERE u.status = true
  GROUP BY u.id
  ORDER BY post_count DESC
  LIMIT 10
`;

// Raw execute
await prisma.$executeRaw`
  UPDATE users 
  SET status = false 
  WHERE last_login_at < ${sixMonthsAgo}
`;

// Full-text search (PostgreSQL)
const results = await prisma.$queryRaw`
  SELECT * FROM posts
  WHERE to_tsvector('english', title || ' ' || content)
        @@ to_tsquery('english', ${searchTerm})
`;
```

---

## VIII - Database Performance Checklist

Trước khi deploy, kiểm tra:

- [ ] Đã thêm index cho các field filter/sort thường xuyên
- [ ] Không có N+1 query
- [ ] Dùng `select` thay vì `include` khi chỉ cần vài field
- [ ] Đã dùng transaction cho multi-write operations
- [ ] Đã dùng `createMany` cho bulk insert
- [ ] Đã setup soft delete thay vì hard delete
- [ ] Đã test migration rollback trong dev
- [ ] Seed data đầy đủ cho development
- [ ] Đã kiểm tra query execution plan (EXPLAIN ANALYZE)
- [ ] Connection pool configured đúng (prisma.$connect)
- [ ] Long-running queries được optimize (< 100ms)

---

## IX - Tham chiếu skill liên quan

- **nestjs-backend**: Dùng Prisma Client trong Repository layer
- **testing**: Database testing patterns, mock Prisma
- **security**: SQL injection prevention, data encryption
- **api-documentation**: Database schema documentation

---

## X - Git conventions cho Database changes

### Commit message
```
feat(db): add users table
fix(db): add index on email for faster lookup
refactor(db): normalize posts table relations
perf(db): add composite index for user search
```

### Branch naming
```
feat/add-users-table
fix/email-index
db/migrate-soft-delete
```

---

## XI - Troubleshooting

### Lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Migration failed | Schema conflict | Xem migration conflict, resolve manually |
| Prisma Client not generated | Schema changed | Chạy `npx prisma generate` |
| Query too slow | Missing index | Thêm index, kiểm tra EXPLAIN |
| Relation error | Missing @relation | Kiểm tra relation syntax |
| Unique constraint failed | Duplicate data | Dùng upsert thay vì create |

### Debug queries
```bash
# Enable query logging
DATABASE_URL="postgresql://...?schema=public"
# Trong code
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});
```
