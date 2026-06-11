# AI Social Commerce OS — Toàn Bộ Luồng Hoạt Động Hệ Thống

> Phiên bản: V4 | Cập nhật: 2026-06-11

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Internet / Người dùng / Khách hàng
           │
           ▼
      ┌─────────┐
      │  Nginx  │  ← Reverse proxy, SSL termination
      └────┬────┘
           │
     ┌─────┴──────┐
     ▼            ▼
  API (NestJS)  Web (NextJS)
  :3001          :3000
     │
     ├─── PostgreSQL  (dữ liệu chính)
     ├─── Redis       (cache, queue, session)
     ├─── MinIO       (file, ảnh, video)
     ├─── Qdrant      (vector DB cho RAG)
     ├─── Ollama      (AI local LLM)
     └─── n8n         (workflow automation)
```

---

## 2. LUỒNG KHỞI ĐỘNG HỆ THỐNG

```
make up
  └─> docker compose up -d
        ├─> postgres   (healthcheck: pg_isready)
        ├─> redis      (healthcheck: redis-cli ping)
        ├─> minio      (healthcheck: curl /health/live)
        ├─> qdrant     (healthcheck: tcp 6333)
        ├─> n8n        (depends_on: postgres healthy)
        ├─> ollama
        ├─> open-webui (depends_on: ollama)
        ├─> api        (depends_on: postgres, redis, qdrant healthy)
        ├─> nginx      (depends_on: api)
        ├─> prometheus
        ├─> loki
        ├─> grafana    (depends_on: prometheus, loki)
        └─> uptime-kuma
```

---

## 3. LUỒNG XỬ LÝ REQUEST API

```
Client Request
     │
     ▼
  Nginx (port 80/443)
     │  proxy_pass
     ▼
  NestJS API (port 3001)
     │
     ├─> JWT Auth Guard ──── xác thực token
     │       │
     │   nếu hợp lệ
     │       ▼
     ├─> RBAC Guard ──────── kiểm tra role/permission
     │       │
     ▼       ▼
  Controller (REST/GraphQL/WebSocket)
     │
     ▼
  Service Layer
     │
     ├─> TypeORM ──────────> PostgreSQL
     ├─> Bull Queue ───────> Redis (background jobs)
     ├─> Cache Manager ────> Redis (response cache)
     └─> Response ─────────> Client
```

---

## 4. LUỒNG HOẠT ĐỘNG TỪNG AGENT

### 4.1 Agent 01 — Trend Agent

```
Cron Job (hàng giờ / trigger thủ công)
     │
     ▼
TrendAgentService.run()
     │
     ├─> Thu thập dữ liệu từ:
     │      ├─ TikTok Trends API
     │      ├─ Facebook Trends
     │      └─ Google Trends
     │
     ├─> Phân tích & tính điểm:
     │      ├─ trend_score
     │      ├─ forecast_score
     │      └─ opportunity_score
     │
     ├─> Lưu vào PostgreSQL (bảng trends)
     │
     └─> Ghi agent_logs (agent, status, duration_ms)
```

### 4.2 Agent 02 — Affiliate Agent

```
Cron Job (mỗi 6 giờ)
     │
     ▼
AffiliateAgentService.run()
     │
     ├─> Crawl sản phẩm hot từ:
     │      ├─ Shopee Affiliate API
     │      ├─ Lazada Affiliate API
     │      └─ TikTok Shop API
     │
     ├─> Tính toán:
     │      ├─ commission_rate
     │      ├─ conversion_rate
     │      └─ profit_potential
     │
     ├─> Xếp hạng sản phẩm affiliate
     │
     └─> Lưu vào PostgreSQL (bảng affiliates)
```

### 4.3 Agent 03 — Content Agent

```
Trigger: sau khi Trend/Affiliate Agent cập nhật
     │
     ▼
