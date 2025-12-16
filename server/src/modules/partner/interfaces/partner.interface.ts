export interface IPartner {
    id: string;
    organization_id: string;
    name: string;
    code: string;
    type: 'CUSTOMER' | 'SUPPLIER';
    phone: string | null;
    email: string | null;
    tax_code: string | null;
    is_active: boolean;
    address_detail: string | null;
    ward_id: string | null;
    ward?: {
        id: string;
        name: string;
        province: {
            id: string;
            name: string;
        };
    };
    created_at: Date;
    updated_at: Date;
    is_deleted: boolean;
}

export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
