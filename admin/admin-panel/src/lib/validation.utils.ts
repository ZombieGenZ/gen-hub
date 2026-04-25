/**
 * Validation & Input Filter Utilities - Admin Panel
 * Áp dụng cho tất cả form trong admin dashboard
 */

// ─── Kiểu dữ liệu ─────────────────────────────────────────────────────────────

export interface FieldError {
    message: string;
}

export type FormErrors<T extends string = string> = Partial<Record<T, string>>;

// ─── Filter / Sanitize Input ──────────────────────────────────────────────────

/**
 * Lọc ký tự đặc biệt, giữ lại chữ (tiếng Việt), số, khoảng trắng, gạch ngang, chấm
 */
export function filterNameInput(text: string): string {
    if (!text) return '';
    return text
        .replace(/[^a-zA-Z0-9À-ỿ\s\-\.]/g, '')
        .replace(/\s+/g, ' ');
}

/**
 * Filter cho trường code / key (role name, permission key, feature flag key)
 * Chỉ cho phép: chữ, số, gạch ngang, gạch dưới — TỰ ĐỘNG chữ thường
 */
export function filterKeyInput(text: string): string {
    if (!text) return '';
    return text
        .replace(/[^a-zA-Z0-9\-_\.]/g, '')
        .toLowerCase();
}

/**
 * Filter cho trường lý do (reason / note / description)
 * Cho phép: chữ, số, khoảng trắng, dấu gạch ngang, chấm, phẩy, dấu hỏi, dấu chấm than
 */
export function filterReasonInput(text: string): string {
    if (!text) return '';
    return text
        .replace(/[<>{}|\\\^~\[\]`]/g, '')
        .replace(/\s+/g, ' ');
}

/**
 * Filter cho trường tiêu đề thông báo
 */
export function filterTitleInput(text: string): string {
    if (!text) return '';
    return text
        .replace(/[<>{}|\\\^~\[\]`]/g, '')
        .replace(/\s+/g, ' ');
}

// ─── Validate Functions ────────────────────────────────────────────────────────

/**
 * Kiểm tra trường không được để trống
 */
export function validateRequired(value: string, fieldLabel: string): string | undefined {
    if (!value || !value.trim()) {
        return `${fieldLabel} không được để trống`;
    }
    return undefined;
}

/**
 * Kiểm tra độ dài tối thiểu
 */
export function validateMinLength(value: string, min: number, fieldLabel: string): string | undefined {
    if (value && value.trim().length < min) {
        return `${fieldLabel} phải có ít nhất ${min} ký tự`;
    }
    return undefined;
}

/**
 * Kiểm tra độ dài tối đa
 */
export function validateMaxLength(value: string, max: number, fieldLabel: string): string | undefined {
    if (value && value.trim().length > max) {
        return `${fieldLabel} tối đa ${max} ký tự`;
    }
    return undefined;
}

/**
 * Kiểm tra số nguyên dương (cho duration)
 */
export function validatePositiveInteger(value: number, fieldLabel: string): string | undefined {
    if (!Number.isInteger(value) || value < 1) {
        return `${fieldLabel} phải là số nguyên dương`;
    }
    return undefined;
}

/**
 * Validate Role name
 * - Bắt buộc
 * - Tối thiểu 2 ký tự
 * - Tối đa 100 ký tự
 */
export function validateRoleName(name: string): string | undefined {
    return validateRequired(name, 'Tên vai trò')
        ?? validateMinLength(name, 2, 'Tên vai trò')
        ?? validateMaxLength(name, 100, 'Tên vai trò');
}

/**
 * Validate Role description (optional)
 * - Tối đa 500 ký tự nếu có nhập
 */
export function validateRoleDescription(description: string): string | undefined {
    return validateMaxLength(description, 500, 'Mô tả');
}

/**
 * Validate Ban reason / Warn reason
 * - Bắt buộc
 * - Tối thiểu 10 ký tự
 * - Tối đa 1000 ký tự
 */
export function validateBanReason(reason: string): string | undefined {
    return validateRequired(reason, 'Lý do')
        ?? validateMinLength(reason, 10, 'Lý do')
        ?? validateMaxLength(reason, 1000, 'Lý do');
}

/**
 * Validate Unban note (optional)
 * - Tối đa 500 ký tự nếu có nhập
 */
export function validateUnbanNote(note: string): string | undefined {
    return validateMaxLength(note, 500, 'Ghi chú');
}

/**
 * Validate Notification title
 * - Bắt buộc
 * - Tối thiểu 3 ký tự
 * - Tối đa 200 ký tự
 */
export function validateNotifyTitle(title: string): string | undefined {
    return validateRequired(title, 'Tiêu đề thông báo')
        ?? validateMinLength(title, 3, 'Tiêu đề thông báo')
        ?? validateMaxLength(title, 200, 'Tiêu đề thông báo');
}

/**
 * Validate Notification content
 * - Bắt buộc
 * - Tối thiểu 10 ký tự
 * - Tối đa 2000 ký tự
 */
export function validateNotifyContent(content: string): string | undefined {
    return validateRequired(content, 'Nội dung thông báo')
        ?? validateMinLength(content, 10, 'Nội dung thông báo')
        ?? validateMaxLength(content, 2000, 'Nội dung thông báo');
}

/**
 * Validate ban duration value
 * - Phải là số nguyên dương
 * - Tối đa 365 (1 năm) cho đơn vị days
 */
export function validateBanDuration(value: number): string | undefined {
    return validatePositiveInteger(value, 'Thời hạn');
}

/**
 * Validate Warn reason
 * - Bắt buộc
 * - Tối thiểu 10 ký tự
 * - Tối đa 1000 ký tự
 */
export function validateWarnReason(reason: string): string | undefined {
    return validateRequired(reason, 'Lý do cảnh cáo')
        ?? validateMinLength(reason, 10, 'Lý do cảnh cáo')
        ?? validateMaxLength(reason, 1000, 'Lý do cảnh cáo');
}

/**
 * Validate Warn category
 * - Bắt buộc chọn
 */
export function validateWarnCategory(categoryId: string): string | undefined {
    if (!categoryId) {
        return 'Vui lòng chọn danh mục cảnh cáo';
    }
    return undefined;
}

// ─── Validate Form Helpers ─────────────────────────────────────────────────────

/**
 * Kiểm tra form có lỗi không
 */
export function hasErrors(errors: FormErrors): boolean {
    return Object.values(errors).some(v => !!v);
}

/**
 * Parse API error response để hiển thị field-level errors
 * Hỗ trợ NestJS class-validator error format
 */
export function parseApiErrors(error: unknown): FormErrors {
    if (!error || typeof error !== 'object') return {};
    const err = error as {
        response?: {
            data?: {
                message?: string | string[];
                errors?: Record<string, string[]>;
            }
        }
    };
    const data = err.response?.data;
    if (!data) return {};

    const result: FormErrors = {};

    // NestJS class-validator: { message: ["field must be ..."] }
    if (Array.isArray(data.message)) {
        data.message.forEach(msg => {
            result['_general'] = (result['_general'] ? result['_general'] + '; ' : '') + msg;
        });
    } else if (typeof data.message === 'string') {
        result['_general'] = data.message;
    }

    // Custom field errors: { errors: { field: ["msg"] } }
    if (data.errors && typeof data.errors === 'object') {
        Object.entries(data.errors).forEach(([field, msgs]) => {
            if (Array.isArray(msgs) && msgs.length > 0) {
                result[field] = msgs[0];
            }
        });
    }

    return result;
}
