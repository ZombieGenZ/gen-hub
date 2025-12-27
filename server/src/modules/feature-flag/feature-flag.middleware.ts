import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from './feature-flag.service';

@Injectable()
export class FeatureFlagMiddleware implements NestMiddleware {
    constructor(private readonly featureFlagService: FeatureFlagService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const method = req.method;
        const path = req.path;

        // Check from in-memory cache (instant, no DB call)
        const isEnabled = this.featureFlagService.isRouteEnabled(method, path);

        if (!isEnabled) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'API endpoint is currently disabled',
                error: 'FEATURE_DISABLED',
                path: `${method} ${path}`,
            });
        }

        next();
    }
}
