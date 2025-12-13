import { Injectable } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

/**
 * Service quản lý cấu hình pagination
 * Đọc giá trị từ AppConfigService (có thể update qua API /config)
 */
@Injectable()
export class PaginationConfigService {
    constructor(private readonly appConfigService: AppConfigService) { }

    /** Số lượng record mặc định mỗi trang */
    get defaultLimit(): number {
        return this.appConfigService.get('pagination').defaultLimit;
    }

    /** Vị trí bắt đầu mặc định (offset) */
    get defaultOffset(): number {
        return this.appConfigService.get('pagination').defaultOffset;
    }

    /** Số lượng record tối đa cho phép mỗi trang */
    get maxLimit(): number {
        return this.appConfigService.get('pagination').maxLimit;
    }

    /** Số lượng record tối thiểu mỗi trang */
    get minLimit(): number {
        return this.appConfigService.get('pagination').minLimit;
    }

    /**
     * Lấy limit với fallback về default
     */
    getLimit(limit?: number | string): number {
        if (limit === undefined || limit === null) {
            return Number(this.defaultLimit);
        }
        const numLimit = Number(limit);
        return Math.min(Math.max(numLimit, this.minLimit), this.maxLimit);
    }

    /**
     * Lấy offset với fallback về default
     */
    getOffset(offset?: number | string): number {
        if (offset === undefined || offset === null) {
            return Number(this.defaultOffset);
        }
        return Math.max(Number(offset), 0);
    }
}
