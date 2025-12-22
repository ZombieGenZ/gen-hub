import { OrganizationNotification, NotificationType } from '@prisma/client';

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';

/**
 * Interface cho OrganizationNotification
 */
export interface IOrgNotification extends OrganizationNotification { }

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
