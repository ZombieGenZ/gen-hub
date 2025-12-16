export interface IWard {
    id: string;
    code: string;
    name: string;
    slug: string | null;
    type: string | null;
    province_id: string;
    is_active: boolean | null;
    created_at: Date;
    updated_at: Date | null;
}

export interface IWardWithProvince extends IWard {
    province: {
        id: string;
        code: string;
        name: string;
    };
}

export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
