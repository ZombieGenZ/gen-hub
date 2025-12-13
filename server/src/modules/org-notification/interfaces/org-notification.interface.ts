import { OrganizationNotification, NotificationType } from '@prisma/client';

/**
 * Interface cho OrganizationNotification
 */
export interface IOrgNotification extends OrganizationNotification { }

/**
 * Interface cho response phân trang
 */
export interface IPaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Interface cho query params
 */
export interface IOrgNotificationQuery {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
    type?: NotificationType;
    warehouse_id?: string;
}
