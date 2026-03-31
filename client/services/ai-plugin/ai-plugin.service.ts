import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface WarehousePricingQuery {
    keywords?: string;
    province_name?: string;
    province_code?: string;
    min_price?: number;
    max_price?: number;
    min_area?: number;
    max_area?: number;
    is_cold_storage?: boolean;
    is_shared_warehouse?: boolean;
    warehouse_id?: string;
    limit?: number;
}

export interface WarehousePricingInfo {
    id: string;
    name: string;
    address: string;
    price_per_m2: number;
    available_area: number;
    is_cold_storage: boolean;
    is_shared_warehouse: boolean;
    images: string[];
}

export interface CheckAvailabilityQuery {
    warehouse_id: string;
    row_id?: string;
}

export interface AvailabilityResult {
    warehouse_id: string;
    row_id?: string;
    available: boolean;
    message?: string;
}

export interface RentalContractTerms {
    content: string;
    version: string;
    updated_at: string;
}

export interface AiFaq {
    id: string;
    question: string;
    answer: string;
    category?: string;
}

export interface CreateAiConsultationRequestDto {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    warehouse_id?: string;
    company?: string;
    position?: string;
}

export interface CreateAiVisitBookingDto {
    warehouse_id: string;
    organization_id?: string;
    visitor_name: string;
    visitor_email: string;
    visitor_phone: string;
    visitor_company?: string;
    visitor_position?: string;
    visit_date: string;
    visit_time_start: string;
    visit_time_end: string;
    purpose: 'RENTAL_INQUIRY' | 'INSPECTION' | 'BUSINESS_MEETING' | 'OTHER';
    purpose_details?: string;
    number_of_visitors?: number;
}

export interface AiConsultationResponse {
    id: string;
    code: string;
}

export interface AiVisitBookingResponse {
    id: string;
    code: string;
    status: string;
}

/**
 * Service AI Plugin - Tích hợp AI chatbot và tư vấn
 */
export class AiPluginService {
    private getHeaders(apiKey: string): HeadersInit {
        return {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách kho và giá thuê cho AI tư vấn */
    async getWarehousePricing(apiKey: string, query?: WarehousePricingQuery): Promise<ApiResponse<WarehousePricingInfo[]>> {
        const params = new URLSearchParams();
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.province_name) params.append('province_name', query.province_name);
        if (query?.province_code) params.append('province_code', query.province_code);
        if (query?.min_price != null) params.append('min_price', String(query.min_price));
        if (query?.max_price != null) params.append('max_price', String(query.max_price));
        if (query?.min_area != null) params.append('min_area', String(query.min_area));
        if (query?.max_area != null) params.append('max_area', String(query.max_area));
        if (query?.is_cold_storage != null) params.append('is_cold_storage', String(query.is_cold_storage));
        if (query?.is_shared_warehouse != null) params.append('is_shared_warehouse', String(query.is_shared_warehouse));
        if (query?.warehouse_id) params.append('warehouse_id', query.warehouse_id);
        if (query?.limit != null) params.append('limit', String(query.limit));

        const response = await fetch(`${API}/ai-plugin/warehouse-pricing?${params.toString()}`, {
            headers: this.getHeaders(apiKey),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin giá kho');
        }

        return response.json();
    }

    /** Kiểm tra tình trạng còn chỗ của kho */
    async checkAvailability(apiKey: string, query: CheckAvailabilityQuery): Promise<ApiResponse<AvailabilityResult>> {
        const params = new URLSearchParams();
        params.append('warehouse_id', query.warehouse_id);
        if (query.row_id) params.append('row_id', query.row_id);

        const response = await fetch(`${API}/ai-plugin/check-availability?${params.toString()}`, {
            headers: this.getHeaders(apiKey),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể kiểm tra tình trạng kho');
        }

        return response.json();
    }

    /** Lấy điều khoản hợp đồng thuê kho */
    async getRentalContractTerms(apiKey: string): Promise<ApiResponse<RentalContractTerms>> {
        const response = await fetch(`${API}/ai-plugin/rental-contract-terms`, {
            headers: this.getHeaders(apiKey),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy điều khoản hợp đồng');
        }

        return response.json();
    }

    /** Lấy danh sách FAQ cho AI */
    async getFaq(apiKey: string): Promise<ApiResponse<AiFaq[]>> {
        const response = await fetch(`${API}/ai-plugin/faq`, {
            headers: this.getHeaders(apiKey),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách FAQ');
        }

        return response.json();
    }

    /** Tạo yêu cầu tư vấn từ nền tảng AI */
    async createConsultationRequest(apiKey: string, dto: CreateAiConsultationRequestDto): Promise<ApiResponse<AiConsultationResponse>> {
        const response = await fetch(`${API}/ai-plugin/consultation-request`, {
            method: 'POST',
            headers: this.getHeaders(apiKey),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo yêu cầu tư vấn');
        }

        return response.json();
    }

    /** Tạo lịch tham quan kho từ nền tảng AI */
    async createVisitBooking(apiKey: string, dto: CreateAiVisitBookingDto): Promise<ApiResponse<AiVisitBookingResponse>> {
        const response = await fetch(`${API}/ai-plugin/visit-booking`, {
            method: 'POST',
            headers: this.getHeaders(apiKey),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo lịch tham quan');
        }

        return response.json();
    }
}

export const aiPluginService = new AiPluginService();
