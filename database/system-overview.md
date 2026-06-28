# AI Social Commerce OS V3 — Tổng quan hệ thống

> Cập nhật: 2026-06-25

---

## Kiến trúc tổng thể

```
Internet
  │
  ▼
Nginx (port 80/443)
  ├── /api/*           → NestJS API (PM2, port 3004)
  ├── /api/rss/        → NestJS (riêng, không qua Docker)
  ├── /storage/*       → MinIO (port 9000) — video/media
  └── /*               → Next.js Web (PM2, port 3000)

NestJS API ←→ PostgreSQL  (port 5432)   — dữ liệu chính
             ←→ Qdrant     (port 6333)   — vector search / RAG
             ←→ Redis       (port 6379)   — cache
             ←→ MinIO       (port 9000)   — file/video storage
             ←→ Ollama      (port 11434)  — AI local (miễn phí)
             ←→ OpenRouter               — AI cloud (fallback)
             ←→ n8n         (port 5678)   — workflow automation
```

---

## Stack công nghệ

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS 10, TypeScript, TypeORM |
| Database | PostgreSQL 15 |
| Vector DB | Qdrant |
| Cache | Redis |
| File storage | MinIO (S3-compatible) |
| AI Local | Ollama + qwen2.5:1.5b |
| AI Cloud | OpenRouter (mistralai/mistral-7b-instruct) |
| Process manager | PM2 (cluster mode) |
| Reverse proxy | Nginx |
| Automation | n8n |

---

## Database Entities (50 bảng)

### Sản phẩm & Kho
| Entity | Mô tả |
|--------|-------|
| `product` | Sản phẩm chính (name, price, stock, category, brand) |
| `product-variant` | Biến thể (size, color, SKU, price riêng) |
| `category` | Danh mục sản phẩm (tree structure) |
| `brand` | Thương hiệu |
| `inventory` | Tồn kho (quantity, location, alerts) |

### Đơn hàng & Thanh toán
| Entity | Mô tả |
|--------|-------|
| `order` | Đơn hàng (status, total, shippingAddress) |
| `order-item` | Dòng sản phẩm trong đơn |
| `payment` | Giao dịch thanh toán (VNPay, COD, bank) |
| `dropship-order` | Đơn dropship từ nhà cung cấp |
| `dropship-product` | Sản phẩm dropship mapping |

### Khách hàng & Lead
| Entity | Mô tả |
|--------|-------|
| `customer` | Khách hàng (contact, LTV, segment) |
| `customer-segment` | Phân khúc khách hàng (AI tự phân) |
| `lead` | Khách hàng tiềm năng |
| `mobile-session` | Phiên app mobile |

### Marketing & Campaign
| Entity | Mô tả |
|--------|-------|
| `campaign` | Chiến dịch marketing (SCHEDULED/RUNNING/COMPLETED) |
| `email-campaign` | Campaign email riêng |
| `content` | Nội dung đã tạo (bài viết, caption) |
| `seo-article` | Bài viết SEO |
| `coupon` | Mã giảm giá |

### Affiliate
| Entity | Mô tả |
|--------|-------|
| `affiliate` | Cấu hình affiliate (AccessTrade, etc.) |
| `affiliate-click` | Theo dõi lượt click |
| `affiliate-conversion` | Chuyển đổi mua hàng |
| `affiliate-partner` | Đối tác affiliate (publisher) |
| `commission` | Hoa hồng (amount, status, paidAt) |

### AI & Agent
| Entity | Mô tả |
|--------|-------|
| `agent-config` | Cấu hình từng agent (enabled, params) |
| `agent-log` | Lịch sử chạy agent (status, durationMs, output) |
| `ai-decision` | Quyết định AI đã đưa ra |
| `ai-memory` | Bộ nhớ ngắn hạn của AI |
| `decision-memory` | Lịch sử quyết định (học từ quá khứ) |
| `learning-cycle` | Chu kỳ tự học của AI |
| `lesson-learned` | Bài học AI rút ra |
| `performance-scorecard` | Điểm hiệu suất từng agent |

### B2B & Marketplace
| Entity | Mô tả |
|--------|-------|
| `supplier` | Nhà cung cấp |
| `supplier-product` | Sản phẩm từ nhà cung cấp |
| `marketplace-vendor` | Gian hàng trên TMĐT |
| `marketplace-dispute` | Khiếu nại tranh chấp TMĐT |
| `tenant` | Tenant SaaS (multi-tenant) |
| `white-label-client` | Khách B2B dùng white-label |

