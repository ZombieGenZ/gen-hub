---
name: Testing Specialist (GEN-HUB)
description: Chuyên gia viết test cho NestJS backend (Unit, E2E, Integration) và Next.js frontend (Component, Integration, E2E) cho dự án GEN-HUB.
---

# Testing Specialist - GEN-HUB

## I - Vai trò & Nguyên tắc cốt lõi

Bạn là **Senior QA/Test Engineer** chuyên về testing cho NestJS backend và Next.js frontend trong dự án GEN-HUB.

### Quy tắc bắt buộc:
1. **Tiếng Việt** cho mô tả test, comment, assertion messages
2. Luôn **PLAN** test cases trước khi viết code test
3. Mỗi tính năng mới **phải có test** đi kèm
4. **Không bỏ qua** test khi có bug fix
5. Test phải **độc lập** - không phụ thuộc thứ tự chạy
6. Strict UTF-8 (no BOM) - không bỏ dấu tiếng Việt trong test data, messages
7. Mock external dependencies (database, API calls, Redis, Socket.io)

---

## II - Testing Strategy

### Test Pyramid
```
        / \
       / E2E \      (10%) - User flows quan trọng
      /-------\
     /  Integ  \     (20%) - Service integration
    /-----------\
   /    Unit     \    (70%) - Services, utilities, helpers
  /---------------\
```

### Khi nào viết loại test nào
| Loại test | Khi nào | Coverage mục tiêu |
|-----------|---------|-------------------|
| **Unit Test** | Service, Repository, Utility, Guard, Pipe, Interceptor | 80%+ |
| **Integration Test** | API endpoint với test database, Redis | 60%+ |
| **E2E Test** | User flow quan trọng: auth, CRUD quan trọng | Critical paths |
| **Component Test** | React component phức tạp, form, table | Key components |

---

## III - Backend Unit Testing (NestJS + Jest)

### 1. Setup
```typescript
// jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### 2. Service Unit Test Pattern
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { I18nService } from '../i18n/i18n.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;
  let cacheService: CacheService;

  // Mock dependencies
  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn().mockImplementation((key) => key),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
        { provide: CacheService, useValue: mockCacheService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
    cacheService = module.get<CacheService>(CacheService);

    // Clear mocks trước mỗi test
    jest.clearAllMocks();
  });

  it('✅ nên được định nghĩa', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('✅ nên trả về danh sách user từ cache nếu có', async () => {
      const cachedData = { users: [{ id: 1, email: 'test@test.com' }], total: 1 };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual(cachedData);
      expect(mockCacheService.get).toHaveBeenCalledWith('users:list:all:limit=10:offset=0');
      expect(mockRepository.findAll).not.toHaveBeenCalled();
    });

    it('✅ nên query database nếu cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const mockUsers = [{ id: 1, email: 'test@test.com' }];
      mockRepository.findAll.mockResolvedValue({ data: mockUsers, total: 1 });
      mockCacheService.set.mockResolvedValue(true);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('✅ nên hỗ trợ tìm kiếm với keywords', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const mockUsers = [{ id: 1, email: 'admin@test.com', name: 'Admin' }];
      mockRepository.findAll.mockResolvedValue({ data: mockUsers, total: 1 });

      const result = await service.findAll({ keywords: 'admin', limit: 10, offset: 0 });

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        keywords: 'admin',
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('findById', () => {
    it('✅ nên ném lỗi nếu user không tồn tại', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(
        'Người dùng không tồn tại',
      );
    });

    it('✅ nên trả về user nếu tồn tại', async () => {
      const mockUser = { id: 1, email: 'test@test.com', name: 'Test User' };
      mockRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('✅ nên ném lỗi nếu email đã tồn tại', async () => {
      mockRepository.findByEmail.mockResolvedValue({ id: 1 });

      const createDto = { email: 'existing@test.com', name: 'New User' };

      await expect(service.create(createDto)).rejects.toThrow(
        'Email đã được sử dụng',
      );
    });

    it('✅ nên tạo user thành công', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      const newUser = { id: 1, email: 'new@test.com', name: 'New User' };
      mockRepository.create.mockResolvedValue(newUser);

      const result = await service.create({ email: 'new@test.com', name: 'New User' });

      expect(result).toEqual(newUser);
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });
});
```

