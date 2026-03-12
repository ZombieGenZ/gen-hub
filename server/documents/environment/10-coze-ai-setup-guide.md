# Hướng Dẫn Cấu Hình Coze AI cho GEN-HUB

> [!NOTE]
> Tài liệu này hướng dẫn cách lấy và cấu hình `COZE_API_KEY`, `COZE_BOT_ID` và `AI_PLUGIN_API_KEY` để sử dụng tính năng **AI Auto-Reply** trong hệ thống Live Chat của GEN-HUB, đồng thời thiết lập **AI Plugin** để Coze bot có thể lấy dữ liệu thời gian thực từ backend.

> [!IMPORTANT]
> Backend hiện đã đổi route từ `/coze-plugin/*` sang `/ai-plugin/*`. Khi cấu hình plugin trên Coze, hãy sử dụng toàn bộ endpoint mới theo tài liệu này.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Bước 1: Tạo Tài Khoản Coze](#2-bước-1-tạo-tài-khoản-coze)
3. [Bước 2: Tạo Bot Mới](#3-bước-2-tạo-bot-mới)
4. [Bước 3: Cấu Hình Model Tối Ưu](#4-bước-3-cấu-hình-model-tối-ưu)
5. [Bước 4: Thiết Lập AI Plugin](#5-bước-4-thiết-lập-ai-plugin)
6. [Bước 5: Cấu Hình Knowledge Base](#6-bước-5-cấu-hình-knowledge-base)
7. [Bước 6: Viết Prompt Tối Ưu](#7-bước-6-viết-prompt-tối-ưu)
8. [Bước 7: Publish Bot Cho API](#8-bước-7-publish-bot-cho-api)
9. [Bước 8: Lấy `COZE_BOT_ID`](#9-bước-8-lấy-coze_bot_id)
10. [Bước 9: Lấy `COZE_API_KEY`](#10-bước-9-lấy-coze_api_key)
11. [Bước 10: Cập Nhật File `.env`](#11-bước-10-cập-nhật-file-env)
12. [Xác Minh Cấu Hình](#12-xác-minh-cấu-hình)
13. [Xử Lý Lỗi Thường Gặp](#13-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**Coze** là nền tảng AI của ByteDance cho phép xây dựng chatbot có prompt, knowledge và plugin/tool calling. Trong GEN-HUB, Coze được dùng cho luồng **AI Auto-Reply** trong live chat.

### Coze được dùng ở đâu trong GEN-HUB?

- **CozeService**: backend gọi Coze Chat API để lấy phản hồi từ bot.
- **AI Plugin**: bộ API public của GEN-HUB để bot truy vấn dữ liệu realtime.
- **Knowledge Base**: nơi lưu FAQ, chính sách, tài liệu nghiệp vụ giúp bot trả lời ổn định hơn.

### Các tính năng chính

- **AI Auto-Reply**: tự động phản hồi khách hàng trong live chat.
- **Realtime Data via AI Plugin**: lấy giá kho, tình trạng còn trống, FAQ, điều khoản hợp đồng.
- **Lead Capture**: bot có thể tạo yêu cầu tư vấn khi khách muốn để lại thông tin.
- **Visit Booking**: bot có thể tạo lịch hẹn tham quan kho trực tiếp từ hội thoại.

### Các biến môi trường cần cấu hình

| Biến | Mô tả |
|------|-------|
| `COZE_ENABLED` | Bật/tắt tích hợp Coze (`true`/`false`) |
| `COZE_API_KEY` | Personal Access Token để backend gọi Coze API |
| `COZE_BOT_ID` | ID bot Coze đang dùng |
| `COZE_API_BASE_URL` | Base URL API Coze, mặc định `https://api.coze.com` |
| `AI_PLUGIN_API_KEY` | API key để Coze gọi các endpoint `/ai-plugin/*` của GEN-HUB |
| `ENABLE_AI_AUTO_REPLY` | Bật tính năng AI Auto-Reply trong backend |

> [!TIP]
> `AI_PLUGIN_API_KEY` là key của backend GEN-HUB, khác với `COZE_API_KEY`.  
> `COZE_API_KEY` dùng để **backend gọi Coze**.  
> `AI_PLUGIN_API_KEY` dùng để **Coze gọi backend**.

---

## 2. Bước 1: Tạo Tài Khoản Coze

1. Truy cập **[https://www.coze.com](https://www.coze.com)**.
2. Đăng ký tài khoản mới hoặc đăng nhập bằng:
   - Google Account
   - Email
3. Sau khi đăng nhập thành công, bạn sẽ vào **Coze Dashboard**.

> [!TIP]
> Nếu đang ở Việt Nam, nên dùng bản Global tại `coze.com` thay vì `coze.cn`.

---

## 3. Bước 2: Tạo Bot Mới

### 3.1. Tạo bot

1. Từ Dashboard, nhấn **"+ Create"** ở phần tạo agent.
2. Chọn tạo bot mới.
3. Điền thông tin:

| Field | Giá trị gợi ý |
|------|----------------|
| **Bot Name** | `GEN-HUB Assistant` |
| **Description** | `Trợ lý AI hỗ trợ khách hàng GEN-HUB` |
| **Bot Mode** | `Single Agent` |

4. Nhấn **Create** để hoàn tất.

### 3.2. Mục tiêu bot

Bot nên được thiết kế để xử lý các nhóm yêu cầu sau:

- Tư vấn tìm kho theo khu vực, diện tích, ngân sách.
- Trả lời câu hỏi về giá thuê, điều khoản và FAQ.
- Hỗ trợ khách đặt lịch tham quan kho.
- Ghi nhận thông tin liên hệ nếu khách cần nhân viên tư vấn.

---

## 4. Bước 3: Cấu Hình Model Tối Ưu

### 4.1. Chọn model

Trong phần **Model Settings**, chọn model phù hợp:

| Model | Đặc điểm | Khuyến nghị |
|------|----------|-------------|
| **GPT-4o mini** | nhanh, chi phí thấp, đủ tốt cho support | Khuyến nghị cho production |
| **GPT-4o** | chất lượng cao hơn | dùng cho tình huống phức tạp |
| **Claude 3.5 Sonnet** | reasoning tốt | phương án thay thế |

### 4.2. Generation settings gợi ý

| Thông số | Giá trị | Giải thích |
|---------|---------|------------|
| **Temperature** | `0.3 - 0.5` | giảm ngẫu nhiên, tăng độ nhất quán |
| **Top p** | `1` | giữ mặc định |
| **Frequency penalty** | `0` | giữ mặc định |
| **Presence penalty** | `0` | giữ mặc định |
| **Context rounds** | `3 - 5` | đủ giữ ngữ cảnh hội thoại |
| **Max response length** | `1024 - 2048` | phù hợp câu trả lời support |
| **Output format** | `Text` | phù hợp kênh chat |

> [!TIP]
> Với chatbot hỗ trợ khách hàng, ưu tiên phản hồi ổn định và chính xác hơn là sáng tạo.

---

## 5. Bước 4: Thiết Lập AI Plugin

> [!IMPORTANT]
> Đây là bước quan trọng nhất để Coze bot truy xuất dữ liệu GEN-HUB theo thời gian thực. Tên plugin mới nên dùng là `GEN_HUB_AI_API`.

### 5.1. Tổng quan các API

GEN-HUB hiện cung cấp **6 API endpoint** cho Coze bot:

| Tool | Endpoint | Mô tả |
|------|----------|-------|
| `get_warehouse_pricing` | `GET /ai-plugin/warehouse-pricing` | Tìm kho và lấy giá chi tiết |
| `check_availability` | `GET /ai-plugin/check-availability` | Kiểm tra tình trạng kho |
| `get_rental_contract_terms` | `GET /ai-plugin/rental-contract-terms` | Lấy điều khoản hợp đồng |
| `get_faq` | `GET /ai-plugin/faq` | Lấy FAQ cho AI tư vấn |
| `create_consultation_request` | `POST /ai-plugin/consultation-request` | Tạo yêu cầu để lại thông tin |
| `create_visit_booking` | `POST /ai-plugin/visit-booking` | Tạo lịch hẹn tham quan kho |

### 5.2. Tạo plugin trong Coze

#### Bước 1: Vào phần Plugins

1. Trong trang chỉnh sửa bot, chọn **Plugins** ở sidebar trái.
2. Nhấn **"+ Add"**.
3. Chọn **Create plugin**.
4. Hệ thống sẽ chuyển đến phần Library.

#### Bước 2: Điền thông tin plugin

| Field | Giá trị gợi ý |
|------|----------------|
| **Plugin name** | `GEN_HUB_AI_API` |
| **Brief Introduction** | `Lấy dữ liệu kho bãi GEN-HUB theo thời gian thực` |
| **Plugin description** | `Plugin cho phép Coze bot truy cập dữ liệu GEN-HUB theo thời gian thực để tìm kho, kiểm tra tình trạng còn trống, xem điều khoản hợp đồng, lấy FAQ, tạo yêu cầu tư vấn và đặt lịch tham quan kho.` |
| **Type** | `Cloud plugin` |
| **Plugin creation method** | `Create based on existing services` |
| **Plugin URL** | `https://api.gen-hub.dev` |

### 5.3. Cấu hình authentication

| Field | Giá trị |
|------|---------|
| **Authorization method** | `Service token / API key` |
| **Location** | `Header` |
| **Parameter name** | `X-API-Key` |
| **Service token/API key** | Giá trị của `AI_PLUGIN_API_KEY` trong `.env` |

Ví dụ:

```env
# Generate: openssl rand -hex 32
AI_PLUGIN_API_KEY=your_secure_random_api_key_here
```

> [!TIP]
> Guard của backend ưu tiên `AI_PLUGIN_API_KEY` và vẫn fallback sang `COZE_PLUGIN_API_KEY` để tương thích ngược. Tuy nhiên tài liệu và cấu hình mới nên dùng `AI_PLUGIN_API_KEY`.

### 5.4. Import OpenAPI schema

Sau khi tạo plugin:

1. Vào màn hình **Tool**.
2. Nhấn **Import**.
3. Chọn **URL & Raw data**.
4. Dán OpenAPI schema dưới đây.

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "GenHubAIAPI",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.gen-hub.dev"
    }
  ],
  "paths": {
    "/ai-plugin/warehouse-pricing": {
      "get": {
        "operationId": "get_warehouse_pricing",
        "summary": "Get warehouse pricing",
        "description": "Tìm danh sách kho phù hợp theo từ khóa, vị trí, diện tích, giá thuê và loại kho.",
        "security": [{ "ApiKeyAuth": [] }],
        "parameters": [
          { "name": "keywords", "in": "query", "required": false, "schema": { "type": "string" } },
          { "name": "province_name", "in": "query", "required": false, "schema": { "type": "string" } },
          { "name": "min_price", "in": "query", "required": false, "schema": { "type": "number" } },
          { "name": "max_price", "in": "query", "required": false, "schema": { "type": "number" } },
          { "name": "min_area", "in": "query", "required": false, "schema": { "type": "number" } },
          { "name": "max_area", "in": "query", "required": false, "schema": { "type": "number" } },
          { "name": "is_cold_storage", "in": "query", "required": false, "schema": { "type": "boolean" } },
          { "name": "is_shared_warehouse", "in": "query", "required": false, "schema": { "type": "boolean" } },
          { "name": "limit", "in": "query", "required": false, "schema": { "type": "integer", "default": 3 } }
        ],
        "responses": {
          "200": { "description": "Lấy danh sách kho thành công" }
        }
      }
    },
    "/ai-plugin/check-availability": {
      "get": {
        "operationId": "check_availability",
        "summary": "Check warehouse availability",
        "description": "Kiểm tra tình trạng còn trống của kho theo warehouse_id.",
        "security": [{ "ApiKeyAuth": [] }],
        "parameters": [
          { "name": "warehouse_id", "in": "query", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Kiểm tra tình trạng thành công" }
        }
      }
    },
    "/ai-plugin/rental-contract-terms": {
      "get": {
        "operationId": "get_rental_contract_terms",
        "summary": "Get rental contract terms",
        "description": "Lấy điều khoản hợp đồng thuê kho tiêu chuẩn của GEN-HUB.",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "200": { "description": "Lấy điều khoản hợp đồng thành công" }
        }
      }
    },
    "/ai-plugin/faq": {
      "get": {
        "operationId": "get_faq",
        "summary": "Get FAQ",
        "description": "Lấy danh sách câu hỏi thường gặp phục vụ tư vấn tự động.",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "200": { "description": "Lấy FAQ thành công" }
        }
      }
    },
    "/ai-plugin/consultation-request": {
      "post": {
        "operationId": "create_consultation_request",
        "summary": "Create consultation request",
        "description": "Tạo yêu cầu để lại thông tin để nhân viên GEN-HUB liên hệ tư vấn.",
        "security": [{ "ApiKeyAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "email", "subject", "message"],
                "properties": {
                  "name": { "type": "string" },
                  "email": { "type": "string", "format": "email" },
                  "phone": { "type": "string" },
                  "subject": { "type": "string" },
                  "message": { "type": "string" },
                  "warehouse_id": { "type": "string", "format": "uuid" },
                  "company": { "type": "string" },
                  "position": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Tạo yêu cầu tư vấn thành công" }
        }
      }
    },
    "/ai-plugin/visit-booking": {
      "post": {
        "operationId": "create_visit_booking",
        "summary": "Create warehouse visit booking",
        "description": "Tạo lịch hẹn tham quan kho cho khách hàng.",
        "security": [{ "ApiKeyAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["warehouse_id", "visitor_name", "visitor_email", "visit_date", "visit_time_start"],
                "properties": {
                  "warehouse_id": { "type": "string", "format": "uuid" },
                  "organization_id": { "type": "string", "format": "uuid" },
                  "visitor_name": { "type": "string" },
                  "visitor_email": { "type": "string", "format": "email" },
                  "visitor_phone": { "type": "string" },
                  "visitor_company": { "type": "string" },
                  "visitor_position": { "type": "string" },
                  "visit_date": { "type": "string", "format": "date-time" },
                  "visit_time_start": { "type": "string" },
                  "visit_time_end": { "type": "string" },
                  "purpose": { "type": "string", "enum": ["SITE_VISIT", "PRICE_DISCUSSION", "FACILITY_CHECK", "OTHER"] },
                  "purpose_details": { "type": "string" },
                  "number_of_visitors": { "type": "integer", "minimum": 1, "default": 1 }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Tạo lịch hẹn tham quan thành công" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  }
}
```

5. Nhấn **Import** để thêm tool.

### 5.5. Enable và publish plugin

1. Bật toàn bộ tool vừa import.
2. Test từng tool với dữ liệu mẫu.
3. Nhấn **Publish** để plugin có hiệu lực.

### 5.6. Add plugin vào bot

1. Quay lại bot `GEN-HUB Assistant`.
2. Chọn **Plugins**.
3. Nhấn **+ Add**.
4. Chọn **Library tools**.
5. Tìm plugin **GEN_HUB_AI_API**.
6. Thêm toàn bộ 6 tool vào bot.

> [!TIP]
> Sau khi add plugin, hãy test ngay trong phần Preview để kiểm tra bot có gọi tool đúng theo prompt hay không.

---

## 6. Bước 5: Cấu Hình Knowledge Base

### 6.1. Thêm knowledge

1. Trong bot, vào phần **Knowledge**.
2. Chọn **+ Add knowledge**.
3. Upload tài liệu hoặc tạo knowledge mới.

### 6.2. Loại tài liệu nên upload

| Loại | Nội dung | Format |
|------|----------|--------|
| **FAQ** | Câu hỏi thường gặp | `.txt`, `.md`, `.docx` |
| **Chính sách** | Điều khoản, quy định | `.pdf`, `.docx` |
| **Bảng giá tham khảo** | Tài liệu giá tĩnh | `.xlsx`, `.csv`, `.pdf` |
| **Hướng dẫn** | Quy trình thuê, thanh toán, bàn giao | `.md`, `.pdf` |

### 6.3. Retrieval settings gợi ý

| Thiết lập | Giá trị |
|----------|----------|
| **Retrieval Mode** | `Hybrid` |
| **Top K** | `3 - 5` |
| **Score Threshold** | `0.5` |

> [!IMPORTANT]
> Các dữ liệu thay đổi thường xuyên như tình trạng kho, giá động, lịch hẹn hoặc yêu cầu tư vấn không nên chỉ dựa vào knowledge. Hãy ưu tiên gọi AI Plugin để lấy dữ liệu realtime.

---

## 7. Bước 6: Viết Prompt Tối Ưu

> [!IMPORTANT]
> Prompt nên hướng bot dùng tool đúng lúc, hỏi lại khi thiếu thông tin và không tự bịa dữ liệu.

### 7.1. System Prompt

Copy nội dung dưới đây vào phần **Persona & Prompt**:

```text
# ĐỊNH DANH VÀ VAI TRÒ

Bạn là GEN-HUB Assistant, trợ lý AI của GEN-HUB, chuyên hỗ trợ khách hàng tìm thuê kho bãi, giải đáp thông tin dịch vụ và hỗ trợ đặt lịch tham quan.

## Mục tiêu chính
1. Tư vấn kho phù hợp theo khu vực, diện tích, ngân sách và đặc thù hàng hóa.
2. Cung cấp thông tin chính xác về giá thuê, tình trạng còn chỗ, FAQ và điều khoản hợp đồng.
3. Hỗ trợ khách đặt lịch tham quan kho.
4. Hỗ trợ khách để lại thông tin để nhân viên GEN-HUB liên hệ tư vấn.

## Nguyên tắc bắt buộc
- Luôn ưu tiên tính chính xác hơn sự trôi chảy.
- Không tự tạo warehouse_id, row_id, giá thuê, tình trạng trống, chính sách hoặc điều khoản.
- Khi cần dữ liệu thời gian thực, bắt buộc gọi AI Plugin thay vì trả lời theo suy đoán.
- Nếu chưa đủ dữ liệu để gọi tool, hãy hỏi lại đúng trường còn thiếu và giải thích ngắn gọn vì sao cần thông tin đó.
- Xưng hô lịch sự bằng "Anh/Chị"; giọng điệu chuyên nghiệp, thân thiện, rõ ràng.
- Trả lời theo ngôn ngữ khách đang dùng. Nếu khách hỏi bằng tiếng Anh, trả lời bằng tiếng Anh; nếu khách dùng tiếng Việt, trả lời bằng tiếng Việt.
- Nếu câu hỏi ngoài phạm vi GEN-HUB hoặc liên quan đến pháp lý/tài chính chuyên sâu mà hệ thống không có dữ liệu xác thực, hãy nói rõ giới hạn và đề nghị nhân viên hỗ trợ thêm.

## Thứ tự ưu tiên sử dụng tool
1. `get_warehouse_pricing`
   Dùng khi khách muốn tìm kho, hỏi giá, hỏi khu vực phù hợp hoặc cần gợi ý phương án thuê.
2. `check_availability`
   Dùng khi khách đã xác định kho cụ thể và muốn biết còn chỗ hay không.
3. `get_rental_contract_terms`
   Dùng khi khách hỏi về điều khoản hợp đồng, đặt cọc, thanh toán, trách nhiệm các bên.
4. `get_faq`
   Dùng khi khách hỏi thông tin chung, quy trình, tiện ích, dịch vụ, thời gian làm việc.
5. `create_consultation_request`
   Dùng khi khách muốn được nhân viên gọi lại hoặc cần hỗ trợ chuyên sâu ngoài phạm vi trả lời tự động.
6. `create_visit_booking`
   Dùng khi khách xác nhận muốn đặt lịch tham quan kho cụ thể.

## Quy tắc gọi từng tool

### Tool: get_warehouse_pricing
- Thu thập tối đa các thông tin sau nếu khách có: khu vực, diện tích, ngân sách, loại hàng hóa, nhu cầu kho lạnh hay kho chia sẻ.
- Nếu khách chỉ cung cấp một phần thông tin, vẫn có thể gọi tool với dữ liệu hiện có rồi hỏi bổ sung sau.
- Chỉ đề xuất tối đa 2-3 kho phù hợp nhất, không liệt kê quá dài.

### Tool: check_availability
- Chỉ gọi khi đã có `warehouse_id`.
- Nếu khách chưa xác định kho cụ thể, quay lại tư vấn bằng `get_warehouse_pricing`.
- Không được tự suy ra tình trạng trống khi chưa gọi tool.

### Tool: get_rental_contract_terms
- Dùng cho câu hỏi về hợp đồng, đặt cọc, thời hạn thuê, thanh toán, chấm dứt hợp đồng.
- Nếu tool trả về nội dung dài, hãy tóm tắt ngắn gọn theo ý chính và hỏi khách có muốn xem phần cụ thể nào không.

### Tool: get_faq
- Dùng cho câu hỏi chung như quy trình thuê, thủ tục, dịch vụ đi kèm, hỗ trợ vận hành.
- Nếu FAQ không đủ trả lời, hãy nói rõ thông tin hiện có chưa bao quát và đề nghị chuyển sang yêu cầu tư vấn.

### Tool: create_consultation_request
- Chỉ gọi sau khi đã xác nhận tối thiểu: họ tên, email, chủ đề, nội dung nhu cầu.
- Nếu thiếu số điện thoại hoặc công ty thì có thể bỏ qua, không bắt buộc.
- Trước khi gọi tool, tóm tắt ngắn lại thông tin để khách xác nhận.

### Tool: create_visit_booking
- Chỉ gọi khi đã có `warehouse_id`, họ tên, email, ngày tham quan và giờ bắt đầu.
- Nên xác nhận lại với khách: kho quan tâm, ngày giờ tham quan, số người tham gia, mục đích tham quan.
- Không tự đặt lịch nếu khách chưa xác nhận rõ ràng.

## Xử lý edge case
- Nếu không tìm thấy kho phù hợp:
  Hãy nói rõ hiện chưa có kho phù hợp với tiêu chí đã cung cấp, sau đó đề nghị nới ngân sách, đổi khu vực hoặc để lại thông tin để nhân viên hỗ trợ.
- Nếu tool trả về dữ liệu rỗng:
  Không suy diễn thêm. Hãy thông báo chưa có dữ liệu phù hợp tại thời điểm hiện tại.
- Nếu khách hỏi ngoài phạm vi GEN-HUB:
  Lịch sự từ chối và điều hướng về các chủ đề kho bãi, logistics, tham quan kho, FAQ hoặc tư vấn.
- Nếu khách muốn so sánh nhiều kho:
  Chỉ so sánh dựa trên dữ liệu tool đã trả về. Nếu thiếu dữ liệu so sánh thì nói rõ.

## Xử lý lỗi tool
- Nếu tool trả về lỗi hoặc không truy cập được:
  Xin lỗi ngắn gọn, nói rằng hệ thống đang tạm thời không lấy được dữ liệu realtime, và đề nghị khách thử lại hoặc để lại thông tin để nhân viên hỗ trợ.
- Không mô tả lỗi kỹ thuật nội bộ như stack trace, timeout chi tiết hoặc tên service backend.

## Quy tắc trình bày câu trả lời
- Ưu tiên câu ngắn, rõ ràng, có cấu trúc.
- Dùng bullet khi liệt kê nhiều ý.
- Giá tiền hiển thị theo VNĐ/tháng.
- Diện tích hiển thị theo m2.
- Luôn kết thúc bằng một câu hỏi mở hoặc gợi ý bước tiếp theo phù hợp.

## Ví dụ hội thoại mẫu

### Tình huống 1: Tìm kho
Khách: Tôi cần thuê kho 500 m2 ở Bình Dương, ngân sách khoảng 30 triệu/tháng.
Assistant: Em sẽ kiểm tra các kho phù hợp tại Bình Dương với diện tích khoảng 500 m2 và ngân sách quanh 30 triệu/tháng cho Anh/Chị.
[Gọi get_warehouse_pricing]
Assistant: Hiện GEN-HUB đang có 2 lựa chọn phù hợp nhất:
- Kho A: 480 m2, khoảng 28.000.000 VNĐ/tháng
- Kho B: 520 m2, khoảng 30.000.000 VNĐ/tháng
Anh/Chị muốn em kiểm tra tình trạng còn chỗ của kho nào trước?

### Tình huống 2: Đặt lịch tham quan
Khách: Tôi muốn xem kho A vào sáng thứ Sáu tuần sau.
Assistant: Em có thể hỗ trợ đặt lịch tham quan cho Anh/Chị. Em xin xác nhận lại:
- Kho quan tâm: Kho A
- Ngày tham quan: 2026-03-20
- Khung giờ dự kiến: 09:00
Anh/Chị vui lòng cho em xin họ tên và email để em tạo lịch giúp mình nhé.
[Sau khi đủ thông tin và khách xác nhận, gọi create_visit_booking]

### Tình huống 3: Để lại thông tin tư vấn
Khách: Tôi chưa chốt được nhu cầu, nhờ nhân viên gọi lại giúp.
Assistant: Em có thể tạo yêu cầu để đội ngũ GEN-HUB liên hệ lại cho Anh/Chị. Anh/Chị vui lòng cho em xin:
- Họ và tên
- Email
- Chủ đề cần hỗ trợ
- Mô tả ngắn nhu cầu hiện tại
[Sau khi đủ thông tin và khách xác nhận, gọi create_consultation_request]
```

### 7.2. Opening Message

```text
Xin chào! Tôi là GEN-HUB Assistant, trợ lý AI của GEN-HUB.

Tôi có thể giúp bạn:
- Tìm kiếm kho bãi phù hợp
- Xem thông tin và giá thuê
- Đặt lịch tham quan kho
- Để lại thông tin để nhân viên tư vấn
- Giải đáp câu hỏi về dịch vụ và hợp đồng

Bạn cần tôi hỗ trợ nội dung gì hôm nay?
```

### 7.3. Suggested Replies

```text
Tôi muốn tìm kho
Xem bảng giá
Đặt lịch tham quan
Để lại thông tin tư vấn
Tra cứu điều khoản hợp đồng
```

---

## 8. Bước 7: Publish Bot Cho API

### 8.1. Publish bot

1. Nhấn **Publish** ở góc phải trên.
2. Trong dialog publish, chọn kênh **API**.
3. Nhấn xác nhận để publish.

### 8.2. Xác nhận publish thành công

Sau khi publish:

- Bot hiển thị trạng thái **Published**.
- Backend GEN-HUB có thể gọi bot qua Coze API.

> [!TIP]
> Mỗi khi thay đổi prompt, plugin hoặc knowledge quan trọng, bạn nên publish lại bot.

---

## 9. Bước 8: Lấy `COZE_BOT_ID`

### Cách 1: Lấy từ URL

Khi đang ở trang chỉnh sửa bot, URL thường có dạng:

```text
https://www.coze.com/space/xxx/bot/7XXXXXXXXXXXXXXXXXX/develop
```

Chuỗi sau `/bot/` chính là `COZE_BOT_ID`.

### Cách 2: Lấy từ bot settings

1. Mở phần **Settings** của bot.
2. Tìm trường **Bot ID** hoặc **ID**.
3. Copy giá trị này.

> [!IMPORTANT]
> `COZE_BOT_ID` thường là một chuỗi số dài, ví dụ `7459876543210123456`.

---

## 10. Bước 9: Lấy `COZE_API_KEY`

### 10.1. Truy cập API Keys

1. Click avatar ở góc phải trên.
2. Chọn **API Keys** hoặc **Personal Access Tokens**.
3. Hoặc truy cập trực tiếp: **[https://www.coze.com/open/oauth/pats](https://www.coze.com/open/oauth/pats)**.

### 10.2. Tạo key mới

1. Nhấn **Add new token** hoặc **Create API Key**.
2. Điền thông tin:

| Field | Giá trị gợi ý |
|------|----------------|
| **Token Name** | `GEN-HUB Production` |
| **Expiration** | `90 days` hoặc `No expiration` |

3. Cấp quyền cần thiết:
   - `Bot` - Read and write
   - `Conversation` - Read and write
   - `Message` - Read and write

4. Nhấn tạo key.

### 10.3. Lưu lại API key

API key có dạng:

```text
pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> [!CAUTION]
> Key thường chỉ hiển thị một lần. Hãy copy và lưu ngay vào `.env`.

---

## 11. Bước 10: Cập Nhật File `.env`

### 11.1. Mở file `.env`

```bash
# Windows
notepad server\\.env

# Hoặc dùng VS Code
code server\\.env
```

### 11.2. Cập nhật các biến cần thiết

```env
# Coze AI Configuration (for Live Chat auto-reply)
COZE_ENABLED=true
COZE_API_KEY=pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
COZE_BOT_ID=7459876543210123456
COZE_API_BASE_URL=https://api.coze.com

# AI Plugin key for Coze plugin/tool calling
AI_PLUGIN_API_KEY=your_secure_random_api_key_here

# AI Auto-Reply
ENABLE_AI_AUTO_REPLY=true
```

### 11.3. Giải thích biến

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `COZE_ENABLED` | `true` | Bật tích hợp Coze |
| `COZE_API_KEY` | `pat_xxx...` | Token để backend gọi Coze |
| `COZE_BOT_ID` | chuỗi số bot | ID bot Coze |
| `COZE_API_BASE_URL` | `https://api.coze.com` | Base URL API |
| `AI_PLUGIN_API_KEY` | random key | Key để Coze gọi AI Plugin của GEN-HUB |
| `ENABLE_AI_AUTO_REPLY` | `true` | Bật phản hồi tự động |

---

## 12. Xác Minh Cấu Hình

### 12.1. Khởi động lại backend

```bash
cd server
npm run start:dev
```

### 12.2. Kiểm tra log

Khi server khởi động, xác nhận Coze service được load đúng và không báo lỗi missing env.

### 12.3. Test trực tiếp trên Coze

Trong phần Preview hoặc chat thử trên Coze, test các câu:

- `Tôi cần thuê kho 500 m² ở TP.HCM`
- `Kho này còn trống không?`
- `Cho tôi xem điều khoản hợp đồng thuê`
- `Tôi muốn đặt lịch tham quan kho`
- `Tôi muốn để lại thông tin để nhân viên tư vấn`

### 12.4. Kiểm tra tool calling

Xác nhận bot gọi đúng các tool:

- `get_warehouse_pricing`
- `check_availability`
- `get_rental_contract_terms`
- `get_faq`
- `create_consultation_request`
- `create_visit_booking`

### 12.5. Test từ GEN-HUB frontend/client

1. Mở live chat trên client.
2. Gửi câu hỏi thực tế.
3. Kiểm tra phản hồi có đúng nghiệp vụ không.
4. Nếu khách để lại thông tin hoặc đặt lịch, kiểm tra dữ liệu có được tạo ở backend hay không.

---

## 13. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi `401 Unauthorized`

**Nguyên nhân**

- `COZE_API_KEY` sai hoặc đã hết hạn.
- `X-API-Key` cấu hình sai cho AI Plugin.

**Giải pháp**

- Tạo lại `COZE_API_KEY`.
- Kiểm tra `AI_PLUGIN_API_KEY` trong plugin config có đúng với server không.

### ❌ Lỗi `403 Forbidden`

**Nguyên nhân**

- Key không có đủ quyền.
- Plugin gọi sai header auth.

**Giải pháp**

- Tạo lại token với đủ quyền Bot, Conversation, Message.
- Kiểm tra lại auth method trong plugin.

### ❌ Lỗi `404 Not Found`

**Nguyên nhân**

- Dùng route cũ `/coze-plugin/*`.
- Bot ID sai.
- Plugin URL sai môi trường.

**Giải pháp**

- Đổi toàn bộ route sang `/ai-plugin/*`.
- Kiểm tra lại `COZE_BOT_ID`.
- Xác nhận base URL plugin đúng domain backend.

### ❌ Bot không gọi AI Plugin

**Nguyên nhân**

- Prompt chưa hướng dẫn dùng tool rõ ràng.
- Tool chưa được add vào bot.
- Tool chưa publish hoặc chưa enable.

**Giải pháp**

- Cập nhật prompt.
- Add lại đủ 6 tool.
- Publish lại plugin và bot.

### ❌ Bot trả lời chung chung, không đúng dữ liệu

**Nguyên nhân**

- Không gọi tool.
- Knowledge chưa đủ tốt.
- Prompt quá mơ hồ.

**Giải pháp**

- Bổ sung hướng dẫn trong prompt: khi cần dữ liệu realtime phải gọi AI Plugin.
- Giảm temperature.
- Cải thiện knowledge và mô tả tool.

### ❌ Không tạo được lịch tham quan hoặc yêu cầu tư vấn

**Nguyên nhân**

- Thiếu field bắt buộc trong request.
- Bot chưa hỏi đủ thông tin trước khi gọi tool.

**Giải pháp**

- Với `create_consultation_request`, cần tối thiểu: `name`, `email`, `subject`, `message`.
- Với `create_visit_booking`, cần tối thiểu: `warehouse_id`, `visitor_name`, `visitor_email`, `visit_date`, `visit_time_start`.

---

## Tài Liệu Tham Khảo

- [Coze API Documentation](https://www.coze.com/docs)
- [Coze Chat API Reference](https://www.coze.com/docs/developer_guides/chat_v3)
- [Coze Plugins Guide](https://www.coze.com/docs/developer_guides/plugin)
- [Personal Access Tokens](https://www.coze.com/docs/developer_guides/pat)
- [OpenAPI Specification](https://swagger.io/specification/)

---

> **Cập nhật lần cuối**: 12/03/2026

> Nếu phát sinh thay đổi endpoint hoặc payload ở backend, cần cập nhật lại OpenAPI schema trong plugin để Coze gọi tool đúng.

