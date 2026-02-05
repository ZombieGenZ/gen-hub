// Notification types matching API response

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

/**
 * User notification from API
 */
export interface UserNotification {
    id: string;
    user_id: string;
    title: string;
    content: string;
    type: NotificationType;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

/**
 * Global/System notification
 */
/**
 * Global/System notification
 */
export interface GlobalNotification {
    id: string;
    title: string;
    content: string;
    type: NotificationType;
    is_read?: boolean;
    starts_at?: string;
    ends_at?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string | null;
    is_deleted?: boolean;
    deleted_at?: string | null;
    created_by?: string;
    updated_by?: string | null;
    deleted_by?: string | null;
}

/**
 * Paginated notification response
 */
export interface NotificationResponse {
    items: UserNotification[];
    total: number;
    limit: number;
    offset: number;
}

export interface GlobalNotificationResponse {
    items: GlobalNotification[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * Unread count response
 */
export interface UnreadCountResponse {
    count: number;
}

/**
 * Send notification request (Admin)
 */
export interface SendNotificationRequest {
    user_id: string;
    title: string;
    content: string;
    type?: NotificationType;
    scheduled_at?: string;
}

/**
 * Send bulk notification request (Admin)
 */
export interface SendBulkNotificationRequest {
    user_ids: string[];
    title: string;
    content: string;
    type?: NotificationType;
    scheduled_at?: string;
}

/**
 * Notification query params
 */
export interface NotificationQueryParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_read?: boolean;
    type?: NotificationType;
}

/**
 * Sent notification for admin dashboard
 */
export interface SentNotification extends UserNotification {
    recipient_name?: string;
    sender_name?: string;
    status: 'sent' | 'failed';
}

/**
 * Target audience types for compose wizard
 */
export type TargetAudienceType = 'individual' | 'role' | 'broadcast' | 'import';

/**
 * User role types
 */
export type UserRole = 'warehouse_owner' | 'staff' | 'customer';

/**
 * Notification action types
 */
export type NotificationActionType = 'none' | 'external_link' | 'internal_link';

/**
 * Compose notification form data
 */
export interface ComposeNotificationData {
    // Step 1: Target
    targetType: TargetAudienceType;
    selectedUsers: string[];
    selectedRoles: UserRole[];
    importedUserIds: string[];
    
    // Step 2: Content
    type: NotificationType;
    title: string;
    content: string;
    actionType: NotificationActionType;
    actionLink: string;
    
    // Step 3: Send options
    sendImmediately: boolean;
    scheduledAt?: string;
}