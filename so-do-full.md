# AI Commerce OS — Sơ đồ hệ thống đầy đủ

> **Stack:** NestJS API · Next.js 16 Web · 20 AI Agents · PostgreSQL · Redis · Qdrant · MinIO · Docker · PM2  
> **Phiên bản:** V3 · Multi-channel · Self-hosted VPS

---

## I. KIẾN TRÚC TỔNG QUAN

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            NGƯỜI DÙNG / BROWSER                              │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ HTTPS :443 / HTTP :80
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           NGINX REVERSE PROXY                                │
│                        nginx:alpine  (Port 80/443)                           │
│                                                                              │
│  /          → Web UI  (Next.js :3003)                                        │
│  /api/*     → NestJS API  (:3002)                                            │
│  /n8n/      → N8N Workflow  (:5678)                                          │
│  /minio/    → MinIO Console  (:9001)                                         │
│  /chat/     → Open WebUI  (:3000)                                            │
└───┬───────────────┬──────────────────────────────────────────────────────────┘
    │               │
    ▼               ▼
┌────────┐   ┌─────────────────────────────────────────────────────────────────┐
│NEXT.JS │   │                     NESTJS API  (Port 3002)                     │
│  WEB   │   │              apps/api/  — TypeScript · TypeORM                  │
│ :3003  │   │                   Swagger UI: /api/docs                         │
│        │◄──│   WebSocket Gateway (Socket.IO) — realtime events               │
│20 pages│   │   JWT Auth + RBAC (admin/manager/staff/viewer)                  │
└────────┘   └──────────────┬──────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────────┐
          ▼                  ▼                       ▼
    ┌──────────┐      ┌──────────┐           ┌──────────────┐
    │PostgreSQL│      │  Redis   │           │    Qdrant    │
    │  :5432   │      │  :6379   │           │  :6333/6334  │
    │ TypeORM  │      │ Cache/   │           │ Vector DB    │
    │ 30 tables│      │ Session  │           │ AI Memory    │
    └──────────┘      └──────────┘           └──────────────┘
          ▼
    ┌──────────┐      ┌──────────┐           ┌──────────────┐
    │  MinIO   │      │  Ollama  │           │     N8N      │
    │  :9000   │      │  :11434  │           │   :5678      │
    │  S3 File │      │  LLM AI  │           │  Workflow    │
    │ Storage  │      │(qwen2.5) │           │ Automation   │
    └──────────┘      └──────────┘           └──────────────┘
```

---

## II. FRONTEND — NEXT.JS 16 WEB

```
apps/web/  (Port 3003 — PM2: commerce-web)
│
├── src/app/
│   ├── (dashboard)/          ← Route group có layout sidebar
│   │   ├── page.tsx          → /         Dashboard KPI tổng quan
│   │   ├── products/         → /products  Quản lý sản phẩm
│   │   ├── orders/           → /orders    Quản lý đơn hàng
│   │   ├── customers/        → /customers Quản lý khách hàng
│   │   ├── leads/            → /leads     Leads & tiềm năng
│   │   ├── categories/       → /categories Danh mục
│   │   ├── brands/           → /brands    Thương hiệu
│   │   ├── inventory/        → /inventory Tồn kho
│   │   ├── payments/         → /payments  Thanh toán
│   │   ├── campaigns/        → /campaigns Chiến dịch marketing
│   │   ├── suppliers/        → /suppliers Nhà cung cấp
│   │   ├── dropship/         → /dropship  Dropshipping
│   │   ├── affiliates/       → /affiliates Affiliate portal
│   │   ├── marketplace/      → /marketplace Shopee/Lazada/TikTok
│   │   ├── agents/           → /agents    AI Agents dashboard
│   │   ├── analytics/        → /analytics Phân tích & báo cáo
│   │   ├── users/            → /users     Quản lý user (admin)
│   │   └── settings/         → /settings  Cài đặt logo/branding
│   ├── login/                → /login     Đăng nhập JWT
│   └── api/brand/upload/     → API upload logo (không cần rebuild)
│
├── src/components/
│   ├── Sidebar.tsx           ← Navigation sidebar responsive
│   ├── Logo.tsx              ← Logo động (fetch từ API, fallback emoji)
│   ├── PageHeader.tsx        ← Header mỗi trang
│   ├── DataTable.tsx         ← Bảng dữ liệu tái sử dụng
│   ├── StatCard.tsx          ← Card KPI
│   └── Modal.tsx             ← Modal dialog
│
├── src/config/brand.ts       ← Cấu hình tên/logo/màu toàn app
├── src/lib/auth.tsx          ← Context JWT + RBAC client
└── src/lib/api.ts            ← HTTP client gọi API
```

**Rewrite Proxy:** `/api/*` → `http://localhost:3002/api/*` (tránh CORS)

---

## III. BACKEND — NESTJS API

```
apps/api/  (Port 3002 — PM2: commerce-api)
│
├── src/modules/
│   │
│   ├── auth/                 JWT login · register · RBAC guard
│   ├── users/                CRUD users · phân quyền 4 role
│   │
│   ├── ── CORE COMMERCE ─────────────────────────────────────
│   ├── products/             CRUD sản phẩm · slug · search
│   ├── categories/           Danh mục · cây phân cấp
│   ├── brands/               Thương hiệu
│   ├── orders/               Đơn hàng · trạng thái · items
│   ├── customers/            Khách hàng · lịch sử mua
│   ├── leads/                Leads · phễu bán hàng
│   ├── inventory/            Tồn kho · cảnh báo
│   ├── payments/             Thanh toán · đối soát
│   ├── campaigns/            Chiến dịch marketing
│   │
│   ├── ── PORTALS ────────────────────────────────────────────
│   ├── suppliers/            Nhà cung cấp + supplier-products
│   ├── dropship/             Đơn dropship · tự động đặt hàng
│   ├── affiliate-portal/     Affiliate đăng ký · theo dõi
│   ├── marketplace/          Sync Shopee · Lazada · TikTok Shop
│   │   ├── shopee.service    Shopee Open API
│   │   ├── lazada.service    Lazada API
│   │   └── tiktok.service    TikTok Shop API
│   │
│   ├── ── AI & DATA ──────────────────────────────────────────
│   ├── ai/                   Chat với Ollama (qwen2.5:7b)
│   ├── ai-memory/            Lưu/truy vấn memory AI (Qdrant)
│   ├── rag/                  Retrieval-Augmented Generation
│   ├── affiliate-intelligence/ Phân tích hiệu quả affiliate AI
│   ├── content-factory/      Sinh nội dung hàng loạt
│   ├── analytics/            KPI · doanh thu · báo cáo
│   ├── workflows/            N8N workflow triggers
│   │
│   ├── gateway/              WebSocket (Socket.IO) realtime
│   │
│   └── agents/               ── 20 AI AGENTS ────────────────
│       ├── master/           Điều phối toàn bộ agents (Cron 1h)
│       ├── trend/            Phân tích xu hướng thị trường
│       ├── trend-predictor/  Dự đoán xu hướng tương lai
│       ├── content/          Sinh nội dung sản phẩm tự động
│       ├── publisher/        Đăng bài đa kênh tự động
│       ├── seo/              Tối ưu SEO · sinh bài viết
│       ├── video/            Tạo video sản phẩm
│       ├── video-optimizer/  Tối ưu video cho từng nền tảng
│       ├── price/            Giám sát giá đối thủ
│       ├── repricing/        Tự động điều chỉnh giá
│       ├── competitor-monitor/ Theo dõi đối thủ cạnh tranh
│       ├── crm/              Chăm sóc khách hàng tự động
│       ├── lead-hunter/      Săn leads từ mạng xã hội
│       ├── sales/            Tự động hóa quy trình bán hàng
│       ├── affiliate/        Quản lý affiliate tự động
│       ├── demand-forecaster/ Dự báo nhu cầu tồn kho
│       ├── segmentation/     Phân khúc khách hàng AI
│       ├── knowledge/        Đồng bộ knowledge base
│       ├── email/            Email marketing tự động
│       └── telegram/         Thông báo Telegram
│
├── src/database/
│   └── entities/             30 TypeORM entities
│       ├── user, product, category, brand
│       ├── order, order-item, customer, lead
│       ├── inventory, payment, campaign
│       ├── supplier, supplier-product
│       ├── dropship-order, dropship-product
│       ├── affiliate, affiliate-partner
│       ├── affiliate-click, affiliate-conversion, commission
│       ├── content, seo-article, video-job
│       ├── email-campaign, workflow
│       ├── agent-config, agent-log
│       ├── ai-memory, knowledge, price-alert
│       └── (n8n sử dụng schema riêng)
│
└── src/main.ts               Bootstrap · Swagger · CORS · Validation
```

---

## IV. 20 AI AGENTS — CHI TIẾT

| # | Agent | Cron | Chức năng |
|---|-------|------|-----------|
| 1 | **Master Agent** | Mỗi 1 giờ | Điều phối toàn bộ agents, đánh giá KPI, phân công tác vụ |
| 2 | **Trend Agent** | Thủ công/Cron | Phân tích xu hướng sản phẩm đang hot trên thị trường |
| 3 | **Trend Predictor** | Cron | Dự đoán xu hướng 7-30 ngày tới bằng AI |
| 4 | **Content Agent** | Cron | Sinh mô tả sản phẩm, bài đăng MXH bằng Ollama LLM |
| 5 | **Publisher Agent** | Cron | Tự động đăng bài lên Shopee/Lazada/TikTok/Facebook |
| 6 | **SEO Agent** | Cron | Tạo bài viết SEO, tối ưu từ khoá, meta tags |
| 7 | **Video Agent** | Thủ công | Tạo script video sản phẩm từ mô tả |
| 8 | **Video Optimizer** | Cron | Tối ưu video cho từng nền tảng (tỉ lệ, caption) |
| 9 | **Price Agent** | Cron | Theo dõi giá sản phẩm tương tự trên thị trường |
| 10 | **Repricing Agent** | Cron | Tự động điều chỉnh giá bán theo chiến lược |
| 11 | **Competitor Monitor** | Cron | Giám sát hoạt động của đối thủ cạnh tranh |
| 12 | **CRM Agent** | Cron | Gửi tin nhắn chăm sóc, nhắc nhở, upsell khách hàng |
| 13 | **Lead Hunter** | Cron | Tìm kiếm leads mới từ mạng xã hội & marketplace |
| 14 | **Sales Agent** | Cron | Tự động hóa pipeline bán hàng, follow-up |
| 15 | **Affiliate Agent** | Cron | Tính hoa hồng, phân tích hiệu quả affiliate |
| 16 | **Demand Forecaster** | Cron | Dự báo nhu cầu để cảnh báo tồn kho |
| 17 | **Segmentation Agent** | Cron | Phân khúc khách hàng theo hành vi mua |
| 18 | **Knowledge Agent** | Thủ công | Đồng bộ dữ liệu vào Qdrant vector DB |
| 19 | **Email Agent** | Cron | Gửi email marketing hàng loạt |
| 20 | **Telegram Agent** | Event | Thông báo đơn hàng, cảnh báo, KPI qua Telegram |

---

## V. DATABASE LAYER

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 17  (Port 5432)                        │
│                    Volume: postgres_data                             │
│                                                                      │
│  Schema: ai_commerce                                                 │
│                                                                      │
│  ┌─── COMMERCE ──────────────────────────────────────────────────┐  │
│  │ products · categories · brands · inventory · price_alerts      │  │
│  │ orders · order_items · payments                                │  │
│  │ customers · leads                                              │  │
│  │ campaigns · email_campaigns                                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── PORTALS ───────────────────────────────────────────────────┐  │
│  │ suppliers · supplier_products                                  │  │
│  │ dropship_orders · dropship_products                            │  │
│  │ affiliates · affiliate_partners                                │  │
│  │ affiliate_clicks · affiliate_conversions · commissions         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── AI & CONTENT ──────────────────────────────────────────────┐  │
│  │ contents · seo_articles · video_jobs                           │  │
│  │ agent_configs · agent_logs                                     │  │
│  │ ai_memories · knowledge_base                                   │  │
│  │ workflows                                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── N8N (schema riêng) ────────────────────────────────────────┐  │
│  │ n8n workflow data (DB: n8n)                                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│   Redis 7       │  │  Qdrant latest  │  │      MinIO latest       │
│   Port 6379     │  │  Port 6333/6334 │  │  Port 9000 (API)        │
│                 │  │                 │  │  Port 9001 (Console)    │
│  • Cache API    │  │  • Vector DB    │  │                         │
│  • Session JWT  │  │  • AI Memory    │  │  • Ảnh sản phẩm         │
│  • Rate limit   │  │  • RAG search   │  │  • Video                │
│  • Pub/Sub      │  │  • Embeddings   │  │  • File upload          │
│                 │  │  • Similarity   │  │  • S3-compatible API    │
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
```

---

## VI. AI ENGINE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Ollama  (Port 11434)                              │
│                    Model: qwen2.5:7b                                 │
│                    Volume: ollama_data                               │
│                                                                      │
│  Được gọi bởi:                                                       │
│  ├── AI Module        → /api/ai/chat  (chat trực tiếp)              │
│  ├── Content Agent    → Sinh mô tả sản phẩm                         │
│  ├── SEO Agent        → Sinh bài viết SEO                           │
│  ├── CRM Agent        → Sinh tin nhắn chăm sóc KH                  │
│  ├── Lead Hunter      → Phân tích và phân loại leads                │
│  └── RAG Module       → Trả lời dựa trên knowledge base            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                 Open WebUI  (Port 3000 → Nginx /chat/)              │
│                 Chat UI cho Ollama models                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## VII. WORKFLOW AUTOMATION — N8N

```
┌─────────────────────────────────────────────────────────────────────┐
│                    N8N  (Port 5678 → Nginx /n8n/)                   │
│                    DB: PostgreSQL (n8n schema)                       │
│                    Volume: n8n_data                                  │
│                                                                      │
│  Triggers nhận từ NestJS API:                                        │
│  POST /api/workflows/trigger/:workflowId                             │
│                                                                      │
│  Use cases:                                                          │
│  ├── Đơn hàng mới → Gửi email xác nhận → Cập nhật tồn kho          │
│  ├── Lead mới → Gửi tin nhắn chào hàng → Tạo task follow-up        │
│  ├── Tồn kho thấp → Thông báo Telegram → Tạo PO tự động            │
│  ├── Agent hoàn thành → Trigger agent tiếp theo                     │
│  └── Shopee/Lazada webhook → Sync đơn hàng về hệ thống             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## VIII. MONITORING STACK

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MONITORING                                    │
│                                                                      │
│  ┌──────────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │   Prometheus     │    │    Grafana       │    │     Loki      │  │
│  │   Port 9090      │───►│    Port 3003     │◄───│   Port 3100   │  │
│  │                  │    │                  │    │               │  │
│  │  Scrape metrics: │    │  Dashboards:     │    │  Log aggre-   │  │
│  │  • NestJS API    │    │  • API metrics   │    │  gation từ    │  │
│  │  • Node exporter │    │  • System health │    │  tất cả       │  │
│  │  • Postgres      │    │  • Agent KPI     │    │  services     │  │
│  │  • Redis         │    │  • Business KPI  │    │               │  │
│  └──────────────────┘    └─────────────────┘    └───────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Uptime Kuma  (Port 3002)                         │   │
│  │  Monitor: API · Web · PostgreSQL · Redis · MinIO · Ollama    │   │
│  │  Alert: Telegram / Email khi service down                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## IX. CI/CD PIPELINE

```
Developer
    │
    │  git push origin main
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GitHub Repository                                  │
│           https://github.com/hqdubmt/WEBBANHANG                     │
│                                                                      │
│  .github/workflows/deploy.yml                                        │
│  Trigger: push to main / workflow_dispatch                           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│              GitHub Actions — Self-hosted Runner (VPS)               │
│                                                                      │
│  JOB 1: 🐳 Build & Push Docker Hub (~5 phút)                        │
│  ├── git pull origin main                                            │
│  ├── docker build → hqdu/webbanhang-api:<sha> + :latest             │
│  ├── docker push → Docker Hub                                        │
│  ├── docker build → hqdu/webbanhang-web:<sha> + :latest             │
│  └── docker push → Docker Hub                                        │
│                                                                      │
│  JOB 2: 🚀 Deploy VPS (~44 giây)  [needs: docker]                  │
│  ├── tạo .env từ GitHub Secret PROD_ENV                             │
│  ├── npm ci + npm run build (NestJS → dist/)                        │
│  ├── npm ci + npm run build (Next.js → .next/)                      │
│  ├── pm2 restart commerce-api --update-env                           │
│  ├── pm2 restart commerce-web --update-env                           │
│  └── curl health check :3002/health                                  │
│                                                                      │
│  JOB 3: 📣 Telegram Notify  [needs: docker + deploy, if: always]   │
│  └── gửi kết quả + image tag + commit info qua Telegram Bot         │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌──────────────────────┐
│   Docker Hub     │      │   VPS Ubuntu         │
│  hqdu/webbanhang │      │  PM2 commerce-api    │
│  -api:latest     │      │  PM2 commerce-web    │
│  -web:latest     │      │  (cập nhật live)     │
└──────────────────┘      └──────────────────────┘
```

**GitHub Secrets cần thiết:**

| Secret | Dùng cho |
|--------|----------|
| `PROD_ENV` | Toàn bộ nội dung file `.env` |
| `DOCKERHUB_USERNAME` | `hqdu` |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `TELEGRAM_BOT_TOKEN` | Bot Telegram thông báo |
| `TELEGRAM_CHAT_ID` | Chat ID nhận thông báo |

---

## X. PROCESS MANAGEMENT — PM2

```
VPS Ubuntu  (/home/hqdu/quangdu/webbanhang/)
│
├── PM2 Processes:
│   ├── commerce-api  (ID: 2)
│   │   ├── cwd:    apps/api/
│   │   ├── script: dist/main.js
│   │   ├── port:   3002
│   │   ├── memory: max 512MB
│   │   └── logs:   logs/api-out.log · logs/api-error.log
│   │
│   └── commerce-web  (ID: 3)
│       ├── cwd:    apps/web/
│       ├── script: node_modules/.bin/next start -p 3003
│       ├── port:   3003
│       ├── memory: max 512MB
│       └── logs:   logs/web-out.log · logs/web-error.log
│
└── Docker Containers (services):
    ├── commerce_postgres    :5432
    ├── commerce_redis       :6379
    ├── commerce_minio       :9000/:9001
    ├── commerce_qdrant      :6333/:6334
    ├── commerce_n8n         :5678
    ├── commerce_ollama      :11434
    ├── commerce_open_webui  :3000
    ├── commerce_nginx       :80/:443
    ├── commerce_prometheus  :9090
    ├── commerce_grafana     :3003
    ├── commerce_loki        :3100
    └── commerce_uptime_kuma :3002
```

---

## XI. API ENDPOINTS ĐẦY ĐỦ

### Auth
```
POST   /api/auth/login
POST   /api/auth/register
```

### Core Commerce
```
GET|POST          /api/products
GET|PATCH|DELETE  /api/products/:id

GET|POST          /api/categories
GET|PATCH|DELETE  /api/categories/:id

GET|POST          /api/brands
GET|PATCH|DELETE  /api/brands/:id

GET|POST          /api/orders
GET|PATCH|DELETE  /api/orders/:id

GET|POST          /api/customers
GET|PATCH|DELETE  /api/customers/:id

GET|POST          /api/leads
GET|PATCH|DELETE  /api/leads/:id

GET|POST          /api/inventory
GET|PATCH         /api/inventory/:id

GET|POST          /api/payments
GET               /api/payments/:id

GET|POST          /api/campaigns
GET|PATCH|DELETE  /api/campaigns/:id
```

### Portals
```
GET|POST          /api/suppliers
GET|PATCH|DELETE  /api/suppliers/:id
GET|POST          /api/suppliers/:id/products

GET|POST          /api/dropship
GET|PATCH         /api/dropship/:id

GET|POST          /api/affiliates
GET|PATCH|DELETE  /api/affiliates/:id

GET               /api/marketplace/sync-all
POST              /api/marketplace/shopee/sync
POST              /api/marketplace/lazada/sync
POST              /api/marketplace/tiktok/sync
```

### AI & Analytics
```
POST   /api/ai/chat
POST   /api/ai/embed
GET    /api/analytics/kpi
GET    /api/analytics/revenue
GET    /api/analytics/products/top
GET    /api/analytics/customers/top
POST   /api/workflows/trigger/:workflowId
```

### AI Agents (20 agents)
```
POST   /api/agents/master/run
GET    /api/agents/master/kpi

POST   /api/agents/trend/run
POST   /api/agents/trend-predictor/run

POST   /api/agents/content/run
POST   /api/agents/publisher/run
POST   /api/agents/seo/run

POST   /api/agents/video/run
POST   /api/agents/video-optimizer/run

POST   /api/agents/price/run
POST   /api/agents/repricing/run
POST   /api/agents/competitor-monitor/run

POST   /api/agents/crm/run
POST   /api/agents/lead-hunter/run
POST   /api/agents/sales/run
POST   /api/agents/affiliate/run

POST   /api/agents/demand-forecaster/run
POST   /api/agents/knowledge/sync

GET    /api/agents/logs
GET    /api/agents/logs/:agent
```

### Users & Settings
```
GET|POST          /api/users
GET|PATCH|DELETE  /api/users/:id

GET    /api/brand/upload
POST   /api/brand/upload   (multipart/form-data)
DELETE /api/brand/upload
```

---

## XII. LUỒNG DỮ LIỆU CHÍNH

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LUỒNG ĐƠN HÀNG                                   │
│                                                                      │
│  Khách đặt hàng                                                      │
│      │                                                               │
│      ▼                                                               │
│  POST /api/orders  →  PostgreSQL (orders + order_items)             │
│      │                                                               │
│      ├──► WebSocket → Thông báo realtime cho admin                  │
│      ├──► Inventory Service → Trừ tồn kho tự động                  │
│      ├──► N8N Workflow → Gửi email xác nhận                         │
│      └──► Telegram Agent → Push thông báo Telegram                  │
│                                                                      │
│  Khi tồn kho < ngưỡng:                                              │
│      └──► Demand Forecaster → Cảnh báo → Tạo PO                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    LUỒNG AI AGENT (Cron hàng giờ)                   │
│                                                                      │
│  Master Agent (0 * * * *)                                            │
│      │                                                               │
│      ├── Đánh giá KPI từ PostgreSQL (agent_logs)                    │
│      ├── Phân tích performance từng agent                            │
│      └── Dispatch tasks:                                             │
│              │                                                       │
│              ├──► Trend Agent → Phân tích xu hướng                  │
│              │        └──► Content Agent → Sinh content             │
│              │                   └──► Publisher → Đăng bài          │
│              │                                                       │
│              ├──► Price Agent → Check giá đối thủ                   │
│              │        └──► Repricing → Cập nhật giá bán             │
│              │                                                       │
│              ├──► Lead Hunter → Tìm leads mới                       │
│              │        └──► CRM Agent → Chăm sóc leads               │
│              │                                                       │
│              └──► Knowledge Agent → Sync Qdrant vector DB           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    LUỒNG MARKETPLACE SYNC                           │
│                                                                      │
│  Shopee / Lazada / TikTok Shop                                       │
│      │                                                               │
│      ├── Webhook → N8N → POST /api/marketplace/sync                 │
│      │                                                               │
│      └── Cron Sync:                                                  │
│              ├── Pull đơn hàng mới → tạo orders                     │
│              ├── Sync tồn kho hai chiều                              │
│              └── Push giá mới khi Repricing Agent thay đổi          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## XIII. CẤU TRÚC THƯ MỤC DỰ ÁN

```
webbanhang/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD GitHub Actions
│
├── apps/
│   ├── api/                    ← NestJS API
│   │   ├── src/
│   │   ├── dist/               ← Build output (git ignore)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                    ← Next.js Web
│       ├── src/
│       ├── .next/              ← Build output (git ignore)
│       ├── public/brand/       ← Logo upload directory
│       ├── Dockerfile
│       └── package.json
│
├── CI-CD/                      ← Tài liệu & script CI/CD
│   ├── SETUP.md
│   ├── setup-runner.sh
│   └── actions/                ← Workflow examples
│
├── database/                   ← Docker compose từng DB riêng lẻ
├── monitoring/                 ← Prometheus + Grafana config
├── nginx/                      ← Nginx config + SSL
├── logs/                       ← PM2 logs (git ignore)
│
├── docker-compose.yml          ← Toàn bộ services
├── ecosystem.config.js         ← PM2 config
├── Makefile                    ← Shortcut commands
├── .env                        ← Secrets (git ignore)
├── .env.example                ← Template .env
└── so-do-full.md               ← File này
```

---

## XIV. PORTS & SERVICES TỔNG HỢP

| Service | Port | Truy cập | Ghi chú |
|---------|------|----------|---------|
| Nginx | 80 / 443 | Public | Reverse proxy chính |
| Next.js Web | 3003 | Qua Nginx `/` | PM2 |
| NestJS API | 3002 | Qua Nginx `/api/` | PM2 |
| PostgreSQL | 5432 | localhost only | Docker |
| Redis | 6379 | localhost only | Docker |
| MinIO API | 9000 | localhost only | Docker |
| MinIO Console | 9001 | Qua Nginx `/minio/` | Docker |
| Qdrant HTTP | 6333 | localhost only | Docker |
| Qdrant gRPC | 6334 | localhost only | Docker |
| N8N | 5678 | Qua Nginx `/n8n/` | Docker |
| Ollama | 11434 | localhost only | Docker |
| Open WebUI | 3000 | Qua Nginx `/chat/` | Docker |
| Prometheus | 9090 | localhost only | Docker |
| Grafana | 3003 | localhost only | Docker |
| Loki | 3100 | localhost only | Docker |
| Uptime Kuma | 3002 | localhost only | Docker |

---

*Cập nhật: 2026-06-11 · AI Commerce OS V3*
