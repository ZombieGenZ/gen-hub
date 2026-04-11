/**
 * Format số tiền VND gọn gàng cho hiển thị
 * - >= 1 tỷ: "1.5 Tỷ"
 * - >= 1 triệu: "150 Triệu"
 * - >= 1 nghìn: "150K"
 * - Tooltip luôn hiển thị số chính xác
 */
export function formatCurrencyCompact(value: number): { display: string; exact: string } {
    const exact = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Math.round(value));

    if (Math.abs(value) >= 1_000_000_000) {
        const billions = value / 1_000_000_000;
        return {
            display: `${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)} Tỷ`,
            exact,
        };
    }
    if (Math.abs(value) >= 1_000_000) {
        const millions = Math.round(value / 1_000_000);
        return { display: `${millions} Triệu`, exact };
    }
    if (Math.abs(value) >= 1_000) {
        const thousands = Math.round(value / 1_000);
        return { display: `${thousands}K`, exact };
    }
    return { display: new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' ₫', exact };
}

/**
 * Format số tiền VND đầy đủ (có dấu phẩy ngăn cách)
 */
export function formatCurrencyFull(value: number): string {
    if (Math.abs(value) >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2).replace('.', ',')} Tỷ ₫`;
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Math.round(value));
}

/**
 * Tính % thay đổi giữa 2 giá trị
 */
export function calcPercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
}
