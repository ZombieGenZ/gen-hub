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
 * Hỗ trợ: 09x, 08x, 07x, 05x, 03x (10 số)
 */
export function validatePhoneNumber(phone: string): {
    isValid: boolean;
    message?: string;
} {
    const cleanPhone = phone.replace(/[\s-()]/g, '');

    // Kiểm tra chỉ chứa số
    if (!/^\d+$/.test(cleanPhone)) {
        return {
            isValid: false,
            message: 'Số điện thoại chỉ được chứa số'
        };
    }

    // Kiểm tra độ dài
    if (cleanPhone.length !== 10) {
        return {
            isValid: false,
            message: 'Số điện thoại phải có 10 số'
        };
    }

    // Kiểm tra đầu số hợp lệ
    const validPrefixes = ['03', '05', '07', '08', '09'];
    const prefix = cleanPhone.substring(0, 2);
    
    if (!validPrefixes.includes(prefix)) {
        return {
            isValid: false,
            message: 'Đầu số điện thoại không hợp lệ'
        };
    }

    return {
        isValid: true,
        message: 'Số điện thoại hợp lệ'
    };
}

/**
 * Validate email
 */
export function validateEmail(email: string): {
    isValid: boolean;
    message?: string;
} {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            message: 'Email không đúng định dạng'
        };
    }

    return {
        isValid: true,
        message: 'Email hợp lệ'
    };
}
