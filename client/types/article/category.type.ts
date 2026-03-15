export interface CategoryResponse {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parent_id?: string | null;
    order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    children?: CategoryResponse[];
}

export interface CreateCategoryDto {
    name: string;
    slug?: string;
    description?: string;
    parent_id?: string | null;
    order?: number;
    is_active?: boolean;
}

export interface UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    parent_id?: string | null;
    order?: number;
    is_active?: boolean;
}

export interface QueryCategoryDto {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}
