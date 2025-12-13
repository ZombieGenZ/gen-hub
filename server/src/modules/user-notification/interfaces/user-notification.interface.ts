import { UserNotification, NotificationType } from '@prisma/client';

/**
 * Interface cho UserNotification
 */
export interface IUserNotification extends UserNotification { }

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
export interface IUserNotificationQuery {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_read?: boolean;
    type?: NotificationType;
}
