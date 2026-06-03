# GEN-HUB Server

Backend của nền tảng quản lý kho bãi và cho thuê kho thương mại **GEN-HUB**.

- **Framework:** NestJS 11 + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Realtime:** Socket.io
- **Port mặc định:** `4000`

---

## Cài đặt & Chạy

```bash
npm install
```

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

---

## Biến môi trường (`.env`)

Tạo file `.env` ở thư mục `server/` dựa theo `.env.example`.

### Biến bắt buộc

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/genhub
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

### AI — Gemini (legacy, vẫn dùng cho các module khác)

```env
GEMINI_API_KEYS=key1,key2,key3
GEMINI_MODEL=gemini-1.5-flash
```

### AI — Local GPS Analyzer (tự train)

```env
# Bật local model thay Gemini cho GPS route analysis
USE_LOCAL_AI=true

# URL của FastAPI server (ai-models/gps-analyzer)
LOCAL_GPS_AI_URL=http://localhost:8001
```

> Khi `USE_LOCAL_AI=false` hoặc không set → hệ thống vẫn dùng Gemini cho GPS (backward compatible).

---

## Kiến trúc module AI

```
src/modules/ai-hub/
├── services/
│   ├── gemini.service.ts        # Gemini API (email, document, vehicle, warehouse)
│   ├── local-gps-ai.service.ts  # Local model (GPS route analysis) ← MỚI
│   ├── coze.service.ts          # Coze chatbot
│   └── dify.service.ts          # Dify chatbot
├── ai-hub.module.ts
└── interfaces/ai.interface.ts
```

### Luồng phân tích GPS (sau khi bật `USE_LOCAL_AI=true`)

```
GPS tracks (DB)
    │
    ▼
GpsService.analyzeSession()
    │  kiểm tra USE_LOCAL_AI
    ├─ true  → LocalGpsAiService → FastAPI :8001 → GradientBoostingClassifier
    └─ false → GeminiService.analyzeGpsRoute() (fallback)
    │
    ▼
Redis cache 60s → API response
```

---

## Các thay đổi gần đây

### [2026-06-04] Tích hợp Local AI Model cho GPS Route Analysis

**Lý do:** Yêu cầu cuộc thi DATN — thay thế hoàn toàn Gemini bằng model tự train.

#### Files mới thêm

| File | Mô tả |
|------|-------|
| `src/modules/ai-hub/services/local-gps-ai.service.ts` | Service gọi FastAPI GPS analyzer, dùng native `fetch` (Node 22), timeout 8s, fallback về `LOW` nếu server không phản hồi, log kết quả vào bảng `AILog` |

#### Files đã sửa

| File | Thay đổi |
|------|----------|
| `src/modules/ai-hub/ai-hub.module.ts` | Thêm `LocalGpsAiService` vào `providers` và `exports` |
| `src/modules/gps/gps.service.ts` | Inject `LocalGpsAiService`, thêm feature flag `process.env.USE_LOCAL_AI` trong `analyzeSession()` |

#### Không có thay đổi

- Prisma schema — giữ nguyên 100%, không cần migration
- API contract — response shape của `GET /gps/session/:token/analysis` không đổi
- Frontend — không cần sửa bất kỳ file nào

#### Model AI sử dụng

Xem chi tiết tại [`ai-models/gps-analyzer/README.md`](../../ai-models/gps-analyzer/README.md).

| Thuộc tính | Giá trị |
|-----------|---------|
| Thuật toán | Gradient Boosting Classifier (scikit-learn) |
| Input | 11 features trích xuất từ GPS tracks |
| Output | LOW / MEDIUM / HIGH + confidence score |
| Dataset | 2.150 mẫu synthetic, 8 kịch bản lái xe |
| Serving | FastAPI server, port 8001 |

---

## Chạy tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

---

## License

UNLICENSED — Đồ án tốt nghiệp TANK ZENITH GEN.
