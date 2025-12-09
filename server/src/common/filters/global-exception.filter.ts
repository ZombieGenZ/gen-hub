import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
 * Global Exception Filter
 * Bắt tất cả exceptions và ghi log async vào database
 * Sử dụng fire-and-forget pattern để không ảnh hưởng response time
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly systemLogService: SystemLogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    // Xác định HTTP status và message
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Trích xuất stack trace nếu có
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Trích xuất response chi tiết từ HttpException
    let errorResponse: unknown = null;
    if (exception instanceof HttpException) {
      errorResponse = exception.getResponse();
    }

    // Xác định log level dựa vào status code
    const logLevel = status >= 500 ? 'ERROR' : 'WARN';

    // Ghi log async (fire-and-forget) - không await
    this.systemLogService.logAsync({
      level: logLevel,
      module: 'http',
      action: 'exception',
      message: `[${status}] ${request.method} ${request.url} - ${message}`,
      userId: request.user?.userId,
      ipAddress: extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      metaData: {
        statusCode: status,
        method: request.method,
        url: request.url,
        path: request.path,
        query: request.query,
        body: this.sanitizeBody(request.body),
        errorMessage: message,
        errorResponse:
          typeof errorResponse === 'object' ? errorResponse : undefined,
        stack: stack,
        timestamp: new Date().toISOString(),
      },
    });

    // Trả về response cho client
    response.status(status).json({
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Loại bỏ các trường nhạy cảm từ request body
   */
  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const sensitiveFields = [
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'token',
      'secret',
      'otp',
      'code',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
