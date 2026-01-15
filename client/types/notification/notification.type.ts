export interface GlobalNotification {
    id: string,
    title: string,
    content: string,
    type: string,
    starts_at: string,
    ends_at: string,
    is_active: boolean,
    created_at: string,
    updated_at: string | null,
    is_deleted: boolean,
    deleted_at: string | null,
    created_by: string,
    updated_by: string | null,
    deleted_by: string | null
}