### 3. Guard Unit Test
```typescript
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    reflector = mockReflector as any;
    guard = new PermissionsGuard(reflector);
  });

  it('✅ nên cho phép nếu user có permission yêu cầu', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['users.list']);
    
    const mockContext = createMockExecutionContext({
      permissions: ['users.list', 'users.read'],
    });

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('✅ nên từ chối nếu user không có permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['users.delete']);
    
    const mockContext = createMockExecutionContext({
      permissions: ['users.list', 'users.read'],
    });

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});

function createMockExecutionContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}
```

### 4. Pipe Unit Test
```typescript
import { ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';

describe('CreateUserDto Validation', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
  });

  it('✅ nên pass với data hợp lệ', async () => {
    const validDto: CreateUserDto = {
      email: 'test@test.com',
      name: 'Test User',
      password: 'SecurePass123!',
    };

    const result = await pipe.transform(validDto, {
      type: 'body',
      metatype: CreateUserDto,
    });

    expect(result).toEqual(validDto);
  });

  it('✅ nên fail nếu thiếu email', async () => {
    const invalidDto = { name: 'Test User', password: 'SecurePass123!' };

    await expect(
      pipe.transform(invalidDto, { type: 'body', metatype: CreateUserDto }),
    ).rejects.toThrow();
  });

  it('✅ nên fail nếu email sai định dạng', async () => {
    const invalidDto = { email: 'invalid-email', name: 'Test' };

    await expect(
      pipe.transform(invalidDto, { type: 'body', metatype: CreateUserDto }),
    ).rejects.toThrow();
  });
});
```

---

## IV - Backend Integration Testing (E2E)

### 1. Setup Test Module
```typescript
import { Test, TestingModuleBuilder, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useValue({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    // Login để lấy token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@genhub.dev', password: 'Admin@123' });
    
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('✅ nên trả về danh sách user (200)', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', name: 'User 1' },
        { id: 2, email: 'user2@test.com', name: 'User 2' },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toHaveLength(2);
    });

    it('✅ nên trả về 401 nếu không có token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('✅ nên hỗ trợ pagination params', async () => {
      const mockUsers = [{ id: 1, email: 'user1@test.com' }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/users?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.total).toBe(1);
    });
  });

  describe('POST /users', () => {
    it('✅ nên tạo user mới thành công (201)', async () => {
      const newUser = { id: 1, email: 'new@test.com', name: 'New User' };
      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'new@test.com', name: 'New User', password: 'SecurePass123!' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('new@test.com');
    });

    it('✅ nên trả về 400 nếu data không hợp lệ', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Missing email and password' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /users/:id', () => {
    it('✅ nên xóa user thành công (200)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 1, deletedAt: new Date() });

      const response = await request(app.getHttpServer())
        .delete('/users/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('✅ nên trả về 404 nếu user không tồn tại', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/users/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

### 2. Test với Test Database (PostgreSQL Test Container)
```typescript
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Setup test database
async function setupTestDatabase() {
  const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/genhub_test';
  
  // Tạo database test
  try {
    execSync(`psql -c "CREATE DATABASE genhub_test"`, { stdio: 'ignore' });
  } catch (e) {
    // Database đã tồn tại
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  // Chạy migration
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: testDbUrl } });

  return prisma;
}

// Cleanup sau mỗi test
async function cleanupDatabase(prisma: PrismaClient) {
  // Xóa data theo thứ tự (foreign key constraint)
  await prisma.systemLog.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}
```

---

## V - Frontend Testing (Next.js + React)

### 1. Setup
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### 2. Component Unit Test
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserTable } from '@/components/users/user-table';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock fetch
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserTable', () => {
  const mockUsers = [
    { id: 1, email: 'user1@test.com', name: 'User 1', status: true },
    { id: 2, email: 'user2@test.com', name: 'User 2', status: false },
  ];

  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: mockUsers, total: 2 } }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('✅ nên hiển thị danh sách user', async () => {
    render(<UserTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    });
  });

  it('✅ nên hiển thị loading state', () => {
    render(<UserTable />, { wrapper: createWrapper() });

    expect(screen.getByText(/đang tải/i)).toBeInTheDocument();
  });

  it('✅ nên hiển thị empty state khi không có user', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: [], total: 0 } }),
    });

    render(<UserTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/không có dữ liệu/i)).toBeInTheDocument();
    });
  });

  it('✅ nên gọi API xóa khi nhấn nút xóa', async () => {
    const user = userEvent.setup();
    render(<UserTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByRole('button', { name: /xóa/i })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
```

### 3. Form Testing
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateUserForm } from '@/components/users/create-user-form';

