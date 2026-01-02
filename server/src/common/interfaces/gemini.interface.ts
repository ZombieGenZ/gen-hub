/**
 * Interface cho kết quả phân loại email
 */
export interface IEmailClassification {
    isUserContact: boolean;        // True nếu là email liên hệ từ người dùng thực
    isSpamOrAdvertising: boolean;  // True nếu là email quảng cáo hoặc spam
    category: 'contact' | 'spam' | 'advertising' | 'newsletter' | 'unknown';
    confidence: number;            // Độ tin cậy 0-1
    reason?: string;               // Lý do phân loại
}

/**
 * Interface cho dữ liệu log AI
 */
export interface IAILogData {
    model: string;
    purpose: string;
    inputText: string;
    outputText?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    durationMs?: number;
    isSuccess: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

/**
 * Interface cho email classification request
 */
export interface IEmailClassificationRequest {
    senderEmail: string;
    senderName: string;
    subject: string;
    content: string;
}
