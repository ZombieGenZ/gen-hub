import { GlobalNotification, NotificationType } from '@prisma/client';

/**
 * Interface cho GlobalNotification với đầy đủ thông tin
 */
export interface IGlobalNotification extends GlobalNotification { }

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
export interface IGlobalNotificationQuery {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
    type?: NotificationType;
}
