# DATABASE RISK REPORT — AI COMMERCE PLATFORM

---

## 1. INTEGRITY RISKS

### CRITICAL

#### IR-01: Massive use of soft foreign keys (varchar IDs, no constraint)
**Affected tables:** 20+ tables  
**Example:** `order_items.productId`, `contents.productId`, `leads.customerId`, `affiliate_conversions.orderId`  
**Risk:** Orphan records accumulate silently. A deleted product leaves order_items referencing a non-existent ID. No DB-level rejection.  
**Impact:** Data corruption, incorrect analytics, ghost references in AI knowledge base.

#### IR-02: No multi-tenancy enforcement at DB level
**Affected tables:** All 40 tables  
**Risk:** `tenants` table exists but has NO foreign key relationship to any other table. Users, orders, products, customers — all tables are tenant-unaware. Any tenant can query any other tenant's data if application-layer filtering fails.  
**Impact:** Critical data leakage risk in production SaaS scenario.

#### IR-03: `products.category` is a plain varchar, not FK to `categories`
**Risk:** Products can reference non-existent categories. Category renames break product categorization silently.  
**Impact:** Category tree inconsistency, broken product filtering.

#### IR-04: `order_items` has no `createdAt`/`updatedAt`
**Risk:** Cannot audit when order items were added/modified. Returns, corrections, or disputes cannot be timestamped.  
**Impact:** Audit trail gap.

#### IR-05: `customers.totalOrders` and `customers.totalSpent` are denormalized counters
**Risk:** If counter update fails (app crash, timeout), counters drift from actual `orders` data. No DB trigger to keep them in sync.  
**Impact:** Wrong customer tier assignment, wrong VIP logic, wrong analytics.

---

### HIGH

#### IR-06: `dropship_orders` completely isolated from `orders` and `customers`
**Risk:** Dropship customer data (name, phone, address) is stored as plain text — no link to `customers` table. Dropship revenue is invisible to main order analytics.  
**Impact:** Revenue leakage in reporting, no CRM history for dropship buyers.

#### IR-07: `affiliate_conversions.clickId` → `affiliate_clicks.id` — soft ref
**Risk:** Conversions can reference deleted or non-existent clicks. Attribution chain broken.  
**Impact:** Wrong commission calculations, partner disputes.

#### IR-08: `email_campaigns` and `campaigns` are parallel/duplicate entities
**Risk:** Two tables serve overlapping purposes. `email_campaigns.recipientEmails` is a simple-array (comma-separated string) — not normalized, size-limited, non-queryable efficiently.  
**Impact:** Data split across two tables, campaign analytics unreliable.

#### IR-09: `campaigns.segment` is a plain varchar
**Risk:** No `customer_segments` table exists. Segment targeting cannot be validated or enforced.  
**Impact:** Campaigns sent to undefined/wrong segments.

#### IR-10: `lessons_learned` has no `updatedAt`
**Risk:** Cannot track when a lesson was last reviewed or updated. Stale lessons appear as current.  
**Impact:** AI decision-making based on outdated lessons.

#### IR-11: `marketplace_disputes` — all FKs are soft refs (vendorId, orderId, customerId)
**Risk:** A resolved order can be deleted while disputes still reference it.  
**Impact:** Dispute resolution history orphaned.

---

### MEDIUM

#### IR-12: `tenants` has no FK to `users`
**Risk:** No way to track which users belong to which tenant at DB level.

#### IR-13: `brands` has no FK to `products` or `suppliers`
**Risk:** Brand data is entirely disconnected from catalog.

#### IR-14: `mobile_sessions.userId` — soft ref to `users`
**Risk:** Sessions for deleted users remain with dangling userId.

#### IR-15: `inventory.supplierId` — soft ref
**Risk:** Cannot JOIN inventory to suppliers for cost analysis without application workarounds.

---

## 2. SCALABILITY RISKS

### CRITICAL

