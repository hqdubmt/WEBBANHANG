# Revenue Architecture — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Revenue Loop Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVENUE AUTOPILOT LOOP                       │
│                                                                 │
│   MARKET                                                        │
│     │ (Facebook/TikTok/Telegram ads)                           │
│     ▼                                                           │
│   ACQUIRE ──→ Lead capture → AI qualification                  │
│     │                                                           │
│     ▼                                                           │
│   CONVERT ──→ AI Chat → Knowledge Brain → Order creation       │
│     │                                                           │
│     ▼                                                           │
│   FULFILL ──→ Order processing → Supplier → Delivery           │
│     │                                                           │
│     ▼                                                           │
│   RETAIN ──→ Follow-up sequences → Repeat purchase trigger     │
│     │                                                           │
│     ▼                                                           │
│   ANALYZE ──→ Revenue analytics → AI insights                  │
│     │                                                           │
│     ▼                                                           │
│   OPTIMIZE ──→ Self-Improvement Loop → Better targeting        │
│     │                                                           │
│     └──────────────────────────────────────────────────────────┘
│                         (back to MARKET)
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Components

### 2.1 Data Layer

| Component | Technology | Status |
|-----------|-----------|--------|
| Relational DB | PostgreSQL | CO |
| Vector DB | Qdrant | CO |
| Cache | Redis | CO |
| File Storage | Local/S3 | THIẾU (S3) |
| Message Queue | THIẾU | Cần Redis Queue/BullMQ |
| Data Warehouse | THIẾU | Cần cho analytics |

### 2.2 AI/ML Layer

| Component | Technology | Status |
|-----------|-----------|--------|
| LLM (local) | Ollama | CO |
| Embedding model | Ollama/Qdrant | CO |
| Knowledge Brain | Custom NestJS service | CO |
| 21 AI Agents | NestJS controllers | CO |
| Self-Improvement Loop | Custom service | CO |
| Recommendation Engine | THIẾU | Cần build |
| Churn Prediction ML | THIẾU | Cần build |

### 2.3 Integration Layer

| Component | Technology | Status |
|-----------|-----------|--------|
| Telegram Bot | NestJS webhook | CO |
| Facebook Messenger | THIẾU (webhook needed) | THIẾU |
| Zalo OA | THIẾU (webhook needed) | THIẾU |
| TikTok | THIẾU | THIẾU |
| Email Service | THIẾU (SendGrid/SES needed) | THIẾU |
| Payment Gateway | THIẾU (VNPay/Momo needed) | THIẾU |
| Shipping API | THIẾU (GHN/GHTK needed) | THIẾU |

---

## 3. Components Hiện Có vs. Cần Xây

### CO SẴN (Foundation):
```
PostgreSQL
├── Lead entity (acquisition)
├── Customer entity (retention)
├── Order entity (revenue)
├── Product entity (catalog)
└── Tenant entity (multi-tenancy)

Qdrant
└── Vector embeddings (Knowledge Brain)

Redis
└── Cache layer

NestJS API
├── 47 controllers
├── 21 AI agents
├── Knowledge Brain service
└── Self-Improvement service

Next.js Frontend
└── Web storefront
```

### CẦN XÂY (Critical gaps):

```
Revenue Loop Gaps:
├── Message Queue (BullMQ/Redis) — for async processing
├── Email Service — for drip campaigns
├── Payment Gateway — for online checkout
├── Shipping/Fulfillment API — for order tracking
├── Segmentation Engine — for targeting
├── Campaign Engine — for automated messaging
├── Analytics Data Pipeline — for revenue insights
└── A/B Testing Engine — for optimization
```

---

## 4. Revenue Stack Architecture Detail

```
                        NGINX Reverse Proxy
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         Next.js           NestJS API       Telegram Bot
         (Web)             (:3001)          Webhook
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
               PostgreSQL              Redis
               (Primary DB)           (Cache)
                    │
              ┌─────┴──────┐
              │            │
           Qdrant        Ollama
         (Vectors)       (LLM)
              │            │
      Knowledge Brain   21 AI Agents
          Service
```

---

## 5. Revenue Data Flow

```
Customer Action → Event Capture → Processing → Revenue Impact

1. NEW ORDER:
   Customer clicks → Order API → PostgreSQL → Update Customer.totalSpent
                                             → Trigger fulfillment
                                             → Update revenue analytics

2. LEAD CONVERTED:
   Salesperson marks converted → Lead.status=converted
                               → Customer entity created
                               → Acquisition cost recorded

3. PRODUCT VIEWED:
   (THIẾU — không có tracking)

4. CART ABANDONED:
   (THIẾU — không có cart entity)

5. PAYMENT RECEIVED:
   (THIẾU — không có payment gateway)
```

---

## 6. Knowledge Brain Revenue Integration

Knowledge Brain (Qdrant + Ollama) hiện đóng vai trò:
- Trả lời FAQ về sản phẩm
- Xử lý customer queries
- Feed information cho AI Chat Agent

**Revenue-related enhancements cần:**
```
Knowledge Brain hiện tại:
└── Product FAQs, policies, procedures

Knowledge Brain cần thêm:
├── Competitor pricing intelligence
├── Product recommendation logic
├── Upsell/cross-sell rules
├── Seasonal demand patterns
├── Customer segment behaviors
└── Top-converting message templates
```

---

## 7. Self-Improvement Loop → Revenue Impact

Hệ thống có `self-improvement.service.ts`. Luồng revenue optimization:

```
Data Collection → Pattern Recognition → Hypothesis → A/B Test → Deploy

Example:
  Data: Message A → 15% conversion, Message B → 22% conversion
  Pattern: Message B performs better
  Action: Self-improvement service updates Knowledge Brain
  Next iteration: All customers receive Message B variant
```

**Current state:** Service tồn tại nhưng chưa rõ đang optimize gì cụ thể cho revenue.

---

## 8. Multi-Tenant Revenue Architecture

`Tenant entity` cho thấy hệ thống designed cho multi-tenancy.

```
Tenant A (Shop 1)
├── Products A
├── Leads A
├── Customers A
├── Orders A
└── Revenue Analytics A

Tenant B (Shop 2)
├── Products B
├── Leads B
├── Customers B
├── Orders B
└── Revenue Analytics B

Shared Infrastructure:
├── PostgreSQL (schema-per-tenant or row-level isolation)
├── Qdrant (namespace per tenant)
├── Redis (prefix per tenant)
├── Ollama (shared LLM)
└── NestJS API (tenant middleware)
```

**Business model implication:** SaaS revenue từ multiple tenants là growth lever quan trọng nhất.

---

## 9. Revenue Architecture Maturity Assessment

| Layer | Maturity | Score |
|-------|----------|-------|
| Data storage | Solid foundation | 75/100 |
| AI/ML layer | Good foundation, partial | 60/100 |
| Integration layer | Very thin | 25/100 |
| Automation layer | Missing | 10/100 |
| Analytics layer | Basic | 20/100 |
| Revenue operations | Manual-heavy | 15/100 |
| **Overall** | | **34/100** |

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
