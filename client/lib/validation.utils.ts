/**
 * Utility functions cho validation mã số thuế Việt Nam
 */

/**
 * Validate định dạng mã số thuế Việt Nam
 * - 10 số: Doanh nghiệp thông thường
 * - 13 số: Chi nhánh/Văn phòng đại diện (10 số gốc + "-" + 3 số phụ)
 * 
 * Lưu ý: Chỉ validate định dạng, không validate checksum vì không có
 * tài liệu chính thức công khai về thuật toán checksum MST Việt Nam.
 * 
 * @param taxCode - Mã số thuế cần kiểm tra
 * @returns Object chứa kết quả validation và message
 */
export function validateTaxCode(taxCode: string): {
    isValid: boolean;
    message?: string;
    type?: 'main' | 'branch';
} {
    // Loại bỏ khoảng trắng và dấu gạch ngang
    const cleanCode = taxCode.replace(/[\s-]/g, '');

    // Kiểm tra rỗng
    if (!cleanCode) {
        return {
            isValid: false,
            message: 'Vui lòng nhập mã số thuế'
        };
    }

    // Kiểm tra chỉ chứa số
    if (!/^\d+$/.test(cleanCode)) {
        return {
            isValid: false,
            message: 'Mã số thuế chỉ được chứa số'
        };
    }

    // Kiểm tra độ dài
    if (cleanCode.length !== 10 && cleanCode.length !== 13) {
        return {
            isValid: false,
            message: 'Mã số thuế phải có 10 số (doanh nghiệp) hoặc 13 số (chi nhánh)'
        };
    }

    // Nếu là 13 số, kiểm tra 3 số cuối (001-999)
    if (cleanCode.length === 13) {
        const branchCode = cleanCode.substring(10, 13);
        const branchNumber = parseInt(branchCode, 10);
        if (branchNumber < 1 || branchNumber > 999) {
            return {
                isValid: false,
                message: 'Mã chi nhánh phải từ 001 đến 999'
            };
        }
        return {
            isValid: true,
            type: 'branch',
            message: 'Mã số thuế chi nhánh hợp lệ'
        };
    }

    return {
        isValid: true,
        type: 'main',
        message: 'Mã số thuế hợp lệ'
    };
}

/**
 * Format mã số thuế có dấu gạch ngang (cho hiển thị)
 * VD: 0123456789 -> 0123456789
 *     0123456789001 -> 0123456789-001
 */
export function formatTaxCode(taxCode: string): string {
    const cleanCode = taxCode.replace(/[\s-]/g, '');
    
    if (cleanCode.length === 13) {
        return `${cleanCode.substring(0, 10)}-${cleanCode.substring(10, 13)}`;
    }
    
    return cleanCode;
}

/**
 * Validate số điện thoại Việt Nam
 * Hỗ trợ: 
 * - 10 số: 09x, 08x, 07x, 06x, 05x, 04x, 03x
 * - Mã quốc gia: +84, 0084, 0084
 * - Định dạng: có dấu phân cách, dấu ngoặc
 */
