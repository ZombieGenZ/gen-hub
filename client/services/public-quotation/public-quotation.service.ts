const API = process.env.NEXT_PUBLIC_API_URL;

export interface CalculateQuotationRequest {
    warehouse_template_id: string;
    rental_type: 'whole' | 'row';
    duration_months: number;
    start_date: string; // YYYY-MM-DD
    row_ids?: string[];
    selected_amenities?: string[];
    insurance_id?: string;
    coupon_code?: string;
}

export interface QuotationApiResponse {
    warehouse_template_id: string;
    warehouse_name: string;
    rental_type: string;
    duration_months: number;
    base_price_per_month: number;
    duration_discount_percent: number;
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
    async calculateQuotation(request: CalculateQuotationRequest): Promise<QuotationApiResponse> {
        const response = await fetch(`${API}/public-quotation/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to calculate quotation');
        }

        const result: PublicQuotationApiResult = await response.json();
        return result.data;
    }
}

export const publicQuotationService = new PublicQuotationService();
