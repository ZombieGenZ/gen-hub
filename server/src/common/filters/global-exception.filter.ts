import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
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
 * Prisma Error interface
 */
interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
  clientVersion?: string;
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
 * Bắt TẤT CẢ exceptions và ghi log vào database + console
 * - Log to console for development debugging
 * - Log to database for production monitoring
 * - Handle Prisma errors specifically
 * - Capture full request context
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly systemLogService: SystemLogService) { }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    // Parse the error
    const errorInfo = this.parseException(exception);

    // Always log to console for visibility
    this.logToConsole(errorInfo, request);

    // Log to database async (fire-and-forget)
    this.logToDatabase(errorInfo, request);

    // Return response to client
    response.status(errorInfo.status).json({
      statusCode: errorInfo.status,
      message: errorInfo.clientMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Parse exception và trả về thông tin chi tiết
   */
  private parseException(exception: unknown): {
    status: number;
    message: string;
    clientMessage: string;
    errorType: string;
    stack?: string;
    errorResponse?: unknown;
    prismaCode?: string;
    prismaMeta?: Record<string, unknown>;
  } {
    // HttpException (từ NestJS)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as { message?: string })?.message || exception.message;

      return {
        status,
        message: exception.message,
        clientMessage: message,
        errorType: 'HttpException',
        stack: exception.stack,
        errorResponse: response,
      };
    }

    // Prisma Errors
    if (this.isPrismaError(exception)) {
      const prismaError = exception as PrismaError;
      const parsed = this.parsePrismaError(prismaError);
      return {
        status: parsed.status,
        message: prismaError.message,
        clientMessage: parsed.clientMessage,
        errorType: `PrismaError:${prismaError.code || 'Unknown'}`,
        stack: prismaError.stack,
        prismaCode: prismaError.code,
        prismaMeta: prismaError.meta,
      };
    }

    // Generic Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        clientMessage: 'Internal server error',
        errorType: exception.constructor.name,
        stack: exception.stack,
      };
    }

    // Unknown error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: String(exception),
      clientMessage: 'Internal server error',
      errorType: 'UnknownError',
    };
  }

  /**
   * Check if error is a Prisma error
   */
  private isPrismaError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const name = error.constructor?.name || '';
    return (
      name.includes('Prisma') ||
      name.includes('PrismaClient') ||
      (error as PrismaError).clientVersion !== undefined
    );
  }

  /**
   * Parse Prisma error để tạo user-friendly message
   */
  private parsePrismaError(error: PrismaError): {
    status: number;
    clientMessage: string;
  } {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          clientMessage: 'A record with this value already exists',
        };
      case 'P2003': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          clientMessage: 'Related record not found',
        };
      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          clientMessage: 'Record not found',
        };
      case 'P2024': // Connection timeout
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          clientMessage: 'Database connection timeout',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          clientMessage: 'Database error occurred',
        };
    }
  }

  /**
   * Log to console with colors for development
   */
  private logToConsole(
    errorInfo: {
      status: number;
      message: string;
      errorType: string;
      stack?: string;
      prismaCode?: string;
    },
    request: RequestWithUser,
  ): void {
    const isServerError = errorInfo.status >= 500;
    const logMethod = isServerError ? 'error' : 'warn';

    // Create a structured log message
    const logMessage = [
      '',
      '═══════════════════════════════════════════════════════════',
      `🚨 ${errorInfo.errorType} [${errorInfo.status}]`,
      '═══════════════════════════════════════════════════════════',
      `📍 ${request.method} ${request.url}`,
      `💬 ${errorInfo.message}`,
      errorInfo.prismaCode ? `🔗 Prisma Code: ${errorInfo.prismaCode}` : '',
      `👤 User: ${request.user?.userId || 'Anonymous'}`,
      `🌐 IP: ${extractIpAddress(request)}`,
      '───────────────────────────────────────────────────────────',
    ]
      .filter(Boolean)
      .join('\n');

    this.logger[logMethod](logMessage);

    // Also log stack trace for server errors
    if (isServerError && errorInfo.stack) {
      this.logger.error('Stack Trace:\n' + errorInfo.stack);
    }
  }

  /**
   * Log to database async (fire-and-forget)
   */
  private logToDatabase(
    errorInfo: {
      status: number;
      message: string;
      clientMessage: string;
      errorType: string;
      stack?: string;
      errorResponse?: unknown;
      prismaCode?: string;
      prismaMeta?: Record<string, unknown>;
    },
    request: RequestWithUser,
  ): void {
    const logLevel = errorInfo.status >= 500 ? 'ERROR' : 'WARN';

    this.systemLogService.logAsync({
      level: logLevel,
      module: 'http',
      action: 'exception',
      message: `[${errorInfo.status}] ${request.method} ${request.url} - ${errorInfo.message}`,
      userId: request.user?.userId,
      ipAddress: extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      metaData: {
        // Error info
        statusCode: errorInfo.status,
        errorType: errorInfo.errorType,
        errorMessage: errorInfo.message,
        errorResponse:
          typeof errorInfo.errorResponse === 'object'
            ? errorInfo.errorResponse
            : undefined,
        stack: errorInfo.stack,
        prismaCode: errorInfo.prismaCode,
        prismaMeta: errorInfo.prismaMeta,

        // Request info
        method: request.method,
        url: request.url,
        path: request.path,
        query: request.query,
        params: request.params,
        body: this.sanitizeBody(request.body),
        headers: this.sanitizeHeaders(request.headers),

        // Timestamp
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Loại bỏ các trường nhạy cảm từ request body
   */
  private sanitizeBody(
    body: Record<string, unknown>,
  ): Record<string, unknown> {
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
      'accessToken',
      'refreshToken',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Loại bỏ các headers nhạy cảm
   */
  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
