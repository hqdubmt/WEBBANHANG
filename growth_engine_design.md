# Growth Engine Design — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Growth Framework

```
GROWTH = NEW MARKETS × NEW CHANNELS × NEW PRODUCTS × RETENTION × VIRALITY
```

Hiện tại hệ thống có nền tảng cho **channel expansion** (platform field có nhiều values) và **product catalog** (Product entity). Cần build automation để drive growth.

---

## 2. Growth Levers

### Lever 1: Customer Acquisition Scale

**Hiện tại:**
- Manual ads management
- No automation cho lead generation
- Platform: facebook/tiktok/zalo/telegram/website

**Growth opportunity:**
```
Current monthly lead volume:     ~100-500 (estimate)
Target with automation:          1,000-5,000
Multiplier:                      5-10x

How:
  1. AI-generated ad creatives → A/B test → optimize
  2. Lookalike audiences từ best customers
  3. Comment-to-DM automation (Facebook/TikTok)
  4. Referral program (virality loop)
```

**API cần xây:**
```
POST /api/growth/campaign             — Create growth campaign
GET  /api/growth/campaign/:id/stats  — Campaign performance
POST /api/growth/lookalike           — Build lookalike from VIP customers
```

---

### Lever 2: Conversion Rate Optimization (CRO)

**Hiện tại:**
- Manual qualification
- AI Chat Agent (basic)
- Knowledge Brain (FAQ)

**Target conversion improvements:**
```
Stranger → Lead:    Current ~3% → Target 5-8%
Lead → Customer:    Current ~15% → Target 25-35%
Customer → Repeat:  Current ~20% → Target 35-45%
```

**How:**
```
1. AI Chat personalization (thay vì generic messages)
2. Social proof automation (show reviews to fence-sitters)
3. Urgency signals (limited stock, time-limited offers)
4. Abandoned conversation recovery
5. Multi-step close sequence với AI Agent
```

**Current state:** AI Chat Agent có nhưng chưa có personalization logic hoặc urgency engine.

---

### Lever 3: Average Order Value (AOV) Growth

**Hiện tại:**
- Không có upsell/cross-sell automation
- Order tạo thủ công hoặc qua bot (basic)

**Target:**
```
Current AOV estimate: 300,000-500,000 VND
Target AOV:          500,000-800,000 VND
Multiplier:          1.5-1.7x
```

**How:**
```
1. Bundle recommendations (AI-generated bundles)
2. "Frequently bought together" cross-sell
3. Upsell at checkout ("Add X for only +50,000 VND")
4. Free shipping threshold (e.g., "Mua thêm 50k để freeship")
5. Volume discounts (mua 2 giảm 10%, mua 3 giảm 15%)
```

**API cần xây:**
```
GET  /api/products/recommendations/:productId  — Cross-sell
GET  /api/products/bundles                    — Bundle suggestions
GET  /api/orders/upsell-offer/:orderId        — Upsell at checkout
```

---

### Lever 4: Customer Lifetime Value (LTV) Optimization

**Hiện tại:**
- `Customer.ltv` field có nhưng không được tính tự động
- Không có LTV optimization strategy

**Target:**
```
Increase avg LTV from X → 2X over 12 months

LTV = AOV × Purchase Frequency × Customer Lifespan
```

**How:**
```
1. Increase purchase frequency → retention campaigns
2. Increase AOV → upsell/cross-sell
3. Extend customer lifespan → reduce churn
4. Tier upgrades với increasing benefits
```

---

### Lever 5: New Product Opportunities

**Hiện tại:**
- Product entity có fields cơ bản
- Không có opportunity detection

**AI-powered product discovery:**
```
Data sources for opportunity detection:
├── Order history → best selling categories
├── Customer chat logs → what they're asking for
├── Competitor analysis → Knowledge Brain enrichment
├── Seasonal trends → calendar-based suggestions
└── Abandoned conversations → "couldn't find" signals

Output:
  AI suggests: "Khách hàng hay hỏi về sản phẩm X nhưng
  chúng ta không có. Đây là cơ hội."
```

**API cần xây:**
```
GET /api/products/opportunity-signals   — Product gaps
GET /api/knowledge-brain/demand-queries — What customers want
```

---

### Lever 6: New Channel Expansion

**Current channels và readiness:**

