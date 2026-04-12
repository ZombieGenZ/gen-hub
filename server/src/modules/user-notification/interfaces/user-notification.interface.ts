import { UserNotification, NotificationType } from '@prisma/client';

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';

/**
 * Interface cho UserNotification
 */
export interface IUserNotification extends UserNotification {}

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
