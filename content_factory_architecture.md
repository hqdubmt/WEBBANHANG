# Content Factory Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Content Factory Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  KNOWLEDGE   │───▶│   CONTENT    │───▶│   TRAFFIC    │───▶│    LEAD      │
│  BRAIN       │    │  FACTORY     │    │  GENERATION  │    │  CAPTURE     │
│              │    │              │    │              │    │              │
│ Products     │    │ FB Post      │    │ Organic      │    │ Comment      │
│ FAQs         │    │ Carousel     │    │ Engagement   │    │ Message      │
│ Policies     │    │ TikTok Script│    │ Reach        │    │ Click        │
│ Trends       │    │ SEO Article  │    │ Impression   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                     │
                                                                     ▼
                                                             ┌──────────────┐
                                                             │   REVENUE    │
                                                             │              │
                                                             │ Orders       │
                                                             │ Repeat buys  │
                                                             │ LTV growth   │
                                                             └──────────────┘
```

---

## 2. Content Agent — API Endpoints

| Method | Endpoint | File | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/agents/content/run` | `content-agent.controller.ts` | Tạo nội dung hàng loạt cho tất cả products |
| `GET`  | `/api/agents/content/pending` | `content-agent.controller.ts` | Danh sách bài chờ đăng (status=draft/scheduled) |
| `POST` | `/api/agents/content/:id/publish` | `content-agent.controller.ts` | Đăng bài cụ thể lên social platform |

**Module path:** `apps/api/src/modules/agents/content/`

---

## 3. Content Entity Schema

```typescript
// apps/api/src/database/entities/content.entity.ts
enum ContentPlatform { FACEBOOK | TELEGRAM | WEBSITE | TIKTOK }
enum ContentStatus   { DRAFT | SCHEDULED | PUBLISHED | FAILED }

Content {
  id: uuid
  productId: string          // FK → products
  title: string
  body: text                 // generated content
  hashtags: string[]         // simple-array
  imageUrl: string
  platform: ContentPlatform  // indexed với status
  status: ContentStatus      // indexed với productId
  platformPostId: string     // ID từ social platform sau publish
  scheduledAt: timestamptz
  publishedAt: timestamptz
}
```

---

## 4. Integrations

### A. Knowledge Brain Integration
```
Content Agent calls:
  GET /api/knowledge-brain/products    → product details, specs, benefits
  GET /api/knowledge-brain/customers   → customer pain points, FAQs
  GET /api/knowledge-brain/business    → promotions, current offers

RAG Context:
  RagService.search(query, collection='products', topK=5)
  → inject kết quả vào prompt khi generate content
```

### B. Trend Agent Integration
```
Content Agent calls:
  Trend Agent output → trending topics, hashtags, formats
  TrendPredictor output → predicted trending products
  → aligns content topics với market demand
```

### C. Publisher Agent Integration
```
Publisher Agent (Agent 04):
  POST /api/agents/publisher/run
  - Reads Content WHERE status='scheduled' AND scheduledAt <= NOW()
  - Calls Facebook Graph API / Telegram Bot API / TikTok API
  - Updates content.status = 'published' + platformPostId
  - Logs to AgentLog table
```

---

## 5. Content Factory Module

```
apps/api/src/modules/content-factory/
  content-factory.controller.ts   → aggregate endpoint
  content-factory.service.ts      → orchestrates all content types

apps/api/src/modules/agents/content/
  content-agent.controller.ts     → 3 endpoints
  content-agent.service.ts        → createBulkContent(), getPendingContents(), publishContent()
  content-agent.module.ts

apps/api/src/modules/agents/publisher/
  publisher-agent.controller.ts
  publisher-agent.service.ts      → cross-platform publish
  publisher-agent.module.ts
```

---

## 6. Content Generation Pipeline

```
POST /api/agents/content/run
    │
    ├── 1. Load active products (top 20 by revenue)
    │
    ├── 2. For each product × each platform:
    │       a. RAG search: product knowledge
    │       b. Trend data: current hashtags
    │       c. LLM generate: title + body + hashtags
    │       d. Save Content {status: draft}
    │
    ├── 3. Content quality check (relevance score)
    │
    ├── 4. Schedule: SET scheduledAt = optimal posting time
    │
    └── Return: {created: N, scheduled: N, failed: N}
```

---

## 7. Optimal Posting Times

```
Facebook: 09:00, 12:00, 20:00 (Vietnam timezone)
Telegram: 08:00, 12:00, 19:00, 21:00
TikTok:   18:00, 20:00, 22:00
Website:  Anytime (SEO, no time dependency)
```

---

## 8. Content-Module Gap Analysis

| Component | Status |
|-----------|--------|
| Content entity + table | DONE |
| Content Agent (3 endpoints) | DONE |
| Publisher Agent | DONE — module exists |
| RAG integration | DONE — RagService available |
| Trend data injection | PARTIAL — TrendAgent exists, integration manual |
| TikTok API integration | MISSING — platform enum has TIKTOK but no TikTok API client |
| Content scheduling cron | MISSING — Publisher Agent runs on-demand |
| Performance tracking (views, clicks) | MISSING — no analytics post-publish |
