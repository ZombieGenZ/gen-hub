# GEN-HUB

GEN-HUB là nền tảng quản lý thuê kho, fulfillment và vận hành kho bãi được xây dựng theo mô hình multi-app. Repository này chứa toàn bộ backend API, client-facing web app, các admin panels chuyên biệt, status dashboard, công cụ khai thác OpenAPI và một desktop client cho Windows.

> Mục tiêu của GEN-HUB là kết nối doanh nghiệp với mạng lưới kho bãi chất lượng cao, đồng thời cung cấp một hệ điều hành số cho booking, hợp đồng, thanh toán, inventory, giám sát vận hành và hỗ trợ khách hàng.

## Mục Lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Cài đặt](#cài-đặt)
- [Chạy project](#chạy-project)
- [Env configuration](#env-configuration)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Hướng dẫn đóng góp](#hướng-dẫn-đóng-góp)
- [Giấy phép](#giấy-phép)
- [Roadmap](#roadmap)

## Giới thiệu

GEN-HUB không chỉ là một website đặt kho. Đây là một hệ sinh thái gồm:

- `server`: NestJS API trung tâm cho auth, organizations, warehouses, rental contracts, payments, refunds, notifications, AI integrations, monitoring và admin operations.
- `client`: Next.js 16 customer app cho landing pages, tìm kiếm kho, booking, dashboard người dùng, 3D warehouse và warehouse-floor workflows.
- `admin/*`: Bộ công cụ quản trị tách vai trò, gồm admin console tổng hợp, database panel, feature-flag panel và resources panel.
- `status`: Dashboard theo dõi trạng thái dịch vụ.
- `utilities/api-json`: Trình khám phá Swagger/OpenAPI JSON.
- `App/GenHubApp`: Ứng dụng Windows WPF chạy trên .NET 8.

Repository hiện chưa dùng workspace manager ở root. Mỗi ứng dụng được cài đặt và chạy độc lập theo thư mục riêng.

## Tính năng chính

- Public marketplace cho tìm kiếm kho, xem chi tiết kho và khởi tạo booking.
- Quản lý warehouse templates, layout kho, racks, shelves, blocks và inventory workflows.
- Hợp đồng thuê kho, tính giá, thanh toán, refund request và balance management.
- Multi-organization, role/permission, API keys và warehouse manager authorization.
- Realtime notifications, org chat, websocket events và live support workflows.
- AI-assisted automation cho auto-reply, plugin integrations và external AI providers.
- Admin tooling cho users, roles, logs, backups, queries, diagrams, feature flags và tài nguyên hệ thống.
- Status monitoring, health endpoints, metrics endpoints và OpenAPI documentation qua Scalar.
- Seed data, Prisma migrations, Redis caching, i18n và extensive environment-based configuration.

## Kiến trúc tổng quan

### 1. Bức tranh hệ thống

```mermaid
flowchart LR
    U[End Users] --> C[client<br/>Next.js 16]
    O[Operations Team] --> A[admin panels<br/>Next.js]
    SRE[SRE / Support] --> ST[status<br/>Next.js]
    DEV[Developers] --> APIJSON[utilities/api-json]

    C --> API[server<br/>NestJS 11]
    A --> API
    ST --> C
    ST --> API
    APIJSON --> API

    API --> DB[(PostgreSQL<br/>Prisma)]
    API --> REDIS[(Redis<br/>cache + queues)]
    API --> EXT[Email / ImageKit / Backblaze B2 / Agora / Cloudflare / Gemini / Coze / Dify / Discord / SePay]

    WIN[Windows App<br/>WPF .NET 8] --> API
```

### 2. Các ứng dụng trong repo

| Ứng dụng | Vai trò | Stack | Port mặc định |
| --- | --- | --- | --- |
| `server` | Core API, auth, domain logic, Swagger, jobs | NestJS 11, Prisma, Redis, BullMQ | `4000` |
| `client` | Website chính cho người dùng và doanh nghiệp | Next.js 16, React 19, Tailwind 4 | `3000` |
| `status` | Theo dõi sức khỏe các dịch vụ | Next.js 16 | `3500` |
| `admin/database-panel` | Query, schema/diagram, export database | Next.js 14 | `3600` |
| `admin/feature-flag-panel` | Quản trị feature flags | Next.js 14 | `3700` |
| `admin/resources-panel` | Giám sát metrics tài nguyên | Next.js 14 | `3800` |
| `admin/admin-panel` | Admin console tổng hợp: users, roles, logs, backups, resources | Next.js 14 | `3900` |
| `utilities/api-json` | OpenAPI JSON explorer | Next.js 16 | `4000` |
| `App/GenHubApp` | Desktop client cho Windows | .NET 8 WPF | n/a |

> Lưu ý: `utilities/api-json` đang cấu hình mặc định port `4000`, trùng với backend. Khi chạy local cùng backend, nên override sang port khác, ví dụ `4100`.

### 3. Backend domain map

Các module chính trong `server/src/modules` được chia tương đối rõ theo domain:

- Identity: `auth`, `account`, `two-factor`, `user`, `user-management`
- Warehousing: `warehouse`, `warehouse-template`, `warehouse-manager*`, `warehouse-visit`, `inventory-request`
- Commerce: `public-catalog`, `public-quotation`, `rental-contract`, `payment`, `refund-request`, `coupon`
- Organizations: `organization`, `organization-role`, `organization-api-key`, `organization-balance`
- Communication: `notification`, `global-notification`, `org-chat`, `contact`, `consultation-request`
- Operations: `system-log`, `database-log`, `database-backup`, `resources`, `analytics`, `feature-flag`
- Integrations: `backblaze-b2`, `email-inbound`, `ai-plugin`, `coze`, `discord`, `app-download`

## Cài đặt

### Yêu cầu hệ thống

- Node.js `20+` được khuyến nghị
- `npm` đi kèm Node.js
- PostgreSQL
- Redis
- .NET 8 SDK nếu cần build `App/GenHubApp`

### Cài dependencies

Vì repo không có root workspace, hãy cài theo từng app bạn cần dùng:

```bash
cd server && npm install
cd ../client && npm install
cd ../status && npm install
cd ../admin/database-panel && npm install
cd ../admin/feature-flag-panel && npm install
cd ../admin/resources-panel && npm install
cd ../admin/admin-panel && npm install
cd ../utilities/api-json && npm install
```

Nếu bạn chỉ cần local stack tối thiểu để phát triển sản phẩm chính, thường chỉ cần:

```bash
cd server && npm install
cd ../client && npm install
```

## Chạy project

### 1. Khởi tạo backend

```bash
cd server
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

Sau khi backend chạy, các endpoint hữu ích:

- `http://localhost:4000/health`
- `http://localhost:4000/api-docs`
- `http://localhost:4000/api-docs-json`
- `http://localhost:4000/api-docs-apikey`
- `http://localhost:4000/api-docs-apikey-json`

Ví dụ kiểm tra nhanh:

```bash
curl http://localhost:4000/health
```

### 2. Chạy website chính

```bash
cd client
cp .env.example .env.local
npm run dev
```

Website chính mặc định chạy tại `http://localhost:3000`.

### 3. Chạy các panel vận hành

Mỗi panel chạy trên một terminal riêng:

```bash
cd status && cp .env.example .env.local && npm run dev
cd admin/database-panel && cp .env.example .env.local && npm run dev
cd admin/feature-flag-panel && cp .env.example .env.local && npm run dev
cd admin/resources-panel && cp .env.example .env.local && npm run dev
cd admin/admin-panel && cp .env.example .env.local && npm run dev
```

Các URL local mặc định:

- `client`: `http://localhost:3000`
- `status`: `http://localhost:3500`
- `database-panel`: `http://localhost:3600`
- `feature-flag-panel`: `http://localhost:3700`
- `resources-panel`: `http://localhost:3800`
- `admin-panel`: `http://localhost:3900`

### 4. Chạy OpenAPI explorer

Do script mặc định của utility cũng dùng port `4000`, hãy đổi port khi chạy local:

```bash
cd utilities/api-json
npx next dev --port 4100
```

### 5. Build desktop app Windows

```bash
cd App/GenHubApp
dotnet build
```

## Env configuration

### 1. Danh sách file env

| App | File mẫu | File local nên dùng |
| --- | --- | --- |
| `server` | `server/.env.example` | `server/.env` |
| `client` | `client/.env.example` | `client/.env.local` |
| `status` | `status/.env.example` | `status/.env.local` |
| `admin/*` | `admin/*/.env.example` | `admin/*/.env.local` |

### 2. Biến tối thiểu cho backend

Để boot được stack cốt lõi, bạn nên cấu hình ít nhất các nhóm sau:

```env
PORT=4000
BACKEND_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:3000,http://localhost:3500,http://localhost:3600,http://localhost:3700,http://localhost:3800,http://localhost:3900

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/genhub
REDIS_URL=redis://localhost:6379/0

JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
ACCESS_VERIFICATION_TOKEN_SECRET=replace_me
TEMP_2FA_TOKEN_SECRET=replace_me
CIPHER_SECRET_KEY=replace_me

SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change_me
```

### 3. Biến tối thiểu cho frontend apps

`client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_USE_CLOUDFLARE_CAPTCHA=false
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
RESOURCES_API_KEY=your_client_api_key_here
```

`status/.env.local`

```env
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:4000
DATABASE_PANEL_URL=http://localhost:3600
FEATURE_FLAG_PANEL_URL=http://localhost:3700
RESOURCES_PANEL_URL=http://localhost:3800
RESOURCES_API_KEY=your_status_api_key_here
```

`admin/*/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_USE_CLOUDFLARE_CAPTCHA=false
RESOURCES_API_KEY=your_panel_api_key_here
```

### 4. Tích hợp tuỳ chọn

`server/.env.example` hiện hỗ trợ nhiều nhóm tích hợp mở rộng. Bạn chỉ cần cấu hình khi thực sự dùng:

- Email / Gmail API
- ImageKit
- Backblaze B2
- Cloudflare Turnstile và Analytics
- Gemini, Coze, Dify
- Discord bot
- Agora
- SePay
- Hunter.io

Nếu đang phát triển local, nên giữ các cờ tùy chọn ở trạng thái tắt:

```env
USE_CLOUDFLARE_CAPTCHA=false
USE_HUNTER_EMAIL_VERIFICATION=false
DISCORD_ENABLED=false
COZE_ENABLED=false
DIFY_ENABLED=false
```

## Cấu trúc thư mục

```text
GEN-HUB/
|-- server/                    # NestJS API, Prisma schema, seeders, Redis/Bull, Swagger
|   |-- src/
|   |   |-- common/            # Guards, decorators, filters, interceptors, shared helpers
|   |   |-- config/            # Cache/config factories
|   |   |-- i18n/              # Ban dich vi/en
|   |   |-- modules/           # Domain modules
|   |   `-- prisma/            # Prisma service
|   `-- prisma/                # schema.prisma va seed entrypoint
|-- client/                    # Website chinh cho customer va organization users
|   |-- app/                   # App Router, public/auth/protected routes
|   |-- components/            # UI components
|   |-- services/              # API client services
|   `-- lib/                   # Utilities
|-- admin/
|   |-- admin-panel/           # Admin console tong hop
|   |-- database-panel/        # Query, schema, export, diagram tools
|   |-- feature-flag-panel/    # Feature flag management
|   `-- resources-panel/       # Service metrics dashboard
|-- status/                    # Service status page
|-- utilities/
|   `-- api-json/              # Swagger/OpenAPI JSON explorer
`-- App/
    `-- GenHubApp/             # Windows WPF desktop client
```

### Một vài route đáng chú ý

- `client/app/(public)`: homepage, pricing, about, bookings, `kho-bai`
- `client/app/(protected)`: dashboard, checkout, orders, `warehouse-3d`, `warehouse-floor`
- `admin/admin-panel/src/app/(protected)`: backups, users, roles, permissions, query, diagram, system-logs, resources

## Hướng dẫn đóng góp

Chúng tôi khuyến khích đóng góp theo hướng thay đổi nhỏ, rõ phạm vi và có thể review nhanh.

1. Tạo branch mới từ `main` hoặc branch integration hiện hành.
2. Giữ thay đổi theo từng concern: backend, client, admin panel hoặc docs.
3. Nếu chỉnh API hoặc contract dữ liệu, cập nhật DTO/Swagger và tài liệu liên quan.
4. Nếu thêm env mới, cập nhật `.env.example` của app tương ứng.
5. Trước khi mở pull request, chạy các lệnh phù hợp trên phần bạn đã sửa:

```bash
# server
cd server
npm run lint
npm run test
npm run build

# next app bất kỳ
cd client
npm run lint
npm run build
```

### Nguyên tắc review được khuyến nghị

- Ưu tiên backward compatibility cho API.
- Không commit secrets, `.env`, database dumps hoặc build artifacts.
- Giữ README và docs đồng bộ với hành vi thực tế của hệ thống.
- Với thay đổi lớn, nên kèm migration plan hoặc rollout notes.

## Giấy phép

Hiện tại repository chưa có file `LICENSE` ở root và package backend đang khai báo `UNLICENSED`.

Điều đó có nghĩa là:

- source code chưa được phát hành dưới giấy phép mã nguồn mở chính thức;
- việc sử dụng, phân phối hoặc thương mại hóa cần tuân theo quyết định của chủ sở hữu dự án.

Nếu dự án có kế hoạch public hoặc nhận external contributions ở quy mô lớn, nên bổ sung file `LICENSE` rõ ràng trong bước tiếp theo.

## Roadmap

- [ ] Chuẩn hóa root workspace (`npm workspaces`, `pnpm`, Turbo hoặc Nx) để đồng bộ install/build/dev commands.
- [ ] Thêm `docker-compose` cho PostgreSQL, Redis và local app bootstrap.
- [ ] Hợp nhất tài liệu triển khai cho backend, client và admin panels.
- [ ] Tự động hóa OpenAPI publishing và versioned API docs.
- [ ] Bổ sung CI/CD checks cho lint, test, build và migration safety.
- [ ] Hoàn thiện observability tập trung cho logs, metrics, alerts và uptime dashboards.
- [ ] Mở rộng desktop/mobile operational clients cho warehouse-floor workflows.

---

Nếu bạn đang onboard vào dự án, lộ trình khởi động nhanh nhất thường là:

1. chạy `server`;
2. chạy `client`;
3. xác nhận `http://localhost:4000/api-docs` và `http://localhost:3000`;
4. sau đó mới bật thêm `status` và các `admin panels` theo nhu cầu.
