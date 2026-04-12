import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { SystemLogService } from '../../modules/system-log/system-log.service';
import {
  extractIpAddress,
  sanitizeHeaders,
  sanitizeHttpValue,
} from '../utils/http-log.util';

interface RequestWithUser extends Request {
  user?: { userId?: string };
  apiKey?: Record<string, unknown>;
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly systemLogService: SystemLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse<Response>();

    if (this.shouldSkipLogging(request)) {
      return next.handle();
    }

    const startTime = Date.now();
    let responseBody: unknown;
    const restoreResponse = this.captureResponseBody(response, (body) => {
      responseBody = body;
    });

    response.once('finish', () => {
      restoreResponse();
      const duration = Date.now() - startTime;
      this.logRequest(request, response, responseBody, duration);
    });

    response.once('close', () => {
      restoreResponse();
    });

    return next.handle();
  }

  private captureResponseBody(
    response: Response,
    onBody: (body: unknown) => void,
  ): () => void {
    const originalJson = response.json.bind(response);
    const originalSend = response.send.bind(response);

    response.json = ((body: unknown) => {
      onBody(body);
      return originalJson(body);
    }) as Response['json'];

    response.send = ((body: unknown) => {
      onBody(body);
      return originalSend(body);
    }) as Response['send'];

    return () => {
      response.json = originalJson;
      response.send = originalSend;
    };
  }

  private logRequest(
    request: RequestWithUser,
    response: Response,
    responseBody: unknown,
    duration: number,
  ): void {
    const statusCode = response.statusCode;

    this.systemLogService.logAsync({
      level: 'INFO',
      module: 'http',
      action: 'request',
      message: `[${statusCode}] ${request.method} ${request.url} - ${duration}ms`,
      userId: request.user?.userId,
      ipAddress: extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      metaData: {
        request: {
          method: request.method,
          url: request.url,
          path: request.path,
          params: sanitizeHttpValue(request.params),
          query: sanitizeHttpValue(request.query),
          body: sanitizeHttpValue(request.body),
          headers: sanitizeHeaders(request.headers as Record<string, unknown>),
          user: sanitizeHttpValue(request.user),
          apiKey: sanitizeHttpValue(request.apiKey),
        },
        response: {
          statusCode,
          headers: sanitizeHeaders(
            response.getHeaders() as Record<string, unknown>,
          ),
          body: sanitizeHttpValue(responseBody),
        },
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  }

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

    if (skipPaths.some((path) => request.path === path)) {
      return true;
    }

    if (skipExtensions.some((ext) => request.path.endsWith(ext))) {
      return true;
    }

    return false;
  }
}
