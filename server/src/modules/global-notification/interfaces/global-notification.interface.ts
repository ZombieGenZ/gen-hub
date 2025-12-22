import { GlobalNotification, NotificationType } from '@prisma/client';

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';

/**
 * Interface cho GlobalNotification với đầy đủ thông tin
 */
export interface IGlobalNotification extends GlobalNotification { }

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