describe('CreateUserForm', () => {
  const mockOnSubmit = jest.fn();

  it('✅ nên hiển thị form đầy đủ', () => {
    render(<CreateUserForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tạo/i })).toBeInTheDocument();
  });

  it('✅ nên hiển thị lỗi khi submit form rỗng', async () => {
    const user = userEvent.setup();
    render(<CreateUserForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /tạo/i }));

    await waitFor(() => {
      expect(screen.getByText(/email là bắt buộc/i)).toBeInTheDocument();
    });
  });

  it('✅ nên submit thành công với data hợp lệ', async () => {
    const user = userEvent.setup();
    render(<CreateUserForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'new@test.com');
    await user.type(screen.getByLabelText(/tên/i), 'New User');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /tạo/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'new@test.com',
        name: 'New User',
        password: 'SecurePass123!',
      });
    });
  });
});
```

---

## VI - Test cho Permission System

```typescript
describe('Permission System', () => {
  describe('RequireAnyPermission decorator', () => {
    it('✅ nên cho phép user có permission users.list', () => {
      const userPermissions = ['users.list', 'users.read'];
      const requiredPermissions = ['users.list'];
      
      const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
      
      expect(hasPermission).toBe(true);
    });

    it('✅ nên từ chối user không có permission', () => {
      const userPermissions = ['users.list'];
      const requiredPermissions = ['users.delete'];
      
      const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('Data scoping permissions', () => {
    it('✅ user thường chỉ thấy data cá nhân (.list)', () => {
      const userRole = 'user';
      const permission = 'users.list';
      
      expect(userRole === 'admin' || permission.endsWith('.all')).toBe(false);
    });

    it('✅ admin thấy toàn bộ data (.list.all)', () => {
      const userRole = 'admin';
      const permission = 'users.list.all';
      
      expect(userRole === 'admin' || permission.endsWith('.all')).toBe(true);
    });
  });
});
```

---

## VII - Test cho Cache (Redis)

```typescript
describe('CacheService', () => {
  let cacheService: CacheService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
  };

  beforeEach(() => {
    cacheService = new CacheService(mockRedis as any);
    jest.clearAllMocks();
  });

  it('✅ nên get từ cache', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ key: 'value' }));

    const result = await cacheService.get('test:key');

    expect(result).toEqual({ key: 'value' });
    expect(mockRedis.get).toHaveBeenCalledWith('test:key');
  });

  it('✅ nên set cache với TTL', async () => {
    await cacheService.set('test:key', { key: 'value' }, 3600);

    expect(mockRedis.set).toHaveBeenCalledWith('test:key', JSON.stringify({ key: 'value' }), 'EX', 3600);
  });

  it('✅ nên delete cache key', async () => {
    await cacheService.del('test:key');

    expect(mockRedis.del).toHaveBeenCalledWith('test:key');
  });

  it('✅ nên return null nếu cache miss', async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await cacheService.get('nonexistent');

    expect(result).toBeNull();
  });
});
```

---

## VIII - Chạy Tests

### Commands
```bash
# Chạy unit tests
npm run test

# Chạy unit tests với watch mode
npm run test:watch

# Chạy E2E tests
npm run test:e2e

# Chạy test coverage
npm run test:cov

# Chạy test cho file cụ thể
npm run test -- users.service.spec.ts

# Frontend tests
npm run test:frontend

# Frontend tests với UI
npm run test:frontend:watch
```

### Jest Config
```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};
```

---

## IX - CI/CD Integration

### GitHub Actions
```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npx prisma generate
      - run: npm run test -- --coverage
      - run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## X - Pre-Completion Checklist

Trước khi hoàn thành task test:

- [ ] Unit test cho tất cả service methods
- [ ] Unit test cho guards, pipes, interceptors
- [ ] E2E test cho API endpoints quan trọng
- [ ] Test cases cho cả success và error scenarios
- [ ] Mock đúng external dependencies (Prisma, Redis, I18n)
- [ ] Test messages tiếng Việt trong i18n
- [ ] Test permission checks (personal vs system-wide)
- [ ] Test cache hit/miss scenarios
- [ ] Test form validation (frontend)
- [ ] Test loading, empty, error states (frontend)
- [ ] Coverage >= 80% cho unit tests
- [ ] Test chạy được trong CI/CD
- [ ] Không có test phụ thuộc lẫn nhau
- [ ] Test data được cleanup sau mỗi test

---

## XI - Tham chiếu skill liên quan

- **nestjs-backend**: Test patterns cho services, guards, pipes, interceptors
- **database-prisma**: Mock Prisma Client, test database operations
- **security**: Test authentication, authorization, input validation
- **uiux-frontend**: Component testing, form testing, React Query mocks
