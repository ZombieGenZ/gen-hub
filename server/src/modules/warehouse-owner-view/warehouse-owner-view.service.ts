import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractStatus, PaymentStatus } from '@prisma/client';

const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.ACTIVE,
  ContractStatus.OVERDUE_LEVEL_1,
  ContractStatus.OVERDUE_LEVEL_2,
  ContractStatus.OVERDUE_LEVEL_3,
  ContractStatus.SEALED,
];

const SIGNED_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.ACTIVE,
  ContractStatus.OVERDUE_LEVEL_1,
  ContractStatus.OVERDUE_LEVEL_2,
  ContractStatus.OVERDUE_LEVEL_3,
  ContractStatus.SEALED,
  ContractStatus.COMPLETED,
];

@Injectable()
export class WarehouseOwnerViewService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy danh sách warehouse_template_id thuộc org này */
  private async getOwnedTemplateIds(orgId: string): Promise<string[]> {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { organization_id: orgId, is_deleted: false },
      select: { warehouse_template_id: true },
    });
    return warehouses
      .map((w) => w.warehouse_template_id)
      .filter((id): id is string => id !== null);
  }

  private async assertOwnership(orgId: string, templateId: string): Promise<void> {
    const ids = await this.getOwnedTemplateIds(orgId);
    if (!ids.includes(templateId)) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin kho này');
    }
  }

  /** Danh sách kho của chủ kho kèm thống kê */
  async getMyWarehouses(orgId: string) {
    const templateIds = await this.getOwnedTemplateIds(orgId);
    if (templateIds.length === 0) return [];

    const templates = await this.prisma.warehouseTemplate.findMany({
      where: { id: { in: templateIds }, is_deleted: false },
      include: {
        images: {
          where: { is_deleted: false },
          orderBy: { order: 'asc' },
          take: 1,
          select: { url: true, thumbnail_url: true },
        },
        trust_profile: {
          select: { trust_score: true, badge_level: true },
        },
        ward: {
          select: {
            name: true,
            province: { select: { name: true } },
          },
        },
      },
    });

    const stats = await Promise.all(
      templateIds.map(async (tid) => {
        const [activeTenants, paidAgg, pendingAgg] = await Promise.all([
          this.prisma.rentalContractDetail.count({
            where: {
              warehouse_template_id: tid,
              is_deleted: false,
              rental_contract: {
                status: { in: ACTIVE_CONTRACT_STATUSES },
                is_deleted: false,
              },
            },
          }),
          this.prisma.payment.aggregate({
            where: {
              status: PaymentStatus.PAID,
              rental_contract: {
                details: { some: { warehouse_template_id: tid } },
                is_deleted: false,
              },
            },
            _sum: { amount: true },
          }),
          this.prisma.payment.aggregate({
            where: {
              status: PaymentStatus.PENDING,
              rental_contract: {
                details: { some: { warehouse_template_id: tid } },
                is_deleted: false,
              },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          template_id: tid,
          active_tenant_count: activeTenants,
          total_paid: paidAgg._sum?.amount ?? 0,
          total_pending: pendingAgg._sum?.amount ?? 0,
        };
      }),
    );

    const statsMap = new Map(stats.map((s) => [s.template_id, s]));

    return templates.map((t) => ({
      ...t,
      ...(statsMap.get(t.id) ?? {
        active_tenant_count: 0,
        total_paid: 0,
        total_pending: 0,
      }),
    }));
  }

  /** Tổng quan chi tiết 1 kho */
  async getWarehouseOverview(orgId: string, templateId: string) {
    await this.assertOwnership(orgId, templateId);

    const template = await this.prisma.warehouseTemplate.findUnique({
      where: { id: templateId },
      include: {
        images: { where: { is_deleted: false }, orderBy: { order: 'asc' } },
        trust_profile: true,
        ward: {
          select: {
            name: true,
            province: { select: { name: true } },
          },
        },
        amenities: {
          where: { is_deleted: false },
          include: { amenity: { select: { name: true, icon: true } } },
        },
      },
    });
    if (!template) throw new NotFoundException('Không tìm thấy kho');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeTenants,
      totalContracts,
      expiringSoon,
      paidAgg,
      pendingAgg,
      overdueContracts,
    ] = await Promise.all([
      this.prisma.rentalContractDetail.count({
        where: {
          warehouse_template_id: templateId,
          is_deleted: false,
          rental_contract: {
            status: { in: ACTIVE_CONTRACT_STATUSES },
            is_deleted: false,
          },
        },
      }),
      this.prisma.rentalContractDetail.count({
        where: {
          warehouse_template_id: templateId,
          is_deleted: false,
          rental_contract: { is_deleted: false },
        },
      }),
      this.prisma.rentalContract.count({
        where: {
          details: { some: { warehouse_template_id: templateId, is_deleted: false } },
          status: { in: ACTIVE_CONTRACT_STATUSES },
          is_deleted: false,
          expired_at: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          paid_at: { gte: thirtyDaysAgo },
          rental_contract: {
            details: { some: { warehouse_template_id: templateId } },
            is_deleted: false,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PENDING,
          rental_contract: {
            details: { some: { warehouse_template_id: templateId } },
            is_deleted: false,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.rentalContract.count({
        where: {
          details: { some: { warehouse_template_id: templateId, is_deleted: false } },
          status: { in: [ContractStatus.OVERDUE_LEVEL_1, ContractStatus.OVERDUE_LEVEL_2, ContractStatus.OVERDUE_LEVEL_3] },
          is_deleted: false,
        },
      }),
    ]);

    return {
      template,
      stats: {
        active_tenant_count: activeTenants,
        total_contract_count: totalContracts,
        expiring_soon_count: expiringSoon,
        overdue_contract_count: overdueContracts,
        paid_this_month: paidAgg._sum?.amount ?? 0,
        pending_amount: pendingAgg._sum?.amount ?? 0,
      },
    };
  }

  /** Danh sách khách thuê đang hoạt động */
  async getWarehouseTenants(orgId: string, templateId: string) {
    await this.assertOwnership(orgId, templateId);

    const contracts = await this.prisma.rentalContract.findMany({
      where: {
        details: { some: { warehouse_template_id: templateId, is_deleted: false } },
        status: { in: ACTIVE_CONTRACT_STATUSES },
        is_deleted: false,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            international_name: true,
            tax_code: true,
            headquarters_address: true,
            representative_name: true,
            representative_title: true,
            representative_phone: true,
            representative_email: true,
          },
        },
        details: {
          where: { warehouse_template_id: templateId, is_deleted: false },
          select: {
            id: true,
            warehouse_name: true,
            price_per_month: true,
            discount_rate: true,
            rental_days: true,
            subtotal: true,
            is_whole_warehouse: true,
          },
        },
        payments: {
          where: { status: PaymentStatus.PAID },
          select: { amount: true, paid_at: true },
          orderBy: { paid_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return contracts.map((c) => ({
      contract_id: c.id,
      contract_code: c.code,
      contract_name: c.name,
      status: c.status,
      started_at: c.started_at,
      expired_at: c.expired_at,
      final_price: c.final_price,
      payment_method: c.payment_method,
      auto_renew: c.auto_renew,
      tenant: c.organization,
      warehouse_detail: c.details[0] ?? null,
      last_payment: c.payments[0] ?? null,
    }));
  }

  /** Lịch sử hợp đồng với pagination + filter */
  async getWarehouseContracts(
    orgId: string,
    templateId: string,
    params: { status?: string; page?: number; limit?: number },
  ) {
    await this.assertOwnership(orgId, templateId);

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, params.limit ?? 20);
    const skip = (page - 1) * limit;

    const statusFilter = params.status
      ? { status: params.status as ContractStatus }
      : {};

    const where = {
      details: { some: { warehouse_template_id: templateId, is_deleted: false } },
      is_deleted: false,
      ...statusFilter,
    };

    const [total, contracts] = await Promise.all([
      this.prisma.rentalContract.count({ where }),
      this.prisma.rentalContract.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              tax_code: true,
              representative_name: true,
              representative_phone: true,
              representative_email: true,
            },
          },
          details: {
            where: { warehouse_template_id: templateId, is_deleted: false },
            select: {
              price_per_month: true,
              rental_days: true,
              subtotal: true,
              is_whole_warehouse: true,
            },
          },
          payments: {
            select: { amount: true, status: true, paid_at: true, type: true },
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      items: contracts,
    };
  }

  /** Doanh thu: hợp đồng vs thực thu — breakdown 6 tháng */
  async getWarehouseRevenue(orgId: string, templateId: string) {
    await this.assertOwnership(orgId, templateId);

    const contracts = await this.prisma.rentalContract.findMany({
      where: {
        details: { some: { warehouse_template_id: templateId, is_deleted: false } },
        status: { in: SIGNED_CONTRACT_STATUSES },
        is_deleted: false,
      },
      select: {
        started_at: true,
        expired_at: true,
        final_price: true,
        details: {
          where: { warehouse_template_id: templateId, is_deleted: false },
          select: { subtotal: true, price_per_month: true },
        },
        payments: {
          select: { amount: true, status: true, paid_at: true },
          orderBy: { paid_at: 'asc' },
        },
      },
    });

    let totalContracted = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const c of contracts) {
      const contracted = c.details.reduce((s, d) => s + Number(d.subtotal), 0);
      const paid = c.payments
        .filter((p) => p.status === PaymentStatus.PAID)
        .reduce((s, p) => s + p.amount, 0);
      const pending = c.payments
        .filter((p) => p.status === PaymentStatus.PENDING)
        .reduce((s, p) => s + p.amount, 0);

      totalContracted += contracted;
      totalPaid += paid;
      totalPending += pending;
    }

    const totalOverdue = Math.max(0, totalContracted - totalPaid - totalPending);

    // Monthly breakdown (6 months)
    const now = new Date();
    const monthly: { month: string; contracted: number; paid: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const activeContracts = contracts.filter((c) => {
        const start = new Date(c.started_at);
        const end = c.expired_at ? new Date(c.expired_at) : new Date(8640000000000000);
        return start <= monthEnd && end >= monthStart;
      });

      const contracted = activeContracts.reduce(
        (sum, c) => sum + c.details.reduce((s, d) => s + Number(d.price_per_month), 0),
        0,
      );

      const paid = contracts.reduce((sum, c) => {
        return (
          sum +
          c.payments
            .filter(
              (p) =>
                p.status === PaymentStatus.PAID &&
                p.paid_at != null &&
                new Date(p.paid_at) >= monthStart &&
                new Date(p.paid_at) <= monthEnd,
            )
            .reduce((s, p) => s + p.amount, 0)
        );
      }, 0);

      monthly.push({ month: monthKey, contracted, paid });
    }

    return {
      summary: {
        total_contracted: totalContracted,
        total_paid: totalPaid,
        total_pending: totalPending,
        total_overdue: totalOverdue,
        collection_rate:
          totalContracted > 0
            ? Math.round((totalPaid / totalContracted) * 100)
            : 0,
      },
      monthly,
    };
  }
}
