import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SlottingRequestItem {
  detail_id: string;      // ID dòng phiếu nhập chi tiết
  sku_id: string;         // ID sản phẩm / SKU
  quantity: number;       // Số lượng hàng nhập
  volume_per_unit: number; // Thể tích cần thiết để chứa 1 unit hàng (VD quy ra m3)
  priority_class: 'A' | 'B' | 'C'; // Hạng A: Bán cực chạy; B: Bình thường; C: Hàng chậm tiêu thụ
}

export interface SlottingResult {
  detail_id: string;
  sku_id: string;
  bin_id: string;
  bin_uid: string;
  assigned_quantity: number;
}

@Injectable()
export class SmartSlottingService {
  private readonly logger = new Logger(SmartSlottingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tự động phân bổ AI Slotting cho Hóa đơn nhập (GRN) bằng PostgreSQL SKIP LOCKED
   * Ưu tiên xếp hàng theo Priority Class XYZ và tránh triệt để Concurrency
   *
   * @param warehouseId ID Nhà kho
   * @param items Mảng sản phẩm cần gán chỗ trong kho
   * @returns Danh sách Mapping kết nối SKU với điểm Coordinates Ô kệ 3D
   */
  async autoAssignBins(
    warehouseId: string,
    items: SlottingRequestItem[]
  ): Promise<SlottingResult[]> {
    const results: SlottingResult[] = [];

    // Chạy Transaction nhằm quản lý Lock. Hủy toàn bộ nếu một phần tử báo lỗi tràn kho
    await this.prisma.$transaction(async (tx) => {
      
      for (const item of items) {
        let remainingQty = item.quantity;
        
        // Cần rà soát cho đến khi cất hết số Quantity vào kệ
        while (remainingQty > 0) {
          
          // 1. Thuật toán Sắp xếp theo Trọng Số Ưu Tiên (Dùng Raw JSONB query của Postgres)
          let orderByClause = '';
          if (item.priority_class === 'A') {
            // Hàng VIP Bán chạy => Z nhỏ (Khúc ngoài cùng sát lối đi), Y nhỏ (Mặt đất - không cần lấy xe thang nâng)
            orderByClause = `ORDER BY CAST(position_xyz->>'z' AS FLOAT) ASC, CAST(position_xyz->>'y' AS FLOAT) ASC`;
          } else if (item.priority_class === 'C') {
            // Hàng ngâm kho, khó bán => Đẩy ra phía sau vách kho xa xôi nhất, Vị trí áp chót trần nhà
            orderByClause = `ORDER BY CAST(position_xyz->>'z' AS FLOAT) DESC, CAST(position_xyz->>'y' AS FLOAT) DESC`;
          } else {
            // Hàng B (Bình dân) => Tiện ngang tầm (Trung bình)
            orderByClause = `ORDER BY CAST(position_xyz->>'z' AS FLOAT) ASC`;
          }

          // 2. RAW SQL Select kết hợp FOR UPDATE SKIP LOCKED
          // Yêu cầu tìm mốc Ô Kệ Trống Đầu Tiên thỏa mãn thể tích 1 hộp và đang KHÔNG bị ai đó truy xuất
          const searchQuery = `
            SELECT id, uid, dimensions
            FROM "bins"
            WHERE warehouse_id = $1::uuid
              AND status = 'Available'
              AND is_deleted = false
              AND (CAST(dimensions->>'w' AS FLOAT) * CAST(dimensions->>'h' AS FLOAT) * CAST(dimensions->>'d' AS FLOAT)) >= $2
            ${orderByClause}
            LIMIT 1
            FOR UPDATE SKIP LOCKED;
          `;

          // Execute Raw Query
          const availableBins = (await tx.$queryRawUnsafe(
             searchQuery, 
             warehouseId, 
             item.volume_per_unit
          )) as any[];

          if (!availableBins || availableBins.length === 0) {
            this.logger.error(`Failed to assign bin for SKU: ${item.sku_id}. Not enough valid spaces or Warehouse is full!`);
            throw new BadRequestException(`Đã hết Ô kệ "Available" có đủ thể tích cho hàng SKU: ${item.sku_id}. Quá trình nhập kho bị ngừng!`);
          }

          const targetBin = availableBins[0];

          // Tính Thể tích thực sự m3 của Ô kệ và tối đa chứa được bao nhiêu Items
          const w = parseFloat(targetBin.dimensions.w);
          const h = parseFloat(targetBin.dimensions.h);
          const d = parseFloat(targetBin.dimensions.d);
          const binVolume = w * h * d;
          
          const maxCapacityQty = Math.floor(binVolume / item.volume_per_unit);
          
          // Gán tối đa lượng hàng còn lại (Hoặc cho đầy Kệ này rồi lặp lại tìm Kệ khác)
          const assignedQty = Math.min(remainingQty, maxCapacityQty);

          // 3. Mark the Bin is reserved (Chiếm Kệ ngay lập tức để không người nào ghi đè)
          await tx.$queryRaw`
            UPDATE "bins" 
            SET status = 'Reserved' 
            WHERE id = ${targetBin.id}::uuid
          `;

          // Ghi nhận Log
          results.push({
            detail_id: item.detail_id,
            sku_id: item.sku_id,
            bin_id: targetBin.id,
            bin_uid: targetBin.uid,
            assigned_quantity: assignedQty,
          });

          remainingQty -= assignedQty;
        }
      }
    }, {
      maxWait: 5000, 
      timeout: 15000 
    });

    this.logger.debug(`Successfully assigned ${results.length} bin spots for the Request!`);
    return results;
  }
}
