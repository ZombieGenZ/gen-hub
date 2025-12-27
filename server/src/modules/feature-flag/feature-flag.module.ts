import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';
import { FeatureFlagMiddleware } from './feature-flag.middleware';

@Module({
    controllers: [FeatureFlagController],
    providers: [FeatureFlagService],
    exports: [FeatureFlagService],
})
export class FeatureFlagModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(FeatureFlagMiddleware)
            .exclude(
                // Feature flag admin APIs
                { path: 'admin/feature-flags', method: RequestMethod.ALL },
                { path: 'admin/feature-flags/*splat', method: RequestMethod.ALL },
                // Auth APIs
                { path: 'auth', method: RequestMethod.ALL },
                { path: 'auth/*splat', method: RequestMethod.ALL },
                // Health check
                { path: 'health', method: RequestMethod.GET },
                // Swagger docs
                { path: 'api-docs', method: RequestMethod.ALL },
                { path: 'api-docs/*splat', method: RequestMethod.ALL },
                { path: 'api-docs-json', method: RequestMethod.GET },
                { path: 'api-docs-apikey', method: RequestMethod.ALL },
                { path: 'api-docs-apikey/*splat', method: RequestMethod.ALL },
                { path: 'api-docs-apikey-json', method: RequestMethod.GET },
            )
            .forRoutes('*');
    }
}