| Channel | Lead Source | Revenue | Automation | Priority |
|---------|-------------|---------|------------|----------|
| Telegram | CO | CO | Medium | Deepen |
| Facebook | CO (partial) | THIẾU | Low | Scale |
| TikTok | CO (label) | THIẾU | None | Build |
| Zalo | CO (partial) | THIẾU | Low | Build |
| Website | CO (basic) | CO (manual) | Low | Scale |
| Email | THIẾU | THIẾU | None | Add |
| TikTok Shop | THIẾU | THIẾU | None | Add |

**Growth priority order:**
1. TikTok — highest growth platform in Vietnam
2. Facebook — existing presence, needs automation
3. Email — retention channel, high ROI
4. TikTok Shop — direct commerce integration

---

### Lever 7: New Market / Tenant Expansion

**Multi-tenancy opportunity:**
- Tenant entity đã có trong system
- Architecture designed cho multi-tenant

**Growth model:**
```
Current: 1 tenant (internal)
Year 1 target: 10 tenants (B2B SaaS)
Year 2 target: 50 tenants

Revenue model:
  Tier Basic:    500,000 VND/month
  Tier Pro:    1,500,000 VND/month
  Tier Scale:  5,000,000 VND/month

Revenue potential Year 2:
  50 tenants × avg 2,000,000 VND = 100,000,000 VND/month
```

**Gap:** Onboarding flow cho new tenants chưa có. Billing chưa có.

---

## 3. Current Opportunity Detection

### 3.1 Built-in Signals (CO)

```typescript
// What the system CAN already detect:

// 1. High churn risk customers (need retention)
Customer.churnRisk > 0.6

// 2. Converted leads → new customers (acquisition working)
Lead.status === 'converted'

// 3. VIP customers (upsell opportunity)
Customer.tier === 'vip'

// 4. New leads by platform (channel performance)
Lead.platform → group and count

// 5. Revenue trend from orders
Order.total → aggregate by period
```

### 3.2 Signals to Build (THIẾU)

```typescript
// What we NEED to detect:

// Product demand gaps
chatLogs.filter(msg => msg.contains('không có') || msg.contains('hết hàng'))

// Abandoned conversations (lost opportunities)
Lead.where(status='qualified').where(updatedAt < now - 72h)

// Price sensitivity signals
chatLogs.filter(msg => msg.contains('đắt') || msg.contains('giảm giá'))

// Competitor mentions
chatLogs.filter(msg => msg.contains(competitorNames))

// High-value timing (ready to buy now)
// Signals: asking delivery time + asking payment methods
```

---

## 4. Growth Analytics Dashboard

```
GROWTH ENGINE DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACQUISITION FUNNEL (MTD)
  Impressions:        48,000
  Leads:              420        Conv: 0.88%
  Qualified:          168        Conv: 40%
  Customers:           52        Conv: 31%

GROWTH METRICS
  New Customers MoM:  +18%
  AOV MoM:            +7%
  Revenue MoM:        +26%
  LTV MoM:            +12%

OPPORTUNITIES DETECTED BY AI:
  ↗ TikTok lead quality improving (conv +15%)
  ↗ Product "Y" trending in chat queries
  ↘ Facebook CAC increased 23% — audit needed
  → 18 qualified leads stalled > 48h — follow up
```

---

## 5. Growth Engine Architecture

```
INPUTS:
├── Order data (PostgreSQL)
├── Lead data (PostgreSQL)
├── Customer data (PostgreSQL)
├── Chat logs (Qdrant vectors)
└── Platform metrics (partial)

PROCESSING:
├── Pattern detection (daily cron + real-time)
├── AI signal analysis (Ollama + Knowledge Brain)
├── Opportunity scoring
└── Action recommendation

OUTPUTS:
├── Growth recommendations → admin dashboard
├── Automated campaigns → Telegram/Zalo messages
├── Product opportunity alerts → Product team
└── Channel budget recommendations → Admin
```

---

## 6. Growth Roadmap

| Phase | Focus | Timeline | Revenue Impact |
|-------|-------|----------|---------------|
| Phase 1 | Fix conversion funnel (lead → customer automation) | Month 1 | +20% revenue |
| Phase 2 | AOV optimization (cross-sell engine) | Month 2 | +15% AOV |
| Phase 3 | Channel expansion (TikTok automation) | Month 3 | +25% leads |
| Phase 4 | LTV optimization (retention campaigns) | Month 4 | +30% LTV |
| Phase 5 | Multi-tenant growth (B2B SaaS) | Month 6+ | 10x revenue ceiling |

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
