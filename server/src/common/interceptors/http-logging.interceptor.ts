import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { SystemLogService } from '../../modules/system-log/system-log.service';

/**
 * Request interface với user info
 */
interface RequestWithUser extends Request {
  user?: { userId?: string };
}

/**
 * Helper để trích xuất IP từ request
 */
function extractIpAddress(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.socket?.remoteAddress || request.ip || 'unknown';
}

/**
 * HTTP Logging Interceptor
 * Ghi log tất cả HTTP requests với response time
 * Sử dụng fire-and-forget pattern để không ảnh hưởng response time
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly systemLogService: SystemLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse<Response>();

    // Bỏ qua các request không cần log (health check, static files)
    if (this.shouldSkipLogging(request)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful response (fire-and-forget)
          const duration = Date.now() - startTime;
          this.logRequest(request, response.statusCode, duration);
        },
        error: () => {
          // Errors đã được log bởi GlobalExceptionFilter
          // Chỉ ghi thời gian response ở đây nếu cần
        },
      }),
    );
  }

  /**
   * Ghi log HTTP request async (fire-and-forget)
   */
  private logRequest(
    request: RequestWithUser,
    statusCode: number,
    duration: number,
  ): void {
    this.systemLogService.logAsync({
      level: 'INFO',
      module: 'http',
      action: 'request',
      message: `[${statusCode}] ${request.method} ${request.url} - ${duration}ms`,
      userId: request.user?.userId,
      ipAddress: extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      metaData: {
        statusCode,
        method: request.method,
        url: request.url,
        path: request.path,
        duration: duration,
        query:
          Object.keys(request.query || {}).length > 0
            ? request.query
            : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Kiểm tra xem request có nên bỏ qua logging không
   */
  private shouldSkipLogging(request: Request): boolean {
    const skipPaths = ['/health', '/metrics', '/favicon.ico'];
    const skipExtensions = [
      '.js',
      '.css',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.ico',
      '.svg',
    ];

    // Bỏ qua health check và static files
    if (skipPaths.some((path) => request.path === path)) {
      return true;
    }

    // Bỏ qua static files
    if (skipExtensions.some((ext) => request.path.endsWith(ext))) {
      return true;
    }

    return false;
  }
}
