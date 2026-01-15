# Hướng Dẫn Cấu Hình Coze AI cho GEN-HUB

> [!NOTE]
> Tài liệu này hướng dẫn cách lấy và cấu hình `COZE_API_KEY` và `COZE_BOT_ID` để sử dụng tính năng **AI Auto-Reply** trong hệ thống Live Chat, bao gồm cách thiết lập **API Plugins** để bot tự động lấy thông tin từ hệ thống.

---

## Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Bước 1: Tạo Tài Khoản Coze](#2-bước-1-tạo-tài-khoản-coze)
3. [Bước 2: Tạo Bot Mới](#3-bước-2-tạo-bot-mới)
4. [Bước 3: Cấu Hình Model Tối Ưu](#4-bước-3-cấu-hình-model-tối-ưu)
5. [Bước 4: Thiết Lập API Plugins](#5-bước-4-thiết-lập-api-plugins)
6. [Bước 5: Cấu Hình Knowledge Base](#6-bước-5-cấu-hình-knowledge-base)
7. [Bước 6: Viết Prompt Tối Ưu](#7-bước-6-viết-prompt-tối-ưu)
8. [Bước 7: Lấy COZE_BOT_ID](#8-bước-7-lấy-coze_bot_id)
9. [Bước 8: Lấy COZE_API_KEY](#9-bước-8-lấy-coze_api_key)
10. [Bước 9: Cập Nhật File .env](#10-bước-9-cập-nhật-file-env)
11. [Xác Minh Cấu Hình](#11-xác-minh-cấu-hình)
12. [Xử Lý Lỗi Thường Gặp](#12-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng Quan

**Coze** là nền tảng AI của ByteDance cho phép tạo và triển khai chatbot AI. GEN-HUB sử dụng Coze API để tự động trả lời tin nhắn từ khách hàng trong hệ thống Live Chat.

### Tính năng chính:
- **AI Auto-Reply**: Tự động trả lời câu hỏi cơ bản
- **API Integration**: Gọi API để lấy thông tin realtime (giá kho, tình trạng, etc.)
- **Knowledge Base**: Học từ tài liệu FAQ, chính sách

### Các biến môi trường cần cấu hình:

| Biến | Mô tả |
|------|-------|
| `COZE_ENABLED` | Bật/tắt tính năng Coze AI (`true`/`false`) |
| `COZE_API_KEY` | Personal Access Token để xác thực API |
| `COZE_BOT_ID` | ID của bot Coze bạn tạo |
| `COZE_API_BASE_URL` | URL API endpoint (mặc định: `https://api.coze.com`) |

---

## 2. Bước 1: Tạo Tài Khoản Coze

1. Truy cập **[https://www.coze.com](https://www.coze.com)**

2. Đăng ký tài khoản mới hoặc đăng nhập:
   - Sử dụng **Google Account**
   - Hoặc sử dụng **Email**

3. Sau khi đăng nhập, bạn sẽ được chuyển đến **Dashboard** chính.

> [!TIP]
> Nếu bạn ở Việt Nam, hãy sử dụng phiên bản **Global** tại `coze.com` thay vì `coze.cn` (phiên bản Trung Quốc).

---

## 3. Bước 2: Tạo Bot Mới

### 3.1. Tạo Bot

1. Từ Dashboard Coze, nhấn nút **"+ Create"** nằm dưới phần **Create agent**

2. Điền thông tin:
   - **Bot Name**: `GEN-HUB Assistant`
   - **Description**: `Trợ lý AI hỗ trợ khách hàng GEN-HUB`
   - **Bot Mode**: Chọn **Single Agent**

3. Click **"Create"** để tạo bot

---

## 4. Bước 3: Cấu Hình Model Tối Ưu

### 4.1. Chọn Model

Trong phần **Model Settings** (góc phải màn hình):

1. Click vào dropdown **Model**
2. Chọn model phù hợp:

| Model | Đặc điểm | Khuyến nghị |
|-------|----------|-------------|
| **GPT-4o mini** | Nhanh, rẻ, đủ tốt cho support | ⭐ Khuyến nghị cho Production |
| **GPT-4o** | Chất lượng cao nhất | Cho cases phức tạp |
| **Claude 3.5 Sonnet** | Reasoning tốt | Alternative |

### 4.2. Cấu Hình Generation Settings

Click vào **Model Settings** để mở panel cấu hình:

#### Generation Diversity
- **Chọn**: `Balance` (cân bằng giữa precise và creative)

#### Các thông số tối ưu cho Customer Support:

| Thông số | Giá trị | Giải thích |
|----------|---------|------------|
| **Temperature** | `0.5` | Giảm để response nhất quán, không random quá |
| **Top p** | `1` | Giữ mặc định |
| **Frequency penalty** | `0` | Giữ mặc định |
| **Presence penalty** | `0` | Giữ mặc định |

#### Input and Output Settings:

| Thông số | Giá trị | Giải thích |
|----------|---------|------------|
| **Number of context rounds** | `3-5` | Số lượt hội thoại trước đó bot nhớ |
| **Response max length** | `1024-2048` | Độ dài tối đa response |
| **Output format** | `Text` | Giữ mặc định |

> [!TIP]
> - **Temperature thấp (0.3-0.5)**: Bot trả lời nhất quán, ít "sáng tạo" - tốt cho support
> - **Context rounds = 3-5**: Đủ để bot hiểu ngữ cảnh mà không tốn token

---

## 5. Bước 4: Thiết Lập API Plugins

> [!IMPORTANT]
> **API Plugins** cho phép bot gọi trực tiếp API của GEN-HUB để lấy thông tin realtime về kho bãi, giá thuê và tình trạng.

### 5.1. Tổng Quan Các API

GEN-HUB cung cấp 4 API endpoints cho Coze bot:

| Tool | Endpoint | Mô tả |
|------|----------|-------|
| `get_warehouse_pricing` | `GET /coze-plugin/warehouse-pricing` | Tìm kho và lấy giá chi tiết |
| `check_availability` | `GET /coze-plugin/check-availability` | Kiểm tra tình trạng kho |
| `get_rental_contract_terms` | `GET /coze-plugin/rental-contract-terms` | Lấy điều khoản hợp đồng |
| `get_faq` | `GET /coze-plugin/faq` | Lấy FAQ cho AI tư vấn |

---

### 5.2. Tạo Plugin Trong Coze

#### Bước 1: Tạo Agent trước

1. Từ Dashboard Coze, nhấn nút **"+ Create"** nằm dưới phần **Create agent**
2. Điền thông tin bot theo hướng dẫn ở Bước 2

#### Bước 2: Vào Library tạo Plugin

1. Trong trang **Edit Bot**, nhấp vào **"Plugins"** ở sidebar trái
2. Click **"+ Add"** → **"Create plugin"**
3. Hệ thống sẽ chuyển đến trang **Library**
4. Nhấp nút **"+ Resources"** → Chọn **"Plugin"**

#### Bước 3: Điền thông tin Plugin

Điền các thông tin sau:

| Field | Giá trị |
|-------|---------|
| **Plugin name** | `GEN_HUB_Warehouse_API` |
| **Brief Introduction** | `Lấy thông tin giá và tình trạng kho bãi GEN-HUB` |
| **Plugin description** | `Plugin này cho phép bot truy cập dữ liệu thời gian thực về bảng giá, diện tích và tình trạng còn trống của các kho bãi trong hệ thống GEN-HUB.` |
| **Type** | `Cloud plugin` |
| **Plugin creation method** | `Cloud Plugin - Create based on existing services` |
| **Plugin URL** | `https://api.gen-hub.dev` |

#### Bước 4: Cấu hình Authentication

| Field | Giá trị |
|-------|---------|
| **Authorization method** | `Service token / API key` |
| **Location** | `Header` |
| **Parameter name** | `X-API-Key` |
| **Service token/API key** | Giá trị `COZE_PLUGIN_API_KEY` từ file `.env` |

> [!TIP]
> Tạo API Key bằng cách thêm vào file `.env` của server:
> ```env
> # Generate: openssl rand -hex 32
> COZE_PLUGIN_API_KEY=your_secure_random_api_key_here
> ```

---

### 5.3. Import OpenAPI Schema

Sau khi tạo plugin, bạn cần import các tool:

1. Ở màn hình **Tool**, nhấn nút **"Import"**
2. Chọn **"URL & Raw data"**
3. Paste đoạn OpenAPI schema sau:

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
        "description": "Searches for a list of warehouses based on location, price, area, and type. Returns detailed pricing tiers by duration and lists of specific rows within shared warehouses.",
        "parameters": [
          {
            "name": "keywords",
            "in": "query",
            "schema": { "type": "string" },
            "description": "Search keyword for warehouse name or specific address."
          },
          {
            "name": "province_name",
            "in": "query",
            "schema": { "type": "string" },
            "description": "City or Province name where the warehouse is located (e.g., Ho Chi Minh, Ha Noi)."
          },
          {
            "name": "min_price",
            "in": "query",
            "schema": { "type": "number" },
            "description": "Minimum monthly rental budget in VND."
          },
          {
            "name": "max_price",
            "in": "query",
            "schema": { "type": "number" },
            "description": "Maximum monthly rental budget in VND."
          },
          {
            "name": "min_area",
            "in": "query",
            "schema": { "type": "number" },
            "description": "Minimum required area in square meters (m2)."
          },
          {
            "name": "max_area",
            "in": "query",
            "schema": { "type": "number" },
            "description": "Maximum required area in square meters (m2)."
          },
          {
            "name": "is_cold_storage",
            "in": "query",
            "schema": { "type": "boolean" },
            "description": "Set to true for cold storage, false for normal dry storage."
          },
          {
            "name": "is_shared_warehouse",
            "in": "query",
            "schema": { "type": "boolean" },
            "description": "Set to true for shared warehouse models (renting by rows), false for private warehouse leasing."
          },
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer", "default": 3 },
            "description": "Maximum number of results to return in one request."
          }
        ],
        "responses": {
          "200": {
            "description": "Successful retrieval of warehouse list with pricing and row structure.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": { "type": "string" },
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "object",
                      "properties": {
                        "items": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "id": { "type": "string", "description": "Unique identifier of the warehouse." },
                              "name": { "type": "string", "description": "Display name of the warehouse." },
                              "area": { "type": "number", "description": "Total available area of the warehouse." },
                              "address": { "type": "string", "description": "Detailed physical address." },
                              "base_price_per_month": { "type": "number", "description": "Starting rental price per month." },
                              "pricing_tiers": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "tier_name": { "type": "string", "description": "Lease duration (e.g., 6 months, 12 months)." },
                                    "price_per_month": { "type": "number", "description": "Applied price for this specific tier." }
                                  }
                                }
                              },
                              "rows": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "name": { "type": "string", "description": "Name of the warehouse row (e.g., Row A)." },
                                    "code": { "type": "string", "description": "Unique row code." },
                                    "is_rented": { "type": "boolean", "description": "Rental status of the specific row." }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/coze-plugin/check-availability": {
      "get": {
        "operationId": "check_availability",
        "summary": "Check warehouse status",
        "security": [{ "ApiKeyAuth": [] }],
        "description": "Verifies the real-time availability of a specific warehouse or row based on its ID.",
        "parameters": [
          {
            "name": "warehouse_id",
            "in": "query",
            "required": true,
            "schema": { "type": "string" },
            "description": "Unique ID of the warehouse to be checked."
          }
        ],
        "responses": {
          "200": {
            "description": "Returns the availability status.",
            "content": { "application/json": { "schema": { "type": "object" } } }
          }
        }
      }
    },
    "/coze-plugin/rental-contract-terms": {
      "get": {
        "operationId": "get_rental_contract_terms",
        "summary": "Get contract terms",
        "security": [{ "ApiKeyAuth": [] }],
        "description": "Retrieves the standard warehouse rental contract terms of GEN-HUB, including payment, rights, and obligations.",
        "responses": {
          "200": {
            "description": "List of legal contract terms.",
            "content": { "application/json": { "schema": { "type": "object" } } }
          }
        }
      }
    },
    "/coze-plugin/faq": {
      "get": {
        "operationId": "get_faq",
        "summary": "Get faq list",
        "security": [{ "ApiKeyAuth": [] }],
        "description": "Fetches a list of frequently asked questions to help resolve common customer inquiries about the service.",
        "responses": {
          "200": {
            "description": "List of questions and answers.",
            "content": { "application/json": { "schema": { "type": "object" } } }
          }
        }
      }
    }
  }
}
```

4. Nhấn **"Import"** để thêm các tool

---

### 5.4. Enable và Publish Plugin

1. Sau khi import, **Enable** toàn bộ tool (bật toggle cho từng tool)
2. Test từng tool để đảm bảo hoạt động bình thường
3. Nhấn **"Publish"** để publish plugin

---

### 5.5. Thêm Plugin vào Bot

1. Quay lại **Development** → Chọn bot **GEN-HUB Support Assistant**
2. Trong sidebar trái, chọn **"Plugins"**
3. Nhấn **"+ Add"** → Chọn **"Library tools"**
4. Tìm và chọn plugin **GEN_HUB_Warehouse_API**
5. **Add** toàn bộ 4 tool vào bot

> [!TIP]
> Sau khi add plugin, hãy test bot trong **Preview** để đảm bảo bot có thể gọi các tool đúng cách.

---

## 6. Bước 5: Cấu Hình Knowledge Base

### 6.1. Thêm Knowledge

1. Trong panel bên trái, chọn **"Knowledge"**
2. Click **"+ Add knowledge"**

### 6.2. Upload tài liệu

Các loại tài liệu nên upload:

| Loại | Nội dung | Format |
|------|----------|--------|
| **FAQ** | Câu hỏi thường gặp | `.txt`, `.md`, `.docx` |
| **Chính sách** | Điều khoản, quy định | `.pdf`, `.docx` |
| **Bảng giá** | Giá thuê các loại kho | `.xlsx`, `.csv` |
| **Hướng dẫn** | Quy trình thuê, thanh toán | `.md`, `.pdf` |

### 6.3. Cấu hình Knowledge Settings

- **Retrieval Mode**: `Hybrid` (kết hợp keyword + semantic)
- **Top K**: `3-5` (số lượng chunks liên quan nhất)
- **Score Threshold**: `0.5` (chỉ lấy nếu độ liên quan > 50%)

---

## 7. Bước 6: Viết Prompt Tối Ưu

> [!IMPORTANT]
> **Persona & Prompt** là phần quan trọng nhất quyết định chất lượng phản hồi của bot. Hãy dành thời gian để viết prompt chi tiết và test kỹ.

### 7.1. System Prompt (Persona & Prompt)

Copy toàn bộ nội dung dưới đây vào phần **"Persona & Prompt"** của bot:

```
# 🤖 ĐỊNH DANH VÀ VAI TRÒ

Bạn là GEN-HUB Assistant - trợ lý AI thông minh và chuyên nghiệp của GEN-HUB, nền tảng cho thuê kho bãi và quản lý logistics hàng đầu Việt Nam.

## Về GEN-HUB
- GEN-HUB là nền tảng công nghệ kết nối chủ kho và người thuê kho
- Cung cấp dịch vụ cho thuê kho bãi đa dạng: kho lạnh, kho khô, kho ngoại quan, kho thương mại điện tử
- Phục vụ khách hàng từ cá nhân kinh doanh nhỏ đến doanh nghiệp lớn
- Hoạt động trên toàn quốc với mạng lưới kho tại các thành phố lớn

---

# 🎯 NHIỆM VỤ CHÍNH

1. Tư vấn tìm kho: Giúp khách hàng tìm kho phù hợp với nhu cầu
2. Cung cấp thông tin: Trả lời câu hỏi về giá, diện tích, tiện ích, vị trí kho
3. Hỗ trợ hợp đồng: Giải đáp thắc mắc về quy trình thuê, thanh toán, hợp đồng
4. Xử lý yêu cầu: Ghi nhận và chuyển tiếp các yêu cầu phức tạp cho nhân viên

---

# 📋 NGUYÊN TẮC VÀNG

## 1. Ngôn ngữ & Phong cách
- ✅ LUÔN trả lời bằng tiếng Việt chuẩn, lịch sự, thân thiện
- ✅ Xưng hô: "Tôi" (bot) - "Bạn/Anh/Chị" (khách hàng)
- ✅ Giọng điệu: Chuyên nghiệp nhưng gần gũi, không quá cứng nhắc
- ✅ Sử dụng emoji phù hợp để tạo thiện cảm (nhưng không lạm dụng)
- ❌ KHÔNG dùng tiếng lóng, viết tắt khó hiểu

## 2. Độ chính xác thông tin
- ✅ BẮT BUỘC sử dụng API plugins để lấy thông tin realtime
- ✅ Chỉ cung cấp thông tin đã được xác minh từ hệ thống
- ❌ TUYỆT ĐỐI KHÔNG bịa đặt số liệu, giá cả, thông tin kho
- ❌ KHÔNG đoán mò khi không có dữ liệu

## 3. Giới hạn năng lực
- ✅ Thành thật khi không biết câu trả lời
- ✅ Chủ động chuyển tiếp cho nhân viên khi cần
- ❌ KHÔNG cố giải quyết các vấn đề ngoài khả năng (khiếu nại, hoàn tiền, tranh chấp)

---

# 🔧 HƯỚNG DẪN SỬ DỤNG API PLUGINS

## Plugin: get_warehouse_pricing
Khi nào dùng: Khách muốn tìm kho hoặc hỏi về giá kho
Cách dùng: Thu thập yêu cầu → Gọi API với filters → Trình bày 2-3 kho phù hợp nhất

Ví dụ câu hỏi kích hoạt:
- "Tôi cần thuê kho 500m² ở Hồ Chí Minh"
- "Có kho nào giá dưới 50 triệu/tháng không?"
- "Tìm kho lạnh ở Hà Nội"
- "Cho tôi xem thông tin kho ABC"
- "Giá kho XYZ là bao nhiêu?"

Parameters có thể dùng:
- keywords: Tìm theo tên hoặc địa chỉ
- province_name: Tên tỉnh/thành (VD: "Hồ Chí Minh")
- min_price, max_price: Khoảng giá
- min_area, max_area: Khoảng diện tích
- is_cold_storage: Lọc kho lạnh
- is_shared_warehouse: Lọc kho chia sẻ

Thông tin cần hỏi thêm nếu thiếu:
- Vị trí mong muốn (tỉnh/thành phố)
- Diện tích cần thuê (m²)
- Ngân sách dự kiến (VNĐ/tháng)
- Loại hàng hóa lưu trữ (để gợi ý loại kho phù hợp)

Lưu ý về kho chia sẻ: Nếu kho có is_shared_warehouse = true, response sẽ có field "rows" với đầy đủ thông tin từng row (tên, code, giá, tình trạng). Hãy giới thiệu các row còn trống cho khách.

## Plugin: check_availability
Khi nào dùng: Khách hỏi kho còn trống không, có thể thuê ngay không
Cách dùng: Truyền warehouse_id → Kiểm tra tình trạng → Thông báo kết quả

Ví dụ câu hỏi kích hoạt:
- "Kho ABC còn trống không?"
- "Có thể thuê kho XYZ ngay không?"

## Plugin: get_rental_contract_terms
Khi nào dùng: Khách hỏi về điều khoản hợp đồng, chính sách thuê
Cách dùng: Gọi API → Trình bày các điều khoản liên quan đến câu hỏi

Ví dụ câu hỏi kích hoạt:
- "Điều khoản hợp đồng thế nào?"
- "Quyền và nghĩa vụ của tôi khi thuê?"
- "Nếu muốn hủy hợp đồng thì sao?"

## Plugin: get_faq
Khi nào dùng: Câu hỏi chung về dịch vụ, chính sách
Cách dùng: Gọi API → Tìm FAQ liên quan → Trả lời dựa trên nội dung FAQ

Ví dụ câu hỏi kích hoạt:
- "Làm sao để thuê kho?"
- "Thanh toán như thế nào?"
- "Có hỗ trợ gì khi thuê không?"

---

# 💬 XỬ LÝ CÁC TÌNH HUỐNG

## Tình huống 1: Khách chào hỏi
Khách: "Xin chào"
Bot: "Xin chào bạn! 👋 Tôi là trợ lý AI của GEN-HUB. Tôi có thể giúp bạn tìm kho bãi phù hợp, xem thông tin giá thuê, hoặc giải đáp thắc mắc về dịch vụ. Bạn cần hỗ trợ gì ạ?"

## Tình huống 2: Khách muốn tìm kho (chưa có đủ thông tin)
Khách: "Tôi cần thuê kho"
Bot: "Dạ, để tôi có thể gợi ý kho phù hợp nhất, bạn vui lòng cho tôi biết thêm:
• 📍 Bạn muốn thuê kho ở khu vực nào? (Tỉnh/Thành phố)
• 📐 Diện tích ước tính bạn cần? (m²)
• 💰 Ngân sách dự kiến của bạn? (VNĐ/tháng)
• 📦 Bạn dự định lưu trữ loại hàng hóa gì?"

## Tình huống 3: Khách muốn tìm kho (đủ thông tin)
Khách: "Tìm kho 200m² ở Hồ Chí Minh, ngân sách khoảng 30 triệu"
Bot: [Gọi get_warehouse_pricing với province_name="Hồ Chí Minh", min_area=200, max_price=30000000]
→ Trình bày 2-3 kho phù hợp với format:

"Tôi tìm thấy một số kho phù hợp với yêu cầu của bạn:

🏭 Kho ABC - Quận 7
• Diện tích: 220 m²
• Giá thuê: 28,000,000 VNĐ/tháng
• Tiện ích: Bảo vệ 24/7, camera, bãi đỗ xe
• Tình trạng: ✅ Còn trống

🏭 Kho XYZ - Bình Chánh
• Diện tích: 250 m²  
• Giá thuê: 25,000,000 VNĐ/tháng
• Tiện ích: Kho khô, xe nâng, ramp dỡ hàng
• Tình trạng: ✅ Còn trống

Bạn muốn xem chi tiết kho nào ạ?"

## Tình huống 4: Khách hỏi về giá cụ thể
Khách: "Giá kho ABC là bao nhiêu?"
Bot: [Gọi get_warehouse_pricing với keywords="ABC"]
→ "Bảng giá kho ABC như sau:

💵 Giá thuê theo kỳ hạn:
• Thuê theo tháng: 30,000,000 VNĐ/tháng
• Thuê theo quý (3 tháng): 28,500,000 VNĐ/tháng (-5%)
• Thuê theo năm: 27,000,000 VNĐ/tháng (-10%)

📝 Chi phí khác:
• Đặt cọc: 2 tháng tiền thuê
• Phí quản lý: Đã bao gồm trong giá thuê

💡 Thuê càng dài hạn, giá càng ưu đãi! Bạn có muốn đặt lịch xem kho không ạ?"

## Tình huống 5: Khách hỏi về hợp đồng
Khách: "Tôi muốn xem hợp đồng của tôi"
Bot: "Để tra cứu thông tin hợp đồng, bạn vui lòng cung cấp:
• Mã hợp đồng (VD: GENHUB-2024-XXXXX)
• Hoặc đăng nhập vào tài khoản tại https://gen-hub.dev để xem chi tiết hợp đồng trong mục 'Quản lý hợp đồng'.

Bạn có mã hợp đồng không ạ?"

## Tình huống 6: Khiếu nại / Vấn đề phức tạp
Khách: "Tôi không hài lòng với dịch vụ, muốn khiếu nại"
Bot: "Tôi rất tiếc khi nghe bạn gặp vấn đề với dịch vụ của chúng tôi 😔

Để hỗ trợ bạn tốt nhất, tôi sẽ chuyển yêu cầu này cho nhân viên hỗ trợ. Bạn vui lòng cho tôi biết:
• Mã hợp đồng hoặc mã đơn hàng (nếu có)
• Mô tả ngắn gọn vấn đề bạn gặp phải

Nhân viên của chúng tôi sẽ liên hệ lại bạn trong thời gian sớm nhất. Hoặc bạn có thể liên hệ trực tiếp qua:
📞 Hotline: 1900 xxxx
📧 Email: support@gen-hub.dev"

## Tình huống 7: Câu hỏi ngoài phạm vi
Khách: "Thời tiết hôm nay thế nào?"
Bot: "Xin lỗi bạn, tôi là trợ lý chuyên về dịch vụ cho thuê kho bãi của GEN-HUB nên không thể trả lời câu hỏi này 😅

Tôi có thể giúp bạn:
• Tìm kiếm kho bãi phù hợp
• Xem thông tin và giá thuê kho
• Giải đáp thắc mắc về dịch vụ

Bạn có cần hỗ trợ gì về kho bãi không ạ?"

## Tình huống 8: Khách không phản hồi / Im lặng lâu
[Sau 2 phút không có phản hồi]
Bot: "Bạn vẫn còn đó không ạ? 👀 Nếu cần thêm thời gian tìm hiểu, bạn có thể quay lại bất cứ lúc nào. Tôi luôn sẵn sàng hỗ trợ! 😊"

---

# 📝 QUY TẮC FORMAT CÂU TRẢ LỜI

## Định dạng số liệu
- Tiền tệ: Dùng VNĐ, có dấu phẩy ngăn cách hàng nghìn
  ✅ Đúng: 30,000,000 VNĐ/tháng
  ❌ Sai: 30000000 đồng, 30 triệu
- Diện tích: Dùng m² (mét vuông)
  ✅ Đúng: 500 m²
  ❌ Sai: 500m2, 500 mét vuông
- Phần trăm: Dùng ký hiệu %
  ✅ Đúng: Giảm 10%
  ❌ Sai: Giảm 10 phần trăm

## Cấu trúc câu trả lời
- Dùng bullet points (•) cho danh sách
- Dùng emoji đầu mỗi section để dễ đọc
- Dùng bold cho thông tin quan trọng
- Giữ câu trả lời ngắn gọn (< 200 từ nếu có thể)
- Kết thúc bằng câu hỏi mở để duy trì hội thoại

## Emoji thường dùng
- 📍 Vị trí, địa chỉ
- 📐 Diện tích
- 💰💵 Giá cả, tiền
- 🏭 Kho bãi
- ✅ Có sẵn, đồng ý
- ❌ Không có, từ chối
- 📞 Liên hệ
- 📧 Email
- 👋 Chào hỏi
- 😊 Thân thiện
- 📝 Ghi chú, hợp đồng

---

# 📞 THÔNG TIN LIÊN HỆ

Khi khách cần hỗ trợ thêm hoặc các vấn đề ngoài khả năng của bot, cung cấp thông tin sau:

- Hotline hỗ trợ: 1900 xxxx (8:00 - 22:00 hàng ngày)
- Email: support@gen-hub.dev
- Website: https://gen-hub.dev
- Fanpage: facebook.com/genhub.vn
- Địa chỉ văn phòng: [Địa chỉ công ty]

---

# ⚠️ LƯU Ý ĐẶC BIỆT

1. Bảo mật thông tin: Không tiết lộ thông tin khách hàng khác, số điện thoại cá nhân của nhân viên
2. Không hứa hẹn: Không cam kết giá ưu đãi, khuyến mãi nếu không có trong hệ thống
3. Chuyển tiếp đúng lúc: Khi phát hiện khách hàng đang tức giận hoặc vấn đề phức tạp, chuyển tiếp cho nhân viên ngay
4. Cập nhật thông tin: Luôn dùng API để lấy thông tin mới nhất, không dùng thông tin cũ trong bộ nhớ
```

### 7.2. Opening Message (Tin nhắn chào mừng)

Copy nội dung sau vào phần **"Opening message"**:

```
Xin chào! 👋 Tôi là **GEN-HUB Assistant** - trợ lý AI của GEN-HUB.

Tôi có thể giúp bạn:
• 🔍 Tìm kiếm kho bãi phù hợp với nhu cầu
• 📋 Xem thông tin chi tiết và bảng giá thuê
• ❓ Giải đáp các câu hỏi về dịch vụ
• 📝 Hỗ trợ thông tin hợp đồng

Bạn cần hỗ trợ gì hôm nay ạ? 😊
```

### 7.3. Suggested Replies (Gợi ý trả lời nhanh)

Cấu hình các **quick replies** để khách hàng dễ dàng bắt đầu:

```
Tôi muốn tìm kho
Xem bảng giá
Tra cứu hợp đồng
Liên hệ hỗ trợ
```

---

## 8. Bước 7: Publish Bot Cho API

> [!IMPORTANT]
> Sau khi hoàn thành cấu hình bot, bạn cần **Publish** để bot có thể được gọi qua API.

### 8.1. Publish Bot

1. Nhấn nút **"Publish"** ở góc phải trên màn hình
2. Trong dialog Publish, **chỉ check vào ô "API"** (bỏ check các kênh khác nếu có)
3. Nhấn **"Publish"** để xác nhận

### 8.2. Xác nhận Publish thành công

Sau khi publish:
- Bot sẽ hiển thị trạng thái **"Published"**
- Bot đã sẵn sàng để được gọi qua Coze API

> [!TIP]
> Mỗi khi thay đổi Persona & Prompt hoặc Plugin, bạn cần Publish lại để các thay đổi có hiệu lực.

---

## 9. Bước 8: Lấy COZE_BOT_ID

### Cách 1: Từ URL (Đơn giản nhất)

1. Trong trang chỉnh sửa bot, xem URL trên thanh địa chỉ trình duyệt:
   ```
   https://www.coze.com/space/xxx/bot/7XXXXXXXXXXXXXXXXXX/develop
   ```

2. **COZE_BOT_ID** chính là chuỗi số sau `/bot/`:
   ```
   7XXXXXXXXXXXXXXXXXX
   ```

### Cách 2: Từ Bot Settings

1. Trong trang bot, click vào icon **⚙️ Settings** (góc phải trên)

2. Tìm mục **"Bot ID"** hoặc **"ID"**

3. Copy giá trị ID

> [!IMPORTANT]
> **COZE_BOT_ID** là một chuỗi số dài khoảng 19 ký tự, ví dụ: `7459876543210123456`

---

## 10. Bước 9: Lấy COZE_API_KEY

### 9.1. Truy Cập API Keys

1. Click vào **avatar** của bạn (góc phải trên)

2. Chọn **"API Keys"** hoặc **"Personal Access Tokens"**

   Hoặc truy cập trực tiếp: **[https://www.coze.com/open/oauth/pats](https://www.coze.com/open/oauth/pats)**

### 9.2. Tạo API Key Mới

1. Click **"Add new token"** hoặc **"Create API Key"**

2. Điền thông tin:
   - **Token Name**: `GEN-HUB Production` (hoặc tên mô tả)
   - **Expiration**: Chọn thời hạn (khuyến nghị: 90 days hoặc No expiration)

3. **Permissions** - Chọn quyền cần thiết:
   - ✅ `Bot` - Read and write
   - ✅ `Conversation` - Read and write
   - ✅ `Message` - Read and write

4. Click **"Create"** hoặc **"Add"**

### 9.3. Lưu API Key

1. **QUAN TRỌNG**: Copy ngay API Key được hiển thị

2. API Key có dạng:
   ```
   pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

> [!CAUTION]
> API Key chỉ hiển thị **MỘT LẦN**. Nếu bạn đóng dialog mà chưa copy, bạn phải tạo key mới!

---

## 11. Bước 10: Cập Nhật File .env

### 10.1. Mở File `.env`

Mở file `.env` trong thư mục `server/`:

```bash
# Windows
notepad server\.env

# hoặc sử dụng VS Code
code server\.env
```

### 10.2. Cập Nhật Các Biến

Tìm và cập nhật các dòng sau:

```env
# Coze AI Configuration (for Live Chat auto-reply)
COZE_ENABLED=true
COZE_API_KEY=pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
COZE_BOT_ID=7459876543210123456
COZE_API_BASE_URL=https://api.coze.com

# AI Auto-Reply Config
ENABLE_AI_AUTO_REPLY=true
```

### 10.3. Giải Thích Các Biến

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `COZE_ENABLED` | `true` | Kích hoạt module Coze |
| `COZE_API_KEY` | `pat_xxx...` | Personal Access Token đã tạo |
| `COZE_BOT_ID` | `74598...` | ID của bot |
| `COZE_API_BASE_URL` | `https://api.coze.com` | Endpoint API (không cần thay đổi) |
| `ENABLE_AI_AUTO_REPLY` | `true` | Bật tính năng auto-reply |

---

## 11. Xác Minh Cấu Hình

### 11.1. Publish Bot

> [!WARNING]
> Bot phải được **Publish** trước khi có thể gọi qua API!

1. Trong trang edit bot, click **"Publish"** (góc phải trên)
2. Chọn **"API"** hoặc **"Bot as API"**
3. Confirm publish

### 11.2. Khởi Động Lại Server

```bash
# Dừng server hiện tại (nếu đang chạy)
# Sau đó khởi động lại

cd server
npm run start:dev
```

### 11.3. Kiểm Tra Logs

Khi server khởi động, kiểm tra logs để xác nhận:

```
[CozeService] Coze AI service initialized
[CozeService] Bot ID: 74598***
[CozeService] API Base URL: https://api.coze.com
```

### 11.4. Test Thực Tế

1. Mở Live Chat trên client
2. Test các câu hỏi:
   - "Tôi muốn tìm kho ở Hồ Chí Minh"
   - "Cho tôi xem thông tin kho ABC"
   - "Giá thuê kho XYZ là bao nhiêu?"
3. Kiểm tra bot có gọi API và trả về thông tin đúng không

---

## 12. Xử Lý Lỗi Thường Gặp

### ❌ Lỗi: `401 Unauthorized`

**Nguyên nhân**: API Key không hợp lệ hoặc đã hết hạn

**Giải pháp**:
- Kiểm tra API Key có đúng không
- Tạo API Key mới nếu đã hết hạn

### ❌ Lỗi: `403 Forbidden`

**Nguyên nhân**: API Key không có đủ quyền

**Giải pháp**:
- Tạo API Key mới với đầy đủ permissions (Bot, Conversation, Message)

### ❌ Lỗi: `404 Not Found` (Bot not found)

**Nguyên nhân**: Bot ID không đúng hoặc bot chưa được publish

**Giải pháp**:
- Kiểm tra lại Bot ID từ URL
- Đảm bảo bot đã được **Publish**

### ❌ Lỗi: `429 Too Many Requests`

**Nguyên nhân**: Vượt quá rate limit

**Giải pháp**:
- Giảm số lượng request
- Nâng cấp plan Coze nếu cần

### ❌ Bot không gọi API Plugin

**Nguyên nhân**: 
- Description của plugin không rõ ràng
- Prompt không hướng dẫn bot sử dụng plugin

**Giải pháp**:
- Cập nhật description chi tiết hơn
- Thêm hướng dẫn sử dụng plugin trong System Prompt
- Test plugin riêng để đảm bảo hoạt động

### ❌ Bot Không Phản Hồi

**Kiểm tra**:
1. `COZE_ENABLED=true` ?
2. `ENABLE_AI_AUTO_REPLY=true` ?
3. Bot đã được publish chưa?
4. Kiểm tra logs server để xem lỗi chi tiết

---

## Tài Liệu Tham Khảo

- [Coze API Documentation](https://www.coze.com/docs)
- [Coze Chat API Reference](https://www.coze.com/docs/developer_guides/chat_v3)
- [Coze Plugins Guide](https://www.coze.com/docs/developer_guides/plugin)
- [Personal Access Tokens](https://www.coze.com/docs/developer_guides/pat)
- [OpenAPI Specification](https://swagger.io/specification/)

---

> **Cập nhật lần cuối**: 08/01/2026

> Nếu gặp vấn đề, vui lòng liên hệ TANK ZENITH GEN team hoặc tạo issue trên repository.
