import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { EmailService } from '../notification/email.service';
import { GeminiService } from '../ai-hub/services/gemini.service';
import { InventoryAlertRepository } from './inventory-alert.repository';
import { CreateAlertConfigDto } from './dto/create-alert-config.dto';
import { QueryAlertDto, QueryAlertConfigDto } from './dto/query-alert.dto';

@Injectable()
export class InventoryAlertService {
  private readonly logger = new Logger(InventoryAlertService.name);

  constructor(
    private readonly repo: InventoryAlertRepository,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly websocket: WebsocketGateway,
    private readonly emailService: EmailService,
    private readonly geminiService: GeminiService,
    private readonly config: ConfigService,
  ) {}

  // ── Config management ──────────────────────────────────────────────────────

  async upsertConfig(organizationId: string, dto: CreateAlertConfigDto, userId: string) {
    const config = await this.repo.upsertConfig({
      organization_id: organizationId,
      warehouse_id: dto.warehouse_id,
      product_id: dto.product_id,
      min_quantity: dto.min_quantity ?? 0,
      reorder_point: dto.reorder_point ?? 0,
      lead_time_days: dto.lead_time_days ?? 3,
      is_active: dto.is_active ?? true,
      created_by: userId,
      updated_by: userId,
    });

    await this.invalidateConfigCache(organizationId);
    return config;
  }

  async listConfigs(organizationId: string, query: QueryAlertConfigDto) {
    return this.repo.findAllConfigs(organizationId, query.warehouse_id);
  }

  async deleteConfig(organizationId: string, configId: string, userId: string) {
    const config = await this.prisma.inventoryAlertConfig.findFirst({
      where: { id: configId, organization_id: organizationId, is_deleted: false },
    });
    if (!config) throw new NotFoundException('Cấu hình cảnh báo không tồn tại');

    await this.repo.deleteConfig(configId, userId);
    await this.invalidateConfigCache(organizationId);
    return { success: true };
  }

  // ── Alert queries ──────────────────────────────────────────────────────────

  async listAlerts(organizationId: string, query: QueryAlertDto) {
    return this.repo.findActiveAlerts(organizationId, query.warehouse_id, query.is_resolved);
  }

  async resolveAlert(organizationId: string, alertId: string, userId: string) {
    const alert = await this.prisma.inventoryAlert.findFirst({
      where: { id: alertId, organization_id: organizationId },
    });
    if (!alert) throw new NotFoundException('Cảnh báo không tồn tại');

    return this.repo.resolveAlert(alertId, userId);
  }

  async getAlertStats(organizationId: string) {
    const unresolved = await this.repo.countUnresolved(organizationId);
    return { unresolved_count: unresolved };
  }

  // ── Scheduled job: runs every 6 hours ──────────────────────────────────────

  @Cron('0 */6 * * *')
  async runStockoutScan() {
    this.logger.log('Bắt đầu quét tồn kho cảnh báo hết hàng...');
    try {
      const configs = await this.prisma.inventoryAlertConfig.findMany({
        where: { is_active: true, is_deleted: false },
      });

      this.logger.log(`Quét ${configs.length} cấu hình cảnh báo`);

      for (const config of configs) {
        await this.evaluateAlertConfig(config);
      }
    } catch (err) {
      this.logger.error('Lỗi khi quét tồn kho:', err);
    }
  }

