/**
 * Prompt templates cho Gemini AI
 * Tách riêng ra để dễ customize và maintain
 */

/**
 * Prompt mặc định cho phân loại email
 * Các placeholder:
 * - {{senderName}}: Tên người gửi
 * - {{senderEmail}}: Email người gửi
 * - {{subject}}: Tiêu đề email
 * - {{content}}: Nội dung email (max 1000 ký tự)
 */
export const EMAIL_CLASSIFICATION_PROMPT = `Bạn là một hệ thống phân loại email. Phân tích email sau và xác định xem đây là:
1. Email liên hệ/hỏi đáp từ người dùng thực (người cần hỗ trợ, khách hàng tiềm năng)
2. Email quảng cáo/marketing
3. Email spam
4. Bản tin (newsletter)
5. Không xác định

Trả về JSON với format chính xác sau (KHÔNG có markdown, KHÔNG có backticks):
{"isUserContact": boolean, "isSpamOrAdvertising": boolean, "category": "contact"|"spam"|"advertising"|"newsletter"|"unknown", "confidence": 0.0-1.0, "reason": "lý do ngắn gọn"}

Email cần phân loại:
- Người gửi: {{senderName}} <{{senderEmail}}>
- Tiêu đề: {{subject}}
- Nội dung: {{content}}

JSON Response:`;

/**
 * Hàm build prompt từ template
 */
export function buildEmailClassificationPrompt(
    senderEmail: string,
    senderName: string,
    subject: string,
    content: string,
): string {
    return EMAIL_CLASSIFICATION_PROMPT
        .replace('{{senderName}}', senderName)
        .replace('{{senderEmail}}', senderEmail)
        .replace('{{subject}}', subject)
        .replace('{{content}}', content.substring(0, 1000));
}
