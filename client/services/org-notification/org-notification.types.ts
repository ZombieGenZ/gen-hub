// ────────────────────────────────────────────────
// Types cho Organization Notification API
// ────────────────────────────────────────────────

export type OrgNotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface IOrgNotification {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    type: OrgNotificationType;
    warehouse_id: string | null;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string | null;
}

export interface CreateOrgNotificationDto {
    title: string;
    content: string;
    type: OrgNotificationType;
    warehouse_id?: string;
    is_active?: boolean;
}

export interface UpdateOrgNotificationDto {
    title?: string;
    content?: string;
    type?: OrgNotificationType;
    warehouse_id?: string;
    is_active?: boolean;
}

export interface QueryOrgNotificationParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    type?: OrgNotificationType;
    is_active?: boolean;
    warehouse_id?: string;
}

export interface OrgNotificationPaginatedResponse {
    items: IOrgNotification[];
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
}
