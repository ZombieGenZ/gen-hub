/**
 * Format a date to Vietnamese relative time string
 * Examples: "Vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước"
 */
export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    const diffMs = now.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Handle future dates
    if (diffMs < 0) {
        return formatFutureTime(Math.abs(diffMs));
    }

    // Just now (less than 1 minute)
    if (diffSeconds < 60) {
        return 'Vừa xong';
    }

    // Minutes
    if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
    }

    // Hours
    if (diffHours < 24) {
        return `${diffHours} giờ trước`;
    }

    // Days
    if (diffDays < 7) {
        if (diffDays === 1) {
            return 'Hôm qua';
        }
        return `${diffDays} ngày trước`;
    }

    // Weeks
    if (diffWeeks < 4) {
        return `${diffWeeks} tuần trước`;
    }

    // Months
    if (diffMonths < 12) {
        return `${diffMonths} tháng trước`;
    }

    // Years
    return `${diffYears} năm trước`;
}

/**
 * Format future time (for scheduled notifications)
 */
function formatFutureTime(diffMs: number): string {
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
        return `Trong ${diffMinutes} phút`;
    }

    if (diffHours < 24) {
        return `Trong ${diffHours} giờ`;
    }

    return `Trong ${diffDays} ngày`;
}

/**
 * Format date to Vietnamese locale string
 */
export function formatDateTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    return targetDate.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