ContentAgentService.run()
     │
     ├─> Lấy trending products từ DB
     │
     ├─> Gọi Ollama LLM (qwen2.5:7b) để tạo:
     │      ├─ Facebook Post
     │      ├─ TikTok Script
     │      ├─ Telegram Post
     │      └─ SEO Article
     │
     ├─> Lưu nội dung vào PostgreSQL (bảng content)
     │
     └─> Đẩy task vào Bull Queue → Publisher Agent
```

### 4.4 Agent 04 — Publisher Agent (V3)

```
Bull Queue Consumer / Cron Job
     │
     ▼
PublisherAgentService.run()
     │
     ├─> Lấy content chờ đăng từ DB
     │
     ├─> Đăng lên từng kênh:
     │      ├─ Facebook Page API
     │      ├─ Telegram Bot API
     │      ├─ TikTok API
     │      └─ Website CMS
     │
     ├─> Cập nhật trạng thái published
     │
     └─> Ghi log kết quả
```

### 4.5 Agent 05 — Lead Hunter (V3)

```
Cron Job (liên tục)
     │
     ▼
LeadHunterService.run()
     │
     ├─> Quét nguồn lead:
     │      ├─ Facebook Group comments
     │      ├─ Website form submissions
     │      ├─ Telegram messages
     │      └─ TikTok comments
     │
     ├─> Classify lead (AI phân loại)
     │
     ├─> Score lead (0-100)
     │
     ├─> Lưu vào PostgreSQL (bảng leads)
     │
     └─> Notify qua WebSocket → Dashboard realtime
```

### 4.6 Agent 06 — Sales Agent

```
Trigger: khách hàng nhắn tin / hỏi hàng
     │
     ▼
SalesAgentService.handleMessage()
     │
     ├─> Tìm kiếm sản phẩm liên quan (RAG)
     │
     ├─> Gọi Ollama LLM với context:
     │      ├─ Thông tin sản phẩm
     │      ├─ Lịch sử chat
     │      └─ Customer profile (AI Memory)
     │
     ├─> Gợi ý sản phẩm + Cross-sell / Upsell
     │
     ├─> Tạo đơn hàng nếu khách đồng ý
     │
     └─> Chuyển sang CRM Agent theo dõi
```

### 4.7 Agent 07 — CRM Agent (V3)

```
Trigger: sau mỗi đơn hàng / tương tác
     │
     ▼
CrmAgentService.run()
     │
     ├─> Cập nhật customer profile
     │
     ├─> Phân tích hành vi mua hàng
     │
     ├─> Phân đoạn khách hàng (Segmentation)
     │
     ├─> Tự động gửi:
     │      ├─ Email follow-up
     │      ├─ Telegram reminder
     │      └─ Discount voucher
     │
     └─> Lưu AI Memory (chat history, preferences)
```

### 4.8 Agent 08 — Video Agent (V2)

```
Trigger: sau Content Agent / thủ công
     │
     ▼
VideoAgentService.run()
     │
     ├─> Lấy product info + content script
     │
     ├─> Pipeline tạo video:
     │      ├─ AI Script (Ollama LLM)
     │      ├─ AI Voice (Kokoro TTS / Whisper)
     │      ├─ AI Visual (image generation)
     │      ├─ Video Render (FFmpeg / Remotion)
     │      └─ Upload to MinIO
     │
     └─> Đẩy sang Publisher Agent → Auto Publish
```

### 4.9 Agent 09 — SEO Agent (V2)

```
Cron Job (hàng ngày)
     │
     ▼
SeoAgentService.run()
     │
     ├─> Nghiên cứu từ khóa
     │
     ├─> Tạo SEO Articles (Ollama LLM)
     │
     ├─> Tạo Landing Pages
     │
     ├─> Tối ưu meta tags, schema markup
     │
     └─> Publish lên Website CMS
```

### 4.10 Agent 10 — Trend Predictor (V2)

```
Cron Job (hàng ngày)
     │
     ▼
TrendPredictorService.run()
     │
     ├─> Lấy lịch sử trend data từ DB
     │
     ├─> Phân tích ML / AI dự đoán
     │
     ├─> Tạo forecast report:
     │      ├─ 7-day forecast
     │      ├─ 30-day forecast
     │      └─ Opportunity score
     │
     └─> Gửi report qua Email / Telegram
