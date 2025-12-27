import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';
import { FeatureFlagGuard } from './feature-flag.guard';

@Module({
    controllers: [FeatureFlagController],
    providers: [
        FeatureFlagService,
        {
            provide: APP_GUARD,
            useClass: FeatureFlagGuard,
        },
    ],
    exports: [FeatureFlagService],
})
export class FeatureFlagModule { }

