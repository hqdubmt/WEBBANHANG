# ERD REPORT — AI COMMERCE PLATFORM

## DIAGRAM (Text-based ERD)

```
┌──────────────────────────────────────────────────────────────────┐
│                     CORE COMMERCE CLUSTER                        │
├──────────────────────────────────────────────────────────────────┤

[users]
  id PK
  email UNIQUE
  role, status
  (No FK to tenants — multi-tenancy NOT implemented at DB level)

[tenants]
  id PK
  slug UNIQUE
  plan, status, monthlyRevenue
  (Isolated entity — no FK to users or any other table)

[categories] ───────────┐
  id PK                  │ self-ref
  parentId FK ───────────┘ (tree structure, max depth undefined)
  name, slug, sortOrder, isActive

[products]
  id PK
  category (varchar) ─ ─ ─ ─ ─ [categories.name] (soft ref, no FK)
  name, price, stock
  source (SHOPEE/LAZADA/TIKTOK/MANUAL)
  status, trendScore

[customers]
  id PK
  name, phone, email
  telegramId, facebookId, zaloId
  tier (NEW/REGULAR/VIP)
  totalOrders, totalSpent (denormalized counters)

[orders]
  id PK
  orderCode UNIQUE
  customerId FK ──────────────▶ [customers.id]
  subtotal, discount, total
  status, source

[order_items]
  id PK
  orderId FK (cascade) ───────▶ [orders.id]
  productId (varchar) ─ ─ ─ ─ [products.id] (soft ref, no FK)
  productName (denormalized snapshot)
  price, quantity, total, commission

[payments]
  id PK
  paymentCode UNIQUE
  orderId FK ─────────────────▶ [orders.id]
  amount, method, status, paidAt

[inventory] (ledger/audit log)
  id PK
  productId FK ───────────────▶ [products.id]
  txType (IMPORT/EXPORT/ADJUST/RETURN)
  quantity, stockBefore, stockAfter
  supplierId (varchar) ─ ─ ─ ─ [suppliers.id] (soft ref)
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                    SUPPLIER / PROCUREMENT CLUSTER                │
├──────────────────────────────────────────────────────────────────┤

[suppliers]
  id PK
  name, contactName, phone, email
  status, rating

[supplier_products]
  id PK
  supplierId (varchar) ─ ─ ─ ─ [suppliers.id] (soft ref)
  sku, barcode, importPrice, suggestedRetailPrice
  leadTimeDays, stock

[brands]
  id PK
  name, slug, country, isActive
  (Standalone — no FK to products or suppliers)
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                      AFFILIATE CLUSTER                           │
├──────────────────────────────────────────────────────────────────┤

[affiliates]  (platform affiliate links)
  id PK
  productId (varchar) ─ ─ ─ ─ [products.id] (soft ref)
  platform (SHOPEE/LAZADA/TIKTOK/CUSTOM)
  affiliateLink, commissionRate, clicks, conversions

[affiliate_partners]  (human affiliates)
  id PK
  email UNIQUE, referralCode UNIQUE
  tier (BRONZE→PLATINUM), commissionRate
  totalClicks, totalConversions, totalEarned, pendingPayout

[affiliate_clicks]  (click tracking log)
  id PK
  partnerId (varchar) ─ ─ ─ ─ [affiliate_partners.id] (soft ref)
  referralCode, productId, ipAddress, utmSource/Medium/Campaign
  converted (boolean)

[affiliate_conversions]  (conversion tracking)
  id PK
  partnerId (varchar) ─ ─ ─ ─ [affiliate_partners.id] (soft ref)
  clickId (varchar) ─ ─ ─ ─ ─ [affiliate_clicks.id] (soft ref)
  orderId (varchar) ─ ─ ─ ─ ─ [orders.id] (soft ref)
  commissionAmount, status

[commissions]  (platform commission tracking)
  id PK
  affiliateId (varchar) ─ ─ ─ [affiliates.id] (soft ref)
  orderId (varchar) ─ ─ ─ ─ ─ [orders.id] (soft ref)
  commissionAmount, status (PENDING→PAID)
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                     DROPSHIP CLUSTER                             │
├──────────────────────────────────────────────────────────────────┤

[dropship_products]  (NOT linked to main products table)
  id PK
  supplierId (varchar) ─ ─ ─ ─ [suppliers.id] (soft ref)
  costPrice, suggestedPrice, profitMargin, soldCount

[dropship_orders]  (NOT linked to main orders table)
  id PK
  dropshipProductId (varchar) ─ [dropship_products.id] (soft ref)
  customerName (denormalized — NOT linked to customers table)
  status (7 states)
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                   CONTENT / MARKETING CLUSTER                    │
├──────────────────────────────────────────────────────────────────┤

[contents]
  id PK
  productId (varchar) ─ ─ ─ ─ [products.id] (soft ref)
  platform (FACEBOOK/TELEGRAM/WEBSITE/TIKTOK)
  status (DRAFT→PUBLISHED), platformPostId

[seo_articles]
  id PK
  keyword, title, slug, content
  productId (varchar) ─ ─ ─ ─ [products.id] (soft ref)
  clusterKeywords, internalLinks, wordCount

[video_jobs]
  id PK
  productId (varchar) ─ ─ ─ ─ [products.id] (soft ref)
  platform (TIKTOK/FACEBOOK_REELS/YOUTUBE_SHORTS)
  status (7 states: PENDING→PUBLISHED)

[campaigns]
  id PK
  type (EMAIL/TELEGRAM/FACEBOOK/TIKTOK/SMS/PUSH)
  segment (varchar — no FK to customer segments)
  targetCount, sentCount, openCount, clickCount, conversionCount

[email_campaigns]
  id PK
  type (WELCOME/UPSELL/CROSS_SELL/REMARKETING)
  recipientEmails (simple-array — denormalized)
  segmentId (varchar — no FK)

[price_alerts]
  id PK
  productId (varchar) ─ ─ ─ ─ [products.id] (indexed)
  ourPrice, competitorPrice, suggestedAction
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                        CRM / LEAD CLUSTER                        │
├──────────────────────────────────────────────────────────────────┤

[leads]
  id PK
  platform (FACEBOOK/TELEGRAM/ZALO/TIKTOK/WEBSITE)
  score, intent, status (NEW→CONVERTED/LOST)
  customerId (varchar) ─ ─ ─ ─ [customers.id] (soft ref, after conversion)

[ai_memories]
  id PK
  customerId (varchar) ─ ─ ─ ─ [customers.id] (soft ref, indexed)
  sessionId, type (CHAT_HISTORY/CUSTOMER_BEHAVIOR/...)
  data (jsonb)
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│              AI AGENT / ORCHESTRATION CLUSTER                    │
├──────────────────────────────────────────────────────────────────┤

[agent_configs]
  id PK
  agentName UNIQUE (25 agents)
  cronExpression, isEnabled, priority
  totalRuns, totalTokensUsed, totalCost

[agent_logs]
  id PK
  agent (enum — 25 agent names)
  status (SUCCESS/FAILED/RUNNING)
  input/output (jsonb), tokensUsed, cost, durationMs
  (Append-only audit log)

[workflows]
  id PK
  trigger (CRON/EVENT/MANUAL/WEBHOOK)
  steps (jsonb), runCount, successCount, failCount
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│               KNOWLEDGE BRAIN / SELF-IMPROVEMENT CLUSTER         │
├──────────────────────────────────────────────────────────────────┤

[knowledge]
  id PK
  type (PRODUCT/FAQ/POLICY/TRAINING/MARKETING/AFFILIATE/CUSTOMER)
  domain (PRODUCT/CUSTOMER/BUSINESS/MARKET/OPERATIONAL)
  tier (SHORT_TERM/MEDIUM_TERM/LONG_TERM)
  vectorId, isIndexed, usageCount
  accuracy, completeness, freshness, businessValue (quality scores)

[decision_memory]
  id PK
  area (8 areas: STRATEGY/MARKETING/SALES/...)
  outcome (PENDING/SUCCESS/FAILURE/PARTIAL)
  revenueImpact, profitImpact, roiActual

[lessons_learned]
  id PK
  type (SUCCESS/FAILURE/UNEXPECTED)
  domain (6 domains)
  confidenceScore, isProven, timesApplied/timesSucceeded

[experiments]
  id PK
  status (HYPOTHESIS→DECIDED)
  decision (PENDING/ADOPT/DISCARD/ITERATE)
  successScore, measurements (jsonb)

[learning_cycles]
  id PK
  scope (8 scopes)
  currentPhase (7 phases: OBSERVE→VALIDATE)
  status (ACTIVE/COMPLETED/PAUSED)
  iterationCount
```

