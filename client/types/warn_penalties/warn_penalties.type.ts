export interface WarnPenalties {
    id: string,
    min_warn_count: number,
    max_warn_count: number,
    is_permanent_ban: boolean,
    duration_value: number,
    duration_unit: string,
    description: string,
    is_active: boolean,
    created_at: string,
    updated_at: string,
    is_deleted: boolean,
    deleted_at: string | null,
    created_by: string,
    updated_by: string | null,
    deleted_by: string | null
}