#### SR-01: `agent_logs` — append-only, unbounded growth
**Risk:** Every AI agent run appends a row. 25 agents × multiple runs/day × 365 days = millions of rows/year. No partition, no TTL, no archive policy.  
**Estimated growth:** At 100 runs/day → 36,500 rows/year. At 1000 runs/day → 365,000 rows/year. jsonb `input`/`output` columns can be large (KB to MB each).  
**Impact:** Full table scans on agent analytics become progressively slower.

#### SR-02: `affiliate_clicks` — high-volume tracking table, no partitioning
**Risk:** Every affiliate link click appends a row. At scale (viral campaigns), this can hit millions of rows quickly. No index on `partnerId` or `createdAt`.  
**Impact:** Partner performance queries slow to unusable.

#### SR-03: `ai_memories` — unbounded per customer
**Risk:** Every chat session, every product view, every behavior event appends rows. Composite index on `(customerId, type)` helps reads but does not bound writes.  
**Impact:** Top customers accumulate thousands of memory rows; queries degrade.

#### SR-04: `knowledge` table — vector indexing not in DB
**Risk:** `vectorId` is stored as varchar (external reference). Vector search requires an external vector DB (Qdrant/Pinecone/etc.). If vector DB goes out of sync with `knowledge` table, queries return stale or missing results.  
**Impact:** AI knowledge retrieval reliability tied to external system sync.

---

### HIGH

#### SR-05: `performance_scorecards` — full data re-scan per period
**Risk:** Scorecard generation reads orders, customers, leads, agent_logs for period calculations. No materialized view, no pre-aggregated fact table.  
**Impact:** Daily scorecard generation time grows linearly with data volume.

#### SR-06: `inventory` ledger — no partitioning by product or date
**Risk:** High-volume products accumulate thousands of inventory transactions. Current stock calculation requires summing all rows for a product (no snapshot/checkpoint).  
**Impact:** `stockBefore`/`stockAfter` pattern helps but full product history queries slow at scale.

#### SR-07: `order_items.productId` — no index
**Risk:** "Show all orders for product X" requires full table scan on order_items.  
**Impact:** Product sales analytics slow with >100K order items.

#### SR-08: `orders.customerId` — no explicit index (only FK constraint)
**Risk:** TypeORM may or may not create an index on FK columns depending on DB version.  
**Impact:** "Show all orders for customer X" may be slow without verified index.

#### SR-09: `TypeORM synchronize: true` in non-production
**Risk:** In staging/dev environments, schema drift can occur automatically. A bad entity change silently alters or drops columns.  
**Impact:** Data loss risk in non-prod environments that share production-like data.

---

### MEDIUM

#### SR-10: `jsonb` columns in high-write tables
**Affected:** agent_logs.input/output, ai_memories.data, knowledge.meta, inventory-related tables  
**Risk:** jsonb writes are heavier than scalar columns. High-frequency writes to large jsonb fields increase WAL (write-ahead log) pressure.

#### SR-11: `simple-array` columns (CSV in varchar)
**Affected:** email_campaigns.recipientEmails, seo_articles.clusterKeywords/internalLinks, contents.hashtags, lessons_learned.tags  
**Risk:** PostgreSQL stores as comma-separated string. No element-level indexing. `LIKE '%value%'` required for search. Unbounded length.

---

## 3. PERFORMANCE RISKS

### CRITICAL

#### PR-01: Missing index on `orders.customerId`
**Query pattern:** "Get all orders for customer X" — core CRM query.  
**Current:** Sequential scan on orders (FK may not auto-index in all PostgreSQL versions).  
**Fix:** `CREATE INDEX idx_orders_customer_id ON orders(customerId);`

#### PR-02: Missing index on `order_items.orderId`
**Query pattern:** "Get all items for order X" — core order detail query.  
**Current:** Sequential scan. With TypeORM cascade, this should work but is not indexed explicitly.  
**Fix:** `CREATE INDEX idx_order_items_order_id ON order_items(orderId);`

