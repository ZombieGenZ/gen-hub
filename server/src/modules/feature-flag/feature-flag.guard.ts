import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from './feature-flag.service';
import { Request } from 'express';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(FeatureFlagGuard.name);

  // Explicitly excluded paths prefix
  private readonly excludedPaths = ['/health', '/api-docs'];

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const path = request.path;

    // 1. Check exclusions (always allow these)
    if (this.isExcluded(path)) {
      return true;
    }

    // 2. Get the route pattern (e.g., /users/:id)
    // request.route is populated by Express after the router has matched the URL
    const routePath = request.route?.path;

    // If no route matched (e.g. 404), we allow it (let the global 404 handler deal with it)
    if (!routePath) {
      return true;
    }

    // 3. Normalize the route pattern to match Swagger/DB format
    // Convert Express style "/users/:id" to Swagger style "/users/{id}"
    const normalizedPath = this.normalizeToSwaggerPath(routePath);

    // 4. Check if this specific route pattern is enabled
    const isEnabled = this.featureFlagService.isRouteEnabled(
      method,
      normalizedPath,
    );

    if (!isEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Chức năng này đã bị vô hiệu hóa',
        error: 'FEATURE_DISABLED',
        path: `${method} ${path}`,
      });
    }

    return true;
  }

  private isExcluded(path: string): boolean {
    const normalized = path.startsWith('/') ? path : '/' + path;
    return this.excludedPaths.some((prefix) => normalized.startsWith(prefix));
  }

  private normalizeToSwaggerPath(expressPath: string): string {
    // Convert path parameters from :param to {param}
    // Example: /api/v1/users/:id -> /api/v1/users/{id}
    // Also ensure it starts with /
    let normalized = expressPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    return normalized;
  }
}
