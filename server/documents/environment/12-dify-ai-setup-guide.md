# Hướng Dẫn Cấu Hình Dify AI cho GEN-HUB

> [!NOTE]
> Tài liệu này hướng dẫn cách lấy và cấu hình `DIFY_API_KEY` và `DIFY_APP_ID` để sử dụng tính năng **AI Auto-Reply** trong hệ thống Live Chat, bao gồm cách thiết lập **Tools** để app Dify tự động lấy thông tin từ hệ thống GEN-HUB.

> [!IMPORTANT]
> Hiện tại backend của GEN-HUB trong codebase vẫn đang có module và endpoint mang tên `coze` / `coze-plugin`. Tài liệu này là bản hướng dẫn thay thế ở mức cấu hình Dify. Nếu chưa refactor backend, bạn vẫn có thể cho Dify gọi các endpoint hiện có như `/coze-plugin/...`.

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

**Dify** là nền tảng để xây dựng ứng dụng AI như chatbot, workflow, knowledge-based app và API service. Với GEN-HUB, Dify có thể được dùng để:

- **AI Auto-Reply**: tự động trả lời câu hỏi cơ bản của khách hàng
- **Tool Calling**: gọi API nội bộ của GEN-HUB để lấy dữ liệu realtime
- **Knowledge Retrieval**: dùng tài liệu FAQ, chính sách, hướng dẫn để tăng độ chính xác

### Các biến môi trường nên cấu hình

| Biến | Mô tả |
|------|-------|
| `DIFY_ENABLED` | Bật/tắt tích hợp Dify (`true`/`false`) |
| `DIFY_API_KEY` | Service API Key của app Dify |
| `DIFY_APP_ID` | ID của app Dify |
| `DIFY_API_BASE_URL` | Base URL API của Dify (thường là `https://api.dify.ai/v1`) |

> [!TIP]
> Theo docs chính thức của Dify, API được gọi qua header `Authorization: Bearer {API_KEY}` và conversation tạo qua Service API tách biệt với conversation ở WebApp.

---

## 2. Bước 1: Tạo Tài Khoản Dify

