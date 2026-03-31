import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface PublicCoupon {
    id: string;
    code: string;
    title: string;
    description?: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number;
    min_order_value?: number;
    max_discount?: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    usage_limit?: number;
    usage_count: number;
    created_at: string;
    updated_at?: string;
}

export interface QueryPublicCouponParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
    valid_now?: boolean;
}

/**
 * Service quản lý mã giảm giá công khai (Public Coupon)
 */
export class PublicCouponService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách mã giảm giá công khai */
    async findMany(query?: QueryPublicCouponParams): Promise<PaginatedResponse<PublicCoupon>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));
        if (query?.valid_now != null) params.append('valid_now', String(query.valid_now));

        const response = await fetch(`${API}/public-coupons?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách coupon');
        }

        return response.json();
    }

    /** Lấy danh sách mã giảm giá đang hoạt động */
    async findAllActive(query?: QueryPublicCouponParams): Promise<PaginatedResponse<PublicCoupon>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));

        const response = await fetch(`${API}/public-coupons/active?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách coupon active');
        }

        return response.json();
    }

    /** Lấy chi tiết mã giảm giá theo ID */
    async findById(id: string): Promise<ApiResponse<PublicCoupon>> {
        const response = await fetch(`${API}/public-coupons/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết coupon');
        }

        return response.json();
    }

    /** Kiểm tra mã giảm giá có hợp lệ không */
    async validateCoupon(code: string, orderValue?: number): Promise<ApiResponse<{
        valid: boolean;
        coupon?: PublicCoupon;
        discount_amount: number;
        message?: string;
    }>> {
        const params = new URLSearchParams();
        params.append('code', code);
        if (orderValue != null) params.append('order_value', String(orderValue));

        const response = await fetch(`${API}/public-coupons/validate?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể kiểm tra coupon');
        }

        return response.json();
    }

    /** Áp dụng mã giảm giá vào đơn hàng */
    async applyCoupon(token: string, code: string, orderData: {
        order_value: number;
        items: Array<{ product_id: string; quantity: number; price: number }>;
    }): Promise<ApiResponse<{
        discount_amount: number;
        final_amount: number;
        coupon: PublicCoupon;
    }>> {
        const response = await fetch(`${API}/public-coupons/apply`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify({ code, ...orderData }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể áp dụng coupon');
        }

        return response.json();
    }
}

export const publicCouponService = new PublicCouponService();
