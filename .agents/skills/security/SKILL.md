---
name: Security Specialist (GEN-HUB)
description: Chuyên gia bảo mật cho NestJS backend và Next.js frontend: JWT, API Key, Guards, Rate Limiting, CORS, XSS, SQL Injection, encryption cho dự án GEN-HUB.
---

# Security Specialist - GEN-HUB

## I - Vai trò & Nguyên tắc cốt lõi

Bạn là **Senior Security Engineer** chuyên về bảo mật cho NestJS backend và Next.js frontend trong dự án GEN-HUB.

### Quy tắc bắt buộc:
1. **Tiếng Việt** cho mô tả, comment, error messages
2. Luôn **PLAN** trước khi thay đổi security-critical code
3. Chờ **user approval** trước khi deploy security changes
4. **Không bao giờ** hardcode secrets, API keys, passwords
5. Luôn encrypt sensitive data (passwords, tokens, PII)
6. Strict UTF-8 (no BOM) - không bỏ dấu tiếng Việt
7. Security-first: thà từ chối an toàn còn hơn mở cửa rủi ro

---

## II - Authentication System

### 1. JWT Authentication

#### Access Token
```typescript
// src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
```

#### Refresh Token
```typescript
// src/auth/auth.service.ts
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION') || '7d',
    });

    // Hash refresh token trước khi lưu
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, hashedRefreshToken },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return this.generateTokens(user);
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }
}
```

#### JWT Config
```typescript
// src/auth/jwt.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
  refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
}));
```

### 2. API Key Authentication
```typescript
// src/common/guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Thiếu API key');
    }

    // Validate API key từ database hoặc env
    const validApiKey = await this.validateApiKey(apiKey);

    if (!validApiKey) {
      throw new ForbiddenException('API key không hợp lệ');
    }

    request.apiKey = validApiKey;
    return true;
  }

  private async validateApiKey(apiKey: string) {
    // Check từ database với rate limit tracking
    const keyRecord = await this.prisma.apiKey.findFirst({
      where: {
        key: this.hashApiKey(apiKey),
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!keyRecord) return null;

    // Kiểm tra rate limit
    if (keyRecord.requestCount >= keyRecord.rateLimit) {
      throw new TooManyRequestsException('Vượt quá giới hạn API key');
    }

    return keyRecord;
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
```

#### Combined Auth Guard
```typescript
// src/common/guards/combined-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const jwtGuard = new JwtAuthGuard();
    const apiKeyGuard = new ApiKeyGuard();

    // Cho phép nếu có JWT HOẶC API Key
    try {
      return jwtGuard.canActivate(context) || apiKeyGuard.canActivate(context);
    } catch {
      return apiKeyGuard.canActivate(context);
    }
  }
}
```

### 3. API Key Logging
```typescript
// src/common/interceptors/api-key-log.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey;
    const start = Date.now();

    return next.handle().pipe(
      tap(async () => {
        if (apiKey) {
          await this.prisma.apiKeyLog.create({
            data: {
              apiKeyId: apiKey.id,
              endpoint: request.url,
              method: request.method,
              responseTime: Date.now() - start,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
            },
          });
        }
      }),
    );
  }
}
```

---

## III - Authorization & Permission System

### 1. Permission Decorator
```typescript
// src/common/decorators/require-permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
```

### 2. Permission Guard
```typescript
// src/common/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // Không yêu cầu permission
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Yêu cầu đăng nhập');
    }

    // Admin có tất cả quyền
    if (user.role === 'admin') {
      return true;
    }

    // Kiểm tra user có ít nhất 1 permission yêu cầu
    const hasPermission = requiredPermissions.some((perm) =>
      user.permissions?.includes(perm),
    );

    if (!hasPermission) {
      throw new UnauthorizedException('Bạn không có quyền truy cập');
    }

    return true;
  }
}
```

### 3. Data Scoping Guard
```typescript
// src/common/guards/data-scope.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    // Admin hoặc user có permission .all
    const permission = this.reflector.get<string>('permission', context.getHandler());
    if (permission?.endsWith('.all') || user.role === 'admin') {
      return true;
    }

    // User thường chỉ thấy data của mình
    const resource = await this.prisma[getModelName(context)].findUnique({
      where: { id: parseInt(resourceId) },
      select: { ownerId: true },
    });

    if (resource?.ownerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
    }

    return true;
  }
}
```

---

## IV - Rate Limiting & CORS

### 1. Rate Limiting
```typescript
// main.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('RATE_LIMIT_TTL', 60),
            limit: config.get('RATE_LIMIT_LIMIT', 100),
          },
          {
            name: 'short',
            ttl: 1000,
            limit: 5,
          },
          {
            name: 'long',
            ttl: 60000,
            limit: 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis(config.get('REDIS_URL')),
        ),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

```typescript
// Controller-level rate limiting
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 lần/phút
  async login(@Body() loginDto: LoginDto) {
    // ...
  }

  @Get('public')
  @SkipThrottle() // Không rate limit
  async publicEndpoint() {
    // ...
  }
}
```

### 2. CORS Configuration
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      
      // Cho phép localhost trong development
      if (!origin || allowedOrigins.includes(origin) || origin?.startsWith('http://localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Origin không được phép'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 3600, // Cache preflight 1 giờ
  });

  await app.listen(process.env.PORT || 3000);
}
```

---

## V - Input Validation & XSS Prevention

