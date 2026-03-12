# Hướng Dẫn Cấu Hình Dify AI cho GEN-HUB

> [!NOTE]
> Tài liệu này hướng dẫn cách cấu hình `DIFY_API_KEYS`, `DIFY_APP_IDS`, `DIFY_API_KEY`, `DIFY_APP_ID`, `DIFY_API_BASE_URL` và `AI_PLUGIN_API_KEY` để sử dụng Dify cho tính năng **AI Auto-Reply** của GEN-HUB.

> [!IMPORTANT]
> Backend hiện đã dùng route `/ai-plugin/*`. Khi cấu hình tool trong Dify, không dùng lại route cũ `/coze-plugin/*`.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Bước 1: Tạo Tài Khoản Dify](#2-bước-1-tạo-tài-khoản-dify)
3. [Bước 2: Tạo App Mới](#3-bước-2-tạo-app-mới)
4. [Bước 3: Cấu Hình Model](#4-bước-3-cấu-hình-model)
5. [Bước 4: Thiết Lập Tools](#5-bước-4-thiết-lập-tools)
6. [Bước 5: Cấu Hình Knowledge Base](#6-bước-5-cấu-hình-knowledge-base)
7. [Bước 6: Viết Prompt Tối Ưu](#7-bước-6-viết-prompt-tối-ưu)
8. [Bước 7: Publish App Cho API](#8-bước-7-publish-app-cho-api)
9. [Bước 8: Lấy `DIFY_APP_ID`](#9-bước-8-lấy-dify_app_id)
10. [Bước 9: Lấy `DIFY_API_KEY`](#10-bước-9-lấy-dify_api_key)
11. [Bước 10: Cập Nhật File `.env`](#11-bước-10-cập-nhật-file-env)
12. [Xác Minh Cấu Hình](#12-xác-minh-cấu-hình)
13. [Xử Lý Lỗi Thường Gặp](#13-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**Dify** là nền tảng để xây dựng ứng dụng AI như chatbot, workflow app, knowledge-based assistant và API service. Trong GEN-HUB, Dify có thể thay thế Coze cho luồng AI Auto-Reply nếu backend được cấu hình gọi Dify.

### Dify được dùng như thế nào trong GEN-HUB?

- **Chatbot/App AI**: xử lý hội thoại với khách hàng.
- **Tool Calling**: gọi AI Plugin của GEN-HUB để lấy dữ liệu realtime.
- **Knowledge Retrieval**: dùng tài liệu nội bộ để trả lời FAQ, chính sách, quy trình.

### Những use case chính

- Tư vấn tìm kho theo vị trí, diện tích, ngân sách.
- Trả lời câu hỏi về giá thuê, FAQ, hợp đồng.
- Tạo yêu cầu để lại thông tin cho nhân viên tư vấn.
- Tạo lịch hẹn tham quan kho.

### Các biến môi trường cần cấu hình

| Biến | Mô tả |
|------|-------|
| `DIFY_ENABLED` | Bật/tắt tích hợp Dify |
| `DIFY_API_KEYS` | Danh sách API key, phân tách bằng dấu phẩy |
| `DIFY_APP_IDS` | Danh sách App ID, phân tách bằng dấu phẩy |
| `DIFY_API_KEY` | API key đơn cho backward compatibility |
| `DIFY_APP_ID` | App ID đơn cho backward compatibility |
| `DIFY_API_BASE_URL` | Base URL API Dify, thường là `https://api.dify.ai/v1` |
| `AI_PLUGIN_API_KEY` | API key để Dify gọi các endpoint `/ai-plugin/*` của GEN-HUB |
| `ENABLE_AI_AUTO_REPLY` | Bật phản hồi tự động trong backend |

> [!TIP]
> `DIFY_API_KEY` là key để backend gọi Dify.  
> `AI_PLUGIN_API_KEY` là key để Dify gọi lại backend GEN-HUB qua AI Plugin.

---

## 2. Bước 1: Tạo Tài Khoản Dify

1. Truy cập **[https://cloud.dify.ai](https://cloud.dify.ai)**.
2. Đăng ký hoặc đăng nhập.
3. Tạo workspace mới hoặc chọn workspace có sẵn cho GEN-HUB.

> [!TIP]
> Nếu doanh nghiệp đang self-host Dify thì thay bằng domain Dify nội bộ, nhưng các bước cấu hình nhìn chung tương tự.

---

## 3. Bước 2: Tạo App Mới

### 3.1. Chọn loại app

Từ **Studio**, chọn **Create App** và cân nhắc:

- **Chatbot**: phù hợp nhất cho live chat support.
- **Chatflow**: phù hợp nếu cần workflow nhiều bước, rẽ nhánh, approval hoặc xử lý phức tạp hơn.

> [!TIP]
> Với use case hiện tại của GEN-HUB, nên bắt đầu bằng **Chatbot** để triển khai nhanh.

### 3.2. Điền thông tin app

| Field | Giá trị gợi ý |
|------|----------------|
| **App Name** | `GEN-HUB Assistant` |
| **Description** | `Trợ lý AI hỗ trợ khách hàng GEN-HUB` |
| **Mode** | `Chatbot` |

### 3.3. Mục tiêu của app

App Dify nên có khả năng:

- Tư vấn tìm kho và lọc theo nhu cầu.
- Trả lời FAQ và điều khoản hợp đồng.
- Hướng dẫn khách để lại thông tin liên hệ.
- Hỗ trợ đặt lịch tham quan kho bằng tool calling.

---

## 4. Bước 3: Cấu Hình Model

### 4.1. Kết nối model provider

Trong phần **Settings / Model Provider**:

1. Chọn provider bạn đang có key, ví dụ:
   - OpenAI
   - Anthropic
   - Gemini
   - Azure OpenAI
2. Dán API key tương ứng.
3. Test kết nối.
4. Lưu cấu hình.

### 4.2. Chọn model cho app

| Model | Đặc điểm | Khuyến nghị |
|------|----------|-------------|
| `gpt-4o-mini` | nhanh, chi phí thấp, đủ tốt cho support | Khuyến nghị cho production |
| `gpt-4o` / `gpt-4.1` | chất lượng cao hơn | dùng cho trường hợp phức tạp |
| `claude-sonnet` | reasoning tốt | phương án thay thế |

### 4.3. Generation settings gợi ý

| Thông số | Giá trị gợi ý | Giải thích |
|------|----------------|-----------|
| `temperature` | `0.3 - 0.5` | giảm độ ngẫu nhiên |
| `max tokens` | `1024 - 2048` | đủ cho support chat |
| `response mode` | `streaming` | phù hợp chat realtime |

> [!TIP]
> Với hệ thống support, phản hồi cần ổn định và chính xác hơn là sáng tạo.

---

## 5. Bước 4: Thiết Lập Tools

> [!IMPORTANT]
> Dify có thể import OpenAPI và dùng như custom tool. Đây là cách tiêu chuẩn để Dify gọi AI Plugin của GEN-HUB.

### 5.1. Tổng quan các API của GEN-HUB

GEN-HUB hiện có **6 endpoint** dành cho Dify:

| Tool | Endpoint | Mô tả |
|------|----------|-------|
| `get_warehouse_pricing` | `GET /ai-plugin/warehouse-pricing` | Tìm kho và lấy giá chi tiết |
| `check_availability` | `GET /ai-plugin/check-availability` | Kiểm tra tình trạng kho |
| `get_rental_contract_terms` | `GET /ai-plugin/rental-contract-terms` | Lấy điều khoản hợp đồng |
| `get_faq` | `GET /ai-plugin/faq` | Lấy FAQ cho AI tư vấn |
| `create_consultation_request` | `POST /ai-plugin/consultation-request` | Tạo yêu cầu để lại thông tin |
| `create_visit_booking` | `POST /ai-plugin/visit-booking` | Tạo lịch hẹn tham quan kho |

### 5.2. Tạo custom tool trong Dify

1. Vào **Tools**.
2. Chọn **Custom Tools**.
3. Chọn **Import via OpenAPI / Swagger**.
4. Đặt tên tool:

| Field | Giá trị gợi ý |
|------|----------------|
| **Tool Name** | `GEN_HUB_AI_API` |
| **Base URL** | `https://api.gen-hub.dev` |

### 5.3. Cấu hình authentication cho tool

| Field | Giá trị |
|------|---------|
| **Auth Type** | `API Key` |
| **Location** | `Header` |
| **Header Name** | `X-API-Key` |
| **Value** | Giá trị `AI_PLUGIN_API_KEY` trong `.env` của backend |

Ví dụ:

```env
AI_PLUGIN_API_KEY=your_secure_random_api_key_here
```

### 5.4. Import OpenAPI schema

Bạn có thể import schema mẫu sau:

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
        "security": [{ "ApiKeyAuth": [] }],
        "parameters": [
          { "name": "keywords", "in": "query", "schema": { "type": "string" } },
          { "name": "province_name", "in": "query", "schema": { "type": "string" } },
          { "name": "min_price", "in": "query", "schema": { "type": "number" } },
          { "name": "max_price", "in": "query", "schema": { "type": "number" } },
          { "name": "min_area", "in": "query", "schema": { "type": "number" } },
          { "name": "max_area", "in": "query", "schema": { "type": "number" } },
          { "name": "is_cold_storage", "in": "query", "schema": { "type": "boolean" } },
          { "name": "is_shared_warehouse", "in": "query", "schema": { "type": "boolean" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 3 } }
        ],
        "responses": {
          "200": {
            "description": "Successful retrieval of warehouse data"
          }
        }
      }
    },
    "/ai-plugin/check-availability": {
      "get": {
        "operationId": "check_availability",
        "summary": "Check warehouse status",
        "security": [{ "ApiKeyAuth": [] }],
        "parameters": [
          {
            "name": "warehouse_id",
            "in": "query",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Returns availability status"
          }
        }
      }
    },
    "/ai-plugin/rental-contract-terms": {
      "get": {
        "operationId": "get_rental_contract_terms",
        "summary": "Get contract terms",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "200": {
            "description": "Returns contract terms"
          }
        }
      }
    },
    "/ai-plugin/faq": {
      "get": {
        "operationId": "get_faq",
        "summary": "Get FAQ",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "200": {
            "description": "Returns FAQ data"
          }
        }
      }
    },
    "/ai-plugin/consultation-request": {
      "post": {
        "operationId": "create_consultation_request",
        "summary": "Create consultation request",
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
          "201": {
            "description": "Consultation request created"
          }
        }
      }
    },
    "/ai-plugin/visit-booking": {
      "post": {
        "operationId": "create_visit_booking",
        "summary": "Create warehouse visit booking",
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
                  "purpose": {
                    "type": "string",
                    "enum": ["SITE_VISIT", "PRICE_DISCUSSION", "FACILITY_CHECK", "OTHER"]
                  },
                  "purpose_details": { "type": "string" },
                  "number_of_visitors": { "type": "integer", "minimum": 1, "default": 1 }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Visit booking created"
          }
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

### 5.5. Add tool vào app

Sau khi import:

1. Quay lại app `GEN-HUB Assistant`.
2. Thêm tool vào app hoặc node tool nếu dùng Chatflow.
3. Test từng operation bằng dữ liệu mẫu.

> [!TIP]
> Nếu app trả lời mà không gọi tool, thường nguyên nhân là prompt chưa đủ rõ hoặc tool chưa được add vào app.

---

## 6. Bước 5: Cấu Hình Knowledge Base

### 6.1. Tạo knowledge base

1. Vào **Knowledge**.
2. Chọn **Create Knowledge**.
3. Upload tài liệu hoặc import dần theo từng nhóm nội dung.

### 6.2. Loại tài liệu nên upload

| Loại | Nội dung | Format |
|------|----------|--------|
| **FAQ** | Câu hỏi thường gặp | `.txt`, `.md`, `.docx` |
| **Chính sách** | Điều khoản, quy định | `.pdf`, `.docx` |
| **Bảng giá tham khảo** | Giá thuê tĩnh | `.xlsx`, `.csv`, `.pdf` |
| **Hướng dẫn** | Quy trình thuê, thanh toán | `.md`, `.pdf` |

### 6.3. Gắn knowledge vào app

1. Mở app.
2. Chọn phần context hoặc knowledge integration.
3. Gắn knowledge base vừa tạo.
4. Cấu hình retrieval settings.

### 6.4. Retrieval settings gợi ý

| Thiết lập | Giá trị gợi ý |
|----------|----------------|
| `Top K` | `3 - 5` |
| `Score Threshold` | `0.5` |
| `Retrieval Mode` | semantic + keyword nếu workspace hỗ trợ |

> [!IMPORTANT]
> Các dữ liệu thay đổi thường xuyên như tình trạng kho, lịch tham quan hoặc yêu cầu tư vấn phải lấy qua AI Plugin, không nên chỉ dựa vào knowledge.

---

## 7. Bước 6: Viết Prompt Tối Ưu

> [!IMPORTANT]
> Chất lượng phản hồi của Dify phụ thuộc lớn vào prompt, tool description và retrieval settings.

### 7.1. System Prompt gợi ý

Copy nội dung sau vào **Instructions / System Prompt**:

```text
Bạn là GEN-HUB Assistant, trợ lý AI của GEN-HUB, chuyên hỗ trợ khách hàng tìm thuê kho bãi, giải đáp thông tin dịch vụ và hỗ trợ đặt lịch tham quan.

Mục tiêu chính:
1. Tư vấn kho phù hợp theo khu vực, diện tích, ngân sách và đặc thù hàng hóa.
2. Cung cấp thông tin chính xác về giá thuê, tình trạng còn chỗ, FAQ và điều khoản hợp đồng.
3. Hỗ trợ khách đặt lịch tham quan kho.
4. Hỗ trợ khách để lại thông tin để nhân viên GEN-HUB liên hệ tư vấn.

Nguyên tắc bắt buộc:
- Luôn ưu tiên tính chính xác hơn sự trôi chảy.
- Không tự tạo warehouse_id, row_id, giá thuê, tình trạng trống, chính sách hoặc điều khoản.
- Khi cần dữ liệu thời gian thực, bắt buộc gọi AI Plugin thay vì trả lời theo suy đoán.
- Nếu chưa đủ dữ liệu để gọi tool, hãy hỏi lại đúng trường còn thiếu và giải thích ngắn gọn vì sao cần thông tin đó.
- Xưng hô lịch sự bằng "Anh/Chị"; giọng điệu chuyên nghiệp, thân thiện, rõ ràng.
- Trả lời theo ngôn ngữ khách đang dùng. Nếu khách hỏi bằng tiếng Anh, trả lời bằng tiếng Anh; nếu khách dùng tiếng Việt, trả lời bằng tiếng Việt.
- Nếu câu hỏi ngoài phạm vi GEN-HUB hoặc liên quan đến pháp lý/tài chính chuyên sâu mà hệ thống không có dữ liệu xác thực, hãy nói rõ giới hạn và đề nghị nhân viên hỗ trợ thêm.

Thứ tự ưu tiên sử dụng tool:
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

Quy tắc gọi từng tool:

Tool `get_warehouse_pricing`
- Thu thập tối đa các thông tin sau nếu khách có: khu vực, diện tích, ngân sách, loại hàng hóa, nhu cầu kho lạnh hay kho chia sẻ.
- Nếu khách chỉ cung cấp một phần thông tin, vẫn có thể gọi tool với dữ liệu hiện có rồi hỏi bổ sung sau.
- Chỉ đề xuất tối đa 2-3 kho phù hợp nhất, không liệt kê quá dài.

Tool `check_availability`
- Chỉ gọi khi đã có `warehouse_id`.
- Nếu khách chưa xác định kho cụ thể, quay lại tư vấn bằng `get_warehouse_pricing`.
- Không được tự suy ra tình trạng trống khi chưa gọi tool.

Tool `get_rental_contract_terms`
- Dùng cho câu hỏi về hợp đồng, đặt cọc, thời hạn thuê, thanh toán, chấm dứt hợp đồng.
- Nếu tool trả về nội dung dài, hãy tóm tắt ngắn gọn theo ý chính và hỏi khách có muốn xem phần cụ thể nào không.

Tool `get_faq`
- Dùng cho câu hỏi chung như quy trình thuê, thủ tục, dịch vụ đi kèm, hỗ trợ vận hành.
- Nếu FAQ không đủ trả lời, hãy nói rõ thông tin hiện có chưa bao quát và đề nghị chuyển sang yêu cầu tư vấn.

Tool `create_consultation_request`
- Chỉ gọi sau khi đã xác nhận tối thiểu: họ tên, email, chủ đề, nội dung nhu cầu.
- Nếu thiếu số điện thoại hoặc công ty thì có thể bỏ qua, không bắt buộc.
- Trước khi gọi tool, tóm tắt ngắn lại thông tin để khách xác nhận.

Tool `create_visit_booking`
- Chỉ gọi khi đã có `warehouse_id`, họ tên, email, ngày tham quan và giờ bắt đầu.
- Nên xác nhận lại với khách: kho quan tâm, ngày giờ tham quan, số người tham gia, mục đích tham quan.
- Không tự đặt lịch nếu khách chưa xác nhận rõ ràng.

Xử lý edge case:
- Nếu không tìm thấy kho phù hợp:
  Hãy nói rõ hiện chưa có kho phù hợp với tiêu chí đã cung cấp, sau đó đề nghị nới ngân sách, đổi khu vực hoặc để lại thông tin để nhân viên hỗ trợ.
- Nếu tool trả về dữ liệu rỗng:
  Không suy diễn thêm. Hãy thông báo chưa có dữ liệu phù hợp tại thời điểm hiện tại.
- Nếu khách hỏi ngoài phạm vi GEN-HUB:
  Lịch sự từ chối và điều hướng về các chủ đề kho bãi, logistics, tham quan kho, FAQ hoặc tư vấn.
- Nếu khách muốn so sánh nhiều kho:
  Chỉ so sánh dựa trên dữ liệu tool đã trả về. Nếu thiếu dữ liệu so sánh thì nói rõ.

Xử lý lỗi tool:
- Nếu tool trả về lỗi hoặc không truy cập được:
  Xin lỗi ngắn gọn, nói rằng hệ thống đang tạm thời không lấy được dữ liệu realtime, và đề nghị khách thử lại hoặc để lại thông tin để nhân viên hỗ trợ.
- Không mô tả lỗi kỹ thuật nội bộ như stack trace, timeout chi tiết hoặc tên service backend.

Quy tắc trình bày câu trả lời:
- Ưu tiên câu ngắn, rõ ràng, có cấu trúc.
- Dùng bullet khi liệt kê nhiều ý.
- Giá tiền hiển thị theo VNĐ/tháng.
- Diện tích hiển thị theo m2.
- Luôn kết thúc bằng một câu hỏi mở hoặc gợi ý bước tiếp theo phù hợp.

Ví dụ hội thoại mẫu:

Tình huống 1: Tìm kho
Khách: Tôi cần thuê kho 500 m2 ở Bình Dương, ngân sách khoảng 30 triệu/tháng.
Assistant: Em sẽ kiểm tra các kho phù hợp tại Bình Dương với diện tích khoảng 500 m2 và ngân sách quanh 30 triệu/tháng cho Anh/Chị.
[Gọi get_warehouse_pricing]
Assistant: Hiện GEN-HUB đang có 2 lựa chọn phù hợp nhất:
- Kho A: 480 m2, khoảng 28.000.000 VNĐ/tháng
- Kho B: 520 m2, khoảng 30.000.000 VNĐ/tháng
Anh/Chị muốn em kiểm tra tình trạng còn chỗ của kho nào trước?

Tình huống 2: Đặt lịch tham quan
Khách: Tôi muốn xem kho A vào sáng thứ Sáu tuần sau.
Assistant: Em có thể hỗ trợ đặt lịch tham quan cho Anh/Chị. Em xin xác nhận lại:
- Kho quan tâm: Kho A
- Ngày tham quan: 2026-03-20
- Khung giờ dự kiến: 09:00
Anh/Chị vui lòng cho em xin họ tên và email để em tạo lịch giúp mình nhé.
[Sau khi đủ thông tin và khách xác nhận, gọi create_visit_booking]

Tình huống 3: Để lại thông tin tư vấn
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
Xin chào! Tôi là GEN-HUB Assistant.

Tôi có thể giúp bạn:
- Tìm kho bãi phù hợp
- Xem thông tin và giá thuê
- Đặt lịch tham quan kho
- Để lại thông tin để nhân viên tư vấn
- Giải đáp câu hỏi về dịch vụ

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

## 8. Bước 7: Publish App Cho API

### 8.1. Publish app

1. Nhấn **Publish**.
2. Kiểm tra app hoạt động bình thường.
3. Mở phần **API Access** hoặc **Access API Reference**.

### 8.2. Lưu ý khi tích hợp API

- Không gọi Dify trực tiếp từ frontend bằng secret key.
- Chỉ gọi Dify từ backend của GEN-HUB.
- Nên lưu `conversation_id` để giữ ngữ cảnh hội thoại.

Ví dụ gọi API chat của Dify:

```bash
curl --location 'https://api.dify.ai/v1/chat-messages' \
  --header 'Authorization: Bearer YOUR_DIFY_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "inputs": {},
    "query": "Tôi cần thuê kho 500 m² ở TP.HCM",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "contact-123"
  }'
```

---

## 9. Bước 8: Lấy `DIFY_APP_ID`

### Cách 1: Lấy từ URL app

Ví dụ URL:

```text
https://cloud.dify.ai/app/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/overview
```

Chuỗi UUID trong URL chính là `DIFY_APP_ID`.

### Cách 2: Lấy từ phần Overview hoặc API Access

Tùy phiên bản Dify, `App ID` có thể xuất hiện trong:

- `Overview`
- `API Access`
- metadata của app

---

## 10. Bước 9: Lấy `DIFY_API_KEY`

### 10.1. Mở phần API Access

1. Vào app `GEN-HUB Assistant`.
2. Chọn **API Access**.
3. Tạo credentials mới cho môi trường cần dùng.

### 10.2. Tạo API key

Nên đặt tên theo môi trường:

- `GEN-HUB Development`
- `GEN-HUB Staging`
- `GEN-HUB Production`

> [!CAUTION]
> `DIFY_API_KEY` là secret key, chỉ nên lưu và sử dụng ở backend.

---

## 11. Bước 10: Cập Nhật File `.env`

### 11.1. Mở file `.env`

```bash
# Windows
notepad server\\.env

# Hoặc dùng VS Code
code server\\.env
```

### 11.2. Cập nhật biến môi trường

```env
# Dify AI Configuration
DIFY_ENABLED=true
# Preferred: comma-separated lists (same index = same credential pair)
DIFY_API_KEYS=your_dify_secret_key_1,your_dify_secret_key_2
DIFY_APP_IDS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
# Backward compatibility (single credential)
DIFY_API_KEY=your_dify_secret_key_here
DIFY_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DIFY_API_BASE_URL=https://api.dify.ai/v1

# AI Plugin key for Dify tool calling
AI_PLUGIN_API_KEY=your_secure_random_api_key_here

# AI Auto-Reply
ENABLE_AI_AUTO_REPLY=true
```

### 11.3. Giải thích biến

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `DIFY_ENABLED` | `true` | Bật tích hợp Dify |
| `DIFY_API_KEYS` | danh sách secret key | Danh sách key backend dùng để gọi Dify |
| `DIFY_APP_IDS` | danh sách UUID | Danh sách App ID ghép cặp theo index với `DIFY_API_KEYS` |
| `DIFY_API_KEY` | secret key | Key đơn để tương thích ngược |
| `DIFY_APP_ID` | UUID | App ID đơn để tương thích ngược |
| `DIFY_API_BASE_URL` | `https://api.dify.ai/v1` | Base URL API |
| `AI_PLUGIN_API_KEY` | random key | Key để Dify gọi AI Plugin của GEN-HUB |
| `ENABLE_AI_AUTO_REPLY` | `true` | Bật phản hồi tự động |

---

## 12. Xác Minh Cấu Hình

### 12.1. Test trực tiếp trên Dify

Chat thử các câu:

- `Tôi muốn tìm kho ở Hồ Chí Minh`
- `Kho nào còn trống dưới 30,000,000 VNĐ/tháng?`
- `Điều khoản hợp đồng thuê kho như thế nào?`
- `Tôi muốn đặt lịch tham quan`
- `Tôi muốn để lại thông tin để nhân viên tư vấn`

### 12.2. Test qua API

```bash
curl --location 'https://api.dify.ai/v1/chat-messages' \
  --header 'Authorization: Bearer YOUR_DIFY_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "inputs": {},
    "query": "Cho tôi xem giá thuê kho tại Hà Nội",
    "response_mode": "blocking",
    "conversation_id": "",
    "user": "test-user-001"
  }'
```

### 12.3. Kiểm tra tool calling

Xác nhận Dify có gọi đúng các tool:

- `get_warehouse_pricing`
- `check_availability`
- `get_rental_contract_terms`
- `get_faq`
- `create_consultation_request`
- `create_visit_booking`

### 12.4. Test từ backend GEN-HUB

Sau khi backend tích hợp Dify:

1. Khởi động lại server.
2. Mở live chat trên client.
3. Gửi câu hỏi thực tế.
4. Kiểm tra log để đảm bảo backend gọi Dify thành công và tool được trigger đúng.

---

## 13. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi `401 Unauthorized`

**Nguyên nhân**

- Sai `DIFY_API_KEY`
- Header `Authorization` không đúng định dạng `Bearer`

**Giải pháp**

- Tạo lại API key
- Kiểm tra backend gửi đúng `Authorization: Bearer {API_KEY}`

### ❌ Lỗi `404 Not Found`

**Nguyên nhân**

- Sai `DIFY_API_BASE_URL`
- Sai endpoint tool
- Vẫn dùng route cũ `/coze-plugin/*`

**Giải pháp**

- Kiểm tra lại `https://api.dify.ai/v1`
- Đảm bảo tool dùng route `/ai-plugin/*`
- Kiểm tra lại base URL của backend GEN-HUB

### ❌ Tool không được gọi

**Nguyên nhân**

- Tool chưa add vào app
- Tool description chưa đủ rõ
- Prompt không yêu cầu model dùng tool

**Giải pháp**

- Add lại tool vào app
- Mô tả rõ từng operation
- Thêm rule trong system prompt: khi cần dữ liệu realtime phải gọi tool

### ❌ App trả lời chung chung, không đúng dữ liệu

**Nguyên nhân**

- Chưa gắn knowledge
- Chưa gọi tool
- Prompt quá mơ hồ

**Giải pháp**

- Tách rõ dữ liệu nào lấy từ knowledge, dữ liệu nào lấy từ AI Plugin
- Giảm temperature
- Viết prompt cụ thể hơn

### ❌ Không giữ được ngữ cảnh hội thoại

**Nguyên nhân**

- Backend không truyền lại `conversation_id`

**Giải pháp**

- Lưu `conversation_id` theo từng phiên chat
- Truyền lại ở các request tiếp theo

### ❌ Không tạo được lịch tham quan hoặc yêu cầu tư vấn

**Nguyên nhân**

- Thiếu field bắt buộc
- Model chưa hỏi đủ thông tin trước khi gọi tool

**Giải pháp**

- `create_consultation_request` cần ít nhất: `name`, `email`, `subject`, `message`
- `create_visit_booking` cần ít nhất: `warehouse_id`, `visitor_name`, `visitor_email`, `visit_date`, `visit_time_start`

---

## Tài Liệu Tham Khảo

- [Dify API Guide](https://docs.dify.ai/en/guides/application-publishing/developing-with-apis)
- [Dify API Reference](https://docs.dify.ai/api-reference)
- [Dify Application Publishing](https://docs.dify.ai/guides/workflow/publish)
- [Dify Tools](https://docs.dify.ai/en/use-dify/workspace/plugins)
- [Dify Knowledge Integration](https://docs.dify.ai/versions/3-0-x/en/user-guide/knowledge-base/integrate-knowledge-within-application)
- [Dify WebApp Template and App ID](https://docs.dify.ai/versions/legacy/en/user-guide/application-publishing/based-on-frontend-templates)

---

> **Cập nhật lần cuối**: 12/03/2026

> Nếu GEN-HUB chuyển runtime AI từ Coze sang Dify hoàn toàn, phần backend service gọi chat API cũng nên được tách riêng theo `DifyService` để quản lý `conversation_id`, retry và observability rõ hơn.