  private async evaluateAlertConfig(config: {
    id: string;
    organization_id: string;
    warehouse_id: string;
    product_id: string;
    min_quantity: unknown;
    reorder_point: unknown;
    lead_time_days: number;
  }) {
    const [stockData, avgDailyOutbound] = await Promise.all([
      this.repo.getInventoryStockData(config.organization_id, config.warehouse_id, config.product_id),
      this.repo.getOutboundVelocity(config.organization_id, config.warehouse_id, config.product_id),
    ]);

    const currentQty = Number(stockData._sum.quantity_available ?? 0);
    const minQty = Number(config.min_quantity);
    const reorderPoint = Number(config.reorder_point);
    const velocity = avgDailyOutbound;

    const isLowByMinQty = currentQty <= minQty;
    const daysUntilStockout = velocity > 0 ? Math.floor(currentQty / velocity) : 999;
    const isLowByDays = daysUntilStockout <= config.lead_time_days;
    const isLowByReorder = reorderPoint > 0 && currentQty <= reorderPoint;

    if (!isLowByMinQty && !isLowByDays && !isLowByReorder) {
      const existingAlert = await this.prisma.inventoryAlert.findFirst({
        where: {
          organization_id: config.organization_id,
          warehouse_id: config.warehouse_id,
          product_id: config.product_id,
          is_resolved: false,
        },
      });
      if (existingAlert) {
        await this.repo.resolveAlert(existingAlert.id, 'SYSTEM');
      }
      return;
    }

    // ── Lấy tên product/warehouse song song ──────────────────────────────────
    const [productName, warehouseName] = await Promise.all([
      this.repo.getProductName(config.product_id),
      this.repo.getWarehouseName(config.warehouse_id),
    ]);

    // ── EOQ — gợi ý số lượng đặt hàng ───────────────────────────────────────
    const recommendedOrderQty = velocity > 0
      ? Math.ceil(velocity * (config.lead_time_days + 7))
      : 0;

    // ── AI suggestion từ Gemini (fallback về template nếu Gemini tắt) ────────
    const aiSuggestion = await this.generateAiSuggestion({
      productName,
      warehouseName,
      currentQty,
      velocity,
      daysUntilStockout,
      leadTimeDays: config.lead_time_days,
      recommendedOrderQty,
    });

    const alert = await this.repo.upsertAlert({
      organization_id: config.organization_id,
      warehouse_id: config.warehouse_id,
      product_id: config.product_id,
      current_quantity: currentQty,
      avg_daily_outbound: velocity,
      days_until_stockout: daysUntilStockout === 999 ? 0 : daysUntilStockout,
      ai_prediction: `Tốc độ xuất TB: ${velocity.toFixed(2)}/ngày. Đề xuất đặt ${recommendedOrderQty} đơn vị.`,
      ai_suggestion: aiSuggestion,
    });

    // ── Debounce: chỉ gửi thông báo nếu chưa notify trong 6 giờ ─────────────
    const shouldNotify = this.shouldSendNotification(alert.notified_at);
    if (!shouldNotify) {
      this.logger.log(`Skip notify cho ${productName} — đã thông báo gần đây`);
      return;
    }

    // ── Emit WebSocket real-time ──────────────────────────────────────────────
    this.websocket.server.emit(`org:${config.organization_id}:inventory-alert`, {
      alert_id: alert.id,
      product_id: config.product_id,
      product_name: productName,
      warehouse_id: config.warehouse_id,
      warehouse_name: warehouseName,
      days_until_stockout: daysUntilStockout === 999 ? 0 : daysUntilStockout,
      current_quantity: currentQty,
      ai_suggestion: aiSuggestion,
      recommended_order_qty: recommendedOrderQty,
    });

    // ── Gửi email đến warehouse managers ─────────────────────────────────────
    await this.sendAlertEmails({
      warehouseId: config.warehouse_id,
      productName,
      warehouseName,
      currentQty,
      daysUntilStockout,
      aiSuggestion,
      recommendedOrderQty,
    });

    await this.repo.markNotified(alert.id);
    this.logger.log(`Đã thông báo cảnh báo cho sản phẩm ${productName}`);
  }

