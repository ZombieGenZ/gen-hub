import { SystemLog, LogLevel } from '@prisma/client';

/**
 * Interface cho SystemLog entity
 */
export interface ISystemLog {
  id: string;
  level: LogLevel;
  module: string;
  action: string;
  message: string;
  meta_data?: Record<string, unknown> | null;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: Date;
  // Optional: populated user data
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

/**
 * Interface cho paginated response
 */
export interface ISystemLogPaginated {
  data: ISystemLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Interface cho statistics response
 */
export interface ISystemLogStats {
  total: number;
  recentCount: number;
  byLevel: Record<string, number>;
}

/**
 * Interface cho query filters
 */
export interface ISystemLogFilter {
  page?: number;
  limit?: number;
  level?: LogLevel;
  module?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}
