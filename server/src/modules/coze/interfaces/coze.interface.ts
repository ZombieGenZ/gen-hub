/**
 * Coze AI Module Interfaces
 * Định nghĩa các types cho việc tích hợp Coze API
 */

/**
 * Cấu hình Coze từ environment
 */
export interface ICozeConfig {
    enabled: boolean;
    apiKey: string;
    botId: string;
    apiBaseUrl: string;
}

/**
 * Request gửi đến Coze Chat API
 */
export interface ICozeChatRequest {
    botId: string;
    userId: string;
    query: string;
    conversationId?: string;
    additionalMessages?: ICozeChatMessage[];
}

/**
 * Message trong conversation
 */
export interface ICozeChatMessage {
    role: 'user' | 'assistant';
    content: string;
    contentType?: 'text' | 'object_string';
}

/**
 * Response từ Coze Chat API
 */
export interface ICozeChatResponse {
    conversationId: string;
    botId: string;
    messages: ICozeChatMessage[];
    code?: number;
    msg?: string;
}

/**
 * Kết quả AI response đã được xử lý
 */
export interface IAiChatResult {
    success: boolean;
    content: string;
    model: string;
    confidence?: number;
    error?: string;
}

/**
 * Tóm tắt thông tin Warehouse Template cho AI context
 */
export interface IWarehouseTemplateSummary {
    id: string;
    name: string;
    description: string | null;
    area: number; // length * width
    pricePerMonth: number;
    address: string | null;
    isSharedWarehouse: boolean;
    isColdStorage: boolean;
    // Thống kê
    totalRows: number;
    totalRacks: number;
    totalShelves: number;
    totalBlocks: number;
    // Addon gifts đi kèm
    addonGifts: { name: string; description: string | null }[];
    // Insurance gifts đi kèm
    insuranceGifts: { name: string; description: string | null }[];
    // Giá theo tier
    discountConfigs: {
        tierName: string;
        durationValue: number;
        durationUnit: string;
        discountPercent: number;
    }[];
    // Ảnh (chỉ URL)
    images: string[];
}

/**
 * Tóm tắt thông tin Row Template cho AI context
 */
export interface IRowTemplateSummary {
    id: string;
    warehouseTemplateId: string;
    name: string;
    code: string;
    description: string | null;
    pricePerMonth: number;
    // Thống kê
    totalRacks: number;
    totalShelves: number;
    totalBlocks: number;
    // Addon gifts đi kèm
    addonGifts: { name: string; description: string | null }[];
    // Insurance gifts đi kèm
    insuranceGifts: { name: string; description: string | null }[];
    // Giá theo tier
    discountConfigs: {
        tierName: string;
        durationValue: number;
        durationUnit: string;
        discountPercent: number;
    }[];
}

/**
 * Tóm tắt thông tin Addon cho AI context
 */
export interface IAddonSummary {
    id: string;
    name: string;
    description: string | null;
    price: number;
    isMonthlyPayment: boolean;
    types: string[];
}

/**
 * Tóm tắt thông tin Insurance cho AI context
 */
export interface IInsuranceSummary {
    id: string;
    name: string;
    description: string | null;
    price: number;
    useManagementFee: boolean;
    managementFeeType: string | null;
    managementFeeValue: number | null;
}

/**
 * Full context cho AI
 */
export interface IAiContext {
    warehouseTemplates: IWarehouseTemplateSummary[];
    rowTemplates: IRowTemplateSummary[];
    addons: IAddonSummary[];
    insurances: IInsuranceSummary[];
}

/**
 * Options cho việc ghi log AI interaction
 */
export interface ICozeLogOptions {
    discordChannelId?: string;
    discordUserId?: string;
}