```

### 4.11 Agent 11 — Price Intelligence (V2)

```
Cron Job (mỗi 4 giờ)
     │
     ▼
PriceAgentService.run()
     │
     ├─> Thu thập giá từ đối thủ:
     │      ├─ Shopee
     │      ├─ Lazada
     │      └─ Tiki
     │
     ├─> So sánh giá thị trường
     │
     ├─> Đề xuất chiến lược giá
     │
     └─> Cập nhật suggested_price vào DB
```

### 4.12 Agent 12 — Customer Segmentation (V2)

```
Cron Job (hàng tuần)
     │
     ▼
SegmentationAgentService.run()
     │
     ├─> Phân tích dữ liệu khách hàng
     │
     ├─> Phân đoạn theo:
     │      ├─ RFM (Recency, Frequency, Monetary)
     │      ├─ Behavior patterns
     │      └─ Purchase history
     │
     └─> Cập nhật segment tags vào customer profile
```

### 4.13 Agent 13 — Email Marketing (V2)

```
Trigger: Campaign tạo / Cron Job
     │
     ▼
EmailAgentService.run()
     │
     ├─> Lấy danh sách segment từ CRM
     │
     ├─> Tạo email content (Ollama LLM)
     │
     ├─> Personalize theo từng customer
     │
     ├─> Gửi email qua SMTP
     │
     └─> Track open rate / click rate → Analytics
```

### 4.14 Agent 14 — Telegram Agent (V2)

```
Trigger: Campaign / Auto-response
     │
     ▼
TelegramAgentService.run()
     │
     ├─> Gửi broadcast messages
     │
     ├─> Xử lý inbound messages (AI chat)
     │
     └─> Thu lead từ Telegram groups
```

### 4.15 Agent 15 — Knowledge Agent (V3)

```
Trigger: dữ liệu mới được thêm / Cron Job sync
     │
     ▼
KnowledgeAgentService.sync()
     │
     ├─> Thu thập từ nguồn:
     │      ├─ Products DB
     │      ├─ Customers DB
     │      ├─ Orders DB
     │      ├─ Policies & FAQs
     │      └─ Marketing materials
     │
     ├─> Pipeline RAG:
     │      ├─ Document chunking
     │      ├─ Embedding (Ollama)
     │      ├─ Lưu vào Qdrant (vector DB)
     │      └─ Index update
     │
     └─> Sẵn sàng cho Sales Agent / AI Chat query
```

### 4.16 Agent 16 — Master Agent (Executive AI) (V2)

```
Cron Job (mỗi 30 phút) / Dashboard trigger
     │
     ▼
MasterAgentService.run()
     │
     ├─> Thu thập KPI từ tất cả agents:
     │      ├─ GET /agents/trend/kpi
     │      ├─ GET /agents/affiliate/kpi
     │      ├─ GET /agents/content/kpi
     │      └─ ... (tất cả agents)
     │
     ├─> Phân tích hiệu suất tổng thể
     │
     ├─> Ra quyết định tự động:
     │      ├─ Scale up/down agent frequency
     │      ├─ Ưu tiên sản phẩm trending
     │      └─ Alert khi metrics xuống thấp
     │
     ├─> Tạo Executive Report
     │
     └─> Gửi summary qua Email / Telegram / Dashboard
```

### 4.17 Agent 17 — Review Agent (V2)

```
Cron Job (hàng ngày)
     │
     ▼
ReviewAgentService.run()
     │
     ├─> Thu thập review từ các nền tảng
     │
     ├─> Phân tích sentiment (positive/negative/neutral)
     │
     ├─> Tổng hợp insights
     │
     └─> Alert nếu có review xấu
```

### 4.18 Agent 18 — Competitor Monitor (V4)

```
Cron Job (mỗi 12 giờ)
     │
     ▼
CompetitorMonitorService.run()
     │
     ├─> Monitor đối thủ cạnh tranh
     │
     ├─> Track giá, chương trình KM
     │
     └─> Báo cáo thay đổi → Price Agent / Dashboard
