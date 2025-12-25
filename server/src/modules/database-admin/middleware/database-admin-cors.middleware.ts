import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DatabaseAdminCorsMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const allowedOrigin =
            this.configService.get<string>('DATABASE_ADMIN_CORS_ORIGIN') ||
            'http://localhost:3001';

        res.header('Access-Control-Allow-Origin', allowedOrigin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
        res.header(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, X-Requested-With',
        );
        res.header('Access-Control-Expose-Headers', 'Content-Disposition');

        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    }
}
