# architecture_report.md
**AI Social Commerce OS — Foundation Audit V1**
**Date:** 2026-06-11

---

## System Overview

Hệ thống là một **AI Social Commerce Platform** đa nền tảng, được xây dựng theo kiến trúc monorepo. Nó kết hợp quản lý thương mại điện tử truyền thống (sản phẩm, đơn hàng, khách hàng) với **26 AI agents** tự động hóa toàn bộ quy trình bán hàng từ nội dung đến phân phối.

**Deployment Model:**
- **Development:** Docker Compose (toàn bộ stack trong container)
- **Production:** PM2 (API + Web chạy native trên VPS) + Docker Compose (infrastructure services)
- **CI/CD:** GitHub Actions → Docker Hub → PM2 restart

**Điểm đặc biệt:**
- Self-Improvement Loop (v6): hệ thống tự học từ kết quả agent
- Multi-tenant infrastructure (hiện disable)
- 26 AI agents phân tầng (v1→v5)
- RAG pipeline với Qdrant vector DB
- Multi-marketplace (Shopee, Lazada, TikTok Shop)

---

## Module Overview

### Backend Modules (33 total — NestJS)

**Nhóm Core CRUD (10 modules):**
| Module | Mục đích |
|--------|----------|
| products | Quản lý sản phẩm, CRUD |
| customers | Hồ sơ khách hàng, CRM |
| orders | Xử lý đơn hàng |
| leads | Quản lý lead bán hàng |
| categories | Danh mục sản phẩm |
| brands | Thương hiệu |
| inventory | Quản lý tồn kho |
| suppliers | Nhà cung cấp |
| payments | Xử lý thanh toán |
| campaigns | Chiến dịch marketing |

**Nhóm AI Agents — v1 (4 agents):**
| Agent | Mục đích |
|-------|----------|
| agents/trend | Phân tích xu hướng thị trường |
| agents/affiliate | Tự động hóa affiliate marketing |
| agents/content | Tạo nội dung tự động |
| agents/sales | Tự động hóa bán hàng |

**Nhóm AI Agents — v2 (10 agents):**
| Agent | Mục đích |
|-------|----------|
| agents/master | Điều phối tổng thể |
| agents/video | Tạo video content |
| agents/seo | Tối ưu SEO |
| agents/trend-predictor | Dự báo xu hướng |
| agents/price | Định giá động |
| agents/segmentation | Phân khúc khách hàng |
| agents/email | Email marketing tự động |
| agents/telegram | Marketing qua Telegram |
| agents/review | Quản lý đánh giá |
| agents/knowledge | Knowledge base |

**Nhóm AI Agents — v3 (4 agents):**
| Agent | Mục đích |
|-------|----------|
| agents/publisher | Xuất bản đa nền tảng |
| agents/lead-hunter | Tìm kiếm lead tự động |
| agents/crm | CRM automation |
| agents/knowledge | Quản lý kiến thức nâng cao |

**Nhóm AI Agents — v4 (4 agents):**
| Agent | Mục đích |
|-------|----------|
| agents/video-optimizer | Tối ưu video |
| agents/competitor-monitor | Theo dõi đối thủ |
| agents/demand-forecaster | Dự báo nhu cầu |
| agents/repricing | Tự động định giá lại |

**Nhóm AI Agents — v5 (4 agents):**
| Agent | Mục đích |
|-------|----------|
| agents/marketplace-optimizer | Tối ưu marketplace |
| agents/mobile-engagement | Engagement mobile users |
| agents/enterprise-health | Giám sát sức khỏe enterprise |
| agents/whitelabel-onboarding | Onboarding white-label clients |

**Nhóm AI Core (5 modules):**
| Module | Mục đích |
|--------|----------|
| rag | Retrieval-Augmented Generation pipeline |
| knowledge-brain | Knowledge base + RAG integration |
| ai-memory | Lưu trữ context AI giữa các phiên |
| ai-board | AI Board of Directors — ra quyết định chiến lược |
| self-improvement | Learning loop, self-optimization |

**Nhóm Business (5 modules):**
| Module | Mục đích |
|--------|----------|
| content-factory | Factory tạo nội dung hàng loạt |
| affiliate-intelligence | Phân tích affiliate |
| affiliate-portal | Cổng quản lý affiliate |
| business-os | Business Operating System |
| analytics | Metrics & reporting |

**Nhóm Advanced Features (7 modules):**
| Module | Mục đích |
|--------|----------|
| dropship | Quản lý dropshipping |
| enterprise | Tính năng enterprise |
| white-label | Giải pháp white-label |
| mobile | Hỗ trợ mobile app |
| marketplace | Shopee/Lazada/TikTok Shop APIs |
| workflows | Workflow automation builder |
| ai | Generic AI integration |

**Nhóm Infrastructure (3 modules):**
| Module | Mục đích |
|--------|----------|
| users | Quản lý người dùng |
| auth | Xác thực & phân quyền (JWT, RBAC) |
| gateway | WebSocket gateway (Socket.io) |

---

## Service Overview

### Backend Services — NestJS (port 3001/3002)

