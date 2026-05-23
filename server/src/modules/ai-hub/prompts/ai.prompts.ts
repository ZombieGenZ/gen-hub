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
 * Prompt phân tích toàn diện xe từ ảnh camera cổng kho
 * Input: ảnh base64, trả về JSON đầy đủ về xe và biển số
 */
export const VEHICLE_ANALYSIS_PROMPT = `Analyze this vehicle image captured at a warehouse gate in Vietnam.
Return ONLY valid JSON with no markdown, no backticks, in this exact format:
{"license_plate":"","plate_confidence":0.0,"vehicle_type":"TRUCK","vehicle_color":"","plate_format":"standard","condition_flags":[]}

Fields:
- license_plate: exact plate text (e.g. "51A-12345", "79B-456.78") or empty string if unreadable
- plate_confidence: 0.0 to 1.0
- vehicle_type: one of TRUCK|CAR|MOTORCYCLE|CONTAINER|VAN|OTHER
- vehicle_color: primary vehicle color in Vietnamese (e.g. "Trắng", "Xanh", "Đỏ", "Bạc")
- plate_format: one of standard|motorcycle_2row|special_blue|military|foreign|unknown
- condition_flags: array of applicable tags: "dirty_plate"|"low_light"|"partial_occlusion"|"blurry"|"damage_visible"|"no_vehicle"

Vietnamese plate formats:
- standard: XX[A-Z]-XXXXX (e.g. 51A-12345, 79B-456.78, 30G-888.88)
- motorcycle_2row: 2-row format, province code on top row
- special_blue: blue background for government/public service vehicles
- military: army green plate

JSON Response:`;

/**
 * Prompt extract yêu cầu tìm kho từ văn bản tự nhiên tiếng Việt
 * Placeholder: {{query}}
 */
export const WAREHOUSE_FILTER_EXTRACT_PROMPT = `Extract warehouse search requirements from this Vietnamese customer query.
Return ONLY valid JSON with no markdown, no backticks:
{"province_name":null,"area_min":null,"area_max":null,"budget_max_monthly":null,"is_cold_storage":null,"is_shared":null,"keywords":null,"industry":null,"location_hints":[]}

Rules:
- area in m² (convert "500 mét vuông"→500, "1000m2"→1000, "nửa ha"→5000)
- budget in VND (convert "15 triệu"→15000000, "20tr/tháng"→20000000)
- is_cold_storage: true only if cold/frozen storage is explicitly mentioned
- is_shared: true=shared slots, false=full warehouse, null=not mentioned
- location_hints: tags from ["near_port","near_airport","industrial_zone","city_center","near_highway"]
- industry: detect context ("thực phẩm đông lạnh"→"food_frozen","điện tử"→"electronics","nội thất"→"furniture","dược phẩm"→"pharma","may mặc"→"textile")
- keywords: any warehouse-specific keywords not covered by other fields

Customer query: {{query}}

JSON Response:`;

/**
 * Prompt ranking và giải thích kho phù hợp nhất
 * Placeholders: {{query}}, {{warehouses}}
 */
export const WAREHOUSE_RANKING_PROMPT = `You are a Vietnamese warehouse rental expert. Rank the best matching warehouses for this customer.

Customer need: {{query}}

Available warehouses:
{{warehouses}}

Return ONLY valid JSON array (max 5 items, sorted best first, no markdown, no backticks):
[{"warehouse_id":"","match_score":0,"match_reason":"","highlights":[]}]

Rules:
- match_score: 0-100 (be honest — only recommend if genuinely suitable, score below 50 means poor match)
- match_reason: 1-2 sentences in Vietnamese explaining WHY this warehouse fits
- highlights: 2-4 short Vietnamese bullet points about key features (e.g. "Kho lạnh -18°C", "Cách cảng 2km", "PCCC 4 lớp")
- Exclude warehouses with match_score < 40

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
  return EMAIL_CLASSIFICATION_PROMPT.replace('{{senderName}}', senderName)
    .replace('{{senderEmail}}', senderEmail)
    .replace('{{subject}}', subject)
    .replace('{{content}}', content.substring(0, 1000));
}

export function buildWarehouseFilterExtractPrompt(query: string): string {
  return WAREHOUSE_FILTER_EXTRACT_PROMPT.replace(
    '{{query}}',
    query.substring(0, 500),
  );
}

export function buildWarehouseRankingPrompt(
  query: string,
  warehouses: object[],
): string {
  return WAREHOUSE_RANKING_PROMPT.replace(
    '{{query}}',
    query.substring(0, 300),
  ).replace('{{warehouses}}', JSON.stringify(warehouses).substring(0, 8000));
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
  return WEBFORM_CLASSIFICATION_PROMPT.replace(
    '{{senderName}}',
    senderName || 'Không có',
  )
    .replace('{{senderEmail}}', senderEmail || 'Không có')
    .replace('{{company}}', company || 'Không có')
    .replace('{{phone}}', phone || 'Không có')
    .replace('{{subject}}', subject || 'Không có')
    .replace('{{message}}', message.substring(0, 1000));
}
