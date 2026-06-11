# AI Social Commerce OS — Tài liệu Kiến trúc & Luồng Hệ thống

> **Phiên bản**: V6 (Autonomous Company)  
> **Ngày cập nhật**: 2026-06-11  
> **Stack**: NestJS · Next.js · PostgreSQL · Redis · Qdrant · Ollama · Docker

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Hạ tầng & Dịch vụ](#4-hạ-tầng--dịch-vụ-docker)
5. [Backend API (NestJS)](#5-backend-api-nestjs)
6. [Database Entities](#6-database-entities)
7. [AI Agents — 25+ tác nhân tự động](#7-ai-agents--25-tác-nhân-tự-động)
8. [AI/ML Core Systems](#8-aiml-core-systems)
9. [Frontend (Next.js)](#9-frontend-nextjs)
10. [Luồng dữ liệu chính](#10-luồng-dữ-liệu-chính)
11. [Tích hợp bên ngoài](#11-tích-hợp-bên-ngoài)
12. [Quan sát & Giám sát](#12-quan-sát--giám-sát)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Cấu hình môi trường](#14-cấu-hình-môi-trường)

---

## 1. Tổng quan hệ thống

**AI Social Commerce OS** là nền tảng thương mại điện tử tự động hóa hoàn toàn bằng AI, được thiết kế như một "công ty tự vận hành". Hệ thống tích hợp:

- **25+ AI Agents** chạy tự động theo lịch (cron)
- **AI Board of Directors** — 7 nhân vật AI giữ vai trò điều hành (CEO, CFO, COO, CTO, CMO, CRO, CSO)
- **Knowledge Brain** — hệ thống trí tuệ đa miền (sản phẩm, khách hàng, thị trường, vận hành)
- **Self-Improvement Loop** — vòng lặp học hỏi và tự cải tiến (V6)
- **RAG (Retrieval-Augmented Generation)** — tìm kiếm ngữ nghĩa qua vector database
- **Multi-platform Marketplace** — Shopee, Lazada, TikTok Shop
- **Multi-tenant & White-label** — hỗ trợ nhiều khách hàng doanh nghiệp

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────┐
│                    NGƯỜI DÙNG / KHÁCH HÀNG              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              NGINX Reverse Proxy :8080                   │
│         /api/* → API:3001  │  /* → Web:3000             │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
┌──────────────▼──────┐  ┌────────────▼────────────────┐
│  Next.js Web :3000   │  │   NestJS API :3001           │
│  (Frontend)          │  │   (Backend)                  │
│  - 28 Dashboard Page │  │   - 33 Modules               │
│  - React 19          │  │   - REST API + WebSocket     │
│  - Tailwind CSS 4    │  │   - 25+ AI Agents (Cron)     │
└──────────────────────┘  └───────────┬──────────────────┘
                                      │
          ┌───────────────────────────┼──────────────────────────┐
          │                           │                          │
┌─────────▼──────┐  ┌─────────────────▼──┐  ┌──────────────────▼─┐
│  PostgreSQL 17  │  │  Redis 7            │  │  Qdrant Vector DB  │
│  (Data Store)   │  │  (Cache + Queue)    │  │  (RAG / Semantic)  │
│  40+ entities   │  │  Bull Job Queue     │  │  9 Collections     │
└────────────────┘  └────────────────────┘  └────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│  MinIO :9000           Ollama :11434           N8N :5678        │
│  (File Storage)        (Local LLM)             (Workflows)      │
│  S3-Compatible         Qwen2.5:7b              No-code Auto     │
└────────────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│  External APIs: OpenRouter · OpenAI · Shopee · Lazada · TikTok │
│  Telegram Bot · Gmail SMTP · FCM · APNS                        │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Cấu trúc thư mục

```
webbanhang/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   └── src/
│   │       ├── config/         # Cấu hình ứng dụng
│   │       ├── common/         # Tiện ích dùng chung (slug.util.ts)
│   │       ├── database/
│   │       │   ├── entities/   # 40+ TypeORM entities
│   │       │   └── database.module.ts
│   │       ├── modules/        # 33 feature modules
│   │       │   ├── agents/     # 25+ AI agent implementations
│   │       │   ├── ai/
│   │       │   ├── ai-board/
│   │       │   ├── ai-memory/
│   │       │   ├── analytics/
│   │       │   ├── affiliate-intelligence/
│   │       │   ├── affiliate-portal/
│   │       │   ├── auth/
│   │       │   ├── brands/
│   │       │   ├── business-os/
│   │       │   ├── campaigns/
│   │       │   ├── categories/
│   │       │   ├── commissions/
│   │       │   ├── content-factory/
│   │       │   ├── customers/
│   │       │   ├── dropship/
│   │       │   ├── enterprise/
│   │       │   ├── gateway/    # WebSocket
│   │       │   ├── inventory/
│   │       │   ├── knowledge-brain/
│   │       │   ├── leads/
│   │       │   ├── marketplace/
│   │       │   ├── mobile/
│   │       │   ├── orders/
│   │       │   ├── payments/
│   │       │   ├── products/
│   │       │   ├── rag/
│   │       │   ├── self-improvement/
│   │       │   ├── suppliers/
│   │       │   ├── users/
│   │       │   ├── white-label/
│   │       │   └── workflows/
│   │       └── main.ts
│   └── web/                    # Next.js Frontend
│       └── src/
│           ├── app/
│           │   ├── login/
│           │   └── (dashboard)/  # 28 route pages
│           ├── components/       # Reusable UI components
│           ├── lib/
│           │   ├── api.ts        # Typed API client
│           │   └── auth.tsx
│           └── config/brand.ts
├── database/                   # DB init scripts
├── monitoring/                 # Prometheus config
├── nginx/nginx.conf            # Reverse proxy config
├── .github/workflows/          # CI/CD pipeline
├── CI-CD/                      # Deployment scripts
├── docker-compose.yml          # 16-service stack
├── ecosystem.config.js         # PM2 config
├── Makefile                    # Dev commands (40+)
├── .env                        # Environment variables
└── SYSTEM-ARCHITECTURE.md      # (file này)
```

---

## 4. Hạ tầng & Dịch vụ (Docker)

### 16 Services trong docker-compose.yml

| Service | Image | Port | Vai trò |
|---------|-------|------|---------|
| **postgres** | postgres:17 | 5432 | Database chính — lưu toàn bộ dữ liệu kinh doanh |
| **redis** | redis:7 | 6379 | Cache + Job Queue (Bull) |
| **minio** | minio/minio | 9000/9001 | Lưu file/ảnh (S3-compatible) |
| **qdrant** | qdrant/qdrant | 6333 | Vector DB cho RAG & semantic search |
| **ollama** | ollama/ollama | 11434 | Local LLM inference (Qwen2.5:7b) |
| **open-webui** | open-webui | — | Giao diện quản lý LLM |
| **n8n** | n8nio/n8n | 5678 | Workflow automation no-code |
| **api** | custom NestJS | 3001 | Backend API + AI Agents |
| **web** | custom Next.js | 3000 | Frontend dashboard |
| **nginx** | nginx:alpine | 8080 | Reverse proxy |
| **prometheus** | prom/prometheus | 9090 | Thu thập metrics |
| **grafana** | grafana/grafana | 3003 | Hiển thị metrics |
| **loki** | grafana/loki | 3100 | Log aggregation |
| **uptime-kuma** | louislam/uptime-kuma | 3002 | Uptime monitoring |

> Tất cả services đều có **healthcheck** và kết nối qua network `commerce_network`.

### Luồng Request Nginx

```
Client Request
      │
      ▼ :8080
  NGINX
  ├── /api/*        → api:3001   (REST API)
  ├── /_next/*      → web:3000   (Static assets)
  ├── /health       → 200 OK     (Health check)
  └── /*            → web:3000   (Frontend)
```

---

## 5. Backend API (NestJS)

### 33 Feature Modules — Phân nhóm chức năng

#### Nhóm 1: Core E-commerce
| Module | Controller | Service | Chức năng |
|--------|-----------|---------|-----------|
| `products` | `/products` | ProductsService | CRUD sản phẩm, phân loại, tìm kiếm |
| `categories` | `/categories` | CategoriesService | Quản lý danh mục |
| `brands` | `/brands` | BrandsService | Quản lý thương hiệu + upload logo |
| `inventory` | `/inventory` | InventoryService | Quản lý tồn kho, cảnh báo hết hàng |
| `orders` | `/orders` | OrdersService | Đơn hàng, doanh thu, báo cáo |
| `customers` | `/customers` | CustomersService | Hồ sơ khách hàng, phân tầng (NEW/REGULAR/VIP) |
| `suppliers` | `/suppliers` | SuppliersService | Nhà cung cấp + sản phẩm nhà cung cấp |
| `payments` | `/payments` | PaymentsService | Thanh toán, thống kê |

#### Nhóm 2: Marketing & Growth
| Module | Controller | Service | Chức năng |
|--------|-----------|---------|-----------|
| `leads` | `/leads` | LeadsService | Khách hàng tiềm năng, trạng thái, nguồn |
| `campaigns` | `/campaigns` | CampaignsService | Chiến dịch marketing đa kênh |
| `workflows` | `/workflows` | WorkflowsService | Luồng tự động hóa kinh doanh |
| `content-factory` | `/content-factory` | ContentFactoryService | Tạo nội dung AI hàng loạt |
| `affiliate-portal` | `/affiliate-portal` | AffiliatePortalService | Portal cho đối tác affiliate |
| `affiliate-intelligence` | `/affiliate-intelligence` | AffiliateIntelligenceService | AI phân tích hiệu quả affiliate |
| `commissions` | `/commissions` | CommissionsService | Hoa hồng, tính toán |

#### Nhóm 3: Marketplace & Fulfillment
| Module | Controller | Service | Chức năng |
|--------|-----------|---------|-----------|
| `marketplace` | `/marketplace` | MarketplaceService | Tích hợp Shopee, Lazada, TikTok |
| `dropship` | `/dropship` | DropshipService | Đơn hàng dropship tự động |

#### Nhóm 4: AI & Intelligence
| Module | Controller | Service | Chức năng |
|--------|-----------|---------|-----------|
| `ai` | `/ai` | AiService | Interface LLM chính |
| `ai-memory` | `/ai-memory` | AiMemoryService | Bộ nhớ ngữ cảnh (4 loại) |
| `rag` | `/rag` | RagService | Retrieval-Augmented Generation |
| `knowledge-brain` | `/knowledge-brain` | KnowledgeBrainService | Trí tuệ đa miền |
| `ai-board` | `/ai-board` | AiBoardService | Hội đồng quản trị AI (7 persona) |
| `self-improvement` | `/self-improvement` | SelfImprovementService | Vòng lặp học hỏi & tự cải tiến |
| `agents` | `/agents` | AgentsService | Orchestration 25+ AI agents |

#### Nhóm 5: Analytics & Reporting
| Module | Controller | Service | Chức năng |
|--------|-----------|---------|-----------|
| `analytics` | `/analytics` | AnalyticsService | Doanh thu, leads, khách hàng |
| `business-os` | `/business-os` | BusinessOsService | Dashboard điều hành chiến lược |

#### Nhóm 6: Enterprise & Infrastructure
| Module | Controller | Service | Chức năng |
|--------|-----------|---------|-----------|
| `enterprise` | `/enterprise` | EnterpriseService | Multi-site management |
| `white-label` | `/white-label` | WhiteLabelService | Quản lý khách hàng white-label |
| `mobile` | `/mobile` | MobileService | Metrics ứng dụng di động |
| `auth` | `/auth` | AuthService | JWT Authentication (access + refresh) |
| `users` | `/users` | UsersService | RBAC — quản lý người dùng & vai trò |
| `gateway` | — | AppGateway | WebSocket real-time events |

---

## 6. Database Entities

### Sơ đồ quan hệ tổng quát

```
Tenant (multi-tenant root)
  └── User (RBAC: ADMIN / MANAGER / STAFF / VIEWER)

Product ──────────────── Category
   │                        │
   ├── Inventory             └── Brand
   ├── SupplierProduct ── Supplier
   ├── Content (JSONB metadata)
   ├── DropshipProduct
   └── VideoJob

Order ──── OrderItem ──── Product
  │
  └── Customer (NEW | REGULAR | VIP)
        └── AiMemory (4 types)

Lead (status: NEW|CONTACTED|QUALIFIED|CONVERTED|LOST)
  └── Campaign

Affiliate ── AffiliatePartner
           ├── AffiliateClick
           └── AffiliateConversion
               └── Commission

MarketplaceVendor
MarketplaceDispute

AgentLog (25+ agent names, status: SUCCESS|FAILED|RUNNING)
AgentConfig

Knowledge (5 domains × 4 tiers)

── Self-Improvement V6 ──
LearningCycle
LessonLearned
DecisionMemory
Experiment
PerformanceScorecard
```

### Danh sách Entity chính

| Entity | Mô tả |
|--------|-------|
| `Product` | Sản phẩm (nguồn: SHOPEE/LAZADA/TIKTOK/MANUAL) |
| `Customer` | Khách hàng (tier: NEW/REGULAR/VIP) |
| `Order` / `OrderItem` | Đơn hàng và chi tiết |
| `Lead` | Khách hàng tiềm năng |
| `Category` / `Brand` | Danh mục & thương hiệu |
| `Inventory` | Tồn kho |
| `Supplier` / `SupplierProduct` | Nhà cung cấp |
| `Payment` | Thanh toán |
| `Campaign` | Chiến dịch |
| `Workflow` | Luồng tự động |
| `EmailCampaign` | Email marketing |
| `Content` | Nội dung (JSONB metadata) |
| `VideoJob` | Công việc tạo video |
| `SeoArticle` | Bài viết SEO |
| `PriceAlert` | Cảnh báo giá |
| `Affiliate` / `AffiliatePartner` | Đối tác tiếp thị |
| `AffiliateClick` / `AffiliateConversion` | Theo dõi click/chuyển đổi |
| `Commission` | Hoa hồng |
| `DropshipProduct` / `DropshipOrder` | Dropshipping |
| `MarketplaceVendor` / `MarketplaceDispute` | Sàn TMĐT |
| `AgentLog` | Lịch sử chạy agent |
| `AgentConfig` | Cấu hình agent |
| `AiMemory` | Bộ nhớ AI (4 loại) |
| `Knowledge` | Kiến thức (5 miền, 4 tầng) |
| `Tenant` | Multi-tenant |
| `WhiteLabelClient` | Khách hàng white-label |
| `User` | Người dùng hệ thống |
| `MobileSession` | Phiên ứng dụng di động |
| `LearningCycle` | Chu kỳ học (V6) |
| `LessonLearned` | Bài học rút ra (V6) |
| `DecisionMemory` | Bộ nhớ quyết định (V6) |
| `Experiment` | Thí nghiệm A/B (V6) |
| `PerformanceScorecard` | Bảng điểm KPI (V6) |

---

## 7. AI Agents — 25+ tác nhân tự động

### Kiến trúc chung của Agent

```
┌─────────────────────────────────────────────────────┐
│                   AGENT LIFECYCLE                   │
│                                                     │
│  Cron Trigger (Scheduled)                           │
│       │                                             │
│       ▼                                             │
│  AgentLog.create(status: RUNNING)                   │
│       │                                             │
│       ▼                                             │
│  Business Logic                                     │
│  ├── Query PostgreSQL (business data)               │
│  ├── Call LLM (OpenRouter/Ollama)                   │
│  ├── RAG search (Qdrant)                            │
│  └── Output: JSON result                            │
│       │                                             │
│       ▼                                             │
│  AgentLog.update(status: SUCCESS/FAILED)            │
│  ├── input/output JSON stored                       │
│  ├── token count & cost tracked                     │
│  └── duration measured                             │
└─────────────────────────────────────────────────────┘
```

### Phân loại theo thế hệ

#### V1 — Foundation Agents
| Agent | Lịch chạy | Chức năng |
|-------|-----------|-----------|
| **Trend Agent** | 6:00 sáng hàng ngày | Quét xu hướng Shopee/Lazada/TikTok, phát hiện sản phẩm hot |
| **Affiliate Agent** | Theo lịch | Quản lý link affiliate, theo dõi tracking |
| **Content Agent** | Theo lịch | Tạo mô tả sản phẩm, nội dung marketing |
| **Sales Agent** | Theo lịch | Hỗ trợ bán hàng, upselling tự động |

#### V2 — Advanced Agents
| Agent | Lịch chạy | Chức năng |
|-------|-----------|-----------|
| **Master Agent** | Mỗi giờ | Điều phối tổng thể, đánh giá KPI |
| **Video Agent** | Theo lịch | Tạo video content (TTS: OpenAI/Kokoro) |
| **SEO Agent** | Theo lịch | Viết bài SEO, tối ưu từ khóa |
| **Trend Predictor** | Theo lịch | Dự báo xu hướng thị trường |
| **Price Agent** | Theo lịch | Theo dõi giá, cảnh báo thay đổi |
| **Segmentation Agent** | Theo lịch | Phân khúc khách hàng tự động |
| **Email Agent** | Theo lịch | Gửi email marketing (Agent 13) |
| **Telegram Agent** | Theo lịch | Tự động hóa Telegram bot (Agent 14) |
| **Review Agent** | Theo lịch | Giám sát & phân tích đánh giá sản phẩm |

#### V3 — Specialized Agents
| Agent | Lịch chạy | Chức năng |
|-------|-----------|-----------|
| **Publisher Agent** | Theo lịch | Đăng bài mạng xã hội (Facebook, Telegram) |
| **Lead Hunter** | Theo lịch | Tìm kiếm và đủ điều kiện leads |
| **CRM Agent** | Theo lịch | Tự động hóa quan hệ khách hàng |
| **Knowledge Agent** | Theo lịch | Đồng bộ hóa knowledge base |

#### V4 — Optimization Agents
| Agent | Lịch chạy | Chức năng |
|-------|-----------|-----------|
| **Video Optimizer** | Theo lịch | Tối ưu hiệu suất video |
| **Competitor Monitor** | Theo lịch | Theo dõi giá & sản phẩm đối thủ |
| **Demand Forecaster** | Theo lịch | Dự báo nhu cầu thị trường |
| **Repricing Agent** | Theo lịch | Tự động điều chỉnh giá |

#### V5 — Enterprise Agents
| Agent | Lịch chạy | Chức năng |
|-------|-----------|-----------|
| **Marketplace Optimizer** | Theo lịch | Tối ưu đa nền tảng sàn TMĐT |
| **Mobile Engagement** | Theo lịch | Tăng tương tác ứng dụng di động |
| **Enterprise Health** | Theo lịch | Giám sát sức khỏe multi-site |
| **Whitelabel Onboarding** | Theo lịch | Tự động onboard khách white-label |

### API Agents

```
POST /agents/master/run        # Chạy master agent thủ công
POST /agents/{name}/run        # Chạy agent cụ thể
GET  /agents/{name}/stats      # Thống kê agent
GET  /agents/logs              # Xem lịch sử agent
```

---

## 8. AI/ML Core Systems

### 8.1 RAG (Retrieval-Augmented Generation)

```
Luồng RAG:
User Query
    │
    ▼
OpenAI Embedding (1536 dim)
    │
    ▼
Qdrant Vector Search
    │
    ▼
Top-K Documents Retrieved
    │
    ▼
LLM Prompt + Context
    │
    ▼
Response
```

**9 Qdrant Collections:**
| Collection | Dữ liệu |
|-----------|---------|
| `products` | Thông tin sản phẩm |
| `customers` | Hồ sơ khách hàng |
| `faq` | Câu hỏi thường gặp |
| `orders` | Lịch sử đơn hàng |
| `affiliate` | Affiliate content |
| `marketing` | Nội dung marketing |
| `business` | Dữ liệu kinh doanh |
| `market` | Dữ liệu thị trường |
| `operational` | Dữ liệu vận hành |

---

### 8.2 AI Memory System

```
AiMemory Entity:
├── CHAT_HISTORY        — Lịch sử hội thoại
├── CUSTOMER_BEHAVIOR   — Hành vi khách hàng
├── PURCHASE_HISTORY    — Lịch sử mua hàng
└── VIEWED_PRODUCTS     — Sản phẩm đã xem
```

**Sử dụng:** Cá nhân hóa đề xuất, ngữ cảnh cho LLM calls.

---

### 8.3 Knowledge Brain (22K+ dòng code)

```
5 Miền kiến thức × 4 Tầng phân tích:

Miền:                       Tầng:
├── Product Intelligence    ├── DATA        (dữ liệu thô)
├── Customer Intelligence   ├── INSIGHTS    (hiểu biết)
├── Business Intelligence   ├── PREDICTIONS (dự báo)
├── Market Intelligence     └── RECOMMENDATIONS (khuyến nghị)
└── Operational Intelligence

API:
GET  /knowledge-brain/dashboard   # Tổng quan đa miền
POST /knowledge-brain/ask         # Đặt câu hỏi bằng ngôn ngữ tự nhiên
```

---

### 8.4 AI Board of Directors (31K+ dòng code)

```
7 AI Persona — Hội đồng Quản trị:

CEO — Chief Executive Officer
 └── Chiến lược tổng thể, định hướng công ty

CFO — Chief Financial Officer
 └── Phân tích tài chính, ngân sách, ROI

COO — Chief Operating Officer
 └── Vận hành, quy trình, hiệu quả

CTO — Chief Technology Officer
 └── Kiến trúc kỹ thuật, roadmap công nghệ

CMO — Chief Marketing Officer
 └── Marketing, thương hiệu, tăng trưởng

CRO — Chief Revenue Officer
 └── Doanh thu, bán hàng, affiliate

CSO — Chief Strategy Officer
 └── Chiến lược dài hạn, phân tích thị trường

API:
GET /ai-board/ceo      # Báo cáo & khuyến nghị CEO
GET /ai-board/cfo      # Phân tích CFO
GET /ai-board/coo      # Đánh giá COO
GET /ai-board/cto      # Roadmap CTO
GET /ai-board/cmo      # Chiến lược CMO
GET /ai-board/cro      # Phân tích CRO
GET /ai-board/cso      # Tầm nhìn CSO
POST /ai-board/meeting  # Tạo cuộc họp hội đồng
```

---

### 8.5 Self-Improvement Loop — V6 (645 dòng code)

```
Vòng lặp học hỏi tự động:

Daily Loop ──── Weekly Analysis ──── Monthly Evolution
    │
    ├── Thu thập metrics hiệu suất
    ├── So sánh với KPI mục tiêu
    ├── Xác định bài học (LessonLearned)
    │   ├── WINNING_STRATEGY — chiến lược thắng
    │   ├── FAILED_STRATEGY  — chiến lược thất bại
    │   └── PROVEN_PATTERN   — mô hình đã chứng minh
    ├── Ghi nhớ quyết định (DecisionMemory)
    ├── Tạo/đánh giá Experiment (A/B test)
    └── Cập nhật PerformanceScorecard

API:
POST /self-improvement/daily-loop    # Chạy vòng lặp hàng ngày
GET  /self-improvement/scorecard     # Bảng điểm KPI
GET  /self-improvement/lessons       # Bài học rút ra
GET  /self-improvement/experiments   # Thí nghiệm đang chạy
```

---

## 9. Frontend (Next.js)

### Cấu trúc Route — 28 Dashboard Pages

```
/login                     # Đăng nhập

/(dashboard)/              # Layout bảo vệ (auth required)
├── (root)/                # Dashboard tổng quan
│
├── Core E-commerce:
│   ├── products/          # Quản lý sản phẩm (CRUD, upload)
│   ├── orders/            # Quản lý đơn hàng
│   ├── customers/         # Hồ sơ khách hàng
│   ├── inventory/         # Quản lý tồn kho
│   ├── categories/        # Danh mục
│   ├── brands/            # Thương hiệu
│   └── suppliers/         # Nhà cung cấp
│
├── Marketing & Growth:
│   ├── leads/             # Quản lý leads
│   ├── campaigns/         # Chiến dịch marketing
│   ├── workflows/         # Luồng tự động
│   ├── affiliates/        # Affiliate portal
│   └── dropship/          # Dropship orders
│
├── Marketplace:
│   ├── marketplace/       # Tích hợp sàn TMĐT
│   └── payments/          # Thanh toán
│
├── AI & Intelligence:
│   ├── agents/            # Quản lý & giám sát agents
│   ├── knowledge-brain/   # Knowledge Brain dashboard
│   ├── ai-board/          # Hội đồng AI
│   └── self-improvement/  # Vòng lặp cải tiến
│
├── Analytics:
│   ├── analytics/         # Báo cáo & phân tích
│   └── business-os/       # Dashboard điều hành
│
└── Enterprise:
    ├── enterprise/        # Multi-site management
    ├── white-label/       # White-label clients
    ├── mobile-metrics/    # Mobile app analytics
    └── settings/          # Cài đặt hệ thống
```

### Component Library

| Component | Chức năng |
|-----------|-----------|
| `Sidebar.tsx` | Navigation sidebar với all routes |
| `DataTable.tsx` | Bảng dữ liệu có sort, filter, paginate |
| `Modal.tsx` | Dialog/popup chung |
| `StatCard.tsx` | KPI card hiển thị metric |
| `PageHeader.tsx` | Header trang với title & actions |
| `Logo.tsx` | Logo thương hiệu |

### API Client (`lib/api.ts` — 318 dòng)

TypeScript typed client cho 27 API modules:
```typescript
// Mẫu sử dụng
import { api } from '@/lib/api'

api.products.list()           // GET /products
api.orders.getRevenue()       // GET /orders/revenue
api.knowledgeBrain.ask(q)     // POST /knowledge-brain/ask
api.aiBoard.ceo()             // GET /ai-board/ceo
api.agents.run('master')      // POST /agents/master/run
```

---

## 10. Luồng dữ liệu chính

### 10.1 Luồng đặt hàng (Order Flow)

```
Khách hàng → Frontend → API
                          │
                          ├── Kiểm tra inventory
                          ├── Tạo Order + OrderItems
                          ├── Cập nhật Inventory
                          ├── Tạo Payment record
                          ├── Gửi xác nhận (Email Agent)
                          └── WebSocket notification → Frontend
```

### 10.2 Luồng AI Agent (Agent Execution Flow)

```
Cron Scheduler (NestJS @Cron)
      │
      ▼
AgentService.run()
      │
      ├── Log: RUNNING (AgentLog.create)
      │
      ├── Query data (PostgreSQL)
      │
      ├── LLM Call
      │   ├── OpenRouter API (cloud)
      │   └── Ollama (local fallback)
      │
      ├── Process result
      │   ├── Store to DB
      │   ├── Update entities
      │   └── Trigger downstream agents
      │
      └── Log: SUCCESS/FAILED (AgentLog.update)
           ├── output JSON
           ├── token_count
           ├── cost_usd
           └── duration_ms
```

### 10.3 Luồng RAG / Knowledge Query

```
User Query (text)
      │
      ▼
Embedding (OpenAI text-embedding-3)
      │
      ▼
Qdrant Vector Search (top-5 results)
      │
      ▼
Context Building (retrieved docs + query)
      │
      ▼
LLM Generation (OpenRouter / Ollama)
      │
      ▼
Structured Response + Citations
```

### 10.4 Luồng Marketplace Sync

```
Cron: Trend Agent (6:00 AM daily)
      │
      ├── Shopee API → Trending products
      ├── Lazada API → Top sellers
      └── TikTok Shop API → Viral items
              │
              ▼
      Phân tích & xếp hạng (LLM)
              │
              ▼
      Lưu vào Products table
              │
              ▼
      Index vào Qdrant (RAG)
              │
              ▼
      Notify Master Agent
```

### 10.5 Luồng Authentication

```
POST /auth/login
      │
      ├── Validate credentials (bcrypt)
      ├── Generate JWT access token (1h)
      ├── Generate JWT refresh token (30d)
      └── Return { access_token, refresh_token, user }

Protected Routes:
Bearer token → JWT Guard → Role Guard → Controller
```

---

## 11. Tích hợp bên ngoài

### Marketplace APIs
| Platform | Tích hợp | Mục đích |
|---------|---------|---------|
| **Shopee** | REST API (APP_ID + SECRET) | Đồng bộ sản phẩm, đơn hàng |
| **Lazada** | REST API (App Key + Token) | Quản lý listing, order sync |
| **TikTok Shop** | REST API (App Key + Token) | Video commerce, live selling |

### AI & LLM
| Provider | Model | Mục đích |
|---------|-------|---------|
| **OpenRouter** | mistral-7b-instruct | Production LLM calls |
| **OpenAI** | gpt-4, embeddings | Embedding, GPT-4 tasks |
| **Ollama (local)** | qwen2.5:7b | Local inference, backup |
| **Kokoro TTS** | Local | Text-to-Speech cho video |

### Communication
| Kênh | Config | Mục đích |
|-----|--------|---------|
| **Telegram** | BOT_TOKEN + CHANNEL_ID | Thông báo, bot tự động |
| **Gmail SMTP** | SMTP credentials | Email marketing |
| **FCM** | SERVER_KEY | Push notification Android |
| **APNS** | Certificates | Push notification iOS |

### Social Media
| Platform | Config | Mục đích |
|---------|--------|---------|
| **Facebook** | PAGE_ID + ACCESS_TOKEN | Đăng bài tự động |

---

## 12. Quan sát & Giám sát

### Monitoring Stack

```
API Metrics (/metrics)
        │
        ▼
Prometheus :9090 ─── scrape every 15s
        │
        ▼
Grafana :3003 ─── Dashboard visualization
        │
        ▼
Alert rules → Telegram notification

Application Logs
        │
        ▼
Loki :3100 ─── Log aggregation
        │
        ▼
Grafana ─── Log visualization

Uptime Monitoring
        │
Uptime Kuma :3002 ─── Check all endpoints
```

### Prometheus Targets
- `api:3001/metrics` — Application metrics
- PostgreSQL exporter — DB metrics
- Redis exporter — Cache metrics
- Node exporter — System metrics

### PM2 Process Manager (Production)

```
commerce-api  (Node.js)  port 3002  dist/main.js   max 512MB
commerce-web  (Next.js)  port 3003  server mode     max 512MB

Logs:
/logs/api-error.log
/logs/api-out.log
/logs/web-error.log
/logs/web-out.log
```

---

## 13. CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```
Trigger: push to main / workflow_dispatch

Job 1: Docker Build & Push
─────────────────────────
  ✓ Checkout repository
  ✓ Login to Docker Hub
  ✓ Build API image → hqdu/webbanhang-api:latest + :sha
  ✓ Build Web image → hqdu/webbanhang-web:latest + :sha
  ✓ Push both images

Job 2: VPS Deploy (depends on Job 1)
─────────────────────────────────────
  ✓ SSH vào VPS
  ✓ git pull latest
  ✓ npm install --production
  ✓ npm run build (api + web)
  ✓ pm2 restart all --update-env
  ✓ Health check: curl localhost:3002/health

Job 3: Telegram Notification (always runs)
───────────────────────────────────────────
  ✓ Gửi kết quả deploy lên Telegram
  ✓ Include: commit hash, author, branch, image tags, timestamp
```

### Makefile Commands

```bash
# Phát triển
make dev          # Khởi động API ở dev mode
make dev-web      # Khởi động Web ở dev mode
make infra        # Khởi động chỉ infrastructure services

# Docker
make up           # docker compose up -d
make down         # docker compose down
make logs         # xem logs
make restart-api  # restart API container

# Database
make db-reset     # Reset database
make psql         # Kết nối PostgreSQL
make backup       # Backup database

# AI & Agents
make run-agents   # Chạy agents thủ công
make agent-logs   # Xem logs agent từ DB
make pull-model   # Download ollama qwen2.5:7b

# Monitoring
make health       # Health check toàn hệ thống
make kpi          # Xem KPI dashboard
make monitoring   # Xem monitoring
make qdrant       # Xem Qdrant collections

# API Docs
make docs         # Mở Swagger UI
```

---

## 14. Cấu hình môi trường

### Biến môi trường quan trọng (`.env`)

```bash
# === Infrastructure ===
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=commerce_user
POSTGRES_PASSWORD=...
POSTGRES_DB=commerce_db

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=...

MINIO_ROOT_USER=...
MINIO_ROOT_PASSWORD=...
MINIO_BUCKET_PRODUCTS=products
MINIO_BUCKET_CONTENT=content

QDRANT_URL=http://qdrant
QDRANT_PORT=6333
QDRANT_API_KEY=...

# === API ===
APP_PORT=3001
APP_SECRET=...
NODE_ENV=production
JWT_ACCESS_EXPIRES=3600      # 1 giờ
JWT_REFRESH_EXPIRES=2592000  # 30 ngày
WS_PORT=3001
WEBHOOK_SECRET=...

# === LLM / AI ===
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=mistral-7b-instruct
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:7b
OPENAI_API_KEY=...
KOKORO_URL=http://kokoro:8880
TTS_PROVIDER=openai  # hoặc kokoro

# === Marketplace ===
SHOPEE_APP_ID=...
SHOPEE_SECRET=...
LAZADA_APP_KEY=...
LAZADA_APP_SECRET=...
LAZADA_ACCESS_TOKEN=...
TIKTOK_APP_KEY=...
TIKTOK_APP_SECRET=...
TIKTOK_ACCESS_TOKEN=...

# === Social & Communication ===
FACEBOOK_PAGE_ID=...
FACEBOOK_ACCESS_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...

# === Monitoring ===
PROMETHEUS_PORT=9090
GRAFANA_PORT=3003
LOKI_PORT=3100
UPTIME_KUMA_PORT=3002

# === Enterprise Features ===
ENABLE_MULTI_TENANT=false
TENANT_ID=default
AFFILIATE_COMMISSION_DEFAULT=8  # phần trăm
AFFILIATE_COOKIE_DAYS=30
LIVESTREAM_PLATFORM=...
LIVESTREAM_STREAM_KEY=...
FCM_SERVER_KEY=...

# === Backup ===
BACKUP_S3_BUCKET=...
BACKUP_RETENTION_DAYS=30

# === N8N Workflow ===
N8N_USER=admin
N8N_PASSWORD=...
N8N_HOST=http://n8n:5678
```

---

## Tóm tắt công nghệ

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend Framework** | NestJS | 10.3.0 |
| **Frontend Framework** | Next.js | 16.2.9 |
| **UI Library** | React | 19.2.4 |
| **Styling** | Tailwind CSS | 4 |
| **Language** | TypeScript | 5.3.3 / 5 |
| **Database** | PostgreSQL | 17 |
| **ORM** | TypeORM | latest |
| **Cache / Queue** | Redis | 7 |
| **Vector DB** | Qdrant | latest |
| **File Storage** | MinIO | latest |
| **Local LLM** | Ollama (Qwen2.5:7b) | latest |
| **Workflow Auto** | N8N | latest |
| **Container** | Docker / Docker Compose | 20+ |
| **Reverse Proxy** | Nginx | alpine |
| **Process Manager** | PM2 | latest |
| **Metrics** | Prometheus + Grafana | latest |
| **Logging** | Loki | latest |
| **Uptime** | Uptime Kuma | latest |
| **CI/CD** | GitHub Actions | latest |

---

*Tài liệu được tạo tự động từ phân tích codebase. Cập nhật khi có thay đổi kiến trúc lớn.*