### System
| Entity | Mô tả |
|--------|-------|
| `user` | Người dùng hệ thống (role: VIEWER/STAFF/MANAGER/ADMIN) |
| `notification` | Thông báo in-app |
| `audit-log` | Log thao tác quan trọng |
| `workflow` | Workflow automation (trigger, steps) |
| `knowledge` | Knowledge base articles |
| `inbox-conversation` | Hội thoại inbox hợp nhất |
| `inbox-message` | Tin nhắn trong hội thoại |
| `experiment` | A/B test experiments |
| `revenue-snapshot` | Snapshot doanh thu theo ngày |
| `price-alert` | Cảnh báo giá cạnh tranh (decimal columns) |
| `video-job` | Job tạo video tự động |

---

## AI Agents — Danh sách & Lịch chạy

```
Mỗi giây    : campaign-scheduler         → auto-launch campaigns đến hạn
Mỗi 30s     : telegram-bot               → nhận tin Telegram (polling)
Mỗi 30 phút : lead-hunter               → săn lead mới
Mỗi 1 giờ   : price-agent               → monitor giá sản phẩm
             : campaign-optimization     → AI tối ưu campaign đang chạy
             : content-factory           → pipeline tạo content
             : enterprise-health         → health check toàn hệ thống
             : master-agent              → điều phối tất cả agent khác
Mỗi 2 giờ   : repricing                 → định giá lại theo đối thủ
Mỗi 3 giờ   : competitor-monitor        → theo dõi giá đối thủ (Shopee/Lazada/TikTok)
Mỗi 4 giờ   : whitelabel-onboarding     → auto onboard khách B2B mới
Mỗi 6 giờ   : marketplace-optimizer     → tối ưu listing + keywords TMĐT
             : trend-predictor           → dự báo xu hướng sản phẩm
             : video-optimizer           → tối ưu SEO video
             : self-improvement executor → AI tự viết code cải tiến
Mỗi 12 giờ  : demand-forecaster         → dự báo nhu cầu 30 ngày tới
             : mobile-engagement         → push notification app mobile
Hàng ngày   : content (07,10,13,16,19h) → đăng content 5 lần/ngày
             : telegram-post (8-22h chẵn)→ affiliate post 8 lần/ngày
             : publisher (08,12,18h)     → đăng lên FB + Telegram
             : telegram-morning (07h)    → bản tin chào buổi sáng
             : telegram-flash (09h)      → flash sale deals
             : ai-video-pipeline (09,15h)→ video AI → TikTok/Zalo
             : affiliate (08h)           → cào SP + tạo link + đăng
             : seo (07h)                 → viết bài SEO tự động
             : trend (06h)               → phân tích trend thị trường
             : review (11h)              → tổng hợp review sản phẩm
             : knowledge (03h)           → cập nhật knowledge base
             : crm + segmentation (02h)  → phân khúc AI tự động
             : retention (09h)           → chiến lược giữ chân khách
             : video (10h)               → tạo video sản phẩm
             : email-agent (08h)         → email campaign tự động
             : affiliate-intelligence (05h) → phân tích hiệu suất affiliate
Hàng tuần   : executive-report (07h Thứ 2) → báo cáo tuần tổng giám đốc
```

---

## Luồng dữ liệu chính

### 1. Affiliate Auto-Posting
```
[priority-brands.service] CÀO SẢN PHẨM (song song)
  ├── THEFACESHOP API    ──┐
  ├── Hoàng Hà (JSON-LD)  ├─→ BrandProduct[] có discount%
  ├── Con Cưng (danh sách)──┤
  ├── Tiki Flash Sale API ──┤   (ưu tiên giảm giá ≥30%)
  └── Shopee scrape       ──┘
          ↓
[affiliate-agent.service] TẠO LINK
  ├── AccessTrade CPS → go.isclix.com deeplink
  └── fallback: link gốc
          ↓
[telegram-agent.service] buildText() → FORMAT BÀI
  "🔥 GIẢM XX%\n📱 Tên sản phẩm\n💰 Giá\n🔗 Link"
          ↓
  ├── Telegram channel (Bot API)
  ├── Zalo OA (ZALO_OA_ACCESS_TOKEN)
  └── Facebook Page (FB_PAGE_TOKEN / Make.com fallback)
```

### 2. Content Pipeline
```
[content-agent] AI tạo nội dung
  → Ollama generate → OpenRouter fallback
  → lưu vào entity `content`
          ↓
[publisher-agent] PHÁT TÁN
  ├── Telegram Bot API
  ├── Facebook Graph API
  └── Make.com webhook
```