export function validatePhoneNumber(phone: string): {
    isValid: boolean;
    message?: string;
} {
    // Trim và kiểm tra rỗng
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
        return {
            isValid: false,
            message: 'Vui lòng nhập số điện thoại'
        };
    }

    // Xóa tất cả ký tự không phải số, ngoài dấu +
    let cleanPhone = trimmedPhone.replace(/[\s\-().]/g, '');
    
    // Xử lý mã quốc gia
    if (cleanPhone.startsWith('+84')) {
        cleanPhone = '0' + cleanPhone.substring(3); // +84123456789 -> 0123456789
    } else if (cleanPhone.startsWith('0084')) {
        cleanPhone = '0' + cleanPhone.substring(4); // 0084123456789 -> 0123456789
    }

    // Kiểm tra chỉ chứa số sau khi xử lý
    if (!/^\d+$/.test(cleanPhone)) {
        return {
            isValid: false,
            message: 'Số điện thoại chỉ được chứa số'
        };
    }

    // Kiểm tra độ dài (phải là 10 số sau xử lý)
    if (cleanPhone.length !== 10) {
        return {
            isValid: false,
            message: 'Số điện thoại phải có 10 số'
        };
    }

    // Kiểm tra đầu số hợp lệ (3-9, sau đó là một trong các số hợp lệ)
    // Việt Nam hỗ trợ: 032-039 (Viettel), 070-079 (MobiFone), 080-089 (VinaPhone), 090-099 (Viettel)
    const prefix = cleanPhone.substring(0, 3);
    const validPrefixes = [
        '032', '033', '034', '035', '036', '037', '038', '039', // Viettel
        '070', '072', '073', '074', '075', '076', '077', '078', '079', // MobiFone
        '080', '081', '082', '083', '084', '085', '086', '087', '088', '089', // VinaPhone
        '090', '091', '092', '093', '094', '095', '096', '097', '098', '099', // Viettel
        '030', '031', // Các đầu số cũ
    ];
    
    if (!validPrefixes.includes(prefix)) {
        return {
            isValid: false,
            message: 'Số điện thoại không đúng định dạng Việt Nam'
        };
    }

    return {
        isValid: true,
        message: 'Số điện thoại hợp lệ'
    };
}

/**
 * Validate email
 * Kiểm tra định dạng email theo chuẩn RFC 5322 (đơn giản)
 */
export function validateEmail(email: string): {
    isValid: boolean;
    message?: string;
} {
    const trimmedEmail = email.trim();
    
    // Kiểm tra rỗng
    if (!trimmedEmail) {
        return {
            isValid: false,
            message: 'Vui lòng nhập email'
        };
    }

    // Regex RFC 5322 đơn giản nhưng đầy đủ hơn
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmedEmail)) {
        return {
            isValid: false,
            message: 'Email không đúng định dạng'
        };
    }

    // Kiểm tra độ dài hợp lý (tối đa 254 ký tự theo RFC)
    if (trimmedEmail.length > 254) {
        return {
            isValid: false,
            message: 'Email quá dài'
        };
    }

    // Kiểm tra phần local (trước @) không quá 64 ký tự
    const [localPart] = trimmedEmail.split('@');
    if (localPart?.length > 64) {
        return {
            isValid: false,
            message: 'Phần trước @ quá dài'
        };
    }

    return {
        isValid: true,
        message: 'Email hợp lệ'
    };
}

/**
 * Filter special characters từ display fields
 * Cho phép: chữ (tiếng Việt), số, dấu cách, dấu gạch ngang, dấu chấm, dấu phẩy
 * Xóa: các ký tự đặc biệt khác (@#$%^&*()[]{}... v.v.)
 */
export function filterSpecialCharacters(text: string, allowComma: boolean = false): string {
    if (!text) return '';
    
    let pattern = /[^a-zA-Z0-9À-ỿ\s\-\.]/g;
    if (allowComma) {
        pattern = /[^a-zA-Z0-9À-ỿ\s\-\.,]/g;
    }
    
    return text
        .replace(pattern, '') // Xóa ký tự đặc biệt
        .replace(/\s+/g, ' '); // Gộp khoảng trắng liên tiếp thành 1
}

/**
 * Filter input cho trường tên (Name field)
 * Chỉ cho phép: chữ, số, dấu cách, gạch ngang, chấm
 */
export function filterNameInput(text: string): string {
    return filterSpecialCharacters(text);
}

/**
 * Filter input cho trường code/SKU
 * Chỉ cho phép: chữ, số, dấu gạch ngang, dấu gạch dưới
 */
export function filterCodeInput(text: string): string {
    if (!text) return '';
    return text
        .replace(/[^a-zA-Z0-9\-_]/g, '')
        .toUpperCase();
}

/**
 * Filter input cho trường ghi chú (Notes field)
 * Cho phép: chữ, số, dấu cách, dấu gạch ngang, chấm, phẩy
 */
export function filterNotesInput(text: string): string {
    return filterSpecialCharacters(text, true); // Cho phép phẩy
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): string | undefined {
    if (!value || !value.trim()) {
        return `${fieldName} không được để trống`;
    }
    return undefined;
}

