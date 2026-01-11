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
 * Prompt phân loại form liên hệ từ website
 * Các placeholder:
 * - {{senderName}}: Tên người gửi
 * - {{senderEmail}}: Email người gửi
 * - {{company}}: Tên công ty (nếu có)
 * - {{phone}}: Số điện thoại (nếu có)
 * - {{subject}}: Chủ đề liên hệ
 * - {{message}}: Nội dung tin nhắn (max 1000 ký tự)
 */
export const WEBFORM_CLASSIFICATION_PROMPT = `Bạn là một hệ thống phân loại yêu cầu liên hệ từ form website. Phân tích yêu cầu sau và xác định xem đây là:
1. Yêu cầu hỗ trợ thực sự từ khách hàng hoặc khách hàng tiềm năng
2. Spam/rác (nội dung vô nghĩa, bot, test)
3. Quảng cáo/tiếp thị bán hàng
4. Không xác định

Đặc điểm form liên hệ website khác với email:
- Thường ngắn gọn và trực tiếp hơn
- Được gửi từ form có yêu cầu xác thực cơ bản
- Thường là yêu cầu tư vấn, hỏi về dịch vụ, báo giá
- Lưu ý: Nếu có thông tin công ty và số điện thoại thực, đây thường là khách hàng tiềm năng

Trả về JSON với format chính xác sau (KHÔNG có markdown, KHÔNG có backticks):
{"isUserContact": boolean, "isSpamOrAdvertising": boolean, "category": "inquiry"|"support"|"spam"|"advertising"|"unknown", "confidence": 0.0-1.0, "reason": "lý do ngắn gọn", "isPotentialCustomer": boolean}

Thông tin yêu cầu liên hệ:
- Họ tên: {{senderName}}
- Email: {{senderEmail}}
- Công ty: {{company}}
- Điện thoại: {{phone}}
- Chủ đề: {{subject}}
- Nội dung: {{message}}

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

/**
 * Hàm build prompt cho webform classification
 */
export function buildWebformClassificationPrompt(
    senderEmail: string,
    senderName: string,
    company: string | undefined,
    phone: string | undefined,
    subject: string,
    message: string,
): string {
    return WEBFORM_CLASSIFICATION_PROMPT
        .replace('{{senderName}}', senderName || 'Không có')
        .replace('{{senderEmail}}', senderEmail || 'Không có')
        .replace('{{company}}', company || 'Không có')
        .replace('{{phone}}', phone || 'Không có')
        .replace('{{subject}}', subject || 'Không có')
        .replace('{{message}}', message.substring(0, 1000));
}

