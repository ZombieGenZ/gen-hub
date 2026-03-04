export interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    order: number;
    is_active: boolean;
    created_at: string;
}

export interface Article {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    thumbnail_url?: string;
    author_id: string;
    category: string;
    tags: string[];
    is_published: boolean;
    published_at?: string;
    created_at: string;
}

export interface SupportCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
}
