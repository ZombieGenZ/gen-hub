import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createAdminJS } from './adminjs.config';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelFallbackController } from './admin-panel-fallback.controller';

@Module({
  imports: [
    AdminModule.createAdminAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Check if admin panel is enabled
        const adminPanelEnabled = configService.get<string>('ADMIN_PANEL_ENABLED');
        const isEnabled = ['true', '1', 'yes', 'on'].includes(adminPanelEnabled?.trim().toLowerCase() || 'false');

        if (!isEnabled) {
          // Return config with shouldBeInitialized: false to skip AdminJS initialization
          return {
            adminJsOptions: {
              rootPath: '/admin',
              resources: [],
            },
            path: '/admin',
            shouldBeInitialized: false,
          };
        }

        const cookieSecret = configService.get<string>('ADMIN_COOKIE_SECRET') || 'gen-hub-admin-secret-change-this-in-production';
        const { admin, auth, sessionOptions } = await createAdminJS(cookieSecret);

        return {
          adminJsOptions: admin.options,
          path: '/admin',
          auth,
          sessionOptions,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AdminPanelService],
  controllers: [AdminPanelFallbackController],
  exports: [AdminPanelService],
})
export class AdminPanelModule {}