  private async generateAiSuggestion(params: {
    productName: string;
    warehouseName: string;
    currentQty: number;
    velocity: number;
    daysUntilStockout: number;
    leadTimeDays: number;
    recommendedOrderQty: number;
  }): Promise<string> {
    const { productName, warehouseName, currentQty, velocity, daysUntilStockout, leadTimeDays, recommendedOrderQty } = params;

    if (this.geminiService.enabled) {
      const prompt = `Bạn là hệ thống quản lý kho. Hãy viết 2-3 câu cảnh báo tồn kho ngắn gọn bằng tiếng Việt, thực tế và rõ ràng.

Thông tin:
- Sản phẩm: ${productName}
- Kho: ${warehouseName}
- Tồn kho hiện tại: ${currentQty} đơn vị
- Tốc độ xuất trung bình: ${velocity.toFixed(1)} đơn vị/ngày
- Dự kiến hết hàng: ${daysUntilStockout <= 0 ? 'ĐÃ HẾT HÀNG' : `sau ${daysUntilStockout} ngày`}
- Thời gian nhập hàng mới: ${leadTimeDays} ngày
- Gợi ý đặt hàng: ${recommendedOrderQty} đơn vị

Yêu cầu: Viết cảnh báo ngắn gọn, nêu rõ mức độ khẩn cấp và hành động cần làm. Không dùng emoji.`;

      const aiText = await this.geminiService.generateText(prompt, 'inventory_alert');
      if (aiText) return aiText;
    }

    // Fallback template
    if (daysUntilStockout <= 0) return `${productName} tại kho ${warehouseName} đã hết hàng. Cần nhập hàng ngay lập tức.`;
    if (daysUntilStockout <= leadTimeDays) {
      return `${productName} tại kho ${warehouseName} chỉ còn ${daysUntilStockout} ngày tồn kho, ít hơn thời gian nhập hàng (${leadTimeDays} ngày). Cần đặt hàng ngay, đề xuất số lượng: ${recommendedOrderQty} đơn vị.`;
    }
    return `${productName} tại kho ${warehouseName} sắp đến điểm đặt hàng. Tồn ${currentQty} đơn vị, tốc độ xuất ${velocity.toFixed(1)}/ngày. Đề xuất đặt ${recommendedOrderQty} đơn vị trong ${daysUntilStockout - leadTimeDays} ngày tới.`;
  }

  private async sendAlertEmails(params: {
    warehouseId: string;
    productName: string;
    warehouseName: string;
    currentQty: number;
    daysUntilStockout: number;
    aiSuggestion: string;
    recommendedOrderQty: number;
  }) {
    try {
      const emails = await this.repo.getWarehouseManagerEmails(params.warehouseId);
      if (emails.length === 0) return;

      const urgency = params.daysUntilStockout <= 0 ? '🔴 HẾT HÀNG'
        : params.daysUntilStockout <= 3 ? '🟠 KHẨN CẤP'
        : '🟡 CẢNH BÁO';

      for (const email of emails) {
        await this.emailService.sendEmail({
          to: email,
          subject: `[Gen-Hub] ${urgency} — ${params.productName} sắp hết hàng tại kho ${params.warehouseName}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#dc2626">Cảnh báo tồn kho</h2>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Sản phẩm</td><td style="padding:8px">${params.productName}</td></tr>
                <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Kho</td><td style="padding:8px">${params.warehouseName}</td></tr>
                <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Tồn kho</td><td style="padding:8px">${params.currentQty} đơn vị</td></tr>
                <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Dự kiến hết</td><td style="padding:8px">${params.daysUntilStockout <= 0 ? 'Đã hết hàng' : `sau ${params.daysUntilStockout} ngày`}</td></tr>
                <tr><td style="padding:8px;background:#f9f9f9;font-weight:bold">Đề xuất đặt</td><td style="padding:8px">${params.recommendedOrderQty} đơn vị</td></tr>
              </table>
              <p style="background:#fef3c7;padding:12px;border-radius:6px;margin-top:12px">${params.aiSuggestion}</p>
              <p style="color:#6b7280;font-size:12px;margin-top:24px">Email tự động từ hệ thống Gen-Hub • ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          `,
        });
      }

      this.logger.log(`Đã gửi email cảnh báo đến ${emails.length} quản lý kho`);
    } catch (err) {
      this.logger.error('Lỗi gửi email cảnh báo:', err);
    }
  }

  private shouldSendNotification(notifiedAt: Date | null): boolean {
    if (!notifiedAt) return true;
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return notifiedAt < sixHoursAgo;
  }

  private async invalidateConfigCache(organizationId: string) {
    await this.redis.delByPattern(`inventory-alert:${organizationId}:*`);
  }
}
