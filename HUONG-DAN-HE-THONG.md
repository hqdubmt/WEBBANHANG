# HƯỚNG DẪN HỆ THỐNG AI SOCIAL COMMERCE OS
## Phiên bản V6 — Autonomous Company

> Tài liệu hướng dẫn hoàn chỉnh — cách hoạt động và sử dụng toàn bộ chức năng

---

## MỤC LỤC

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Kiến Trúc Kỹ Thuật](#2-kiến-trúc-kỹ-thuật)
3. [Cài Đặt & Khởi Động](#3-cài-đặt--khởi-động)
4. [Xác Thực & Phân Quyền](#4-xác-thực--phân-quyền)
5. [Quản Lý Sản Phẩm](#5-quản-lý-sản-phẩm)
6. [Quản Lý Đơn Hàng](#6-quản-lý-đơn-hàng)
7. [Thanh Toán](#7-thanh-toán)
8. [Quản Lý Khách Hàng & CRM](#8-quản-lý-khách-hàng--crm)
9. [Leads & Marketing](#9-leads--marketing)
10. [Chiến Dịch Marketing](#10-chiến-dịch-marketing)
11. [Analytics & Báo Cáo](#11-analytics--báo-cáo)
12. [Business OS — Hệ Điều Hành Doanh Nghiệp](#12-business-os--hệ-điều-hành-doanh-nghiệp)
13. [Knowledge Brain — Não Bộ Tri Thức](#13-knowledge-brain--não-bộ-tri-thức)
14. [AI Board of Directors — Ban Lãnh Đạo AI](#14-ai-board-of-directors--ban-lãnh-đạo-ai)
15. [Self-Improvement Loop — Vòng Lặp Tự Cải Tiến](#15-self-improvement-loop--vòng-lặp-tự-cải-tiến)
16. [25 AI Agents](#16-25-ai-agents)
17. [Marketplace Đa Sàn](#17-marketplace-đa-sàn)
18. [Inbox Hợp Nhất — Omnichannel](#18-inbox-hợp-nhất--omnichannel)
19. [AI Chat & Admin Assistant](#19-ai-chat--admin-assistant)
20. [Kho Hàng & Nhà Cung Cấp](#20-kho-hàng--nhà-cung-cấp)
21. [Dropship & Affiliate](#21-dropship--affiliate)
22. [Enterprise & White Label](#22-enterprise--white-label)
23. [Mobile & Notifications](#23-mobile--notifications)
24. [WebSocket Realtime](#24-websocket-realtime)
25. [Monitoring & Observability](#25-monitoring--observability)
26. [Giao Diện Frontend](#26-giao-diện-frontend)
27. [Swagger API Docs](#27-swagger-api-docs)
28. [Cấu Trúc Database](#28-cấu-trúc-database)

---

## 1. TỔNG QUAN HỆ THỐNG

### Hệ thống là gì?

**AI Social Commerce OS** là nền tảng bán hàng thông minh tự động hoàn toàn. Hệ thống kết hợp **25 AI Agents** + **7 AI Executives (Ban Lãnh Đạo AI)** để vận hành doanh nghiệp thương mại điện tử mà không cần con người can thiệp liên tục.

### Mô hình vận hành cốt lõi

```
Thị trường (Market Data)
    ↓
Business OS (Hệ điều hành tổng hợp KPI, Funnel, Priority)
    ↓
Knowledge Brain (Não bộ học từ dữ liệu, RAG Q&A)
    ↓
AI Board Meeting (7 AI executives họp ngày, ra quyết định)
    ↓
25 Agents thực thi (content, SEO, email, pricing, CRM...)
    ↓
Kết quả → Ghi nhận → Self-Improvement học hỏi
    ↓
Vòng lặp lại từ đầu (Autonomous Company)
```

### Điểm khác biệt

- **Không cần vận hành thủ công** — Agents chạy tự động theo lịch (cron)
- **AI Board họp hàng ngày** — 7 executives phân tích và ra priority actions
- **Tự học và cải tiến** — Self-Improvement Loop ghi nhận bài học, điều chỉnh chiến lược
- **Đa kênh thực sự** — Shopee, Lazada, TikTok, Facebook, Telegram, WebChat trong một hệ thống
- **RAG Knowledge Base** — Hỏi AI về bất kỳ dữ liệu nào trong hệ thống bằng ngôn ngữ tự nhiên

---

## 2. KIẾN TRÚC KỸ THUẬT

### Stack công nghệ

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND: Next.js 14 (App Router) — port 3004      │
├─────────────────────────────────────────────────────┤
│  BACKEND API: NestJS + TypeORM — port 3001          │
│  • 35+ modules, JWT Auth, WebSocket, Bull Queue     │
│  • Rate Limiting: 10 req/s, 200 req/min             │
│  • Swagger Docs: /api/docs                          │
├─────────────────────────────────────────────────────┤
│  DATABASE LAYER                                     │
│  PostgreSQL 17    → Dữ liệu chính (50+ entities)   │
│  Redis 7          → Cache + Job Queue               │
│  Qdrant           → Vector DB cho RAG/AI            │
│  MinIO            → File storage (S3-compatible)   │
├─────────────────────────────────────────────────────┤
│  AI LAYER                                           │
│  Ollama (qwen2.5:7b) → AI Local, không phí         │
│  OpenRouter (mistral-7b) → AI Cloud fallback       │
├─────────────────────────────────────────────────────┤
│  SERVICES                                           │
│  n8n          → Workflow automation                 │
│  Open WebUI   → Chat trực tiếp với AI local        │
│  Prometheus   → Metrics                            │
│  Grafana      → Dashboard monitoring               │
│  Loki         → Log aggregation                    │
│  Uptime Kuma  → Uptime monitoring                  │
│  Nginx        → Reverse proxy (production)         │
└─────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục

```
webbanhang/
├── apps/
│   ├── api/                      ← NestJS Backend
│   │   └── src/
│   │       ├── app.module.ts     ← Entry point, đăng ký toàn bộ modules
│   │       ├── main.ts           ← Bootstrap: port, CORS, Swagger, WebSocket
│   │       ├── modules/          ← 35+ feature modules
│   │       │   ├── auth/         ← JWT authentication
│   │       │   ├── products/
│   │       │   ├── orders/
│   │       │   ├── customers/
│   │       │   ├── ai-board/     ← 7 AI Executives
│   │       │   ├── business-os/  ← Business Operating System
│   │       │   ├── knowledge-brain/ ← RAG + Vector search
│   │       │   ├── self-improvement/ ← Autonomous learning
│   │       │   ├── agents/       ← 25 AI Agents
│   │       │   ├── inbox/        ← Omnichannel inbox
│   │       │   ├── chat/         ← AI Chat assistant
│   │       │   └── ...
│   │       └── database/
│   │           ├── entities/     ← 50+ TypeORM entities
│   │           └── migrations/   ← V7, V8 migrations
│   └── web/                      ← Next.js Frontend
│       └── src/
│           ├── app/(dashboard)/  ← 28 trang quản trị
│           ├── components/       ← DataTable, Modal, PageHeader...
│           └── lib/              ← API client, Auth context
├── docker-compose.yml            ← Toàn bộ infrastructure
├── monitoring/                   ← Prometheus + Grafana configs
├── nginx/                        ← Nginx config (production)
└── .env                          ← Environment variables
```

### Luồng dữ liệu

```
HTTP Request → Nginx (prod) → API (NestJS)
                                  ↓
                           ThrottlerGuard (rate limit)
                                  ↓
                           AuthGuard (JWT verify)
                                  ↓
                           Controller → Service → Repository
                                                      ↓
                                              PostgreSQL / Redis
                                              Qdrant (vector search)
                                              MinIO (files)
                                              AI (Ollama/OpenRouter)
```

---

## 3. CÀI ĐẶT & KHỞI ĐỘNG

### Yêu cầu

- Docker + Docker Compose
- Git
- Make (optional, dùng Makefile)

### Bước 1 — Chuẩn bị

```bash
git clone <repo>
cd webbanhang
cp .env.example .env
# Chỉnh sửa .env nếu cần (xem phần biến môi trường)
```

### Bước 2 — Khởi động

```bash
# Khởi động toàn bộ hệ thống (infra + API)
make up

# Hoặc trực tiếp với Docker Compose
docker compose up -d

# Chỉ khởi động hạ tầng (không build API — để dev local)
make infra

# Dev mode — chạy API và Web ngoài Docker
make dev

# Production (có Nginx + Web container)
docker compose --profile prod up -d
```

### Bước 3 — Pull AI Model

```bash
# Pull model Ollama (cần làm sau lần đầu)
make pull-model

# Hoặc thủ công
docker exec commerce_ollama ollama pull qwen2.5:7b
```

### Bước 4 — Tạo tài khoản Admin đầu tiên

```bash
# Kiểm tra hệ thống đã có admin chưa
curl http://localhost:3001/api/auth/setup-status

# Nếu { "needed": true } → tạo admin
curl -X POST http://localhost:3001/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin123!","name":"Admin"}'
```

### Cổng truy cập

| Dịch vụ | URL | Tài khoản mặc định |
|---|---|---|
| **Admin Dashboard** | `http://localhost:3004` | Tài khoản vừa tạo |
| **API** | `http://localhost:3001/api` | — |
| **Swagger Docs** | `http://localhost:3001/api/docs` | — |
| **Grafana** | `http://localhost:3003` | admin/admin |
| **Uptime Kuma** | `http://localhost:3002` | Tạo khi lần đầu vào |
| **n8n Workflows** | `http://localhost:5678` | Từ `.env` N8N_USER/PASSWORD |
| **MinIO Console** | `http://localhost:9001` | Từ `.env` MINIO_ROOT_USER/PASSWORD |
| **Open WebUI** | `http://localhost:3000` | Tạo khi lần đầu vào |

### Biến môi trường quan trọng (`.env`)

```bash
# App
APP_PORT=3004              # Port frontend
APP_SECRET=<strong_secret> # JWT signing key (BẮT BUỘC ĐỔI)

# Database
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=54372
POSTGRES_USER=commerce_user
POSTGRES_PASSWORD=<password>
POSTGRES_DB=ai_commerce

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
REDIS_PASSWORD=<password>

# AI
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:7b
OPENROUTER_MODEL=mistralai/mistral-7b-instruct
OPENROUTER_API_KEY=<key>   # Nếu dùng AI cloud

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<password>

# Marketplace (optional)
SHOPEE_APP_ID=
SHOPEE_APP_SECRET=
FACEBOOK_PAGE_ID=394892883716330
TELEGRAM_BOT_TOKEN=
```

### Lệnh hay dùng

```bash
# Xem logs API
docker logs commerce_api -f

# Xem logs tất cả
docker compose logs -f

# Restart API sau khi thay đổi
docker compose restart api

# Vào PostgreSQL
docker exec -it commerce_postgres psql -U commerce_user -d ai_commerce

# Kiểm tra health tất cả containers
docker compose ps
```

---

## 4. XÁC THỰC & PHÂN QUYỀN

### Cơ chế

- **JWT HS256** — tự ký, không phụ thuộc thư viện ngoài
- **Access Token**: hết hạn sau **1 giờ**
- **Refresh Token**: hết hạn sau **30 ngày**
- `AuthModule` là `@Global()` — **toàn bộ API đều yêu cầu token** trừ routes có `@Public()`
- Rate Limit: **10 request/giây** + **200 request/phút**

### Các role

| Role | Quyền |
|---|---|
| `admin` | Toàn quyền — tạo, xem, sửa, xoá, cấu hình hệ thống |
| `manager` | Quản lý sản phẩm, đơn hàng, khách hàng, campaigns |
| `staff` | Xem và cập nhật đơn hàng, leads, khách hàng |
| `viewer` | Chỉ xem (role mặc định khi đăng ký) |

### API Endpoints

#### Kiểm tra setup (không cần token)
```http
GET /api/auth/setup-status
```
Response:
```json
{ "needed": true }   // cần tạo admin
{ "needed": false }  // đã có admin
```

#### Tạo Admin đầu tiên (không cần token, chỉ hoạt động khi chưa có admin)
```http
POST /api/auth/setup
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "Admin123!",
  "name": "Super Admin"
}
```

#### Đăng nhập
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "Admin123!"
}
```
Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "admin@company.com",
    "name": "Super Admin",
    "role": "admin"
  }
}
```

#### Đăng ký (role mặc định: viewer)
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "staff@company.com",
  "password": "Staff123!",
  "name": "Nhân viên A"
}
```

#### Làm mới token
```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

#### Lấy thông tin user hiện tại
```http
GET /api/auth/me
Authorization: Bearer eyJ...
```

### Cách dùng token trong mọi request

```http
GET /api/products
Authorization: Bearer <accessToken>
```

Hoặc trong JavaScript:
```javascript
const res = await fetch('/api/products', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 5. QUẢN LÝ SẢN PHẨM

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/products` | Danh sách sản phẩm |
| `POST` | `/api/products` | Tạo sản phẩm mới |
| `GET` | `/api/products/hot` | Sản phẩm bán chạy |
| `GET` | `/api/products/:id` | Chi tiết sản phẩm |
| `PUT` | `/api/products/:id` | Cập nhật sản phẩm |
| `DELETE` | `/api/products/:id` | Xoá sản phẩm |

### Tạo sản phẩm

```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Áo thun cotton nam",
  "slug": "ao-thun-cotton-nam",
  "description": "Áo thun 100% cotton, form regular",
  "price": 250000,
  "comparePrice": 350000,
  "cost": 120000,
  "sku": "AT-COTTON-001",
  "stock": 100,
  "categoryId": "uuid-danh-muc",
  "brandId": "uuid-thuong-hieu",
  "images": ["https://..."],
  "tags": ["cotton", "basic", "nam"],
  "isActive": true
}
```

### Danh sách với filter

```http
GET /api/products?page=1&limit=20&categoryId=uuid&search=áo
```

### Quản lý Danh Mục & Thương Hiệu

```http
# Tạo danh mục
POST /api/categories
{ "name": "Áo", "slug": "ao", "parentId": null }

# Tạo thương hiệu
POST /api/brands
{ "name": "Nike", "slug": "nike", "logo": "https://..." }
```

---

## 6. QUẢN LÝ ĐƠN HÀNG

### Trạng thái đơn hàng

```
pending → confirmed → processing → shipped → delivered
                                          ↘ cancelled
```

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `POST` | `/api/orders` | Tạo đơn hàng mới |
| `GET` | `/api/orders` | Danh sách (filter: status, customerId, page, limit) |
| `GET` | `/api/orders/revenue?days=30` | Tổng quan doanh thu |
| `GET` | `/api/orders/stats` | Thống kê theo trạng thái |
| `GET` | `/api/orders/stats/summary` | Thống kê chi tiết + doanh thu hôm nay |
| `GET` | `/api/orders/:id` | Chi tiết đơn hàng |
| `PUT` | `/api/orders/:id/status` | Cập nhật trạng thái |
| `PATCH` | `/api/orders/:id` | Cập nhật địa chỉ, ghi chú, coupon |
| `DELETE` | `/api/orders/:id` | Huỷ đơn + hoàn kho |
| `POST` | `/api/orders/bulk/status` | Cập nhật hàng loạt |

### Fulfillment (Vận chuyển)

| Method | URL | Mô tả |
|---|---|---|
| `PATCH` | `/api/orders/:id/advance` | Tự động chuyển trạng thái kế tiếp |
| `PATCH` | `/api/orders/:id/fulfill` | Set trạng thái + tracking number |
| `POST` | `/api/orders/fulfillment/auto-deliver` | Auto mark DELIVERED đơn giao quá X ngày |
| `GET` | `/api/orders/fulfillment/status` | Dashboard tổng quan giao hàng |

### Tạo đơn hàng

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "uuid-khach-hang",
  "items": [
    { "productId": "uuid", "quantity": 2, "price": 250000 }
  ],
  "shippingAddress": {
    "name": "Nguyễn Văn A",
    "phone": "0901234567",
    "address": "123 Nguyễn Huệ",
    "city": "TP.HCM"
  },
  "paymentMethod": "cod",
  "note": "Giao giờ hành chính"
}
```

### Cập nhật hàng loạt

```http
POST /api/orders/bulk/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderIds": ["uuid1", "uuid2", "uuid3"],
  "status": "shipped"
}
```

### Auto Fulfillment

```http
# Tự động mark DELIVERED cho đơn đã shipped > 3 ngày
POST /api/orders/fulfillment/auto-deliver
{ "daysAgo": 3 }

# Chuyển đơn lên trạng thái tiếp theo (auto flow)
PATCH /api/orders/uuid/advance

# Set tracking number
PATCH /api/orders/uuid/fulfill
{ "status": "shipped", "trackingNumber": "VN123456789" }
```

---

## 7. THANH TOÁN

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/payments` | Danh sách thanh toán |
| `GET` | `/api/payments/stats` | Thống kê thanh toán |
| `GET` | `/api/payments/methods` | Phương thức thanh toán |
| `GET` | `/api/payments/history` | Lịch sử |
| `GET` | `/api/payments/order/:orderId` | Thanh toán theo đơn |
| `POST` | `/api/payments` | Tạo thanh toán thủ công |
| `POST` | `/api/payments/:id/confirm` | Xác nhận thanh toán |
| `POST` | `/api/payments/:id/refund` | Hoàn tiền |

### VNPay

```http
# Bước 1 — Tạo URL thanh toán
POST /api/payments/vnpay/create-url
{ "orderId": "uuid", "amount": 500000, "returnUrl": "http://..." }
# Response: { "paymentUrl": "https://sandbox.vnpayment.vn/..." }

# Bước 2 — VNPay redirect về (webhook tự động)
GET /api/payments/vnpay/return?vnp_ResponseCode=00&...
```

### MoMo

```http
# Tạo giao dịch MoMo
POST /api/payments/momo/create
{ "orderId": "uuid", "amount": 500000 }

# IPN Webhook từ MoMo (tự động)
POST /api/payments/momo/ipn
```

### COD (Thanh toán khi nhận hàng)

```http
POST /api/payments/cod/confirm
{ "orderId": "uuid", "collectedAmount": 500000 }
```

---

## 8. QUẢN LÝ KHÁCH HÀNG & CRM

### Customer Tiers (Hạng khách hàng)

```
new → regular → silver → gold → vip → platinum
```

### Endpoints cơ bản

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/customers` | Danh sách khách hàng |
| `POST` | `/api/customers` | Tạo khách hàng mới |
| `GET` | `/api/customers/stats` | Thống kê tổng quan |
| `GET` | `/api/customers/:id` | Chi tiết |
| `PUT` | `/api/customers/:id` | Cập nhật |
| `POST` | `/api/customers/:id/upgrade-vip` | Nâng VIP |

### Health Score (Sức khoẻ khách hàng)

Hệ thống tự động chấm điểm sức khoẻ từng khách hàng dựa trên: tần suất mua, giá trị đơn, thời gian cuối mua.

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/customers/health/dashboard` | Dashboard tổng quan |
| `GET` | `/api/customers/:id/health` | Health score cá nhân |
| `POST` | `/api/customers/health/batch-scan` | Quét & cập nhật hàng loạt |
| `GET` | `/api/customers/health/at-risk` | Khách hàng có nguy cơ rời bỏ |

### Retention (Giữ chân khách hàng)

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/customers/retention/inactive` | Khách không mua > 30 ngày |
| `POST` | `/api/customers/retention/follow-up` | Gửi follow-up tự động |
| `POST` | `/api/customers/retention/birthday-reminders` | Nhắc sinh nhật tự động |
| `POST` | `/api/customers/retention/re-engage` | Chiến dịch re-engage |
| `GET` | `/api/customers/retention/stats` | Thống kê retention |

### Loyalty Program (Điểm thưởng)

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/customers/:id/loyalty` | Điểm và hạng loyalty |
| `PATCH` | `/api/customers/:id/check-tier` | Kiểm tra & tự động nâng hạng |
| `POST` | `/api/customers/loyalty/batch-tiers` | Cập nhật hạng hàng loạt |
| `POST` | `/api/customers/:id/reward-coupon` | Tặng coupon phần thưởng |
| `GET` | `/api/customers/loyalty/perks/:tier` | Đặc quyền theo hạng |

### Ví dụ sử dụng

```http
# Tạo khách hàng mới
POST /api/customers
{
  "name": "Nguyễn Thị B",
  "email": "b@email.com",
  "phone": "0901234567",
  "address": "HCM",
  "birthday": "1990-05-15"
}

# Quét health score tất cả khách hàng
POST /api/customers/health/batch-scan

# Tặng coupon 10% cho khách VIP
POST /api/customers/uuid/reward-coupon
{ "type": "PERCENTAGE", "value": 10, "expiresIn": 30 }
```

---

## 9. LEADS & MARKETING

### Lead Status Flow

```
new → contacted → qualified → negotiating → converted
                                          ↘ lost
```

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `POST` | `/api/leads` | Tạo lead thủ công |
| `GET` | `/api/leads` | Danh sách leads |
| `GET` | `/api/leads/hot` | Leads nóng (high intent score) |
| `PUT` | `/api/leads/:id/status` | Cập nhật trạng thái |

### Thu thập leads tự động

```http
# Từ form web (landing page)
POST /api/leads/capture/form
{
  "name": "Nguyễn Văn C",
  "phone": "0909...",
  "email": "c@email.com",
  "platform": "website",
  "source": "google_ads",
  "product": "áo thun"
}

# Từ tin nhắn inbox (Facebook/Telegram)
POST /api/leads/capture/inbox
{ "conversationId": "uuid", "platform": "facebook" }

# Từ comment mạng xã hội
POST /api/leads/capture/comment
{ "commentId": "123", "platform": "facebook", "content": "cho hỏi..." }
```

### Phân loại & định tuyến AI

```http
# AI phân loại 1 lead (hot/warm/cold + score 0-100)
POST /api/leads/uuid/classify

# AI phân loại hàng loạt
POST /api/leads/classify/batch
{ "leadIds": ["uuid1", "uuid2"] }

# Định tuyến tự động → assign cho sales phù hợp
POST /api/leads/routing/auto

# Phân công thủ công
PATCH /api/leads/uuid/assign
{ "assignedTo": "staff-uuid" }

# Đồng bộ sang CRM
POST /api/leads/uuid/sync-crm

# Thống kê routing
GET /api/leads/routing/stats
```

---

## 10. CHIẾN DỊCH MARKETING

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/campaigns` | Danh sách chiến dịch |
| `GET` | `/api/campaigns/stats` | Thống kê tổng quan |
| `POST` | `/api/campaigns` | Tạo chiến dịch mới |
| `PUT` | `/api/campaigns/:id` | Cập nhật |
| `POST` | `/api/campaigns/:id/launch` | Kích hoạt chiến dịch |
| `PATCH` | `/api/campaigns/:id/pause` | Tạm dừng |
| `PATCH` | `/api/campaigns/:id/resume` | Tiếp tục |
| `POST` | `/api/campaigns/:id/schedule` | Đặt lịch tự động |
| `POST` | `/api/campaigns/:id/distribute` | Phân phối đa kênh |
| `GET` | `/api/campaigns/:id/performance` | Hiệu suất |
| `POST` | `/api/campaigns/:id/ab-test` | Tạo A/B test |
| `GET` | `/api/campaigns/ab-test/compare` | So sánh kết quả |
| `GET` | `/api/campaigns/optimization/report` | Báo cáo tối ưu hoá |
| `DELETE` | `/api/campaigns/:id` | Xoá chiến dịch |

### Tạo chiến dịch

```http
POST /api/campaigns
{
  "name": "Flash Sale Hè 2026",
  "type": "flash_sale",
  "channels": ["email", "telegram", "facebook"],
  "targetSegment": "vip",
  "startDate": "2026-07-01T08:00:00Z",
  "endDate": "2026-07-01T20:00:00Z",
  "budget": 5000000,
  "content": {
    "subject": "Flash Sale 50% hôm nay!",
    "body": "Giảm ngay 50% toàn bộ sản phẩm...",
    "cta": "Mua ngay"
  }
}
```

### Đặt lịch & phân phối

```http
# Đặt lịch chạy
POST /api/campaigns/uuid/schedule
{ "scheduledAt": "2026-07-01T08:00:00Z" }

# Phân phối đồng thời email + telegram + facebook
POST /api/campaigns/uuid/distribute
{ "channels": ["email", "telegram"] }

# Tạo A/B test
POST /api/campaigns/uuid/ab-test
{
  "variantA": { "subject": "Tiêu đề A" },
  "variantB": { "subject": "Tiêu đề B" },
  "splitRatio": 50
}
```

---

## 11. ANALYTICS & BÁO CÁO

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/analytics/dashboard` | Dashboard tổng hợp |
| `GET` | `/api/analytics/revenue` | Phân tích doanh thu chi tiết |
| `GET` | `/api/analytics/leads` | Phân tích leads |
| `GET` | `/api/analytics/customers` | Phân tích khách hàng |
| `GET` | `/api/analytics/ai` | Hiệu suất AI Agents |
| `GET` | `/api/analytics/content` | Phân tích nội dung |
| `GET` | `/api/analytics/kpi` | KPI tổng hợp |
| `GET` | `/api/analytics/forecast` | Dự báo tăng trưởng AI |
| `GET` | `/api/analytics/snapshots` | Lịch sử snapshots |
| `GET` | `/api/analytics/bottlenecks` | Phát hiện điểm tắc nghẽn |
| `GET` | `/api/analytics/growth-suggestions` | Đề xuất tăng trưởng AI |
| `GET` | `/api/analytics/optimization-report` | Báo cáo tối ưu hoá |
| `POST` | `/api/analytics/reports/daily` | Tạo báo cáo ngày |
| `POST` | `/api/analytics/reports/weekly` | Tạo báo cáo tuần |

### Sử dụng

```http
# Dashboard tổng quan (gọi mỗi khi vào trang analytics)
GET /api/analytics/dashboard

# Dự báo doanh thu 30 ngày tới
GET /api/analytics/forecast?days=30

# Tìm điểm tắc nghẽn trong hệ thống
GET /api/analytics/bottlenecks

# Lấy đề xuất tăng trưởng từ AI
GET /api/analytics/growth-suggestions

# Tạo báo cáo PDF ngày
POST /api/analytics/reports/daily
{ "date": "2026-06-16" }
```

---

## 12. BUSINESS OS — HỆ ĐIỀU HÀNH DOANH NGHIỆP

Business OS là **trung tâm chỉ huy** — tổng hợp toàn bộ dữ liệu thành bức tranh kinh doanh tức thì. Tự động phát hiện vấn đề P0/P1/P2/P3 và đề xuất hành động.

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/business-os/dashboard` | Dashboard đầy đủ (tất cả data) |
| `GET` | `/api/business-os/funnel` | Business Funnel (Traffic → Revenue) |
| `GET` | `/api/business-os/kpi` | KPI Framework (Acquisition/Sales/Revenue/Customer) |
| `GET` | `/api/business-os/intelligence` | Intelligence (Opportunities/Risks/Money Leaks) |
| `GET` | `/api/business-os/priorities` | Priority Issues P0→P3 |
| `GET` | `/api/business-os/plan` | Autonomous Plan (Daily/Weekly/Monthly) |
| `GET` | `/api/business-os/questions` | Core Business Questions |
| `GET` | `/api/business-os/report/daily` | Báo cáo ngày tự động |
| `GET` | `/api/business-os/report/weekly` | Báo cáo tuần chiến lược |

### Cách đọc dữ liệu

#### Dashboard tổng hợp
```http
GET /api/business-os/dashboard
```
Response structure:
```json
{
  "generatedAt": "2026-06-16T...",
  "systemStatus": "Healthy|Warning|Critical",
  "funnel": {
    "traffic": 500,
    "leads": 100,
    "conversations": 30,
    "orders": 15,
    "revenue": 7500000,
    "grossProfit": 2625000,
    "avgOrderValue": 500000,
    "conversionLeadToOrder": "15.0%"
  },
  "kpi": {
    "acquisition": { "visitors": 500, "leads": 100, "cpl": 75000 },
    "sales": { "orders": 15, "conversionRate": "15%" },
    "revenue": { "today": 1500000, "thisMonth": 45000000, "growth": "+12.5%" },
    "customer": { "total": 230, "vip": 18, "retentionRate": "67.8%" }
  },
  "intelligence": {
    "opportunities": ["..."],
    "risks": ["..."],
    "moneyLeaks": ["..."]
  },
  "priorityIssues": [
    { "level": "P0", "area": "System", "issue": "...", "action": "..." }
  ],
  "plan": {
    "daily": ["...", "..."],
    "weekly": ["...", "..."],
    "monthly": ["...", "..."]
  }
}
```

### Priority Issue Framework

```
P0 — KHỦNG HOẢNG (xử lý ngay trong giờ)
     • SLA vi phạm
     • Agent failures > 3 lần/24h
     
P1 — NGHIÊM TRỌNG (xử lý trong ngày)
     • Conversion rate < 5%
     • Tenant không hoạt động > 30 ngày
     
P2 — CẦN CHÚ Ý (xử lý trong tuần)
     • Content draft > 20 bài chưa publish
     • Leads mới > 10 chưa liên hệ
     
P3 — CẢI TIẾN (lên kế hoạch)
     • Chưa có white label client
     • Opportunity mở rộng
```

### Money Leak Detection (Phát hiện rò rỉ)

Business OS tự động phát hiện:
- Agent có success rate < 50% nhưng vẫn tốn chi phí AI
- Content thất bại — lãng phí token
- Tỷ lệ đơn hàng huỷ > 10%
- Content draft không publish — không tạo doanh thu

### Daily vs Weekly Report

```http
# Báo cáo ngày — tổng quan nhanh
GET /api/business-os/report/daily
# Bao gồm: systemStatus, todayRevenue, topIssue, immediateActions, funnelStatus

# Báo cáo tuần — chiến lược
GET /api/business-os/report/weekly  
# Bao gồm: whatWorked, whatFailed, moneyLeaks, recommendedFocus, revenueGrowthPlan
```

---

## 13. KNOWLEDGE BRAIN — NÃO BỘ TRI THỨC

Knowledge Brain là **RAG system** — lưu trữ tri thức và cho phép hỏi bằng ngôn ngữ tự nhiên, AI tìm kiếm và trả lời dựa trên dữ liệu thực của hệ thống.

### 5 Domain Tri Thức

```
PRODUCT    → Sản phẩm bán chạy, margin cao, tồn kho
CUSTOMER   → Hành vi mua, hạng, churn risk
BUSINESS   → Doanh thu, KPI, tăng trưởng
MARKET     → Xu hướng, cạnh tranh, pricing
OPERATIONAL → Agent health, workflow, bottleneck
```

### 3 Memory Tiers

```
SHORT_TERM  → Dữ liệu 24h (orders, leads, agents)
MEDIUM_TERM → 7-30 ngày (campaigns, content)
LONG_TERM   → Tri thức chiến lược, bài học tích luỹ
```

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/knowledge-brain/dashboard` | Tổng quan 5 domain |
| `GET` | `/api/knowledge-brain/product-intelligence` | Tri thức sản phẩm |
| `GET` | `/api/knowledge-brain/customer-intelligence` | Tri thức khách hàng |
| `GET` | `/api/knowledge-brain/business-intelligence` | Tri thức kinh doanh |
| `GET` | `/api/knowledge-brain/market-intelligence` | Tri thức thị trường |
| `GET` | `/api/knowledge-brain/operational-intelligence` | Tri thức vận hành |
| `GET` | `/api/knowledge-brain/executive-questions` | 8 câu hỏi chiến lược hàng đầu |
| `POST` | `/api/knowledge-brain/ask` | Hỏi AI bằng tiếng Việt |
| `POST` | `/api/knowledge-brain/ingest` | Nạp tri thức mới |
| `GET` | `/api/knowledge-brain/stats` | Thống kê knowledge base |
| `GET` | `/api/knowledge-brain/db/tables` | Khám phá cấu trúc DB |
| `GET` | `/api/knowledge-brain/db/relationships` | Quan hệ giữa bảng |
| `GET` | `/api/knowledge-brain/api/catalog` | Catalogue API |
| `GET` | `/api/knowledge-brain/api/search/:query` | Tìm API theo query |

### Hỏi AI (RAG Q&A)

```http
POST /api/knowledge-brain/ask
Content-Type: application/json
Authorization: Bearer <token>

{
  "question": "Sản phẩm nào đang bán chạy nhất tháng này?"
}
```
Response:
```json
{
  "question": "Sản phẩm nào đang bán chạy nhất?",
  "answer": "Dựa trên dữ liệu, top 3 sản phẩm bán chạy nhất: 1) Áo thun cotton (250 đơn, 62.5M₫), 2) Quần jean skinny (180 đơn, 54M₫), 3) Giày sneaker (120 đơn, 72M₫). Áo thun cotton dẫn đầu về số lượng đơn.",
  "sources": ["product_intelligence", "order_data"],
  "confidence": 0.92
}
```

### Nạp tri thức mới

```http
POST /api/knowledge-brain/ingest
{
  "domain": "MARKET",
  "tier": "LONG_TERM",
  "title": "Xu hướng thị trường Q3/2026",
  "content": "Thời trang sustainable đang tăng 40% YoY. Gen Z ưu tiên thương hiệu có cam kết môi trường. TikTok Shop vượt Shopee về tốc độ tăng GMV...",
  "tags": ["trend", "q3-2026", "tiktok"]
}
```

### 8 Câu hỏi chiến lược

```http
GET /api/knowledge-brain/executive-questions
```
Trả về 8 câu hỏi quan trọng nhất cần CEO trả lời, ví dụ:
1. Nguồn traffic nào đang mang lại ROI cao nhất?
2. Sản phẩm nào có margin tốt nhất cần đẩy mạnh?
3. Khách hàng nào có nguy cơ churn cao cần re-engage?
4. Agent nào đang hoạt động kém hiệu quả cần tối ưu?

---

## 14. AI BOARD OF DIRECTORS — BAN LÃNH ĐẠO AI

7 AI Executives họp hàng ngày, mỗi người phân tích một góc độ khác nhau và đưa ra quyết định chiến lược.

### 7 AI Executives

| Executive | Phụ trách | KPI chính |
|---|---|---|
| **CEO AI** | Revenue growth, chiến lược tổng thể | Revenue growth, conversion rate |
| **CFO AI** | Lợi nhuận, chi phí, ROI | Gross/Net profit, cost leaks, agent ROI |
| **COO AI** | Vận hành agents, workflow | Agent success rate, pipeline bottleneck |
| **CTO AI** | Uptime, SLA, kỹ thuật | Error rate, SLA violations, uptime % |
| **CMO AI** | Marketing, content, kênh | Leads/tuần, top channel, content pipeline |
| **CRO AI** | Funnel, conversion, AOV | Conversion rate, AOV, funnel stages |
| **CSO AI** | Chiến lược, thị trường | Market position, investment areas |

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/ai-board/meeting` | Cuộc họp đầy đủ tất cả 7 executives |
| `GET` | `/api/ai-board/ceo` | Báo cáo CEO AI |
| `GET` | `/api/ai-board/cfo` | Báo cáo CFO AI |
| `GET` | `/api/ai-board/coo` | Báo cáo COO AI |
| `GET` | `/api/ai-board/cto` | Báo cáo CTO AI |
| `GET` | `/api/ai-board/cmo` | Báo cáo CMO AI |
| `GET` | `/api/ai-board/cro` | Báo cáo CRO AI |
| `GET` | `/api/ai-board/cso` | Báo cáo CSO AI |

### Board Meeting (Cuộc họp đầy đủ)

```http
GET /api/ai-board/meeting
```
Response structure:
```json
{
  "generatedAt": "2026-06-16T09:00:00Z",
  "meetingType": "Daily Board Meeting",
  "systemStatus": "Warning",
  "executiveSummary": {
    "statusOverall": "Warning",
    "revenueStatus": "+12.5%",
    "topIssue": "15 lead mới chưa được liên hệ",
    "topOpportunity": "Mở rộng white label — chưa khai thác",
    "immediateActions": ["Follow-up 15 leads", "Publish 25 content draft", "..."]
  },
  "boardReports": {
    "ceo": { "kpi": {...}, "priorities": [...], "risks": [...] },
    "cfo": { "kpi": {...}, "costLeaks": [...] },
    "coo": { "kpi": {...}, "agentHealth": [...] },
    "cto": { "kpi": {...}, "infrastructureHealth": {...} },
    "cmo": { "kpi": {...}, "channelBreakdown": [...] },
    "cro": { "kpi": {...}, "funnelStages": [...] },
    "cso": { "kpi": {...}, "investmentAreas": [...] }
  },
  "priorityActions": [
    { "level": "P0", "action": "Khắc phục SLA violations", "owner": "CTO" },
    { "level": "P1", "action": "Follow-up 15 leads mới", "owner": "CMO/CRO" },
    { "level": "P2", "action": "Tối ưu agent cost", "owner": "CFO/COO" },
    { "level": "P3", "action": "White Label expansion plan", "owner": "CSO" }
  ],
  "strategicRecommendations": {
    "shortTerm": ["Đạt 10 WL clients/30 ngày", "Tối ưu CR > 15%"],
    "midTerm": ["Mở rộng 3 thị trường mới", "$100K MRR"],
    "longTerm": ["Enterprise B2B platform leader"]
  }
}
```

### CFO AI — Phát hiện Cost Leaks

CFO AI tự động tính:
- Agent nào success rate < 50% nhưng tốn chi phí AI token
- Tỷ lệ đơn huỷ và revenue mất đi
- ROI từng kênh marketing
- Gross/Net profit margin ước tính (35%/18%)

### COO AI — Agent Health Monitoring

COO AI phân loại agent theo 3 mức:
- **Healthy** — failure rate = 0
- **Warning** — có failures nhưng successes vẫn nhiều hơn
- **Critical** — failures > successes

---

## 15. SELF-IMPROVEMENT LOOP — VÒNG LẶP TỰ CẢI TIẾN

Hệ thống tự quan sát, đánh giá, học hỏi và cải tiến theo chu kỳ ngày/tuần/tháng.

### Vòng lặp 6 bước

```
1. OBSERVE   → Thu thập KPI thực tế 24h
2. EVALUATE  → Đánh giá: thành công / thất bại / bất ngờ
3. ANALYZE   → Phân tích nguyên nhân gốc rễ
4. LEARN     → Tổng hợp bài học, ghi vào LessonLearned
5. IMPROVE   → Tạo kế hoạch cải tiến cụ thể
6. EXECUTE   → Thực thi và ghi nhận kết quả
```

### 7 Business Health Scores (0-100)

| Score | Đánh giá | Ngưỡng |
|---|---|---|
| `revenueScore` | Sức khoẻ doanh thu | < 60 = Warning |
| `profitScore` | Sức khoẻ lợi nhuận | < 50 = Danger |
| `growthScore` | Tốc độ tăng trưởng | < 0 = Critical |
| `marketingScore` | Hiệu quả marketing | < 40 = Warning |
| `operationsScore` | Hiệu quả vận hành | < 70 = Warning |
| `technologyScore` | Sức khoẻ công nghệ | < 80 = Warning |
| `customerScore` | Sức khoẻ khách hàng | < 60 = Warning |

### 8 Evolution Levels

```
L1: Agent System       → Có agents tự động chạy
L2: Multi-Agent        → Agents phối hợp với nhau
L3: Executive AI       → AI có báo cáo executive
L4: Business OS        → BOS tổng hợp KPI, phát hiện vấn đề
L5: Knowledge Brain    → RAG, học từ dữ liệu
L6: AI Board           → 7 executives họp, ra quyết định
L7: Self-Improvement   → Học hỏi và tự cải thiện
L8: Autonomous Company → Tự vận hành hoàn toàn
```

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/self-improvement/dashboard` | Tổng quan |
| `GET` | `/api/self-improvement/observe` | Phase 1: Thu thập |
| `GET` | `/api/self-improvement/evaluate` | Phase 2: Đánh giá |
| `GET` | `/api/self-improvement/analyze` | Phase 3: Phân tích |
| `GET` | `/api/self-improvement/daily-loop` | Chạy vòng lặp ngày |
| `GET` | `/api/self-improvement/weekly-retrospective` | Tổng kết tuần |
| `GET` | `/api/self-improvement/monthly-evolution` | Tiến hoá tháng |
| `GET` | `/api/self-improvement/improvement-plan` | Kế hoạch cải tiến |
| `GET` | `/api/self-improvement/scorecard` | 7 health scores |
| `GET` | `/api/self-improvement/scorecard/today` | Điểm hôm nay |
| `GET` | `/api/self-improvement/scorecard/history` | Lịch sử điểm |

### Quản lý Quyết định

```http
# Danh sách quyết định AI đã ra
GET /api/self-improvement/decisions

# Tạo quyết định mới
POST /api/self-improvement/decisions
{
  "area": "PRICING",
  "decision": "Tăng giá sản phẩm X lên 15%",
  "rationale": "Đối thủ tăng giá, demand vẫn cao",
  "expectedOutcome": "Tăng revenue 8% giữ nguyên volume"
}

# Ghi nhận kết quả thực tế
PUT /api/self-improvement/decisions/uuid/outcome
{
  "outcome": "POSITIVE",
  "actualResult": "Revenue tăng 11%, volume giảm 2%",
  "lesson": "Khách hàng ít nhạy cảm giá hơn dự kiến"
}
```

### A/B Testing Giá

```http
# Gợi ý giá tối ưu cho sản phẩm
GET /api/self-improvement/pricing-test/suggest/product-uuid

# Bắt đầu A/B test giá
POST /api/self-improvement/pricing-test/start
{
  "productId": "uuid",
  "priceA": 250000,
  "priceB": 290000,
  "splitRatio": 50,
  "durationDays": 7
}

# Đánh giá kết quả test
POST /api/self-improvement/pricing-test/experiment-id/evaluate

# Xem test đang chạy
GET /api/self-improvement/pricing-test/active
```

### Autonomous Mode (Chạy tự động hoàn toàn)

```http
# Chạy một vòng lặp tự cải tiến hoàn chỉnh
POST /api/self-improvement/autonomous/run

# AI tự ra quyết định không cần phê duyệt
POST /api/self-improvement/autonomous/auto-decisions

# AI tự tối ưu hoá hệ thống
POST /api/self-improvement/autonomous/auto-optimize

# Xem quyết định đang chờ phê duyệt
GET /api/self-improvement/autonomous/pending

# Phê duyệt quyết định AI
POST /api/self-improvement/autonomous/decisions/uuid/approve

# Từ chối quyết định AI
POST /api/self-improvement/autonomous/decisions/uuid/reject
{ "reason": "Rủi ro quá cao, cần thêm dữ liệu" }
```

### Bài học (Lessons Library)

```http
# Tất cả bài học đã học
GET /api/self-improvement/lessons

# Chiến lược thành công
GET /api/self-improvement/lessons/winning-strategies

# Chiến lược thất bại (để tránh)
GET /api/self-improvement/lessons/failed-strategies

# Pattern đã được chứng minh
GET /api/self-improvement/lessons/proven-patterns
```

---

## 16. 25 AI AGENTS

Mỗi agent có controller, service và module riêng. Agents chạy theo 2 cách:
1. **Cron Schedule** — tự động chạy theo lịch (VD: mỗi giờ, mỗi ngày)
2. **Manual Trigger** — gọi API thủ công

### Master Agent (Điều phối)

```http
# Trigger điều phối ngay (không cần chờ cron)
POST /api/agents/master/run

# KPI từ tất cả agents trong 24h
GET /api/agents/master/kpi
```

Master Agent chạy **mỗi giờ** (cron `0 * * * *`), đánh giá performance từng agent và phân công task mới.

### Danh sách 25 Agents

#### Nhóm V1 — Core (4 agents)

| Agent | Endpoint | Cron | Chức năng |
|---|---|---|---|
| **TrendAgent** (01) | `/api/agents/trend` | Mỗi 6 giờ | Phát hiện xu hướng thị trường, đề xuất sản phẩm |
| **AffiliateAgent** (02) | `/api/agents/affiliate` | Hàng ngày | Tối ưu hoá affiliate links, tính hoa hồng |
| **ContentAgent** (03) | `/api/agents/content` | Mỗi giờ | Tạo nội dung marketing tự động |
| **SalesAgent** (04) | `/api/agents/sales` | Mỗi 30 phút | Hỗ trợ bán hàng, phân tích conversion |

#### Nhóm V2 — Intelligence (9 agents)

| Agent | Endpoint | Chức năng |
|---|---|---|
| **MasterAgent** (05) | `/api/agents/master` | Điều phối toàn bộ agents, KPI |
| **VideoAgent** (08) | `/api/agents/video` | Tạo script video, tối ưu thumbnail |
| **SEOAgent** (09) | `/api/agents/seo` | Tạo bài SEO, tối ưu keywords |
| **TrendPredictorAgent** (10) | `/api/agents/trend-predictor` | Dự đoán xu hướng 7-30 ngày |
| **PriceAgent** (11) | `/api/agents/price` | Định giá động theo competitor |
| **SegmentationAgent** (12) | — | Phân khúc khách hàng tự động |
| **EmailAgent** (13) | — | Email marketing automation |
| **TelegramAgent** (14) | — | Thông báo Telegram tự động |
| **ReviewAgent** (15) | — | Quản lý và phân tích review sản phẩm |

#### Nhóm V3 — CRM (4 agents)

| Agent | Endpoint | Chức năng |
|---|---|---|
| **PublisherAgent** (04) | `/api/agents/publisher` | Đăng bài tự động đa nền tảng |
| **LeadHunterAgent** (05) | `/api/agents/lead-hunter` | Tìm kiếm & chấm điểm leads mới |
| **CRMAgent** (07) | `/api/agents/crm` | Follow-up khách hàng tự động |
| **KnowledgeAgent** (15) | `/api/agents/knowledge` | Học từ lịch sử, cập nhật knowledge base |

#### Nhóm V4 — Market (4 agents)

| Agent | Endpoint | Chức năng |
|---|---|---|
| **VideoOptimizerAgent** (17) | `/api/agents/video-optimizer` | SEO video TikTok, YouTube — title/tag/description |
| **CompetitorMonitorAgent** (18) | `/api/agents/competitor-monitor` | Giám sát giá đối thủ, alert khi thay đổi |
| **DemandForecasterAgent** (19) | `/api/agents/demand-forecaster` | Dự báo nhu cầu theo mùa, inventory planning |
| **RepricingAgent** (20) | `/api/agents/repricing` | Tự động điều chỉnh giá theo đối thủ |

#### Nhóm V5 — Enterprise (4 agents)

| Agent | Endpoint | Chức năng |
|---|---|---|
| **MarketplaceOptimizerAgent** (21) | `/api/agents/marketplace-optimizer` | Tối ưu ranking trên Shopee/Lazada/TikTok |
| **MobileEngagementAgent** (22) | `/api/agents/mobile-engagement` | Push notification, D7/D30 retention |
| **EnterpriseHealthAgent** (23) | `/api/agents/enterprise-health` | SLA monitoring, tenant health checks |
| **WhitelabelOnboardingAgent** (24) | `/api/agents/whitelabel-onboarding` | Automated client onboarding |

### Agent Logs

Mọi hoạt động của agent đều được ghi vào `agent_logs`:
```
{
  agent: "trend",          // AgentName enum
  status: "success|failed|running",
  input: {},               // Input data
  output: {},              // Output/result
  tokensUsed: 1250,        // AI tokens tiêu thụ
  cost: 0.000250,          // Chi phí AI ($)
  durationMs: 2340,        // Thời gian chạy (ms)
  createdAt: "..."
}
```

---

## 17. MARKETPLACE ĐA SÀN

### Sàn hỗ trợ

- **Shopee** — OAuth callback, sync sản phẩm
- **Lazada** — OAuth callback, affiliate links
- **TikTok Shop** — OAuth callback, video commerce

### Endpoints

| Method | URL | Mô tả |
|---|---|---|
| `GET` | `/api/marketplace/status` | Kết nối hiện tại với các sàn |
| `GET` | `/api/marketplace/trending` | Sản phẩm trending trên các sàn |
| `GET` | `/api/marketplace/search` | Tìm kiếm đa sàn |
| `POST` | `/api/marketplace/affiliate-link` | Tạo affiliate link có tracking |
| `POST` | `/api/marketplace/best-affiliate` | Tìm affiliate deal tốt nhất |
| `GET` | `/api/marketplace/shopee/oauth/callback` | OAuth Shopee |
| `GET` | `/api/marketplace/lazada/oauth/callback` | OAuth Lazada |
| `GET` | `/api/marketplace/tiktok/oauth/callback` | OAuth TikTok |

### Cách kết nối marketplace

```bash
# 1. Điền credentials trong .env
SHOPEE_APP_ID=xxxxx
SHOPEE_APP_SECRET=xxxxx

# 2. Redirect user đến OAuth URL của sàn
# 3. Sàn redirect về callback → hệ thống lưu token tự động
```

```http
# Tạo affiliate link với UTM tracking
POST /api/marketplace/affiliate-link
{
  "productUrl": "https://shopee.vn/...",
  "platform": "shopee",
  "campaign": "flash-sale-june",
  "medium": "facebook"
}

# Tìm affiliate tốt nhất cho sản phẩm
POST /api/marketplace/best-affiliate
{ "productName": "Áo thun cotton", "category": "fashion" }
```

---

## 18. INBOX HỢP NHẤT — OMNICHANNEL

Gộp tất cả kênh giao tiếp (Facebook, Telegram, Web Chat) vào một giao diện quản lý.

### Endpoints

#### Facebook Messenger
```http
# Verify webhook (Facebook gọi khi setup)
GET /api/inbox/facebook/webhook?hub.verify_token=xxx&hub.challenge=yyy

# Nhận tin nhắn từ Facebook (Facebook tự gọi)
POST /api/inbox/facebook/webhook

# Trả lời khách hàng trên Facebook
POST /api/inbox/facebook/reply/conversation-uuid
{ "message": "Xin chào! Chúng tôi có thể hỗ trợ bạn..." }
```

#### Telegram Bot
```http
# Đăng ký webhook Telegram
POST /api/inbox/telegram/register-webhook
{ "botToken": "xxx:yyy", "webhookUrl": "https://yourapi.com/api/inbox/telegram/webhook" }

# Nhận update từ Telegram (Telegram tự gọi)
POST /api/inbox/telegram/webhook

# Trả lời qua Telegram
POST /api/inbox/telegram/reply/conversation-uuid
{ "message": "Chào bạn..." }
```

#### Web Chat (Embed vào website)
```http
# Tạo session chat (khi khách vào web)
POST /api/inbox/webchat/session
{ "visitorName": "Khách", "pageUrl": "https://..." }
# Response: { "sessionId": "uuid", "token": "..." }

# Khách gửi tin nhắn
POST /api/inbox/webchat/message
{ "sessionId": "uuid", "message": "Cho hỏi giá áo?" }

# Nhân viên trả lời
POST /api/inbox/webchat/reply/conversation-uuid
{ "message": "Giá áo thun cotton là 250.000₫ bạn nhé..." }

# Lịch sử chat
GET /api/inbox/webchat/conversation-uuid/messages
```

#### Unified Management
```http
# Tất cả hội thoại (tất cả kênh)
GET /api/inbox

# Thống kê inbox
GET /api/inbox/stats

# Chi tiết hội thoại
GET /api/inbox/uuid

# Phân công nhân viên
PATCH /api/inbox/uuid/assign
{ "staffId": "staff-uuid" }

# Đóng hội thoại
PATCH /api/inbox/uuid/resolve
{ "resolution": "Đã tư vấn và chốt đơn" }

# Gộp với hồ sơ khách hàng
PATCH /api/inbox/uuid/merge-customer
{ "customerId": "customer-uuid" }
```

### Setup Facebook Webhook

1. Vào Facebook Developers → App → Messenger → Webhooks
2. Webhook URL: `https://yourdomain.com/api/inbox/facebook/webhook`
3. Verify Token: giá trị trong `.env` `FACEBOOK_VERIFY_TOKEN`
4. Subscribe: `messages`, `messaging_postbacks`

### Setup Telegram Bot

```http
POST /api/inbox/telegram/register-webhook
{
  "botToken": "123456:ABC...",
  "webhookUrl": "https://yourdomain.com/api/inbox/telegram/webhook"
}
```

---

## 19. AI CHAT & ADMIN ASSISTANT

### Chat AI tích hợp hệ thống

```http
# Tạo session chat mới
POST /api/chat/sessions
{ "userId": "optional-uuid" }
# Response: { "sessionId": "uuid", "title": "New Chat" }

# Gửi tin nhắn và nhận phản hồi AI
POST /api/chat/sessions/session-uuid/message
{ "message": "Hôm nay bán được bao nhiêu đơn?" }
# AI trả lời dựa trên dữ liệu thực tế

# Streaming response (Server-Sent Events)
GET /api/chat/sessions/session-uuid/stream

# Xem lịch sử hội thoại
GET /api/chat/sessions/session-uuid/context

# Danh sách sessions
GET /api/chat/sessions

# Xoá session
DELETE /api/chat/sessions/session-uuid
```

### Admin AI Query (hỏi về dữ liệu hệ thống)

```http
# Hỏi AI về bất kỳ dữ liệu nào
POST /api/chat/admin/query
{ "query": "Tháng này doanh thu bao nhiêu so với tháng trước?" }

# KPI tức thì qua AI
GET /api/chat/admin/kpi

# AI Chat trực tiếp (không cần session)
POST /api/ai/chat
{
  "messages": [
    { "role": "user", "content": "Sản phẩm nào đang hot?" }
  ]
}

# Kiểm tra kết nối AI
GET /api/ai/health
```

### Context window

AI chat giữ **20 tin nhắn gần nhất** trong context để duy trì tính liên tục của cuộc trò chuyện.

System prompt:
> "Bạn là AI Assistant của AI Commerce OS. Trả lời ngắn gọn, chính xác bằng tiếng Việt."

---

## 20. KHO HÀNG & NHÀ CUNG CẤP

### Inventory

```http
# Kiểm tra tồn kho sản phẩm
GET /api/inventory/product/product-uuid

# Điều chỉnh tồn kho
POST /api/inventory/adjust
{
  "productId": "uuid",
  "quantity": -5,
  "reason": "Đơn hàng #123 giao thành công",
  "type": "SALE"
}

# Danh sách sắp hết hàng (< 10 items)
GET /api/inventory/low-stock

# Giá trị tổng tồn kho
GET /api/inventory/value
```

### Suppliers (Nhà cung cấp)

```http
# Danh sách nhà cung cấp
GET /api/suppliers

# Tạo nhà cung cấp
POST /api/suppliers
{
  "name": "Công ty A",
  "contactName": "Nguyễn Văn A",
  "email": "a@company.vn",
  "phone": "028...",
  "address": "HCM",
  "paymentTerms": "NET30",
  "leadTimeDays": 7
}

# Sản phẩm của nhà cung cấp
GET /api/suppliers/uuid/products
```

---

## 21. DROPSHIP & AFFILIATE

### Dropship

```http
# Sản phẩm dropship có sẵn
GET /api/dropship/products

# Thêm sản phẩm dropship
POST /api/dropship/products
{
  "name": "Áo thun supplier",
  "supplierPrice": 150000,
  "retailPrice": 280000,
  "supplierId": "uuid",
  "supplierSku": "SP-001"
}

# Tạo đơn dropship (tự động gửi cho supplier)
POST /api/dropship/orders
{
  "productId": "uuid",
  "quantity": 5,
  "shippingAddress": { "name": "...", "phone": "...", "address": "..." },
  "customerOrderId": "uuid"
}

# Cập nhật trạng thái đơn dropship
PUT /api/dropship/orders/uuid/status
{ "status": "shipped", "trackingNumber": "VN..." }
```

### Affiliate Portal

```http
# Danh sách đối tác affiliate
GET /api/affiliate-portal/partners

# Thống kê tổng quan
GET /api/affiliate-portal/partners/stats

# Thống kê từng đối tác
GET /api/affiliate-portal/partners/partner-uuid/stats

# Tạo đối tác mới
POST /api/affiliate-portal/partners
{
  "name": "KOL Nguyễn Văn X",
  "email": "x@gmail.com",
  "commissionRate": 0.1,  // 10%
  "channels": ["tiktok", "instagram"]
}

# Duyệt đối tác
PUT /api/affiliate-portal/partners/uuid/approve

# Tạm dừng đối tác
PUT /api/affiliate-portal/partners/uuid/suspend

# Ghi nhận click từ affiliate link
POST /api/affiliate-portal/clicks
{
  "partnerId": "uuid",
  "productId": "uuid",
  "source": "tiktok",
  "ip": "..."
}

# Danh sách conversions (đơn hàng từ affiliate)
GET /api/affiliate-portal/conversions
```

---

## 22. ENTERPRISE & WHITE LABEL

### Enterprise (Multi-tenant SaaS)

```http
# Danh sách tenants
GET /api/enterprise

# Thống kê tổng quan tenants
GET /api/enterprise/stats

# Tạo tenant mới
POST /api/enterprise
{
  "name": "Chuỗi cửa hàng ABC",
  "plan": "enterprise",
  "slaTarget": 99.5,
  "maxUsers": 50,
  "domain": "abc.yourplatform.com"
}

# Cập nhật uptime (tự động từ monitoring)
PATCH /api/enterprise/uuid/uptime
{ "uptimePercent": 99.8 }

# Thông tin tenant
GET /api/enterprise/uuid

# Cập nhật tenant
PATCH /api/enterprise/uuid
{ "status": "active", "plan": "enterprise_plus" }
```

### White Label (Nền tảng nhãn trắng)

```http
# Danh sách white label clients
GET /api/white-label

# Tạo white label client mới
POST /api/white-label
{
  "clientName": "Shop Thời Trang XYZ",
  "contactEmail": "xyz@email.com",
  "brandName": "XYZ Fashion",
  "primaryColor": "#FF6B35",
  "domain": "xyz-fashion.com",
  "plan": "standard"
}

# Cập nhật thông tin
PATCH /api/white-label/uuid
{ "status": "active", "brandLogo": "https://..." }

# Hoàn tất onboarding (trigger Agent tự động setup)
POST /api/white-label/uuid/complete-onboarding
```

### Mobile (App Analytics)

```http
# Thống kê mobile
GET /api/mobile/stats

# D7/D30/D90 Retention
GET /api/mobile/retention

# Bắt đầu mobile session
POST /api/mobile/session
{
  "deviceId": "device-uuid",
  "userId": "optional",
  "platform": "ios|android",
  "appVersion": "2.0.1"
}

# Kết thúc session
PATCH /api/mobile/session/session-id/end
{ "duration": 180 }
```

---

## 23. MOBILE & NOTIFICATIONS

### Push Notification (MobileEngagementAgent)

Agent MobileEngagement (22) tự động gửi push notifications:

```
- D7 Retention: Sau 7 ngày không mở app → gửi "Ưu đãi chỉ dành cho bạn"
- D30 Re-engagement: Sau 30 ngày → "Chúng tôi nhớ bạn"
- New Product Alert: Sản phẩm mới phù hợp với sở thích
- Order Status: Cập nhật trạng thái đơn hàng
- Birthday Coupon: Coupon sinh nhật
```

### Notifications Table

Hệ thống lưu tất cả notifications vào bảng `notifications`:
```
{
  userId: "uuid",
  type: "push|email|telegram|sms",
  title: "Đơn hàng #123 đã được giao",
  body: "...",
  isRead: false,
  data: {}
}
```

---

## 24. WEBSOCKET REALTIME

### Kết nối

```javascript
// Client-side (JavaScript)
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  path: '/ws',
  auth: { token: 'Bearer eyJ...' }
});
```

### Rooms (Phòng sự kiện)

```javascript
// Tham gia phòng để nhận sự kiện
socket.emit('join', 'dashboard');  // KPI + orders + leads
socket.emit('join', 'orders');     // Chỉ đơn hàng mới
socket.emit('join', 'leads');      // Chỉ leads mới
socket.emit('join', 'agents');     // Agent updates

// Rời phòng
socket.emit('leave', 'orders');
```

### Sự kiện nhận

```javascript
// Đơn hàng mới
socket.on('new_order', (order) => {
  console.log('Đơn mới:', order.id, order.total);
});

// Lead mới
socket.on('new_lead', (lead) => {
  console.log('Lead:', lead.name, lead.phone, lead.platform);
});

// Agent hoàn thành task
socket.on('agent_update', ({ agent, status, data }) => {
  console.log(`Agent ${agent}: ${status}`);
});

// KPI cập nhật realtime
socket.on('kpi_update', (kpi) => {
  console.log('Revenue hôm nay:', kpi.todayRevenue);
});

// Notification cá nhân
socket.on('notification', ({ message, type }) => {
  showNotification(message, type); // 'info' | 'warning' | 'error'
});

// Chat message (realtime chat)
socket.on('chat_message', (message) => {
  appendMessage(message);
});
```

### Tham gia phòng cá nhân

```javascript
// Nhận notification riêng theo user
socket.emit('join', `user:${userId}`);

// Nhận realtime chat session
socket.emit('join', `chat:${sessionId}`);
```

---

## 25. MONITORING & OBSERVABILITY

### Prometheus Metrics

URL: `http://localhost:9090`

Metrics được thu thập:
- HTTP request rate, latency
- Node.js memory/CPU
- Database connection pool
- Custom business metrics (agent runs, orders, revenue)

### Grafana Dashboard

URL: `http://localhost:3003` (admin/admin)

Dashboard có sẵn:
- API Performance (request rate, latency, error rate)
- Business Metrics (orders, revenue, leads)
- AI Agent Performance (runs, success rate, cost)
- Infrastructure (CPU, Memory, DB connections)

### Loki Log Aggregation

URL: `http://localhost:3100`

Tìm logs trong Grafana → Explore → Loki:
```
{job="api"} |= "error"           # Tìm lỗi
{job="api"} |= "agent"           # Logs agent
{job="api"} |= "Master Agent"    # Logs master agent
```

### Uptime Kuma

URL: `http://localhost:3002`

Theo dõi uptime của:
- API endpoint (health check)
- Database
- Redis
- Qdrant

### Health Check API

```http
# Kiểm tra AI model có hoạt động không
GET /api/ai/health
# Response: { "status": "ok", "model": "qwen2.5:7b", "latencyMs": 234 }
```

---

## 26. GIAO DIỆN FRONTEND

### 28 Trang Quản Trị

Truy cập tại `http://localhost:3004`

| Route | Trang | Chức năng chính |
|---|---|---|
| `/` | **Dashboard** | KPI tổng quan, charts realtime |
| `/ai-board` | **AI Board** | 7 AI Executives + Daily Meeting |
| `/business-os` | **Business OS** | Funnel, KPI, Priorities, Reports |
| `/knowledge-brain` | **Knowledge Brain** | 5 domains, Ask AI, Ingest |
| `/self-improvement` | **Self-Improvement** | Scorecard, Loop, Experiments |
| `/agents` | **AI Agents** | Danh sách & trạng thái 25 agents |
| `/analytics` | **Analytics** | Revenue, Leads, Customers, Forecast |
| `/reports` | **Reports** | Daily/Weekly reports |
| `/orders` | **Đơn hàng** | CRUD, fulfillment, bulk update |
| `/products` | **Sản phẩm** | Quản lý products + variants |
| `/customers` | **Khách hàng** | CRM + Health Score + Loyalty |
| `/leads` | **Leads** | Capture, Classify, Route, CRM sync |
| `/campaigns` | **Chiến dịch** | Marketing campaigns + A/B test |
| `/payments` | **Thanh toán** | VNPay, MoMo, COD |
| `/inventory` | **Kho hàng** | Tồn kho, Low stock alerts |
| `/marketplace` | **Sàn TMĐT** | Shopee, Lazada, TikTok |
| `/inbox` | **Inbox** | Facebook, Telegram, WebChat |
| `/suppliers` | **Nhà cung cấp** | Quản lý suppliers |
| `/dropship` | **Dropship** | Sản phẩm & đơn dropship |
| `/affiliates` | **Affiliate** | Partner portal |
| `/enterprise` | **Enterprise** | Multi-tenant SaaS |
| `/white-label` | **White Label** | Client portal |
| `/mobile-metrics` | **Mobile** | App analytics, retention |
| `/brands` | **Thương hiệu** | Quản lý brands |
| `/categories` | **Danh mục** | Phân loại sản phẩm |
| `/users` | **Người dùng** | Quản lý accounts + roles |
| `/settings` | **Cài đặt** | Cấu hình hệ thống, integrations |
| `/login` | **Đăng nhập** | Auth page |

### Sidebar Navigation

Sidebar được định nghĩa trong [apps/web/src/components/Sidebar.tsx](apps/web/src/components/Sidebar.tsx) — các nhóm menu:
- **Autonomous AI** (AI Board, Business OS, Knowledge Brain, Self-Improvement)
- **Operations** (Dashboard, Analytics, Reports, Agents)
- **Commerce** (Products, Orders, Payments, Customers, Inventory)
- **Marketing** (Leads, Campaigns, Marketplace, Inbox)
- **Growth** (Suppliers, Dropship, Affiliates, Enterprise, White Label, Mobile)
- **Settings** (Users, Settings)

---

## 27. SWAGGER API DOCS

URL: **`http://localhost:3001/api/docs`**

Swagger UI có đầy đủ:
- Toàn bộ endpoints với description bằng tiếng Việt
- Request/Response schema
- Bearer token authentication
- Try it out — test API trực tiếp

Để test trong Swagger:
1. Vào `/api/docs`
2. Click **Authorize** (nút khoá)
3. Nhập: `Bearer <accessToken>`
4. Gọi bất kỳ endpoint nào

---

## 28. CẤU TRÚC DATABASE

### 50+ Entities chính

#### Nhóm Commerce

```sql
products          -- Sản phẩm (name, price, cost, sku, stock, categoryId, brandId)
product_variants  -- Biến thể (màu, size, giá riêng)
categories        -- Danh mục (tree structure với parentId)
brands            -- Thương hiệu
orders            -- Đơn hàng (total, status, shippingAddress, paymentMethod)
order_items       -- Chi tiết đơn (productId, quantity, price)
payments          -- Thanh toán (method, amount, status, gateway ref)
inventory         -- Tồn kho (productId, quantity, lowStockThreshold)
coupons           -- Mã giảm giá (code, type, value, minOrder, expiresAt)
```

#### Nhóm CRM

```sql
customers         -- Khách hàng (name, email, phone, tier, totalSpent, lastPurchaseAt)
customer_segments -- Phân khúc khách hàng
leads             -- Leads (name, phone, platform, status, score, assignedTo)
ai_memory         -- AI memory / chat history
ai_decisions      -- Quyết định AI (area, decision, outcome)
```

#### Nhóm Marketing & Content

```sql
campaigns         -- Chiến dịch marketing
email_campaigns   -- Email campaigns
contents          -- Nội dung (title, body, type, platform, status)
seo_articles      -- Bài SEO
video_jobs        -- Video generation jobs
```

#### Nhóm Agents & Operations

```sql
agent_logs        -- Log của tất cả agents (agent, status, input, output, cost, durationMs)
agent_configs     -- Cấu hình từng agent
workflows         -- n8n-style workflows
knowledge         -- Knowledge base (domain, tier, content, embedding)
```

#### Nhóm Marketplace & Distribution

```sql
suppliers         -- Nhà cung cấp
supplier_products -- Sản phẩm từ supplier
dropship_products -- Sản phẩm dropship
dropship_orders   -- Đơn hàng dropship
affiliates        -- Affiliate records
affiliate_partners -- Đối tác affiliate
affiliate_clicks  -- Click tracking
affiliate_conversions -- Conversion tracking
commissions       -- Hoa hồng
marketplace_vendors   -- Vendors trên marketplace
marketplace_disputes  -- Tranh chấp
```

#### Nhóm Enterprise V5

```sql
tenants           -- Enterprise tenants (plan, slaTarget, uptimePercent)
white_label_clients -- White label clients (brandName, domain, status)
mobile_sessions   -- Mobile app sessions (deviceId, platform, duration)
```

#### Nhóm Inbox

```sql
inbox_conversations -- Hội thoại (platform, status, assignedTo, customerId)
inbox_messages      -- Tin nhắn (role, content, timestamp)
```

#### Nhóm Autonomous V6

```sql
learning_cycles   -- Vòng lặp học hỏi (scope, phase, status, observations)
lessons_learned   -- Bài học (type, domain, lesson, confidence, applicability)
decision_memories -- Quyết định đã ra (area, decision, outcome, lesson)
experiments       -- Thí nghiệm A/B (hypothesis, control, variant, result)
performance_scorecards -- 7 health scores (revenueScore, profitScore, growthScore...)
price_alerts      -- Cảnh báo giá (productId, alertType, threshold)
revenue_snapshots -- Snapshot doanh thu theo ngày
audit_logs        -- Audit trail (entity, action, userId, before, after)
```

### Indexes quan trọng

```sql
-- Agent logs (query performance)
INDEX ON agent_logs (agent, createdAt)
INDEX ON agent_logs (status, createdAt)

-- Leads
INDEX ON leads (status, platform, createdAt)

-- Orders  
INDEX ON orders (status, customerId, createdAt)
```

---

## PHỤ LỤC — CÁC LỆNH THƯỜNG DÙNG

### Docker

```bash
# Xem trạng thái containers
docker compose ps

# Xem logs realtime
docker compose logs -f api
docker compose logs -f

# Restart dịch vụ
docker compose restart api

# Rebuild và restart
docker compose up -d --build api

# Dừng toàn bộ
docker compose down

# Dừng và xoá volumes (CẢNH BÁO: mất dữ liệu)
docker compose down -v
```

### Database

```bash
# Kết nối PostgreSQL
docker exec -it commerce_postgres psql -U commerce_user -d ai_commerce

# Xem tất cả bảng
\dt

# Xem cấu trúc bảng
\d orders

# Chạy migration
docker exec commerce_api npm run migration:run

# Tạo migration mới
docker exec commerce_api npm run migration:generate -- src/database/migrations/NewMigration
```

### Redis

```bash
# Kết nối Redis
docker exec -it commerce_redis redis-cli -a $REDIS_PASSWORD

# Xem tất cả keys
KEYS *

# Xem jobs trong queue
LRANGE bull:jobs:waiting 0 -1
```

### Ollama AI

```bash
# Xem models đã pull
docker exec commerce_ollama ollama list

# Pull model mới
docker exec commerce_ollama ollama pull qwen2.5:7b

# Test AI
docker exec commerce_ollama ollama run qwen2.5:7b "Xin chào!"
```

---

## PHỤ LỤC — TROUBLESHOOTING

### API không khởi động

```bash
# Kiểm tra logs
docker logs commerce_api --tail 50

# Thường gặp: database chưa ready
docker compose up -d postgres redis  # Khởi động infra trước
sleep 5
docker compose up -d api
```

### AI không phản hồi

```bash
# Kiểm tra Ollama
docker exec commerce_ollama ollama list

# Nếu không có model → pull lại
make pull-model

# Kiểm tra kết nối từ API
curl http://localhost:3001/api/ai/health
```

### Qdrant không kết nối

RAG Service tự động tắt khi Qdrant không kết nối — **app không crash**. Chỉ mất tính năng vector search.

```bash
# Restart Qdrant
docker compose restart qdrant

# Kiểm tra
curl http://localhost:6333/health
```

### Lỗi "Token đã hết hạn"

```javascript
// Frontend: tự động refresh token
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
});
const { accessToken } = await response.json();
localStorage.setItem('accessToken', accessToken);
```

### Rate limit bị chặn (429)

Giới hạn: **10 request/giây** hoặc **200 request/phút**

Giải pháp: Thêm delay hoặc dùng batch endpoints thay vì gọi nhiều lần.

---

*Tài liệu được tạo: 2026-06-16*
*Phiên bản hệ thống: V6 — Autonomous Company*
*Stack: NestJS + Next.js + PostgreSQL + Qdrant + Ollama + Docker*
