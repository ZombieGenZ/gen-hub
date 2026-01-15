import { ContactListEntry } from '@prisma/client';

/**
 * Interface cho ContactListEntry với relations
 */
export interface IContactListEntryWithRelations extends ContactListEntry { }

/**
 * Response phân trang cho ContactListEntry
 */
export interface IContactListPaginatedResponse {
    items: IContactListEntryWithRelations[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Kết quả kiểm tra blacklist/whitelist
 */
export interface IContactListCheckResult {
    isBlacklisted: boolean;
    isWhitelisted: boolean;
    blacklistEntry?: IContactListEntryWithRelations;
    whitelistEntry?: IContactListEntryWithRelations;
    reason?: string;        // Lý do nếu match (từ blacklistEntry hoặc whitelistEntry)
    matchType?: string;     // Loại match: EMAIL, EMAIL_DOMAIN, IP_V4, etc.
}
