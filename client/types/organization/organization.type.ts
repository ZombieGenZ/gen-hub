export interface Organization {
    id: string;
    name: string;
    is_active: boolean;
    is_deleted: boolean;
    owner_id: string;
    google_client_id: string | null;
    google_client_secret: string | null;
    google_refresh_token: string | null;
    email_primary_address: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    created_by: string;
    updated_by: string;
    deleted_by: string | null;
    owner: {
        id: string;
        name: string;
        email: string;
    };
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