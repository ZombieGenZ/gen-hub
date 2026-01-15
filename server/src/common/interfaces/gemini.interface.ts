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

/**
 * Interface cho kết quả phân loại webform
 */
export interface IWebformClassification {
    isUserContact: boolean;         // True nếu là yêu cầu liên hệ từ người dùng thực
    isSpamOrAdvertising: boolean;   // True nếu là spam hoặc quảng cáo
    category: 'inquiry' | 'support' | 'spam' | 'advertising' | 'unknown';
    confidence: number;             // Độ tin cậy 0-1
    reason?: string;                // Lý do phân loại
    isPotentialCustomer?: boolean;  // True nếu có tiềm năng là khách hàng
}