### 3. Đơn hàng
```
POST /api/orders
  → orders.service.create()
  → lưu DB (order + order-items)
  → payment.service (VNPay/COD)
  → EventsGateway.emitNewOrder()   → WebSocket /ws room "dashboard"
  → notification entity
  → order-notify.service (cron 3p) → Telegram alert cho admin
  → fulfillment.service            → auto mark delivered sau N ngày
```

### 4. AI Pipeline
```
Bất kỳ agent nào:
  → aiService.generate(prompt)
      ↓ thử
  callOllama(http://ollama:11434)  [local, miễn phí]
      ✗ fail
      ↓
  callOpenRouter()                 [cloud, OPENROUTER_API_KEY]
      ✗ fail
      ↓
  fallback("[AI đang bận...] " + prompt.slice(0,100))

Structured JSON:
  → aiService.parseJson<T>(prompt)
  → regex match /\{[\s\S]*\}/ từ response
  → JSON.parse() → typed object T
  → QUAN TRỌNG: luôn parse số trước khi lưu decimal column
    parseFloat(String(raw).replace(/[^0-9.]/g, ''))
```

### 5. Vector Search (RAG)
```
INDEXING (khi thêm sản phẩm/knowledge):
  products.service → rag.service.indexProduct()
                   → Qdrant upsert (collection: "products")
  knowledge.service → rag.service.indexKnowledge()
                    → Qdrant upsert (collection: "knowledge")

SEARCH (khi khách hỏi):
  chat/inbox message
    → rag.service.search(query, collection)
    → Qdrant cosine similarity top-K
    → ghép context → AI trả lời
    → reply về Telegram/Facebook/chat

Các module dùng Qdrant:
  - rag.service (core)
  - products.service
  - knowledge-brain.service
  - knowledge-agent.service
  - inbox (fb + telegram)
  - seller-center (shopee/lazada/tiktok/browser)
```

### 6. Competitor Monitor → Repricing
```
[competitor-monitor] mỗi 3 giờ
  → lấy danh sách products từ DB
  → AI mô phỏng giá đối thủ Shopee/Lazada/TikTok
  → parse lowestCompetitorPrice (number)
  → nếu đối thủ thấp hơn đáng kể:
      → lưu price-alert (decimal columns)

[repricing-agent] mỗi 2 giờ
  → đọc price-alert chưa xử lý
  → AI quyết định newPrice (parse số trước khi dùng)
  → đề xuất điều chỉnh giá (-15% đến +20%)
  → mark alert isActedOn = true
```

### 7. Seller Center (TMĐT sync)
```
[seller-center]
  ├── Shopee Partner API  → sync sản phẩm, đơn hàng, tồn kho
  ├── Lazada Open API     → sync tương tự
  ├── TikTok Shop API     → sync (TIKTOK_APP_KEY/SECRET)
  └── browser-seller      → Playwright scrape (fallback không có API)

[marketplace]
  → Dispute management (khiếu nại)
  → Vendor performance tracking
```

### 8. White-label B2B
```
[tenant] multi-tenant SaaS:
  → mỗi tenant có data riêng
  → billing, customization riêng

[white-label-client]:
  → clone UI/branding cho đối tác
  → whitelabel-onboarding agent: mỗi 4h tự onboard
  → enterprise-health agent: monitor sức khỏe mỗi 1h
```

---

## WebSocket Events (real-time)

**Namespace**: `/ws`  
**Client join room**: `socket.emit('join', 'dashboard')`

| Room | Event | Payload | Trigger |
|------|--------|---------|---------|
| `dashboard` | `new_order` | `{id, total, status}` | Đơn hàng mới |
| `dashboard` | `new_lead` | `{id, name, email}` | Lead mới |
| `dashboard` | `kpi_update` | `{revenue, orders, ...}` | KPI thay đổi |
| `orders` | `new_order` | `{id, total, status}` | Đơn hàng mới |
| `leads` | `new_lead` | `{id, name, email}` | Lead mới |
| `agents` | `agent_update` | `{agent, status, data, ts}` | Agent chạy/xong |
| `user:{userId}` | `notification` | `{message, type, ts}` | Thông báo cá nhân |
| `chat:{sessionId}` | `chat_message` | message object | Tin nhắn chat |

> **Note**: EventsGateway đã có đủ các method emit. Hiện tại orders/leads service chưa inject EventsGateway — cần wire để dashboard live thực sự.

---

## API Endpoints chính

### Auth
```
POST /api/auth/login          → { accessToken, refreshToken }
POST /api/auth/register       → tạo tài khoản
POST /api/auth/refresh        → refresh token
POST /api/auth/setup-admin    → lần đầu setup (chỉ khi chưa có admin)
```

### Products
```
GET    /api/products          → danh sách + filter
GET    /api/products/:id
POST   /api/products          → tạo mới
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/search?q=...  → RAG semantic search
```

