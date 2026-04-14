import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators';

@ApiTags('Admin Panel')
@ApiExcludeController()
@Public()
@Controller('admin')
export class AdminPanelFallbackController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getAdminPanel(@Res() res: Response) {
    const adminPanelEnabled = this.configService.get<string>('ADMIN_PANEL_ENABLED');
    const isEnabled = ['true', '1', 'yes', 'on'].includes(adminPanelEnabled?.trim().toLowerCase() || 'false');

    if (!isEnabled) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Panel Disabled | GEN-HUB</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #1E293B;
            }
            .container {
              text-align: center;
              padding: 2rem;
              max-width: 600px;
            }
            .icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 2rem;
              color: #EF4444;
            }
            h1 {
              font-size: 3rem;
              font-weight: 700;
              color: #EF4444;
              margin-bottom: 1rem;
            }
            h2 {
              font-size: 1.5rem;
              font-weight: 600;
              color: #334155;
              margin-bottom: 1rem;
            }
            p {
              font-size: 1.125rem;
              color: #64748B;
              margin-bottom: 2rem;
              line-height: 1.6;
            }
            .card {
              background: #FFFFFF;
              border-radius: 1rem;
              padding: 3rem 2rem;
              box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
              border: 1px solid #E2E8F0;
            }
            .badge {
              display: inline-block;
              padding: 0.375rem 0.75rem;
              background: #FEE2E2;
              color: #DC2626;
              border-radius: 9999px;
              font-size: 0.875rem;
              font-weight: 600;
              margin-bottom: 1.5rem;
            }
            code {
              background: #F1F5F9;
              padding: 0.25rem 0.5rem;
              border-radius: 0.25rem;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
                color: #F1F5F9;
              }
              .card {
                background: #334155;
                border-color: #475569;
              }
              h1 { color: #EF4444; }
              h2 { color: #CBD5E1; }
              p { color: #94A3B8; }
              .badge {
                background: #7F1D1D;
                color: #FCA5A5;
              }
              code {
                background: #1E293B;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <div class="badge">DISABLED</div>
              <h1>Admin Panel</h1>
              <h2>Trang quản trị đang bị vô hiệu hóa</h2>
              <p>Để bật trang quản trị, hãy đặt biến môi trường <code>ADMIN_PANEL_ENABLED=true</code> trong file .env</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // If enabled, redirect to AdminJS login
    return res.redirect('/admin/login');
  }
}
