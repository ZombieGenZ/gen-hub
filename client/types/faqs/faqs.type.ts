export interface Faqs {
    id: string,
    question: string,
    answer: string,
    order: number,
    is_active: boolean,
    created_at: string,
    updated_at: string,
    is_deleted: boolean,
    deleted_at: string | null,
    created_by: string,
    updated_by: string | null,
    deleted_by: string | null
}