#### PR-03: Missing index on `contents.productId` and `contents.status`
**Query pattern:** "Get all published content for product X" — AI content agent core query.  
**Fix:** Composite index `(productId, status)`

#### PR-04: Missing index on `leads.status` and `leads.platform`
**Query pattern:** AI CRM agent queries leads by status (NEW, CONTACTED) and platform.  
**Fix:** Composite index `(status, platform, createdAt)`

#### PR-05: Missing index on `agent_logs.agent` and `agent_logs.createdAt`
**Query pattern:** "Get last N runs for agent X" — core agent monitoring query.  
**Fix:** Composite index `(agent, createdAt DESC)`

---

### HIGH

#### PR-06: Missing index on `knowledge.type` and `knowledge.domain`
**Query pattern:** AI brain queries knowledge by type+domain for context retrieval.  
**Fix:** Composite index `(type, domain, tier)`

#### PR-07: Missing index on `inventory.productId`
**Query pattern:** "Get stock history for product X" — inventory audit.  
**Fix:** `CREATE INDEX idx_inventory_product_id ON inventory(productId);`

#### PR-08: Missing index on `affiliate_clicks.partnerId` + `affiliate_clicks.createdAt`
**Query pattern:** Partner performance dashboard — clicks per partner per period.  
**Fix:** Composite index `(partnerId, createdAt DESC)`

#### PR-09: N+1 risk in `categories` tree loading
**Risk:** Loading categories with `children` relation triggers recursive queries if not eagerly loaded with `findTrees()` or explicit JOIN.  
**Impact:** Deep category trees (3+ levels) generate exponential queries.

#### PR-10: N+1 risk in `orders` → `order_items` → product data
**Risk:** Loading order with items, then loading each item's product data separately = N+1 queries.  
**TypeORM eager loading** not configured; depends on service-level JOIN discipline.

---

### MEDIUM

#### PR-11: Missing index on `products.status` and `products.source`
**Query pattern:** "Get all active products from Shopee" — trend agent core query.

#### PR-12: Missing index on `payments.orderId`
**Query pattern:** "Get payment for order X" — checkout confirmation.

#### PR-13: `performance_scorecards` has no unique constraint on `(period, periodDate)`
**Risk:** Duplicate scorecard records for the same period possible. No upsert safety.

#### PR-14: Large jsonb columns in `learning_cycles`
**Risk:** observations/measurements/analysis/lessons/improvementPlan/executionResults/validationResults — 7 jsonb columns per row. Full-row reads are heavy if only 1 field needed.

---

## RISK SUMMARY TABLE

| Risk ID | Category | Severity | Table(s) | Description |
|---------|----------|----------|----------|-------------|
| IR-01 | Integrity | CRITICAL | 20+ tables | Soft FKs everywhere |
| IR-02 | Integrity | CRITICAL | All 40 | No multi-tenancy at DB |
| IR-03 | Integrity | CRITICAL | products | category is varchar not FK |
| IR-04 | Integrity | HIGH | order_items | No timestamps |
| IR-05 | Integrity | HIGH | customers | Counter drift risk |
| SR-01 | Scalability | CRITICAL | agent_logs | Unbounded growth |
| SR-02 | Scalability | CRITICAL | affiliate_clicks | No partitioning/index |
| SR-03 | Scalability | CRITICAL | ai_memories | Unbounded per customer |
| SR-04 | Scalability | HIGH | knowledge | External vector sync |
| PR-01 | Performance | CRITICAL | orders | Missing customerId index |
| PR-02 | Performance | CRITICAL | order_items | Missing orderId index |
| PR-03 | Performance | CRITICAL | contents | Missing productId index |
| PR-05 | Performance | CRITICAL | agent_logs | Missing agent+date index |
| PR-09 | Performance | HIGH | categories | N+1 tree loading |
| PR-10 | Performance | HIGH | orders/items | N+1 product loading |

**Total risks identified: 25**  
**Critical: 8 | High: 10 | Medium: 7**
