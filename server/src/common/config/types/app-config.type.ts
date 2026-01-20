/**
 * App Config Types
 * Định nghĩa các interfaces cho cấu hình ứng dụng
 */

/**
 * Interface cho màu sắc ứng dụng
 */
export interface IAppColors {
    // Primary Colors
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Neutral / Greys
    gray900: string;
    gray700: string;
    gray500: string;
    gray300: string;
    gray100: string;

    // Background & Surface
    background: string;
    cardSurface: string;
    sidebarBg: string;

    // Accent Colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Border + Shadow
    border: string;
    shadow: string;
}

/**
 * Interface cho cấu hình phân trang
 */
export interface IPaginationConfig {
    /** Số lượng record mặc định mỗi trang */
    defaultLimit: number;
    /** Vị trí bắt đầu mặc định */
    defaultOffset: number;
    /** Số lượng record tối đa cho phép mỗi trang */
    maxLimit: number;
    /** Số lượng record tối thiểu mỗi trang */
    minLimit: number;
}

/**
 * Interface cho toàn bộ cấu hình ứng dụng
 */
export interface IAppConfig {
    brandName: string;
    supportEmail: string;
    supportPhone: string;
    colors: IAppColors;
    pagination: IPaginationConfig;
    enableAiAutoReply: boolean;
}
