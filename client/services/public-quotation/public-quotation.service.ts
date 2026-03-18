const API = process.env.NEXT_PUBLIC_API_URL;

export interface CalculateQuotationRequest {
    warehouse_template_id: string;
    rental_type: 'whole' | 'row';
    duration_tier_id?: string;
    duration_months?: number;
    start_date?: string; // YYYY-MM-DD
    row_template_ids?: string[];
    row_ids?: string[]; // legacy
    addon_ids?: string[];
    selected_amenities?: string[]; // legacy
    insurance_id?: string;
    coupon_code?: string;
}

export interface QuotationApiResponse {
    warehouse_template_id: string;
    warehouse_name: string;
    rental_type: string;
    duration_months: number;
    duration_tier_id?: string;
    duration_tier_name?: string;
    base_price_per_month: number;
    duration_discount_percent: number;
    duration_discount_amount?: number;
    addons_cost?: number;
    insurance_cost?: number;
    management_fee?: number;
    subtotal: number;
    service_fee: number;
    coupon_discount: number;
    grand_total: number;
    deposit_amount: number;
    is_warehouse_available: boolean;
    start_date: string;
    end_date: string;
}

export interface PublicQuotationApiResult {
    code: string;
    message: string;
    success: boolean;
    data: QuotationApiResponse;
}

export class PublicQuotationService {

    /**
     * Tính toán báo giá thuê kho
     * @param request Thông tin yêu cầu tính toán
     * @returns Kết quả tính toán
     */
    async calculateQuotation(request: CalculateQuotationRequest): Promise<QuotationApiResponse> {
        const normalizedRequest = {
            warehouse_template_id: request.warehouse_template_id,
            rental_type: request.rental_type,
            duration_tier_id: request.duration_tier_id,
            row_template_ids: request.row_template_ids || request.row_ids,
            addon_ids: request.addon_ids || request.selected_amenities,
            insurance_id: request.insurance_id,
            coupon_code: request.coupon_code,
            start_date: request.start_date,
        };

        if (!normalizedRequest.duration_tier_id) {
            throw new Error('Missing duration_tier_id for quotation calculation');
        }

        const response = await fetch(`${API}/public/quotation/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(normalizedRequest),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to calculate quotation');
        }

        const result: PublicQuotationApiResult = await response.json();
        const data = result.data;

        // Keep backward compatibility with previous response shape if needed
        return {
            warehouse_template_id: data.warehouse_template_id,
            warehouse_name: data.warehouse_name,
            rental_type: data.rental_type,
            duration_months: data.duration_months,
            duration_tier_id: data.duration_tier_id,
            duration_tier_name: data.duration_tier_name,
            base_price_per_month: data.base_price_per_month,
            duration_discount_percent: data.duration_discount_percent,
            duration_discount_amount: data.duration_discount_amount,
            addons_cost: data.addons_cost,
            insurance_cost: data.insurance_cost,
            management_fee: data.management_fee,
            subtotal: data.subtotal,
            service_fee: data.service_fee,
            coupon_discount: data.coupon_discount,
            grand_total: data.grand_total,
            deposit_amount: data.deposit_amount,
            is_warehouse_available: data.is_warehouse_available,
            start_date: data.start_date,
            end_date: data.end_date,
        };
    }
}

export const publicQuotationService = new PublicQuotationService();
