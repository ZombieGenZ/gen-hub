/**
 * Interface response phân trang dùng chung cho toàn bộ các module
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