```

### 4.19 Agent 19 — Demand Forecaster (V4)

```
Cron Job (hàng tuần)
     │
     ▼
DemandForecasterService.run()
     │
     ├─> Phân tích lịch sử đơn hàng
     │
     ├─> Dự báo nhu cầu sản phẩm
     │
     └─> Đề xuất nhập hàng → Inventory Module
```

### 4.20 Agent 20 — Repricing Agent (V4)

```
Trigger: Price Intelligence update / Cron Job
     │
     ▼
RepricingService.run()
     │
     ├─> Lấy suggested_price từ Price Agent
     │
     ├─> So sánh với cost + margin target
     │
     └─> Tự động update giá sản phẩm trong DB
```

### 4.21 Agent 21 — Video Optimizer (V4)

```
Trigger: sau khi Video Agent publish
     │
     ▼
VideoOptimizerService.run()
     │
     ├─> Phân tích performance video đã đăng
     │
     ├─> A/B test thumbnails / titles
     │
     └─> Tối ưu metadata → Re-publish
```

---

## 5. LUỒNG RAG (Retrieval-Augmented Generation)

```
User Query (AI Chat / Sales Agent)
     │
     ▼
RagService.query(question)
     │
     ├─> Embedding query text (Ollama embeddings)
     │
     ├─> Vector search trong Qdrant
     │      └─> Top-K relevant documents
     │
     ├─> Build prompt:
     │      ├─ System context
     │      ├─ Retrieved documents
     │      └─ User question
     │
     ├─> Gọi Ollama LLM → Generate answer
     │
     └─> Trả về answer + sources
```

---

## 6. LUỒNG ĐẶT HÀNG (Order Flow)

```
Khách hàng
     │
     ├─> AI Chat tư vấn (Sales Agent + RAG)
     │
     ▼
POST /orders
     │
     ├─> Validate sản phẩm / tồn kho (Inventory)
     │
     ├─> Tính giá + khuyến mãi (Campaigns)
     │
     ├─> Tạo Order record (PostgreSQL)
     │
     ├─> Tạo Payment link
     │      ├─ VNPay / MoMo / ZaloPay
     │      └─ COD
     │
     ├─> Gửi xác nhận đơn hàng:
     │      ├─ Email
     │      └─ Telegram / SMS
     │
     ├─> Cập nhật Inventory (trừ tồn kho)
     │
     ├─> Push event → CRM Agent (cập nhật profile)
     │
     └─> WebSocket event → Dashboard realtime
```

---

## 7. LUỒNG AFFILIATE (Affiliate Flow)

```
Affiliate đăng ký (Affiliate Portal)
     │
     ▼
POST /affiliate-portal/register
     │
     ├─> Tạo affiliate account
     │
     ├─> Cấp unique referral link
     │
     └─> Khách hàng mua qua referral link
                │
                ▼
          Ghi nhận commission
                │
          ├─> Track click & conversion
          ├─> Tính hoa hồng
          └─> Thanh toán tự động
```

---

## 8. LUỒNG DROPSHIP

```
Supplier đăng ký
     │
     ▼
Dropship Module
     │
     ├─> Sync sản phẩm từ supplier
     │
     ├─> Đơn hàng vào → Auto forward to supplier
     │
     └─> Track trạng thái giao hàng
```

---

## 9. LUỒNG CONTENT FACTORY

```
ContentFactory.generate(product, channel)
     │
     ├─> Facebook Post
     │      └─> Ollama LLM → Post text + hashtags
     │
     ├─> TikTok Script
     │      └─> Ollama LLM → Script + CTA
     │
     ├─> SEO Article
     │      └─> Ollama LLM → Long-form content
     │
     ├─> Email Campaign
     │      └─> Ollama LLM → Subject + Body
     │
     └─> Landing Page
            └─> Ollama LLM → HTML content
```

---

## 10. LUỒNG AI MEMORY

```
Mỗi tương tác với khách hàng
     │
     ▼
