import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface AdminDashboardOverview {
  totalWarehouses: number;
  pendingApprovals: number;
  totalCustomers: number;
  monthlyRevenue: number;
  updatedAt: string;
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);
  private readonly CACHE_KEY = 'admin:dashboard:overview';
  private readonly CACHE_TTL = 60; // 60 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getOverview(): Promise<AdminDashboardOverview> {
    // Try cache first
    const cached = await this.redisService.get(this.CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as AdminDashboardOverview;
    }

    // Current month range (VN timezone)
    const now = new Date();
    const vnNow = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
    );
    const monthStart = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const monthEnd = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Run all queries in parallel
    const [
      totalWarehouses,
      pendingContracts,
      pendingConsultations,
      pendingOrgUpdates,
      pendingVisits,
      totalCustomers,
      revenueResult,
    ] = await Promise.all([
      // 1. Total warehouses (not deleted)
      this.prisma.warehouseTemplate.count({
        where: { is_deleted: false },
      }),

      // 2a. Rental contracts pending approval
      this.prisma.rentalContract.count({
        where: { status: 'PENDING', is_deleted: false },
      }),

      // 2b. Consultation requests pending
      this.prisma.consultationRequest.count({
        where: { status: 'PENDING', is_deleted: false },
      }),

      // 2c. Organization update requests pending
      this.prisma.organizationUpdateRequest.count({
        where: { status: 'PENDING', is_deleted: false },
      }),

      // 2d. Warehouse visit bookings pending
      this.prisma.warehouseVisitBooking.count({
        where: { status: 'PENDING', is_deleted: false },
      }),

      // 3. Total customers (not deleted)
      this.prisma.user.count({
        where: { is_deleted: false },
      }),

      // 4. Monthly revenue (paid payments this month)
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          paid_at: {
            gte: monthStart,
            lte: monthEnd,
          },
          is_deleted: false,
        },
      }),
    ]);

    const result: AdminDashboardOverview = {
      totalWarehouses,
      pendingApprovals:
        pendingContracts +
        pendingConsultations +
        pendingOrgUpdates +
        pendingVisits,
      totalCustomers,
      monthlyRevenue: revenueResult._sum.amount ?? 0,
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.set(
      this.CACHE_KEY,
      JSON.stringify(result),
      this.CACHE_TTL,
    );

    return result;
  }
}