/**
 * Validate min length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): string | undefined {
    if (value && value.trim().length < minLength) {
        return `${fieldName} phải có ít nhất ${minLength} ký tự`;
    }
    return undefined;
}

/**
 * Validate max length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | undefined {
    if (value && value.trim().length > maxLength) {
        return `${fieldName} tối đa ${maxLength} ký tự`;
    }
    return undefined;
}

/**
 * Validate địa chỉ (Address field)
 * - Bắt buộc
 * - Tối thiểu 10 ký tự (đủ để có số, tên đường, quận/huyện)
 * - Tối đa 500 ký tự
 * - Không chứa ký tự HTML nguy hiểm
 */
export function validateAddress(address: string): {
    isValid: boolean;
    message?: string;
} {
    const trimmed = address?.trim() ?? '';

    if (!trimmed) {
        return { isValid: false, message: 'Địa chỉ không được để trống' };
    }

    if (trimmed.length < 10) {
        return { isValid: false, message: 'Địa chỉ phải có ít nhất 10 ký tự' };
    }

    if (trimmed.length > 500) {
        return { isValid: false, message: 'Địa chỉ tối đa 500 ký tự' };
    }

    // Ngăn HTML/script injection
    if (/<[^>]*>|javascript:/i.test(trimmed)) {
        return { isValid: false, message: 'Địa chỉ chứa ký tự không hợp lệ' };
    }

    return { isValid: true, message: 'Địa chỉ hợp lệ' };
}

/**
 * Filter input cho trường địa chỉ
 * Cho phép: chữ (tiếng Việt), số, khoảng trắng, gạch ngang, dấu phẩy, dấu chấm, dấu /
 */
export function filterAddressInput(text: string): string {
    if (!text) return '';
    return text
        .replace(/[<>{}|\\\^~\[\]`]/g, '')
        .replace(/\s+/g, ' ');
}

/**
 * Validate SKU / Mã sản phẩm
 * - Bắt buộc
 * - Chỉ cho phép: chữ hoa, số, gạch ngang, gạch dưới
 * - Tối thiểu 3 ký tự
 * - Tối đa 50 ký tự
 * - Phải bắt đầu bằng chữ hoặc số
 */
export function validateSKU(sku: string): {
    isValid: boolean;
    message?: string;
} {
    const trimmed = sku?.trim() ?? '';

    if (!trimmed) {
        return { isValid: false, message: 'SKU không được để trống' };
    }

    if (trimmed.length < 3) {
        return { isValid: false, message: 'SKU phải có ít nhất 3 ký tự' };
    }

    if (trimmed.length > 50) {
        return { isValid: false, message: 'SKU tối đa 50 ký tự' };
    }

    // Chỉ cho phép chữ hoa, số, gạch ngang, gạch dưới
    if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(trimmed)) {
        return {
            isValid: false,
            message: 'SKU chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới, phải bắt đầu bằng chữ hoặc số',
        };
    }

    return { isValid: true, message: 'SKU hợp lệ' };
}

/**
 * Validate mã sản phẩm / mã đối tượng (Product Code)
 * Tương tự SKU nhưng cho phép chữ thường và có prefix phân loại
 * - Bắt buộc
 * - Tối thiểu 2 ký tự, tối đa 50 ký tự
 * - Chỉ cho phép: chữ, số, gạch ngang, gạch dưới
 */
export function validateProductCode(code: string): {
    isValid: boolean;
    message?: string;
} {
    const trimmed = code?.trim() ?? '';

    if (!trimmed) {
        return { isValid: false, message: 'Mã sản phẩm không được để trống' };
    }

    if (trimmed.length < 2) {
        return { isValid: false, message: 'Mã sản phẩm phải có ít nhất 2 ký tự' };
    }

    if (trimmed.length > 50) {
        return { isValid: false, message: 'Mã sản phẩm tối đa 50 ký tự' };
    }

    if (!/^[A-Z0-9][A-Z0-9\-_]*$/i.test(trimmed)) {
        return {
            isValid: false,
            message: 'Mã sản phẩm chỉ được chứa chữ, số, dấu gạch ngang và gạch dưới',
        };
    }

    return { isValid: true, message: 'Mã sản phẩm hợp lệ' };
}
