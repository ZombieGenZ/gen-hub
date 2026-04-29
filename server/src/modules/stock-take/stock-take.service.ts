import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockTakeStatus } from '@prisma/client';
import { CreateStockTakeDto, QueryStockTakeDto, UpdateStockTakeDetailsDto } from './dto';

@Injectable()
export class StockTakeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinh mã phiếu kiểm kê theo format KK-YYYYMM-XXXX
   */
  private async generateCode(orgId: string): Promise<string> {
    const now = new Date();
    const prefix = `KK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;

    const lastTake = await this.prisma.stockTake.findFirst({
      where: {
        organization_id: orgId,
        code: { startsWith: prefix },
      },
      orderBy: { created_at: 'desc' },
    });

    let seq = 1;
    if (lastTake) {
      const parts = lastTake.code.split('-');
      seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Tạo phiếu kiểm kê mới ở trạng thái DRAFT.
   * Tự động snapshot toàn bộ tồn kho hiện tại của kho được chọn.
   */
  async create(orgId: string, dto: CreateStockTakeDto, actorId: string) {
    // Kiểm tra kho tồn tại và thuộc org
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouse_id, organization_id: orgId, is_deleted: false },
    });
    if (!warehouse) throw new NotFoundException('Kho không tồn tại hoặc không thuộc tổ chức này');

    // Kiểm tra không có phiếu kiểm kê đang chạy cho kho này
    const existing = await this.prisma.stockTake.findFirst({
      where: {
        organization_id: orgId,
        warehouse_id: dto.warehouse_id,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
        is_deleted: false,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Kho này đang có phiếu kiểm kê ${existing.code} chưa hoàn tất`,
      );
    }

    // Snapshot tồn kho hiện tại
    const inventories = await this.prisma.inventory.findMany({
      where: { organization_id: orgId, warehouse_id: dto.warehouse_id, is_deleted: false, quantity: { gt: 0 } },
    });

    const code = await this.generateCode(orgId);

    return this.prisma.stockTake.create({
      data: {
        organization_id: orgId,
        warehouse_id: dto.warehouse_id,
        code,
        status: StockTakeStatus.DRAFT,
        notes: dto.notes,
        created_by: actorId,
        details: {
          create: inventories.map((inv) => ({
            product_id: inv.product_id,
            batch_id: inv.batch_id ?? null,
            block_id: inv.block_id,
            system_qty: inv.quantity_on_hand,
            actual_qty: 0,
            difference: 0,
          })),
        },
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { details: true } },
      },
    });
  }

  /**
   * Danh sách phiếu kiểm kê (có phân trang)
   */
  async findAll(orgId: string, query: QueryStockTakeDto) {
    const where = {
      organization_id: orgId,
      is_deleted: false,
      ...(query.warehouse_id && { warehouse_id: query.warehouse_id }),
      ...(query.status && { status: query.status as StockTakeStatus }),
      ...(query.keywords && { code: { contains: query.keywords, mode: 'insensitive' as const } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockTake.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true } },
          _count: { select: { details: true } },
        },
        orderBy: { created_at: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
      }),
      this.prisma.stockTake.count({ where }),
    ]);

    return { items, total, limit: query.limit ?? 20, offset: query.offset ?? 0 };
  }

  /**
   * Chi tiết phiếu kiểm kê kèm danh sách dòng sản phẩm
   */
  async findOne(orgId: string, id: string) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: {
        warehouse: { select: { id: true, name: true } },
        details: {
          include: {
            product: { select: { id: true, name: true, sku: true, image_url: true } },
            batch: { select: { id: true, code: true, expiry_date: true } },
            block: {
              select: {
                id: true,
                code: true,
                shelf: {
                  select: {
                    code: true,
                    rack: { select: { code: true, row: { select: { code: true, name: true } } } },
                  },
                },
              },
            },
          },
          orderBy: [{ product: { name: 'asc' } }],
        },
        _count: { select: { details: true } },
      },
    });

    if (!stockTake) throw new NotFoundException('Phiếu kiểm kê không tồn tại');
    return stockTake;
  }

  /**
   * Bắt đầu kiểm kê: DRAFT → IN_PROGRESS
   */
  async start(orgId: string, id: string, actorId: string) {
    const stockTake = await this.findOneOrThrow(orgId, id);
    if (stockTake.status !== StockTakeStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể bắt đầu phiếu ở trạng thái DRAFT');
    }

    return this.prisma.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.IN_PROGRESS, updated_by: actorId },
      include: { warehouse: { select: { id: true, name: true } } },
    });
  }

  /**
   * Cập nhật số đếm thực tế cho các dòng trong phiếu kiểm kê
   */
  async updateDetails(orgId: string, id: string, dto: UpdateStockTakeDetailsDto, actorId: string) {
    const stockTake = await this.findOneOrThrow(orgId, id);
    if (!['IN_PROGRESS', 'DRAFT'].includes(stockTake.status)) {
      throw new BadRequestException('Chỉ có thể cập nhật số đếm khi phiếu đang ở DRAFT hoặc IN_PROGRESS');
    }

    // Cập nhật từng dòng và tính chênh lệch
    await Promise.all(
      dto.details.map((item) =>
        this.prisma.stockTakeDetail.updateMany({
          where: { id: item.detail_id, stock_take_id: id },
          data: {
            actual_qty: item.actual_qty,
          },
        }),
      ),
    );

    return this.findOne(orgId, id);
  }

  /**
   * Hoàn tất kiểm kê: IN_PROGRESS → COMPLETED, tính chênh lệch
   */
  async complete(orgId: string, id: string, actorId: string) {
    const stockTake = await this.findOneOrThrow(orgId, id);
    if (stockTake.status !== StockTakeStatus.IN_PROGRESS) {
      throw new BadRequestException('Chỉ có thể hoàn tất phiếu ở trạng thái IN_PROGRESS');
    }

    // Tính chênh lệch cho tất cả dòng có counted_qty
    const details = await this.prisma.stockTakeDetail.findMany({
      where: { stock_take_id: id },
    });

    await Promise.all(
      details.map((d) =>
        this.prisma.stockTakeDetail.update({
          where: { id: d.id },
          data: {
            difference: Number(d.actual_qty) - Number(d.system_qty),
          },
        }),
      ),
    );

    return this.prisma.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.COMPLETED, updated_by: actorId },
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { details: true } },
      },
    });
  }

  /**
   * Điều chỉnh tồn kho theo chênh lệch: COMPLETED → ADJUSTED
   * Ghi nhận InventoryTransaction ADJUSTMENT cho các dòng có chênh lệch
   */
  async adjust(orgId: string, id: string, actorId: string) {
    const stockTake = await this.findOneOrThrow(orgId, id);
    if (stockTake.status !== StockTakeStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể điều chỉnh phiếu ở trạng thái COMPLETED');
    }

    const details = await this.prisma.stockTakeDetail.findMany({
      where: { stock_take_id: id },
    });

    const adjustableDetails = details.filter(
      (d) => Number(d.difference) !== 0,
    );

    if (adjustableDetails.length === 0) {
      // Không có chênh lệch → vẫn đánh dấu ADJUSTED
      return this.prisma.stockTake.update({
        where: { id },
        data: { status: StockTakeStatus.ADJUSTED, updated_by: actorId },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Ghi nhận transactions và cập nhật inventory
      for (const detail of adjustableDetails) {
        const diff = Number(detail.difference);

        // Tìm inventory tương ứng
        const inv = await tx.inventory.findFirst({
          where: {
            organization_id: orgId,
            warehouse_id: stockTake.warehouse_id,
            product_id: detail.product_id,
            block_id: detail.block_id,
            ...(detail.batch_id && { batch_id: detail.batch_id }),
            is_deleted: false,
          },
        });

        if (inv) {
          const newOnHand = Math.max(0, Number(inv.quantity_on_hand) + diff);
          const newAvailable = Math.max(0, Number(inv.quantity_available) + diff);
          const newQty = Math.max(0, Number(inv.quantity) + diff);

          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: newQty,
              quantity_on_hand: newOnHand,
              quantity_available: newAvailable,
              updated_by: actorId,
            },
          });
        }

        // Ghi transaction ADJUSTMENT
        await tx.inventoryTransaction.create({
          data: {
            organization_id: orgId,
            warehouse_id: stockTake.warehouse_id,
            product_id: detail.product_id,
            batch_id: detail.batch_id ?? null,
            type: 'ADJUSTMENT',
            quantity: Math.abs(diff),
            reference_code: stockTake.code,
            created_by: actorId,
          },
        });
      }

      // Cập nhật trạng thái phiếu
      return tx.stockTake.update({
        where: { id },
        data: { status: StockTakeStatus.ADJUSTED, updated_by: actorId },
        include: {
          warehouse: { select: { id: true, name: true } },
          _count: { select: { details: true } },
        },
      });
    });
  }

  /**
   * Hủy phiếu kiểm kê
   */
  async cancel(orgId: string, id: string, actorId: string) {
    const stockTake = await this.findOneOrThrow(orgId, id);
    if (['ADJUSTED', 'CANCELLED'].includes(stockTake.status)) {
      throw new BadRequestException('Không thể hủy phiếu đã được điều chỉnh hoặc đã hủy');
    }

    return this.prisma.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.CANCELLED, updated_by: actorId },
      include: { warehouse: { select: { id: true, name: true } } },
    });
  }

  private async findOneOrThrow(orgId: string, id: string) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
    });
    if (!stockTake) throw new NotFoundException('Phiếu kiểm kê không tồn tại');
    return stockTake;
  }
}