1. Truy cập **[https://cloud.dify.ai](https://cloud.dify.ai)**
2. Đăng ký hoặc đăng nhập
3. Tạo hoặc chọn workspace để quản lý app AI của GEN-HUB

> [!TIP]
> Nếu doanh nghiệp self-host Dify, thay vì `cloud.dify.ai` bạn dùng domain nội bộ của hệ thống Dify đang triển khai.

---

## 3. Bước 2: Tạo App Mới

### 3.1. Chọn loại app

Từ **Studio**, nhấn **Create App** và chọn một trong hai hướng:

- **Chatbot**: phù hợp nhất nếu mục tiêu chính là AI hỗ trợ hội thoại
- **Chatflow**: phù hợp nếu muốn điều khiển luồng xử lý rõ ràng hơn, có nhiều node và logic tool/knowledge phức tạp

> [!TIP]
> Với use case Live Chat của GEN-HUB, nên bắt đầu bằng **Chatbot** để triển khai nhanh. Nếu sau này cần routing, condition, approval hoặc multi-step logic thì chuyển sang **Chatflow**.

### 3.2. Điền thông tin app

| Field | Giá trị gợi ý |
|------|---------------|
| **App Name** | `GEN-HUB Assistant` |
| **Description** | `Trợ lý AI hỗ trợ khách hàng GEN-HUB` |
| **Mode** | `Chatbot` |

---

## 4. Bước 3: Cấu Hình Model

Trước khi app hoạt động, bạn cần cấu hình **Model Provider** trong workspace và chọn model cho app.

### 4.1. Kết nối model provider

Trong phần **Settings / Model Provider**:

1. Chọn provider bạn đang có API key, ví dụ:
   - OpenAI
   - Anthropic
   - Gemini
   - Azure OpenAI
2. Dán API key tương ứng
3. Test kết nối và lưu

### 4.2. Chọn model cho app

Trong app GEN-HUB Assistant:

| Model | Đặc điểm | Khuyến nghị |
|------|----------|-------------|
| `gpt-4o-mini` | nhanh, chi phí thấp, đủ tốt cho support | Khuyến nghị cho production |
| `gpt-4.1` / `gpt-4o` | chất lượng tốt hơn | dùng cho case phức tạp |
| `claude-sonnet` | reasoning tốt | phương án thay thế |

### 4.3. Generation settings gợi ý

| Thông số | Giá trị gợi ý | Giải thích |
|------|----------------|-----------|
| `temperature` | `0.3 - 0.5` | giảm độ ngẫu nhiên, tăng tính nhất quán |
| `max tokens` | `1024 - 2048` | đủ cho câu trả lời support |
| `response mode` | `streaming` | phù hợp chat realtime |

> [!TIP]
> Với chatbot support, ưu tiên response ổn định hơn là sáng tạo.

---

## 5. Bước 4: Thiết Lập Tools

> [!IMPORTANT]
> Dify hỗ trợ **Custom Tools** và có thể import API bằng chuẩn **OpenAPI/Swagger**. Đây là cách phù hợp để app Dify gọi API GEN-HUB.

### 5.1. Tổng quan các API của GEN-HUB

GEN-HUB hiện có thể cung cấp các endpoint sau cho Dify:

| Tool | Endpoint | Mô tả |
|------|----------|-------|
| `get_warehouse_pricing` | `GET /coze-plugin/warehouse-pricing` | Tìm kho và lấy giá chi tiết |
| `check_availability` | `GET /coze-plugin/check-availability` | Kiểm tra tình trạng kho |
| `get_rental_contract_terms` | `GET /coze-plugin/rental-contract-terms` | Lấy điều khoản hợp đồng |
| `get_faq` | `GET /coze-plugin/faq` | Lấy FAQ cho AI tư vấn |

> [!NOTE]
> Nếu backend chưa đổi route, Dify vẫn dùng được các endpoint `/coze-plugin/*` hiện tại.

### 5.2. Tạo Custom Tool trong Dify

1. Vào **Tools**
2. Chọn **Custom Tools**
3. Chọn **Import via OpenAPI / Swagger**
4. Đặt tên tool, ví dụ: `GEN_HUB_Warehouse_API`
5. Cấu hình base URL:
   - Production: `https://api.gen-hub.dev`
   - Local/Staging: domain tương ứng của môi trường test

### 5.3. Cấu hình Authentication cho Tool

Nếu API GEN-HUB yêu cầu key header, cấu hình:

| Field | Giá trị |
|------|---------|
| **Auth Type** | `API Key` |
| **Location** | `Header` |
| **Header Name** | `X-API-Key` |
| **Value** | Giá trị key của server GEN-HUB |

> [!TIP]
> Nếu backend hiện tại đang dùng guard `COZE_PLUGIN_API_KEY`, bạn vẫn cần cấu hình đúng giá trị đó trong Dify để tool gọi được API.

Ví dụ trong `.env` của server:

```env
# Generate: openssl rand -hex 32
COZE_PLUGIN_API_KEY=your_secure_random_api_key_here
```

### 5.4. Import OpenAPI Schema

Bạn có thể dùng schema dưới đây để import nhanh vào Dify:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "GenHubWarehouseAPI",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.gen-hub.dev"
    }
  ],
  "paths": {
    "/coze-plugin/warehouse-pricing": {
      "get": {
        "operationId": "get_warehouse_pricing",
        "summary": "Search warehouse and detailed pricing",
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
    "/coze-plugin/check-availability": {
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
    "/coze-plugin/rental-contract-terms": {
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
    "/coze-plugin/faq": {
      "get": {
        "operationId": "get_faq",
        "summary": "Get faq list",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "200": {
            "description": "Returns FAQ data"
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

### 5.5. Add Tool vào app

Sau khi import xong:

1. Quay lại app `GEN-HUB Assistant`
2. Thêm tool vào app hoặc vào node tool nếu dùng Chatflow
3. Test từng tool với dữ liệu thực tế

> [!TIP]
> Dify khuyến nghị cấu hình tool một lần ở workspace, sau đó tái sử dụng cho nhiều app.

---

## 6. Bước 5: Cấu Hình Knowledge Base

Theo docs chính thức của Dify, knowledge base được quản lý riêng và có thể gắn vào app để retrieval.

### 6.1. Tạo knowledge base

1. Vào **Knowledge**
2. Chọn **Create Knowledge**
3. Upload tài liệu hoặc tạo knowledge rỗng rồi import dần

### 6.2. Các loại tài liệu nên upload

| Loại | Nội dung | Format |
|------|----------|--------|
| **FAQ** | Câu hỏi thường gặp | `.txt`, `.md`, `.docx` |
| **Chính sách** | Điều khoản, quy định | `.pdf`, `.docx` |
| **Bảng giá** | Giá thuê các loại kho | `.xlsx`, `.csv`, `.pdf` |
| **Hướng dẫn** | Quy trình thuê, thanh toán | `.md`, `.pdf` |

### 6.3. Gắn knowledge vào app

1. Mở app
2. Thêm **Knowledge / Context**
3. Chọn knowledge base vừa tạo
4. Cấu hình retrieval

### 6.4. Retrieval settings gợi ý

| Thiết lập | Giá trị gợi ý |
|----------|----------------|
| `Top K` | `3 - 5` |
| `Score Threshold` | `0.5` |
| `Retrieval Mode` | kết hợp semantic + keyword nếu workspace hỗ trợ |

> [!TIP]
> Tài liệu thay đổi thường xuyên như bảng giá hoặc tình trạng kho không nên chỉ để trong knowledge; hãy ưu tiên tool/API realtime.

---

## 7. Bước 6: Viết Prompt Tối Ưu

> [!IMPORTANT]
> Dù dùng Dify thay Coze, chất lượng phản hồi vẫn phụ thuộc rất lớn vào prompt, tool description và retrieval settings.

### 7.1. System Prompt gợi ý

Copy nội dung sau vào phần **Instructions / System Prompt** của app:

```text
Bạn là GEN-HUB Assistant, trợ lý AI chuyên hỗ trợ khách hàng tìm thuê kho bãi và giải đáp thông tin dịch vụ của GEN-HUB.

Mục tiêu chính:
1. Giúp khách hàng tìm kho phù hợp theo vị trí, diện tích, ngân sách, loại kho
2. Trả lời câu hỏi về giá thuê, điều khoản hợp đồng, quy trình thuê kho
3. Sử dụng tool khi cần dữ liệu realtime
4. Sử dụng knowledge khi cần câu trả lời từ tài liệu nội bộ

Nguyên tắc trả lời:
- Ưu tiên chính xác, ngắn gọn, rõ ràng
- Không tự bịa giá thuê, tình trạng kho hoặc chính sách
- Khi thiếu thông tin, hỏi lại đúng dữ liệu còn thiếu
- Khi có tool phù hợp, hãy gọi tool thay vì suy đoán
- Nếu câu hỏi ngoài phạm vi GEN-HUB, lịch sự từ chối và điều hướng lại

Khi tư vấn thuê kho, hãy cố gắng thu thập:
- Khu vực cần thuê
- Diện tích mong muốn
- Ngân sách
- Loại hàng hóa lưu trữ
- Nhu cầu kho lạnh / kho thường / kho chia sẻ

Định dạng trả lời:
- Dùng bullet ngắn gọn
- Giá hiển thị theo VNĐ/tháng
- Diện tích hiển thị theo m²
- Nếu có nhiều lựa chọn, chỉ ưu tiên 2-3 kho phù hợp nhất
- Kết thúc bằng một câu hỏi mở để tiếp tục hội thoại
```

### 7.2. Opening Message

```text
Xin chào! Tôi là GEN-HUB Assistant.

Tôi có thể giúp bạn:
- Tìm kho bãi phù hợp
- Xem thông tin và giá thuê
- Giải đáp câu hỏi về dịch vụ
- Hỗ trợ thông tin hợp đồng

Bạn cần tôi hỗ trợ nội dung gì hôm nay?
```

### 7.3. Suggested Replies

```text
Tôi muốn tìm kho
Xem bảng giá
Tra cứu hợp đồng
Liên hệ hỗ trợ
```

---

## 8. Bước 7: Publish App Cho API

Theo docs Dify, sau khi hoàn thành cấu hình bạn cần **Publish** để dùng WebApp và **Access API Reference** để tích hợp backend.

### 8.1. Publish app

1. Nhấn **Publish**
2. Kiểm tra WebApp hoạt động bình thường
3. Mở mục **API Access** hoặc **Access API Reference**

### 8.2. Lưu ý khi tích hợp API

- Không gọi Dify trực tiếp từ frontend bằng secret key
- Chỉ gọi Dify từ backend của GEN-HUB
- Dùng `conversation_id` để giữ ngữ cảnh hội thoại

Ví dụ API chat của Dify:

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

Theo docs Dify về WebApp Template, `App ID` có thể lấy trực tiếp từ URL của app.

Ví dụ:

```text
https://cloud.dify.ai/app/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/overview
```

Chuỗi UUID trong URL chính là `DIFY_APP_ID`.

### Cách 2: Lấy từ phần Overview / API Access

Tùy phiên bản Dify, `App ID` có thể hiển thị trong:

- `Overview`
- `API Access`
- metadata của app

---

## 10. Bước 9: Lấy `DIFY_API_KEY`

### 10.1. Mở phần API Access

1. Vào app `GEN-HUB Assistant`
2. Chọn **API Access**
3. Tạo credentials mới cho môi trường cần dùng

### 10.2. Tạo API Key

Đặt tên key theo môi trường:

- `GEN-HUB Development`
- `GEN-HUB Staging`
- `GEN-HUB Production`

> [!CAUTION]
> Theo docs chính thức của Dify, secret key phải được giữ ở backend. Không nhúng trực tiếp vào frontend hoặc client app.

---

## 11. Bước 10: Cập Nhật File `.env`

### 11.1. Mở file `.env`

```bash
# Windows
notepad server\.env

# hoặc dùng VS Code
code server\.env
```

### 11.2. Cập nhật biến môi trường

```env
# Dify AI Configuration (for Live Chat auto-reply)
DIFY_ENABLED=true
DIFY_API_KEY=your_dify_secret_key_here
DIFY_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DIFY_API_BASE_URL=https://api.dify.ai/v1

# AI Auto-Reply Config
ENABLE_AI_AUTO_REPLY=true

# Existing GEN-HUB API key for tool authentication
COZE_PLUGIN_API_KEY=your_secure_random_api_key_here
```

### 11.3. Giải thích các biến

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `DIFY_ENABLED` | `true` | Kích hoạt tích hợp Dify |
| `DIFY_API_KEY` | secret key | Key dùng để gọi Service API |
| `DIFY_APP_ID` | UUID app | ID của app Dify |
| `DIFY_API_BASE_URL` | `https://api.dify.ai/v1` | Base URL API |
| `ENABLE_AI_AUTO_REPLY` | `true` | Bật auto-reply |
| `COZE_PLUGIN_API_KEY` | random key | Key để Dify gọi tool API của GEN-HUB hiện tại |

---

## 12. Xác Minh Cấu Hình

### 12.1. Test trực tiếp trên Dify

1. Mở app trong Dify
2. Chat thử:
   - `Tôi muốn tìm kho ở Hồ Chí Minh`
   - `Kho nào còn trống dưới 30,000,000 VNĐ/tháng?`
   - `Điều khoản hợp đồng thuê kho như thế nào?`
3. Kiểm tra tool có được gọi đúng không

### 12.2. Test qua API

Gọi thử endpoint:

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

### 12.3. Test từ backend GEN-HUB

Sau khi tích hợp backend:

1. Khởi động lại server
2. Mở Live Chat trên client
3. Gửi câu hỏi thật
4. Kiểm tra log để chắc chắn backend gọi Dify thành công

---

## 13. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `401 Unauthorized`

**Nguyên nhân**:
- Sai `DIFY_API_KEY`
- Header `Authorization` không đúng định dạng `Bearer`

**Giải pháp**:
- Tạo lại API key
- Kiểm tra backend có gửi đúng `Authorization: Bearer {API_KEY}` không

### ❌ Lỗi: `404 Not Found`

**Nguyên nhân**:
- Sai endpoint Dify
- Sai `DIFY_API_BASE_URL`
- Tool đang gọi sai base URL của GEN-HUB

**Giải pháp**:
- Kiểm tra lại `https://api.dify.ai/v1`
- Kiểm tra lại URL của tool custom

### ❌ Lỗi: Tool không được gọi

**Nguyên nhân**:
- Tool chưa add vào app hoặc node
- Tool description chưa rõ
- Prompt không hướng dẫn model dùng tool

**Giải pháp**:
- Add lại tool vào app
- Viết description rõ hơn cho từng operation
- Bổ sung rule trong system prompt: khi cần dữ liệu realtime phải gọi tool

### ❌ Lỗi: App trả lời chung chung, không đúng dữ liệu

**Nguyên nhân**:
- Chưa gắn knowledge
- Chưa gọi tool
- Prompt quá mơ hồ

**Giải pháp**:
- Tách rõ thông tin nào lấy từ knowledge, thông tin nào lấy từ API
- Giảm temperature
- Viết prompt cụ thể hơn

### ❌ Lỗi: Không giữ được ngữ cảnh hội thoại

**Nguyên nhân**:
- Backend không truyền lại `conversation_id`

**Giải pháp**:
- Lưu `conversation_id` theo từng phiên chat
- Truyền lại `conversation_id` ở các request tiếp theo

### ❌ Bot không phản hồi trong GEN-HUB

**Kiểm tra**:
1. `DIFY_ENABLED=true`?
2. `ENABLE_AI_AUTO_REPLY=true`?
3. `DIFY_API_KEY` đúng chưa?
4. Backend đã tích hợp Dify chưa, hay vẫn đang gọi Coze?
5. Tool API của GEN-HUB có public và xác thực đúng không?

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

> Nếu bạn muốn dùng Dify thật sự trong runtime của GEN-HUB, bước tiếp theo là refactor backend từ `CozeService` sang một `DifyService` tương ứng với `chat-messages`, `conversation_id` và cơ chế tool/knowledge của Dify.
