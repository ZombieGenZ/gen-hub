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
import { ResponseCode } from '../responses';

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
    const responseBody: Record<string, unknown> = {
      code: errorInfo.code,
      message: errorInfo.clientMessage,
      success: false,
    };

    // Thêm errors array nếu có
    if (errorInfo.errors && errorInfo.errors.length > 0) {
      responseBody.errors = errorInfo.errors;
    }

    response.status(errorInfo.status).json(responseBody);
  }

  /**
   * Error item trong response
   */
  private parseException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    clientMessage: string;
    errorType: string;
    stack?: string;
    errorResponse?: unknown;
    prismaCode?: string;
    prismaMeta?: Record<string, unknown>;
    errors?: Array<{ field: string; message: string }>;
  } {
    // HttpException (từ NestJS)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // Check if response is custom format with code and message
      if (typeof response === 'object' && response !== null) {
        const customResponse = response as { code?: string; message?: string; success?: boolean; data?: unknown };

        // Nếu response có custom code (từ BruteForceGuard hoặc các guard khác)
        if (customResponse.code && customResponse.message) {
          return {
            status,
            code: customResponse.code,
            message: exception.message,
            clientMessage: customResponse.message,
            errorType: 'HttpException',
            stack: exception.stack,
            errorResponse: response,
          };
        }
      }

      const rawMessage = (response as { message?: unknown })?.message;

      // ValidationPipe trả về message là mảng các lỗi
      if (Array.isArray(rawMessage)) {
        const errors = rawMessage.map((msg: string) => ({
          field: 'unknown',
          message: msg,
        }));
        return {
          status,
          code: this.getHttpErrorCode(status),
          message: exception.message,
          clientMessage: rawMessage[0] || exception.message,
          errorType: 'HttpException',
          stack: exception.stack,
          errorResponse: response,
          errors,
        };
      }

      const message =
        typeof response === 'string'
          ? response
          : (rawMessage as string | undefined) || exception.message;

      return {
        status,
        code: this.getHttpErrorCode(status),
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
        code: parsed.code,
        message: prismaError.message,
        clientMessage: parsed.clientMessage,
        errorType: `PrismaError:${prismaError.code || 'Unknown'}`,
        stack: prismaError.stack,
        prismaCode: prismaError.code,
        prismaMeta: prismaError.meta,
        errors: parsed.errors,
      };
    }

    // Generic Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ResponseCode.ERROR_INTERNAL,
        message: exception.message,
        clientMessage: 'Internal server error',
        errorType: exception.constructor.name,
        stack: exception.stack,
      };
    }

    // Unknown error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ResponseCode.ERROR_UNKNOWN,
      message: String(exception),
      clientMessage: 'Internal server error',
      errorType: 'UnknownError',
    };
  }

  /**
   * Get error code from HTTP status
   */
  private getHttpErrorCode(status: number): ResponseCode | string {
    const codeMap: Record<number, ResponseCode> = {
      400: ResponseCode.ERROR_BAD_REQUEST,
      401: ResponseCode.ERROR_UNAUTHORIZED,
      403: ResponseCode.ERROR_FORBIDDEN,
      404: ResponseCode.ERROR_NOT_FOUND,
      409: ResponseCode.ERROR_CONFLICT,
      429: ResponseCode.ERROR_TOO_MANY_REQUESTS,
      500: ResponseCode.ERROR_INTERNAL,
      503: ResponseCode.ERROR_SERVICE_UNAVAILABLE,
    };
    return codeMap[status] || `error.http_${status}`;
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
    code: string;
    clientMessage: string;
    errors?: Array<{ field: string; message: string }>;
  } {
    // Lấy tên entity từ meta nếu có
    const entityName = this.extractEntityName(error.meta);

    switch (error.code) {
      case 'P2002': { // Unique constraint violation
        const target = error.meta?.target;
        const fieldName = Array.isArray(target) ? target[0] : target;
        const message = fieldName
          ? `Giá trị ${fieldName} đã tồn tại`
          : 'Dữ liệu đã tồn tại trong hệ thống';
        return {
          status: HttpStatus.CONFLICT,
          code: ResponseCode.ERROR_DUPLICATE,
          clientMessage: 'Dữ liệu đầu vào không hợp lệ',
          errors: [{
            field: fieldName as string || 'unknown',
            message,
          }],
        };
      }
      case 'P2003': { // Foreign key constraint violation
        const fieldName = error.meta?.field_name as string | undefined;
        const cleanFieldName = fieldName
          ? fieldName.replace('_id', '').replace(/_/g, ' ')
          : 'unknown';
        const message = fieldName
          ? `ID ${cleanFieldName} không hợp lệ`
          : 'Dữ liệu liên quan không tồn tại';
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ResponseCode.ERROR_VALIDATION,
          clientMessage: 'Dữ liệu đầu vào không hợp lệ',
          errors: [{
            field: fieldName || 'unknown',
            message,
          }],
        };
      }
      case 'P2025': { // Record not found
        const fieldName = this.extractFieldName(error.meta) || 'id';
        const message = entityName
          ? `${entityName} không tồn tại`
          : 'Dữ liệu không tồn tại';
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ResponseCode.ERROR_VALIDATION,
          clientMessage: 'Dữ liệu đầu vào không hợp lệ',
          errors: [{
            field: fieldName,
            message,
          }],
        };
      }
      case 'P2024': // Connection timeout
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          code: ResponseCode.ERROR_DATABASE_CONNECTION,
          clientMessage: 'Lỗi kết nối cơ sở dữ liệu',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ResponseCode.ERROR_DATABASE,
          clientMessage: 'Lỗi cơ sở dữ liệu',
        };
    }
  }

  /**
   * Trích xuất field name từ Prisma error meta
   */
  private extractFieldName(meta?: Record<string, unknown>): string | null {
    if (!meta) return null;

    // Thử lấy từ cause - ví dụ: "...on 'WarehouseTemplate' record(s)) was found for a nested connect on one-to-many relation 'WardToWarehouseTemplate'"
    const cause = meta.cause as string | undefined;
    if (cause && typeof cause === 'string') {
      // Tìm relation name và extract field từ đó
      const relationMatch = cause.match(/relation '(\w+)To(\w+)'/i);
      if (relationMatch) {
        // Chuyển PascalCase thành snake_case + _id
        const entityName = relationMatch[1];
        return this.toSnakeCase(entityName) + '_id';
      }
    }

    return null;
  }

  /**
   * Chuyển PascalCase thành snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  /**
   * Trích xuất tên entity từ Prisma error meta
   * Ưu tiên lấy từ cause (entity thực sự bị lỗi) trước modelName (entity đang thao tác)
   */
  private extractEntityName(meta?: Record<string, unknown>): string | null {
    if (!meta) return null;

    // Ưu tiên lấy từ cause trước - đây là entity thực sự bị thiếu
    const cause = meta.cause as string | undefined;
    if (cause && typeof cause === 'string') {
      // Extract model name from messages like "No 'Ward' record..."
      const match = cause.match(/No '(\w+)' record/i);
      if (match) {
        return this.formatModelName(match[1]);
      }
    }

    // Fallback: lấy từ modelName nếu không tìm thấy trong cause
    const modelName = meta.modelName as string | undefined;
    if (modelName) {
      return this.formatModelName(modelName);
    }

    return null;
  }

  /**
   * Format model name thành dạng hiển thị
   */
  private formatModelName(modelName: string): string {
    const modelNameMap: Record<string, string> = {
      'User': 'Người dùng',
      'Product': 'Sản phẩm',
      'Category': 'Danh mục',
      'Order': 'Đơn hàng',
      'Warehouse': 'Kho hàng',
      'WarehouseTemplate': 'Template kho',
      'Ward': 'Phường/Xã',
      'District': 'Quận/Huyện',
      'Province': 'Tỉnh/Thành phố',
      'RefreshToken': 'Phiên đăng nhập',
      'BackupCode': 'Mã backup',
      'SystemLog': 'Log hệ thống',
    };

    return modelNameMap[modelName] || modelName;
  }

  /**
   * Log to console with colors for development
   * Chỉ log chi tiết cho server errors (5xx) và Prisma errors
   * Bỏ qua client errors (4xx) để tránh spam console
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
    const isPrismaError = !!errorInfo.prismaCode;

    // Chỉ log chi tiết cho server errors và Prisma errors
    // Bỏ qua client errors (4xx) để không spam console
    if (!isServerError && !isPrismaError) {
      return;
    }

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

    this.logger.error(logMessage);

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
