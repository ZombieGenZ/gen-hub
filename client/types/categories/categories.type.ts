export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string | null;
    image_url: string | null;
    color: string | null;
    parent_id: string | null;
    order: number;
    status: string;
    is_featured: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    created_by: string;
    updated_by: string | null;
    deleted_by: string | null;
    parent: Category | null;
    _count: {
        articles: number;
        children: number;
    };
}

export interface CreateUpdateCategoryRequest {
    name: string;
    slug: string;
    description: string;
    icon: string;
    image_url: string;
    color: string;
    parent_id: string;
    order: number;
    status: CategoryStatus;
    is_featured: boolean;
    is_active: boolean;
}

export enum CategoryStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
}