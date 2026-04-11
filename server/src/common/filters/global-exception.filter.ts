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

interface RequestWithUser extends Request {
  user?: { userId?: string };
}

interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
  clientVersion?: string;
}

interface ParsedException {
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
  extraFields?: Record<string, unknown>;
}

interface ParsedPrismaError {
  status: number;
  code: string;
  clientMessage: string;
  detailMessage: string;
  errors?: Array<{ field: string; message: string }>;
}

function extractIpAddress(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  return request.socket?.remoteAddress || request.ip || 'unknown';
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly systemLogService: SystemLogService) { }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    const errorInfo = this.parseException(exception);

    this.logToConsole(errorInfo, request);
    this.logToDatabase(errorInfo, request);

    const responseBody: Record<string, unknown> = {
      code: errorInfo.code,
      message: errorInfo.clientMessage,
      success: false,
      ...errorInfo.extraFields,
    };

    if (errorInfo.errors && errorInfo.errors.length > 0) {
      responseBody.errors = errorInfo.errors;
    }

    response.status(errorInfo.status).json(responseBody);
  }

  private shouldExposeDatabaseErrorDetail(): boolean {
    const value = process.env.EXPOSE_DATABASE_ERROR_DETAIL;

    if (value === undefined) {
      return false;
    }

    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  private parseException(exception: unknown): ParsedException {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const customResponse = response as {
          code?: string;
          message?: string;
          success?: boolean;
          data?: unknown;
          [key: string]: unknown;
        };

        if (customResponse.code && customResponse.message) {
          const {
            code: _code,
            message: _message,
            success: _success,
            data: _data,
            ...extraFields
          } = customResponse;

          return {
            status,
            code: customResponse.code,
            message: exception.message,
            clientMessage: customResponse.message,
            errorType: 'HttpException',
            stack: exception.stack,
            errorResponse: response,
            extraFields:
              Object.keys(extraFields).length > 0 ? extraFields : undefined,
          };
        }
      }

      const rawMessage = (response as { message?: unknown })?.message;

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
        extraFields: this.shouldExposeDatabaseErrorDetail()
          ? { detail: parsed.detailMessage || prismaError.message }
          : undefined,
      };
    }

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

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ResponseCode.ERROR_UNKNOWN,
      message: String(exception),
      clientMessage: 'Internal server error',
      errorType: 'UnknownError',
    };
  }

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

  private isPrismaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const name = error.constructor?.name || '';
    return (
      name.includes('Prisma') ||
      name.includes('PrismaClient') ||
      (error as PrismaError).clientVersion !== undefined
    );
  }

  private parsePrismaError(error: PrismaError): ParsedPrismaError {
    const entityName = this.extractEntityName(error.meta);

    switch (error.code) {
      case 'P2002': {
        const target = error.meta?.target;
        const fieldName = Array.isArray(target) ? target[0] : target;
        const fieldLabel = typeof fieldName === 'string' ? fieldName : 'unknown';
        const message =
          fieldLabel !== 'unknown'
            ? `Giá trị ${fieldLabel} đã tồn tại`
            : 'Dữ liệu đã tồn tại trong hệ thống';

        return {
          status: HttpStatus.CONFLICT,
          code: ResponseCode.ERROR_DUPLICATE,
          clientMessage: 'Dữ liệu đầu vào không hợp lệ',
          detailMessage:
            fieldLabel !== 'unknown'
              ? `Vi phạm ràng buộc duy nhất tại trường ${fieldLabel}`
              : 'Bản ghi đang vi phạm ràng buộc duy nhất trong cơ sở dữ liệu',
          errors: [
            {
              field: fieldLabel,
              message,
            },
          ],
        };
      }
      case 'P2003': {
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
          detailMessage: fieldName
            ? `Khóa ngoại tại trường ${fieldName} không hợp lệ hoặc bản ghi liên quan không tồn tại`
            : 'Bản ghi liên quan không tồn tại hoặc khóa ngoại không hợp lệ',
          errors: [
            {
              field: fieldName || 'unknown',
              message,
            },
          ],
        };
      }
      case 'P2025': {
        const fieldName = this.extractFieldName(error.meta) || 'id';
        const message = entityName
          ? `${entityName} không tồn tại`
          : 'Dữ liệu không tồn tại';

        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ResponseCode.ERROR_VALIDATION,
          clientMessage: 'Dữ liệu đầu vào không hợp lệ',
          detailMessage: entityName
            ? `Không tìm thấy ${entityName} hoặc bản ghi liên quan để hoàn thành thao tác`
            : 'Không tìm thấy bản ghi cần thiết để hoàn thành thao tác',
          errors: [
            {
              field: fieldName,
              message,
            },
          ],
        };
      }
      case 'P2024':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          code: ResponseCode.ERROR_DATABASE_CONNECTION,
          clientMessage: 'Lỗi kết nối cơ sở dữ liệu',
          detailMessage: 'Kết nối tới cơ sở dữ liệu bị timeout',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ResponseCode.ERROR_DATABASE,
          clientMessage: 'Lỗi cơ sở dữ liệu',
          detailMessage:
            error.message ||
            'Đã xảy ra lỗi không xác định khi thao tác với cơ sở dữ liệu',
        };
    }
  }

  private extractFieldName(meta?: Record<string, unknown>): string | null {
    if (!meta) {
      return null;
    }

    const cause = meta.cause as string | undefined;
    if (cause && typeof cause === 'string') {
      const relationMatch = cause.match(/relation '(\w+)To(\w+)'/i);
      if (relationMatch) {
        const entityName = relationMatch[1];
        return this.toSnakeCase(entityName) + '_id';
      }
    }

    return null;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private extractEntityName(meta?: Record<string, unknown>): string | null {
    if (!meta) {
      return null;
    }

    const cause = meta.cause as string | undefined;
    if (cause && typeof cause === 'string') {
      const match = cause.match(/No '(\w+)' record/i);
      if (match) {
        return this.formatModelName(match[1]);
      }
    }

    const modelName = meta.modelName as string | undefined;
    if (modelName) {
      return this.formatModelName(modelName);
    }

    return null;
  }

  private formatModelName(modelName: string): string {
    const modelNameMap: Record<string, string> = {
      User: 'Người dùng',
      Product: 'Sản phẩm',
      Category: 'Danh mục',
      Order: 'Đơn hàng',
      Warehouse: 'Kho hàng',
      WarehouseTemplate: 'Template kho',
      Ward: 'Phường/Xã',
      District: 'Quận/Huyện',
      Province: 'Tỉnh/Thành phố',
      RefreshToken: 'Phiên đăng nhập',
      BackupCode: 'Mã backup',
      SystemLog: 'Log hệ thống',
    };

    return modelNameMap[modelName] || modelName;
  }

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

    if (!isServerError && !isPrismaError) {
      return;
    }

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

    if (isServerError && errorInfo.stack) {
      this.logger.error('Stack Trace:\n' + errorInfo.stack);
    }
  }

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
        method: request.method,
        url: request.url,
        path: request.path,
        query: request.query,
        params: request.params,
        body: this.sanitizeBody(request.body),
        headers: this.sanitizeHeaders(request.headers),
        timestamp: new Date().toISOString(),
      },
    });
  }

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
