import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminPanelService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Initialize admin panel resources if needed
  }

  async onModuleDestroy() {
    // Cleanup resources if needed
  }

  isAdminPanelEnabled(): boolean {
    const adminPanelEnabled = this.configService.get<string>('ADMIN_PANEL_ENABLED');
    return ['true', '1', 'yes', 'on'].includes(adminPanelEnabled?.trim().toLowerCase() || 'false');
  }
}