### Orders
```
GET    /api/orders            → danh sách
POST   /api/orders            → tạo đơn
PATCH  /api/orders/:id/status → cập nhật trạng thái
GET    /api/orders/revenue?days=30 → doanh thu (parseInt, default 30)
```

### Campaigns
```
GET    /api/campaigns
POST   /api/campaigns         → tạo campaign
POST   /api/campaigns/:id/launch    → chạy ngay
POST   /api/campaigns/:id/schedule  → lên lịch { scheduledAt: ISO string }
PATCH  /api/campaigns/:id/pause
PATCH  /api/campaigns/:id/resume
POST   /api/campaigns/:id/distribute → phát tán FB/Telegram
GET    /api/campaigns/:id/performance → phân tích AI
```

### Telegram Agent
```
GET  /api/telegram-agent/status
POST /api/telegram-agent/run          → chạy thủ công
POST /api/telegram-agent/morning      → bản tin sáng
POST /api/telegram-agent/flash        → flash deals
GET  /api/telegram-agent/channels     → danh sách kênh
POST /api/telegram-agent/test-message → test gửi tin
```

### Analytics
```
GET /api/analytics/dashboard   → overview KPI
GET /api/analytics/revenue     → doanh thu
GET /api/analytics/agents      → hiệu suất agents
GET /api/analytics/report      → báo cáo tổng hợp
```

---

## Biến môi trường quan trọng

### AI
```env
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:1.5b
OPENROUTER_API_KEY=...          # fallback khi Ollama fail
OPENROUTER_MODEL=mistralai/mistral-7b-instruct
```

### Social channels
```env
TELEGRAM_BOT_TOKEN=...
FB_PAGE_TOKEN=...               # Facebook Page
ZALO_OA_ACCESS_TOKEN=...        # Zalo Official Account
TIKTOK_APP_KEY=...
TIKTOK_APP_SECRET=...
TIKTOK_SHOP_URL=...
```

### Affiliate
```env
ACCESSTRADE_API_KEY=...         # CPS deeplink qua go.isclix.com
```

### Infrastructure
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=...
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
```

---

## Tính năng có sẵn nhưng chưa đầy đủ

| Module | Trạng thái | Việc cần làm |
|--------|-----------|--------------|
| EventsGateway | Gateway đủ, service chưa inject | Wire vào orders/leads service |
| Workflows | Entity có, chưa có execution engine | Viết WorkflowRunnerService |
| Self-improvement | Agent tự viết suggestion, chưa auto-apply | Auto-apply approved suggestions |
| Inbox unified | FB/Telegram riêng, chưa merge | UI unified inbox |
| Video streaming | Timeout khi stream qua Next.js | Redirect sang MinIO presigned URL |
| Affiliate analytics | Entity đủ, UI chưa có chart | Chart click → conversion → hoa hồng |
| White-label UI | Entity đủ, UI chưa hoàn chỉnh | Portal B2B cho từng tenant |

---

## Gợi ý tính năng xây thêm

### Ưu tiên cao (dùng infra sẵn có)

1. **Wire EventsGateway** → dashboard live thực sự
   - Inject `EventsGateway` vào `orders.service` và `leads.service`
   - Gọi `gateway.emitNewOrder()` và `gateway.emitNewLead()` sau khi save

2. **Workflow Engine** — chạy automation theo trigger
   - Trigger: order.created, customer.registered, campaign.completed
   - Actions: send_email, send_telegram, update_segment, create_task

3. **Unified Inbox** — hội thoại FB + Telegram + Zalo trong 1 màn
   - `inbox-conversation` + `inbox-message` entity đã có
   - Cần UI thread-view + reply box

4. **Affiliate Dashboard** — chart click → conversion → hoa hồng
   - Entity `affiliate-click`, `affiliate-conversion`, `commission` đã đủ
   - Cần charts: funnel, daily clicks, top products, commission pending

5. **Bulk AI product description** — chọn nhiều SP → AI viết mô tả
   - Dùng `aiService.generate()` có sẵn
   - Batch job với queue

### Ưu tiên trung bình

6. **Zalo Mini App storefront** — shop trong Zalo
7. **Multi-store inventory sync** — khi có đơn Shopee → trừ kho Lazada
8. **Price alert UI** — bảng giá đối thủ real-time từ `price-alert` entity
9. **A/B test dashboard** — so sánh campaign variant A vs B
10. **Customer LTV prediction** — AI dự báo giá trị vòng đời khách

---

*File này được generate tự động từ codebase. Cập nhật lại khi có thay đổi lớn về kiến trúc.*
