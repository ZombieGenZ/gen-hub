export interface RentalTemplateItemDto {
    template_id: string;
    warehouse_name: string;
    warehouse_description?: string;
    contents_description?: string;
    row_template_ids?: string[];
}

export type RentalContractPaymentType = 'TRANSFER' | 'CASH';
export type RentalContractPaymentMethod = 'BALANCE' | 'TRANSFER' | 'HYBRID';

export interface CreateRentalContractRequest {
    duration_tier_id: string;
    organization_id: string;
    templates: RentalTemplateItemDto[];
    type: RentalContractPaymentType;
    addon_ids?: string[];
    auto_renew?: boolean;
    coupon_codes?: string[];
    insurance_ids?: string[];
    notes?: string;
    payment_method?: RentalContractPaymentMethod;
    scheduled_start_at?: string;
    signature?: File | Blob;
}
