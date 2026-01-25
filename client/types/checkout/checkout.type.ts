import { QuotationBreakdown } from '@/types/booking/booking.type';

export type CheckoutStep = 
    | 'rental-info'             
    | 'business-info'           
    | 'representative-info'     
    | 'payment'                 
    | 'confirmation';           

export type PaymentMethod = 
    | 'sepay-qr';       

export interface PaymentMethodInfo {
    id: PaymentMethod;
    name: string;
    description: string;
    icon: string;
    processingTime: string;
    isRecommended?: boolean;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
    {
        id: 'sepay-qr',
        name: 'QR SePay',
        description: 'Quét mã QR để thanh toán. Xác nhận tự động trong vài giây.',
        icon: 'qr-code',
        processingTime: 'Tức thì',
        isRecommended: true,
    },
];

/**
 * Dữ liệu checkout session (lưu trữ trong context)
 */
export interface CheckoutSession {
    // Thông tin kho
    warehouse_template_id: string;
    warehouse_name?: string;
    
    // Loại thuê
    rental_type: 'whole' | 'row';
    row_template_ids?: string[];
    
    // Thời gian
    duration_tier_id: string;
    duration_tier_name?: string;
    duration_months: number;
    start_date: string;
    
    // Dịch vụ
    addon_ids: string[];
    insurance_id?: string;
    coupon_code?: string;
    
    // Thông tin doanh nghiệp
    organization_id?: string;
    
    // Thanh toán
    payment_method?: PaymentMethod;
    
    // Báo giá
    quotation: QuotationBreakdown;
}

/**
 * Dữ liệu checkout session (lưu trữ trong context)
 */
export interface CheckoutSession {
    // Thông tin kho
    warehouse_template_id: string;
    warehouse_name?: string;
    warehouse_details?: {
        address?: string;
        image?: string;
    };
    
    // Loại thuê
    rental_type: 'whole' | 'row';
    row_template_ids?: string[];
    row_details?: { id: string; name: string }[];
    
    // Thời gian
    duration_tier_id: string;
    duration_tier_name?: string;
    duration_months: number;
    start_date: string;
    
    // Dịch vụ bổ sung
    addon_ids: string[];
    addon_details?: { 
        id: string; 
        name: string; 
        price: number;
        unit?: string;
        is_monthly_payment?: boolean;
    }[];
    insurance_id?: string;
    insurance_details?: { id: string; name: string; price: number };
    coupon_code?: string;
    
    // Thông tin doanh nghiệp
    organization_id?: string;
    
    // Thanh toán
    // Thanh toán
    payment_method?: PaymentMethod;
    deposit_amount?: number;
    
    // Báo giá
    quotation: QuotationBreakdown;
}

/**
 * Request payload để tạo đơn thuê
 */
export interface CreateOrderRequest {
    warehouse_template_id: string;
    rental_type: 'whole' | 'row';
    row_template_ids?: string[];
    duration_tier_id: string;
    started_at: string;             
    addon_ids: string[];
    insurance_id?: string;
    coupon_code?: string;
    organization_id: string;
    payment_method: PaymentMethod;
    deposit_amount: number;         
    notes?: string;
}

/**
 * Response từ API tạo đơn thuê
 */
export interface CreateOrderResponse {
    order_id: string;
    order_code: string;             // Mã đơn hàng (VD: GH-2025-001234)
    status: OrderStatus;
    payment_info: PaymentInfo;
    created_at: string;
}

/**
 * Trạng thái đơn thuê
 */
export type OrderStatus = 
    | 'pending_payment'         
    | 'payment_processing'  
    | 'deposit_paid'        
    | 'contract_pending'    
    | 'contract_signed'     
    | 'fully_paid'          
    | 'active'                  
    | 'completed'           
    | 'cancelled';          

/**
 * Thông tin thanh toán
 */
export interface PaymentInfo {
    method: PaymentMethod;
    amount: number;
    currency: string;
    
    // Cho bank transfer
    bank_name?: string;
    bank_account?: string;
    bank_account_name?: string;
    transfer_content?: string;
    
    // Cho SePay QR
    qr_code_url?: string;
    qr_expire_at?: string;
    
    // Trạng thái
    paid_at?: string;
    transaction_id?: string;
}

/**
 * Thông tin đơn thuê đầy đủ
 */
export interface Order {
    id: string;
    order_code: string;
    status: OrderStatus;
    
    // Thông tin thuê
    warehouse_template_id: string;
    warehouse_name: string;
    rental_type: 'whole' | 'row';
    row_template_ids?: string[];
    
    // Thời gian
    duration_tier_id: string;
    duration_months: number;
    started_at: string;
    ended_at: string;
    
    // Dịch vụ
    addon_ids: string[];
    insurance_id?: string;
    coupon_code?: string;
    
    // Tài chính
    quotation: QuotationBreakdown;
    payment_info: PaymentInfo;
    
    // Liên kết
    organization_id: string;
    contract_id?: string;
    
    // Timestamps
    created_at: string;
    updated_at: string;
}
