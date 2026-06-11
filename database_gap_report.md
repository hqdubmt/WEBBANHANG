# DATABASE GAP REPORT — AI COMMERCE PLATFORM

---

## 1. MISSING TABLES

### CRITICAL — Core business logic missing

#### GAP-01: `customer_segments`
**Why needed:** `campaigns.segment` is a raw varchar. There is no table defining customer segments, their rules, or their members.  
**Impact:** AI Segmentation agent has nowhere to persist segment definitions. Campaign targeting is unvalidated.  
**Suggested columns:** id, name, description, rules(jsonb), memberCount, createdAt

#### GAP-02: `tenant_users` (or `user_tenants` junction)
**Why needed:** `tenants` and `users` are completely disconnected. No table maps which users belong to which tenant with which role.  
**Impact:** Multi-tenancy impossible to enforce without this. Current system is effectively single-tenant at DB level.  
**Suggested columns:** id, tenantId FK, userId FK, role, createdAt

#### GAP-03: `product_categories` (junction) or `product.categoryId` FK
**Why needed:** `products.category` is a plain varchar. No formal relationship to the `categories` table.  
**Impact:** Category tree is maintained but products don't use it formally.  
**Suggested:** Either add `categoryId UUID FK` to products, or create a many-to-many junction if products can belong to multiple categories.

#### GAP-04: `product_brands`
**Why needed:** `brands` table exists but has zero foreign key connections to `products`.  
**Impact:** Brand data is useless — can't query "all products by brand X".  
**Suggested columns:** productId FK, brandId FK (or add brandId to products)

#### GAP-05: `notifications`
**Why needed:** System has 25 AI agents, workflows, experiments, campaigns — but no table to store outgoing notifications (push, email, SMS, Telegram, Zalo).  
**Impact:** No notification history, no delivery tracking, no deduplication.  
**Suggested columns:** id, userId/customerId, channel, title, body, status, sentAt, readAt

#### GAP-06: `product_variants`
**Why needed:** `products` table has no variant/SKU system (size, color, weight variations).  
**Impact:** E-commerce without variants is incomplete. Current model forces creating separate products for each variant.  
**Suggested columns:** id, productId FK, name, sku, price, stock, attributes(jsonb)

#### GAP-07: `product_images`
**Why needed:** `products.image` stores a single image URL. E-commerce requires multiple images per product.  
**Impact:** Single-image limit reduces product presentation quality.  
**Suggested columns:** id, productId FK, url, sortOrder, isPrimary

#### GAP-08: `shipping_methods` / `shipping_providers`
**Why needed:** Orders have `shippingAddress` (text) but no shipping method, carrier, tracking number, or cost at the order level.  
**Impact:** Cannot track shipping costs, compare carriers, or provide customers with tracking.

#### GAP-09: `coupons` / `discount_codes`
**Why needed:** `orders` has a `discount` column but no table defines discount rules, coupon codes, usage limits.  
**Impact:** Discount amounts cannot be validated or audited against rules. Coupon fraud possible.  
**Suggested columns:** id, code, type(PERCENT/FIXED), value, minOrderAmount, usageLimit, usedCount, expiresAt

#### GAP-10: `reviews` / `product_ratings`
**Why needed:** No table for customer product reviews or ratings.  
**Impact:** Social proof absent. `marketplace_vendors` has a `rating` field but no source data to compute it from.

---

### HIGH — Analytics & AI readiness gaps

#### GAP-11: `revenue_snapshots`
**Why needed:** `performance_scorecards` stores scores (0-100) but not raw revenue figures over time. No table stores daily/weekly revenue totals for trend analysis.  
**Impact:** AI cannot do time-series revenue forecasting without a proper fact table.  
**Suggested columns:** id, date, totalRevenue, totalOrders, avgOrderValue, grossProfit, period

#### GAP-12: `business_kpis`
**Why needed:** KPIs (CAC, LTV, ROAS, churn rate, conversion rate) are not stored anywhere. They exist only in `rawMetrics` jsonb inside `performance_scorecards`.  
**Impact:** Cannot query "what was our CAC in March?" without parsing jsonb. No time-series KPI trending.

#### GAP-13: `customer_journey_events`
**Why needed:** No table tracks the sequence of touchpoints a customer goes through (view product → click affiliate → add to cart → purchase).  
**Impact:** Attribution modeling impossible. Funnel analysis impossible. AI cannot learn optimal conversion paths.

#### GAP-14: `ai_decisions`
**Why needed:** `decision_memory` tracks human/strategic decisions. But AI agents make dozens of micro-decisions daily (price this product, publish this content, send this campaign). No table records these.  
**Impact:** AI accountability gap. Cannot audit why an agent took a specific action.  
**Suggested columns:** id, agentName, decisionType, input(jsonb), decision(jsonb), confidence, outcome, createdAt

#### GAP-15: `product_pricing_history`
**Why needed:** `price_alerts` records competitor price alerts but not the history of our own price changes.  
**Impact:** Cannot audit "when did we change price and what was the revenue effect?"