AiMemoryService.save()
     │
     ├─> Chat History (Redis + PostgreSQL)
     ├─> Purchase History
     ├─> Product Interest
     ├─> Behavior Pattern
     └─> Customer Preferences

Khi Sales Agent trả lời
     │
     ▼
AiMemoryService.get(customerId)
     └─> Load context → Personalized response
```

---

## 11. LUỒNG WEBSOCKET (REALTIME)

```
GatewayModule (Socket.IO)
     │
     ├─> Events từ Server → Client:
     │      ├─ new_order        (đơn hàng mới)
     │      ├─ new_lead         (lead mới)
     │      ├─ agent_status     (trạng thái agent)
     │      └─ kpi_update       (cập nhật KPI)
     │
     └─> Client subscribe dashboard → Realtime update
```

---

## 12. LUỒNG MONITORING & OBSERVABILITY

```
Mỗi service / agent
     │
     └─> Metrics → Prometheus (port 9090)
                        │
                        ▼
                   Grafana Dashboard (port 3003)
                        └─> Alerts

Logs → Loki (port 3100)
           │
           └─> Grafana Logs Explorer

Uptime → Uptime Kuma (port 3002)
           └─> HTTP healthcheck mỗi 60s
```

---

## 13. LUỒNG BACKUP

```
make backup (thủ công) / Cron Job (hàng ngày)
     │
     ▼
pg_dump ai_commerce
     │
     ├─> Gzip compress
     ├─> Lưu vào ./backups/backup_YYYYMMDD_HHMMSS.sql.gz
     └─> (Optional) Sync to cloud storage (rclone)
```

---

## 14. LUỒNG CI/CD

```
git push → GitHub
     │
     ▼
GitHub Actions Workflow
     │
     ├─> Build Docker image
     ├─> Run tests
     ├─> Push image to Docker Hub
     │
     └─> Deploy (SSH / webhook)
            └─> docker compose pull && docker compose up -d
```

---

## 15. LUỒNG AUTHENTICATION & AUTHORIZATION

```
POST /auth/login
     │
     ├─> Verify email + password (bcrypt)
     │
     ├─> Issue JWT token (Access + Refresh)
     │
     └─> Response token

Mọi request có token
     │
     ▼
JWT Auth Guard
     │
     ├─> Verify JWT signature
     ├─> Decode user info + role
     │
     ▼
RBAC Guard
     │
     ├─> Kiểm tra role: admin / seller / affiliate / customer
     │
     └─> Allow / Deny
```

---

## 16. TỔNG HỢP PORTS & SERVICES

| Service       | Port  | Mô tả                    |
|---------------|-------|--------------------------|
| nginx         | 80/443| Reverse proxy public     |
| api (NestJS)  | 3001  | Backend REST API         |
| web (NextJS)  | 3000  | Frontend / Open-WebUI    |
| postgres      | 5432  | Cơ sở dữ liệu chính      |
| redis         | 6379  | Cache, queue, session     |
| minio         | 9000  | Object storage           |
| minio console | 9001  | MinIO dashboard          |
| qdrant        | 6333  | Vector database          |
| n8n           | 5678  | Workflow automation      |
| ollama        | 11434 | Local LLM                |
| prometheus    | 9090  | Metrics collection       |
| grafana       | 3003  | Monitoring dashboard     |
| loki          | 3100  | Log aggregation          |
| uptime-kuma   | 3002  | Uptime monitoring        |
| swagger       | 3001/api/docs | API documentation |

---

## 17. KPI TARGETS

| Metric           | Target         |
|------------------|----------------|
| Products         | 10,000         |
| Leads / ngày     | 1,000          |
| Posts / ngày     | 100            |
| Videos / ngày    | 100            |
| Orders / ngày    | 100            |
| Uptime           | 24/7 (99.9%)   |
| AI Operations    | Fully automated|

---

## 18. ROADMAP PHASES

| Phase | Nội dung                                   | Trạng thái |
|-------|--------------------------------------------|------------|
| V1    | MVP: Products, Orders, Affiliate, AI Chat  | ✅ Done    |
| V2    | Content Factory, Video, RAG, Multi-Agent   | ✅ Done    |
| V3    | Auth, RBAC, WebSocket, Full Automation     | ✅ Done    |
| V4    | Dropship, Competitor Monitor, Repricing    | ✅ Done    |
| V5    | Enterprise, Mobile App, Marketplace, White Label | ✅ Done |
| V6    | Autonomous Company: BOS, Knowledge Brain, AI Board, Self-Improvement | ✅ Done |

---

## 19. AUTONOMOUS COMPANY ARCHITECTURE (V6)

```
Market
  ↓
