export interface Organization {
    id: string;
    name: string;
    international_name: string | null;
    is_active: boolean;
    is_deleted: boolean;
    owner_id: string;
    tax_code: string;
    headquarters_address: string;
    representative_name: string;
    representative_title: string;
    representative_phone: string;
    representative_email: string;
    is_using_google_email: boolean;
    _count: {
        members: number;
        roles: number;
        api_keys: number;
    };
}

export interface OrganizationResponse {
    items: Organization[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}