
export interface ContactTag {
    id: string;
    name: string;
    description?: string;
    color?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}

export interface CreateContactTagDto {
    name: string;
    description?: string;
    color?: string;
    is_active?: boolean;
}

export interface UpdateContactTagDto {
    name?: string;
    description?: string;
    color?: string;
    is_active?: boolean;
}

export interface QueryContactTagDto {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
}
