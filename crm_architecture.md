# CRM Automation Engine — Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Tổng quan CRM Layer

CRM Layer là tầng quản lý vòng đời khách hàng từ Lead → Customer → Repeat → VIP → Churn Prevention. Mọi dữ liệu đều có trong PostgreSQL; vector memory trong Qdrant phục vụ semantic search; Redis cache hot-path queries.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CRM LAYER — V3                              │
├─────────────┬──────────────┬────────────────┬───────────────────────┤
│  Lead Layer │ Customer     │  Order Layer   │  Analytics Layer      │
│  leads      │  customers   │  orders        │  agent_logs           │
│  status:    │  tier:       │  status:       │  crm_stats            │
│  new/       │  new/        │  pending/      │  segment_counts       │
│  contacted/ │  regular/    │  confirmed/    │  ltv_distribution     │
│  qualified/ │  vip         │  shipping/     │  churn_cohort         │
│  converted/ │              │  delivered/    │                       │
│  lost       │              │  cancelled     │                       │
└─────────────┴──────────────┴────────────────┴───────────────────────┘
```

---

## 2. CRM Agent — API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/agents/crm/run` | Chạy CRM Agent thủ công — phân tích toàn bộ customer base |
| `GET`  | `/api/agents/crm/stats` | Thống kê CRM: tier counts, churnRisk avg, ltv total |
| `GET`  | `/api/agents/crm/customer/:id` | Phân tích 360° profile cho một khách hàng cụ thể |
| `GET`  | `/api/analytics/customers` | Customer summary (AnalyticsController) |
| `GET`  | `/api/customers` | Danh sách customers phân trang (CustomersController) |

**Module path:** `apps/api/src/modules/agents/crm/`

**Files:**
- `crm-agent.controller.ts` — 3 endpoints trên
- `crm-agent.service.ts` — `analyzeCrm()`, `getCrmStats()`, `getCustomerProfile(id)`
- `crm-agent.module.ts`

---

## 3. Data Model — Entities

### Customer Entity (`customers` table)
```typescript
// apps/api/src/database/entities/customer.entity.ts
enum CustomerTier { NEW = 'new', REGULAR = 'regular', VIP = 'vip' }

Customer {
  id: uuid (PK)
  name: string
  phone: string          // Index
  email: string          // Index
  telegramId: string
  facebookId: string
  zaloId: string
  tier: CustomerTier     // Index — new/regular/vip
  totalOrders: number    // auto-increment khi order.delivered
  totalSpent: decimal    // cumulative
  ltv: decimal           // lifetime value (computed)
  churnRisk: decimal     // 0.00–100.00
  acquisitionSource: string
  address: string
  birthday: string
  note: text
  orders: Order[]        // OneToMany
}
```

### Lead Entity (`leads` table)
```typescript
enum LeadPlatform { FACEBOOK | TELEGRAM | ZALO | TIKTOK | WEBSITE }
enum LeadStatus   { NEW | CONTACTED | QUALIFIED | CONVERTED | LOST }

Lead {
  id: uuid
  platform: LeadPlatform
  platformUserId: string
  name: string
  content: text          // raw message
  score: decimal(5,2)    // 0–100 — AI-scored
  intent: string         // buy/ask/compare/spam
  status: LeadStatus
  customerId: string     // FK khi converted
  assignedTo: string
  followUpAt: timestamptz
  meta: jsonb
}
```

### Order Entity (`orders` table)
```typescript
enum OrderStatus { PENDING | CONFIRMED | SHIPPING | DELIVERED | CANCELLED }
enum OrderSource { FACEBOOK | TELEGRAM | WEBSITE | ZALO | MANUAL }

Order {
  orderCode: string (unique)
  customerId: string (FK)
  total: decimal
  status: OrderStatus
  source: OrderSource
  couponCode: string
}
```

---

## 4. Memory Tiers

```
┌──────────────────────────────────────────────────────────────────┐
│                    CRM MEMORY ARCHITECTURE                       │
├──────────────────┬───────────────────┬───────────────────────────┤
│  PostgreSQL       │  Redis (planned)  │  Qdrant                   │
│  (persistent)     │  (cache)          │  (vector)                 │
├──────────────────┼───────────────────┼───────────────────────────┤
│  customers        │  hot_segments     │  collection:              │
│  leads            │  crm_stats_cache  │    customer_profiles      │
│  orders           │  tier_counts      │  semantic search:         │
│  knowledge        │  churn_risk_top   │    customer conversations │
│  agent_logs       │  TTL: 5 min       │    support history        │
└──────────────────┴───────────────────┴───────────────────────────┘
```

**Current state:**
- PostgreSQL: FULLY operational — all entities deployed
- Redis: NOT YET integrated — tier count queries hit DB directly
- Qdrant: INTEGRATED via `RagService` — collection `customer_profiles` exists via Knowledge entity

---

## 5. CRM Agent — Workflow nội bộ

```
CRM Agent Run (POST /api/agents/crm/run)
    │
    ├── 1. Load toàn bộ customers (paginated)
    │
    ├── 2. Tính churnRisk per customer
    │       churnRisk = f(days_since_last_order, order_freq_drop, ltv_trend)
    │
    ├── 3. Update tier tự động
    │       totalSpent < 500K    → NEW
    │       500K ≤ spent < 5M    → REGULAR
    │       spent ≥ 5M           → VIP
    │
    ├── 4. Identify At-Risk (churnRisk > 70)
    │
    ├── 5. Ghi Knowledge record vào knowledge_brain
    │       domain: CUSTOMER, tier: MEDIUM_TERM
    │
    └── 6. Return stats: {updated, atRisk, upgraded, downgraded}
```

---

## 6. Gap Analysis

| Thành phần | Trạng thái | Ưu tiên |
|------------|-----------|---------|
| Customer CRUD API | DONE | — |
| CRM Agent (analyze) | DONE | — |
| Auto tier upgrade | DONE | — |
| churnRisk calculation | PARTIAL — formula cần tinh chỉnh | HIGH |
| Redis cache layer | MISSING | MEDIUM |
| Follow-up scheduler | MISSING | HIGH |
| Telegram/Zalo outreach automation | MISSING | HIGH |
| Customer 360° dashboard | PARTIAL | MEDIUM |