#### GAP-16: `executive_reports`
**Why needed:** `performance_scorecards` has scores but no full narrative executive report (weekly summary, insights, recommendations) stored for retrieval.  
**Impact:** AI Board generates reports but cannot retrieve historical reports for trend comparison.

#### GAP-17: `customer_memory` (behavioral profile)
**Why needed:** `ai_memories` stores raw session data. No table stores synthesized customer profiles (preferred categories, price sensitivity, best contact time, churn risk score).  
**Impact:** AI Sales agent cannot personalize without a consolidated customer intelligence profile.

---

### MEDIUM — Operational gaps

#### GAP-18: `return_requests` / `refunds`
**Why needed:** `payments` has a REFUNDED status but no table tracks return requests, return reasons, or partial refund workflows.  
**Impact:** Return management is impossible to track systematically.

#### GAP-19: `agent_schedules` (separate from `agent_configs`)
**Why needed:** `agent_configs` stores cron expressions but not the execution schedule history (when was each agent scheduled to run, was it skipped, delayed?).  
**Impact:** Cannot diagnose schedule drift or missed runs.

#### GAP-20: `webhook_events`
**Why needed:** No table records incoming webhooks (from Shopee, Lazada, payment gateways, Telegram).  
**Impact:** Webhook replay impossible. Debugging payment callbacks requires checking external logs.

#### GAP-21: `audit_logs`
**Why needed:** No generic audit log table for user actions (who deleted what, who changed which order status).  
**Impact:** Compliance and security audit impossible.

#### GAP-22: `api_keys`
**Why needed:** No table for tenant API keys, webhook secrets, or partner access tokens.  
**Impact:** External integration security managed entirely in application code with no DB backing.

---

## 2. MISSING DATA (Columns/Fields)

### In existing tables

| Table | Missing Field | Why Needed |
|-------|--------------|------------|
| products | categoryId (FK) | Formal link to categories tree |
| products | brandId (FK) | Link to brands |
| products | weight, dimensions | Shipping calculations |
| products | sku | Standard product identifier |
| products | costPrice | Profit margin calculation |
| products | lowStockThreshold | Reorder point alerts |
| orders | shippingCost | Full order cost breakdown |
| orders | shippingMethod | Carrier selection |
| orders | trackingNumber | Customer tracking |
| orders | assignedTo (userId) | Order assignment to staff |
| order_items | createdAt, updatedAt | Audit trail |
| customers | address | Shipping default |
| customers | birthday | Loyalty/birthday campaign |
| customers | acquisitionSource | CAC attribution |
| customers | churnRisk | AI-computed risk score |
| customers | ltv | Lifetime value |
| leads | assignedTo (userId) | Lead ownership tracking |
| leads | followUpAt | Next contact scheduling |
| knowledge | embedding (vector) | In-DB vector if no ext DB |
| agent_logs | workflowId | Link log to workflow run |
| performance_scorecards | (period, periodDate) UNIQUE | Prevent duplicates |
| marketplace_disputes | evidenceUrls | Proof attachments |
| tenants | ownerId (userId FK) | Tenant admin linkage |

---

## 3. MISSING RELATIONSHIPS

| Missing Relationship | From → To | Why Critical |
|---------------------|-----------|-------------|
| tenants → users | ManyToMany via tenant_users | Multi-tenancy enforcement |
| products → categories | ManyToOne (categoryId FK) | Formal catalog structure |
| products → brands | ManyToOne (brandId FK) | Brand filtering |
| dropship_orders → orders | Optional FK | Revenue consolidation |
| dropship_orders → customers | Optional FK | CRM visibility |
| campaigns → customers | ManyToMany via campaign_recipients | Campaign tracking |
| leads → campaigns | ManyToOne | Attribution tracking |
| affiliate_conversions → orders | Formal FK | Commission accuracy |
| marketplace_disputes → marketplace_vendors | Formal FK | Dispute integrity |
| marketplace_disputes → orders | Formal FK | Dispute audit trail |
| experiments → learning_cycles | ManyToOne | Self-improvement linkage |
| decision_memory → experiments | ManyToOne | Decision traceability |
| knowledge → agent_logs | ManyToMany | Which knowledge was used by which agent |
| supplier_products → suppliers | Formal FK | Procurement integrity |
| order_items → products | Formal FK | Product catalog integrity |

---

## 4. STRUCTURAL GAPS SUMMARY

| Gap ID | Type | Severity | Description |
|--------|------|----------|-------------|
| GAP-01 | Missing table | CRITICAL | customer_segments |
| GAP-02 | Missing table | CRITICAL | tenant_users |
| GAP-03 | Missing relationship | CRITICAL | products → categories (FK) |
| GAP-06 | Missing table | HIGH | product_variants |
| GAP-09 | Missing table | HIGH | coupons/discount_codes |
| GAP-11 | Missing table | HIGH | revenue_snapshots |
| GAP-13 | Missing table | HIGH | customer_journey_events |
| GAP-14 | Missing table | HIGH | ai_decisions |
| GAP-17 | Missing table | HIGH | customer_memory profile |
| GAP-21 | Missing table | HIGH | audit_logs |

**Total missing tables identified: 22**  
**Total missing columns identified: 20+**  
**Total missing relationships: 15**