---

```
┌──────────────────────────────────────────────────────────────────┐
│                  ENTERPRISE / PLATFORM CLUSTER                   │
├──────────────────────────────────────────────────────────────────┤

[white_label_clients]
  id PK
  domain UNIQUE
  status (ONBOARDING→CHURNED)
  monthlyFee, totalRevenue

[marketplace_vendors]
  id PK
  email UNIQUE
  totalGmv, totalFees, disputeRate, feePercent, rating

[marketplace_disputes]
  id PK
  vendorId (varchar) ─ ─ ─ ─ [marketplace_vendors.id] (soft ref)
  orderId (varchar) ─ ─ ─ ─ ─ [orders.id] (soft ref)
  customerId (varchar) ─ ─ ─ ─ [customers.id] (soft ref)
  type, status, claimAmount, refundAmount

[mobile_sessions]
  id PK
  userId (varchar) ─ ─ ─ ─ ─ [users.id] (soft ref)
  deviceId, platform, appVersion
  durationSeconds, screenViews, crashed

[performance_scorecards]
  id PK
  period (DAILY/WEEKLY/MONTHLY), periodDate
  8 dimension scores (0-100 each)
  overallScore, rawMetrics (jsonb)
```

---

## RELATIONSHIP MATRIX

| Entity | Related To | Relationship | Formal FK? |
|--------|-----------|--------------|------------|
| categories | categories | Self ManyToOne/OneToMany | YES |
| orders | customers | ManyToOne | YES |
| order_items | orders | ManyToOne (cascade) | YES |
| payments | orders | ManyToOne | YES |
| inventory | products | ManyToOne | YES |
| products | categories | Soft ref via varchar | NO |
| order_items | products | Soft ref via varchar | NO |
| supplier_products | suppliers | Soft ref via varchar | NO |
| inventory | suppliers | Soft ref via varchar | NO |
| affiliates | products | Soft ref via varchar | NO |
| affiliate_clicks | affiliate_partners | Soft ref via varchar | NO |
| affiliate_conversions | affiliate_partners | Soft ref via varchar | NO |
| affiliate_conversions | affiliate_clicks | Soft ref via varchar | NO |
| affiliate_conversions | orders | Soft ref via varchar | NO |
| commissions | affiliates | Soft ref via varchar | NO |
| commissions | orders | Soft ref via varchar | NO |
| contents | products | Soft ref via varchar | NO |
| seo_articles | products | Soft ref via varchar | NO |
| video_jobs | products | Soft ref via varchar | NO |
| leads | customers | Soft ref via varchar | NO |
| ai_memories | customers | Soft ref via varchar | NO |
| marketplace_disputes | marketplace_vendors | Soft ref via varchar | NO |
| marketplace_disputes | orders | Soft ref via varchar | NO |
| mobile_sessions | users | Soft ref via varchar | NO |
| dropship_products | suppliers | Soft ref via varchar | NO |
| dropship_orders | dropship_products | Soft ref via varchar | NO |

---

## ISOLATED ENTITIES (No relationships to core commerce)

- `tenants` — floats standalone, no FK to users or products
- `brands` — no FK to products, suppliers, or categories
- `agent_configs` / `agent_logs` — self-contained AI layer
- `workflows` — no FK to any domain entity
- `experiments` — no FK to decisions or knowledge
- `learning_cycles` — no FK to experiments or decisions
- `performance_scorecards` — aggregates via raw metrics jsonb, no FK
- `email_campaigns` — no FK to campaigns (parallel duplicate)
- `white_label_clients` — no FK to tenants

---

## DENORMALIZATION PATTERNS

| Table | Denormalized Field | Source |
|-------|-------------------|--------|
| order_items | productName, productImage | products |
| order_items | affiliateLink | products/affiliates |
| dropship_orders | customerName, customerPhone, customerAddress | — |
| dropship_orders | productName, supplierName | — |
| customers | totalOrders, totalSpent | orders (counter cache) |
| affiliate_partners | totalClicks, totalConversions, totalEarned | affiliate_clicks/conversions |
| marketplace_vendors | totalGmv, totalFees, productCount, orderCount | — |
| supplier_products | supplierName | suppliers |
