import { QuotationBreakdown } from '@/types/booking/booking.type';

/**
 * Contract template field mappings
 */
export interface ContractFieldMapping {
    // Company Information
    company_name: string;
    company_international_name?: string;
    company_tax_code: string;
    company_headquarters_address: string;
    company_invoice_address?: string;
    
    // Representative Information
    representative_name: string;
    representative_title: string;
    representative_phone: string;
    representative_email: string;
    
    // Warehouse Information
    warehouse_name: string;
    warehouse_address: string;
    warehouse_area?: number;
    rental_type: 'whole' | 'row';
    rental_type_display: string;
    
    // Rental Period
    start_date: string;
    end_date: string;
    duration_months: number;
    
    // Financial Information
    base_price_per_month: number;
    base_price_total: number;
    duration_discount_percent: number;
    duration_discount_amount: number;
    addons_cost: number;
    insurance_cost: number;
    subtotal: number;
    service_fee: number;
    grand_total: number;
    deposit_amount: number;
    
    // Additional Services
    addon_list: string[];
    insurance_name?: string;
    
    // Contract Metadata
    contract_code?: string;
    contract_date: string;
}

/**
 * Full contract data structure
 */
export interface ContractData {
    // Basic Info
    id?: string;
    contract_code: string;
    contract_date: string;
    
    // Parties
    organization: {
        name: string;
        international_name?: string;
        tax_code: string;
        headquarters_address: string;
        invoice_address?: string;
    };
    
    representative: {
        name: string;
        title: string;
        phone: string;
        email: string;
    };
    
    // Rental Details
    warehouse: {
        template_id: string;
        name: string;
        address: string;
        area?: number;
    };
    
    rental: {
        type: 'whole' | 'row';
        row_ids?: string[];
        row_names?: string[];
        start_date: string;
        end_date: string;
        duration_months: number;
    };
    
    // Services
    addons: {
        id: string;
        name: string;
        price: number;
    }[];
    
    insurance?: {
        id: string;
        name: string;
        price: number;
    };
    
    // Financial
    quotation: QuotationBreakdown;
    deposit_amount: number;
    
    // Status
    status?: ContractStatus;
}

/**
 * Contract status
 */
export type ContractStatus =
    | 'draft'           // Nháp
    | 'pending'         // Chờ ký
    | 'signed'          // Đã ký
    | 'active'          // Đang hiệu lực
    | 'expired'         // Hết hạn
    | 'terminated'      // Đã chấm dứt
    | 'cancelled';      // Đã hủy

/**
 * Contract generation options
 */
export interface ContractGenerationOptions {
    format?: 'pdf' | 'docx';
    template?: string;
    includeSignature?: boolean;
    includeStamp?: boolean;
}

/**
 * Contract generation result
 */
export interface ContractGenerationResult {
    success: boolean;
    contract_url?: string;
    contract_blob?: Blob;
    error?: string;
}