| Layer | Tech | Cấu hình |
|-------|------|----------|
| HTTP Framework | NestJS 10.3.0 | Express adapter |
| Real-time | Socket.io 4.7.4 | Cùng port với HTTP |
| Job Queue | Bull + Redis | Background jobs |
| Scheduler | @nestjs/schedule | Cron jobs cho agents |
| Validation | class-validator | Global pipe |
| Documentation | Swagger UI | `/api/docs` |
| ORM | TypeORM 0.3.19 | PostgreSQL driver |

### Frontend Services — Next.js (port 3000/3003)

| Layer | Tech | Cấu hình |
|-------|------|----------|
| Framework | Next.js 16.2.9 | App Router |
| React | 19.2.4 | Concurrent Mode |
| Styling | Tailwind CSS v4 | PostCSS |
| Output | standalone | Self-contained build |
| API Proxy | next.config rewrites | `/api/*` → backend |

### Infrastructure Services

| Service | Image | Port | Vai trò |
|---------|-------|------|---------|
| PostgreSQL 17 | postgres:17 | 5432 | Primary database |
| Redis 7 | redis:7-alpine | 6379 | Cache + job queue |
| MinIO | minio/minio | 9000/9001 | Object storage (S3) |
| Qdrant | qdrant/qdrant | 6333/6334 | Vector DB (RAG) |
| Ollama | ollama/ollama | 11434 | Local LLM (qwen2.5:7b) |
| Open WebUI | open-webui | 3000 | LLM management UI |
| n8n | n8nio/n8n | 5678 | Workflow automation |
| Nginx | nginx:alpine | 8080 | Reverse proxy |
| Prometheus | prom/prometheus | 9090 | Metrics collection |
| Grafana | grafana/grafana | 3003 | Metrics visualization |
| Loki | grafana/loki | 3100 | Log aggregation |
| Uptime Kuma | louislam/uptime-kuma | 3002 | Uptime monitoring |

---

## Dependency Overview

### Backend Critical Dependencies

```
NestJS Core Stack:
  @nestjs/common, @nestjs/core, @nestjs/platform-express → v10.3.0
  @nestjs/config → env management
  @nestjs/schedule → cron jobs (agents run on schedule)
  @nestjs/bull → job queues (background processing)
  @nestjs/websockets + @nestjs/platform-socket.io → real-time

Database:
  typeorm@0.3.19 + pg@8.11.3 → PostgreSQL
  ioredis@5.3.2 → Redis

Storage:
  minio@7.1.3 → file uploads/storage

External HTTP:
  axios@1.6.5 → marketplace APIs, AI services

Utilities:
  class-validator + class-transformer → request validation
  nodemailer → email marketing
  dayjs → date handling
  socket.io → WebSocket
```

### Frontend Critical Dependencies

```
Next.js 16.2.9 + React 19.2.4
Tailwind CSS v4 (PostCSS)
TypeScript 5.x
No state management library (useState/Context only)
No UI component library (custom components)
No chart library detected
```

### Service Dependencies (Docker network: commerce_network)

```
api → postgres, redis, minio, qdrant, ollama
web → api (via HTTP rewrite)
nginx → api, web
prometheus → api (metrics scraping)
grafana → prometheus, loki
n8n → postgres (separate DB: n8n)
```

---

## Infrastructure Overview

### Network Architecture

```
Internet
    │
    ▼
[Nginx :8080] ──────────────────────────────────
    │                                            │
    ▼                                            ▼
[NestJS API :3001]                  [Next.js Web :3000]
    │
    ├── [PostgreSQL :5432]
    ├── [Redis :6379]
    ├── [MinIO :9000]
    ├── [Qdrant :6333]
    └── [Ollama :11434]

Monitoring Stack (biệt lập):
[Prometheus :9090] ← scrapes → [API /metrics]
[Grafana :3003] ← queries → [Prometheus, Loki]
[Loki :3100] ← receives → [API logs]
[Uptime Kuma :3002] ← polls → [all services]
```

### Deployment Topology (Production)

```
VPS Server
├── PM2 Process Manager
│   ├── commerce-api (port 3002, max 512MB RAM)
│   └── commerce-web (port 3003, max 512MB RAM)
├── Docker Compose (infrastructure only)
│   ├── postgres, redis, minio, qdrant
│   ├── ollama, n8n
│   └── monitoring stack
└── Nginx (port 8080 → routing)
```

### CI/CD Pipeline

```
git push → main
    │
    ▼
GitHub Actions
    ├── Job 1: Docker Build & Push (Docker Hub)
    │   ├── hqdu/webbanhang-api:latest
    │   └── hqdu/webbanhang-web:latest
    ├── Job 2: VPS Deploy (PM2)
    │   ├── npm ci + npm run build (API)
    │   ├── npm ci + npm run build (Web)
    │   └── pm2 restart --update-env
    └── Job 3: Telegram Notification
        └── Báo cáo kết quả deploy
```

### Storage Architecture

**MinIO Buckets:**
- `products` — hình ảnh sản phẩm
- `content` — nội dung marketing (hình, bài viết)
- `videos` — video được tạo bởi video agents

**PostgreSQL Databases:**
- `ai_commerce` — database chính (43 entities)
- `n8n` — database riêng cho n8n workflows

**Qdrant Collections:**
- Dùng cho RAG (knowledge brain)
- Embeddings tìm kiếm semantic

**Redis:**
- Cache dữ liệu
- Job queue (Bull)
- Session storage

---

*Audit conducted: 2026-06-11 | Version: Foundation Audit V1*