### 1. DTO Validation
```typescript
// src/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@genhub.dev' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên không được vượt quá 100 ký tự' })
  name: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;
}
```

### 2. XSS Sanitization
```typescript
// src/common/pipes/xss-sanitization.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class XSSSanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [], // Không cho phép HTML tag
        allowedAttributes: {},
      });
    }
    return value;
  }
}

// Global pipe
app.useGlobalPipes(new XSSSanitizationPipe());
```

### 3. SQL Injection Prevention
```typescript
// ✅ ĐÚNG - Dùng parameterized queries qua Prisma
const user = await prisma.user.findFirst({
  where: { email: userInput } // Prisma tự động escape
});

// ❌ SAI - Raw SQL với string concatenation
const user = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userInput}'` // SQL Injection risk!
);

// ✅ ĐÚNG - Raw query với parameterized
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

---

## VI - Encryption & Data Protection

### 1. Password Hashing
```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
```

### 2. Sensitive Data Encryption
```typescript
// src/common/utils/encryption.ts
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 3. Environment Variables
```typescript
// .env.example (KHÔNG bao giờ commit .env thật)
# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Encryption
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/genhub

# Redis
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=https://genhub.dev,https://app.genhub.dev

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```

---

## VII - Security Headers

```typescript
// main.ts
import { helmet } from 'helmet';

app.use(helmet());

// Hoặc custom headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
  res.removeHeader('X-Powered-By');
  next();
});
```

---

## VIII - Frontend Security (Next.js)

### 1. Token Management
```typescript
// lib/auth/token.ts
export function setTokens(accessToken: string, refreshToken: string) {
  // Không lưu token trong localStorage nếu có XSS risk
  // Dùng httpOnly cookies thay thế
  document.cookie = `accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=900`;
  document.cookie = `refreshToken=${refreshToken}; Path=/auth/refresh; HttpOnly; SameSite=Strict; Max-Age=604800`;
}

export function clearTokens() {
  document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'refreshToken=; Path=/auth/refresh; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
```

### 2. CSRF Protection
```typescript
// Middleware CSRF
import { csrf } from 'edge-csrf';

const csrfProtect = csrf({ cookie: { secure: true } });

export async function middleware(request: NextRequest) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const error = await csrfProtect(request, response);
    if (error) {
      return new Response('CSRF token không hợp lệ', { status: 403 });
    }
  }
}
```

### 3. Input Sanitization (Frontend)
```typescript
// utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: { 'a': ['href', 'title'] },
  });
}

// Component an toàn
function SafeHtml({ html }: { html: string }) {
  const sanitized = sanitizeHtml(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

---

## IX - Security Audit Checklist

Trước khi deploy production:

### Authentication & Authorization
- [ ] JWT secret đủ mạnh và được lưu trong environment variable
- [ ] Access token expiration <= 15 phút
- [ ] Refresh token rotation được implement
- [ ] Password hashing với bcrypt (salt rounds >= 10)
- [ ] Permission checks ở cả Controller và Service layer
- [ ] Data scoping hoạt động đúng (personal vs system-wide)

### Input Validation
- [ ] Tất cả DTOs có validation decorators
- [ ] XSS sanitization được áp dụng
- [ ] SQL injection prevention (parameterized queries)
- [ ] File upload validation (type, size, extension)
- [ ] Rate limiting được cấu hình

### Data Protection
- [ ] Sensitive data được encrypt trong database
- [ ] Không log passwords, tokens, PII
- [ ] HTTPS enforced trong production
- [ ] Security headers được cấu hình
- [ ] CORS whitelist cụ thể

### Monitoring & Logging
- [ ] Failed login attempts được log
- [ ] API key usage tracking
- [ ] Suspicious activity alerts
- [ ] Audit log cho CUD operations
- [ ] Error messages không lộ internal details

### Dependencies
- [ ] `npm audit` không có critical vulnerabilities
- [ ] Dependencies cập nhật thường xuyên
- [ ] No unused dependencies

---

## X - Security Response Patterns

### Standard Error Response
```typescript
// src/common/responses/error.response.ts
export class ErrorResponse {
  constructor(
    public code: string,
    public message: string,
    public success: boolean = false,
    public errors?: Record<string, string[]>,
  ) {}
}

// Usage
throw new UnauthorizedException(
  new ErrorResponse('UNAUTHORIZED', 'Bạn không có quyền truy cập')
);
```

### Security Event Logging
```typescript
// src/common/services/security-log.service.ts
@Injectable()
export class SecurityLogService {
  async log(event: {
    type: 'FAILED_LOGIN' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_TOKEN' | 'SUSPICIOUS_ACTIVITY';
    userId?: number;
    ipAddress: string;
    userAgent: string;
    details?: Record<string, any>;
  }) {
    await this.prisma.securityLog.create({
      data: {
        eventType: event.type,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details ? JSON.stringify(event.details) : null,
      },
    });

    // Gửi alert cho admin nếu critical
    if (event.type === 'SUSPICIOUS_ACTIVITY') {
      await this.notifyAdmin(event);
    }
  }
}
```

---

## XI - Tham chiếu skill liên quan

- **nestjs-backend**: Guards, decorators, authentication patterns
- **testing**: Security test cases, penetration test scenarios
- **database-prisma**: Encrypted fields, secure queries
- **api-documentation**: API security documentation
- **uiux-frontend**: Frontend security patterns, token management
