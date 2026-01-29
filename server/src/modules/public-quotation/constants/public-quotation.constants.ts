/**
 * Cấu hình mặc định cho tính báo giá
 */
export const QUOTATION_CONSTANTS = {
    /** Số tiền cọc tối thiểu (VND) */
    MIN_DEPOSIT_AMOUNT: 2_000_000,

    /** Tỷ lệ % tiền cọc trên tổng hóa đơn */
    DEPOSIT_PERCENT: 0.1,

    /** Tỷ lệ % phí dịch vụ */
    SERVICE_FEE_PERCENT: 0.1,

    /** Số ngày trong 1 tháng (cho tính toán) */
    DAYS_PER_MONTH: 30,
} as const;