Business Operating System  (/business-os)
  ↓
Knowledge Brain  (/knowledge-brain)
  ↓
AI Board Of Directors  (/ai-board)
  CEO · CFO · COO · CTO · CMO · CRO · CSO
  ↓
Execution Agents  (21+ agents)
  ↓
Results
  ↓
Self Improvement Loop  (/self-improvement)
  Observe → Evaluate → Analyze → Learn → Improve → Execute
  ↓
Knowledge Brain Update
  ↓
Repeat
```

---

## 20. LUỒNG BUSINESS OPERATING SYSTEM

```
GET /business-os/dashboard
  ├─> Business Funnel (Traffic→Leads→Conversations→Orders→Revenue→LTV)
  ├─> KPI Framework (Acquisition / Sales / Revenue / Customer)
  ├─> Business Intelligence (Opportunities / Risks / Money Leaks)
  ├─> Priority Issues (P0→P1→P2→P3 Decision Framework)
  └─> Autonomous Plan (Daily / Weekly / Monthly)

GET /business-os/report/daily   → Executive report 24h
GET /business-os/report/weekly  → Strategic review 7 ngày
```

---

## 21. LUỒNG KNOWLEDGE BRAIN

```
5 Knowledge Domains:
  PRODUCT     → top sellers, high-margin products
  CUSTOMER    → VIP, churn risk, LTV
  BUSINESS    → revenue, growth, conversion
  MARKET      → price alerts, trends
  OPERATIONAL → agent health, success rate

3 Memory Tiers:
  SHORT_TERM  → Realtime / Chat
  MEDIUM_TERM → 30 ngày / Campaigns
  LONG_TERM   → Lịch sử / Chiến lược

POST /knowledge-brain/ask      → RAG-powered Q&A
POST /knowledge-brain/ingest   → Nạp tri thức mới → Qdrant index
GET  /knowledge-brain/executive-questions → 8 câu hỏi chiến lược
```

---

## 22. LUỒNG AI BOARD OF DIRECTORS

```
GET /ai-board/meeting → Daily Board Meeting (tổng hợp toàn bộ)
  ├─> CEO Report: revenue growth, strategy, priorities
  ├─> CFO Report: profit, cost leaks, ROI
  ├─> COO Report: agent health, workflow efficiency
  ├─> CTO Report: uptime, error rate, SLA
  ├─> CMO Report: channels, content, campaigns
  ├─> CRO Report: funnel, conversion, AOV
  └─> CSO Report: market position, investment areas

Output: systemStatus + priorityActions (P0–P3) + strategicRecommendations
```

---

## 23. LUỒNG SELF-IMPROVEMENT LOOP

```
Observe → Evaluate → Root Cause Analysis
  └─> Extract Lessons (LessonsLearned DB)
        └─> Build Improvement Plan (DecisionMemory DB)
              └─> Run Experiments (Experiments DB)
                    └─> Compute Scorecard (PerformanceScorecard DB)

7 Business Health Scores (0-100):
  Revenue · Profit · Growth · Marketing · Operations · Technology · Customer

8 Evolution Levels:
  L1: Agent System
  L2: Multi-Agent System
  L3: Executive AI
  L4: Business Operating System
  L5: Knowledge Brain
  L6: AI Board Of Directors
  L7: Self Improvement Loop
  L8: Autonomous Company ← mục tiêu cuối cùng
```

---

*Tài liệu này mô tả toàn bộ luồng hoạt động của AI Social Commerce OS dựa trên source code thực tế.*
