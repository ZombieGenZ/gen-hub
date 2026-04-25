/**
 * Sanitize Utilities - XSS Prevention
 * Dùng để làm sạch dữ liệu trước khi hiển thị lên UI
 */

// Bảng escape HTML cơ bản (không dùng innerHTML)
const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

/**
 * Escape HTML characters để ngăn XSS khi render trong dangerouslySetInnerHTML
 * Ưu tiên: render dữ liệu bằng React text nodes ({value}) thay vì dangerouslySetInnerHTML
 *
 * @example
 * // LUÔN DÙNG REACT TEXT NODES:
 * <span>{user.name}</span>     ← an toàn
 *
 * // CHỈ DÙNG escapeHtml KHI BẮT BUỘC DÙNG dangerouslySetInnerHTML:
 * <div dangerouslySetInnerHTML={{ __html: escapeHtml(content) }} />
 */
export function escapeHtml(text: string): string {
    if (!text) return '';
    return String(text).replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Loại bỏ tất cả HTML tags khỏi chuỗi
 * Dùng khi cần hiển thị plain text từ nguồn không tin cậy
 */
export function stripHtmlTags(text: string): string {
    if (!text) return '';
    return String(text).replace(/<[^>]*>/g, '');
}

/**
 * Sanitize URL — chỉ cho phép http:// và https://
 * Ngăn javascript: URI injection
 */
export function sanitizeUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    // Nếu không phải http/https → trả về chuỗi rỗng
    return '';
}

/**
 * Truncate text an toàn + ellipsis, không cắt giữa chữ tiếng Việt
 */
export function safeTruncate(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Sanitize dữ liệu hiển thị trong bảng / danh sách
 * - Loại bỏ HTML tags
 * - Truncate nếu quá dài
 * - Trả về '-' nếu rỗng
 */
export function sanitizeDisplayValue(value: string | null | undefined, maxLength = 200): string {
    if (value === null || value === undefined || value === '') return '-';
    const stripped = stripHtmlTags(String(value));
    return safeTruncate(stripped, maxLength);
}

/**
 * Sanitize object để log / debug (ẩn sensitive fields)
 * Tránh log password, token, secret ra console
 */
export function sanitizeForLog<T extends Record<string, unknown>>(
    obj: T,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'access_token', 'refresh_token']
): Partial<T> {
    const result = { ...obj };
    sensitiveFields.forEach(field => {
        if (field in result) {
            (result as Record<string, unknown>)[field] = '[REDACTED]';
        }
    });
    return result;
}
