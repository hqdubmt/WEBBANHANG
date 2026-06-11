# DATABASE READINESS SCORE — AI COMMERCE PLATFORM

**Audit date:** 2026-06-11  
**Total tables:** 40  
**ORM:** TypeORM 0.3.19 / PostgreSQL  

---

## SCORING CRITERIA

Each dimension scored 0–100. Final score = weighted average.

| Dimension | Weight |
|-----------|--------|
| Schema Design | 15% |
| Data Quality | 15% |
| Performance | 15% |
| Scalability | 15% |
| Business Coverage | 20% |
| AI Readiness | 10% |
| Knowledge Brain Readiness | 5% |
| Production Readiness | 5% |

---

## DIMENSION 1: SCHEMA DESIGN — 42 / 100

### What was evaluated
- Normalization
- Use of proper data types
- Primary key strategy
- Foreign key completeness
- Constraint enforcement
- Index coverage

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| Primary keys: UUID on all tables | ✅ PASS | Consistent uuid PK |
| Enum types for status fields | ✅ PASS | Well-defined state machines |
| Decimal precision for financial data | ✅ PASS | decimal(15,2) on monetary fields |
| Self-referential category tree | ✅ PASS | Clean parentId pattern |
| Foreign key completeness | ❌ FAIL | Only 5 formal FKs out of 30+ relationships |
| Multi-tenancy at schema level | ❌ FAIL | No tenantId on any business table |
| Product → Category FK | ❌ FAIL | varchar category, no FK |
| Product variants / SKU system | ❌ FAIL | Monolithic product table |
| Coupon/discount table | ❌ FAIL | discount is unvalidated decimal |
| No duplicate entities | ❌ FAIL | email_campaigns + campaigns overlap |
| simple-array usage | ❌ WARN | recipientEmails, hashtags not normalized |
| No views, triggers, functions | ❌ WARN | All logic in application layer |
| Migration files | ❌ FAIL | None — relies on synchronize |

**Score reasoning:** Good UUID/enum/decimal discipline undermined by pervasive missing FKs, no multi-tenancy schema, duplicate entities, and no migration history.

**Score: 42/100**

---

## DIMENSION 2: DATA QUALITY — 38 / 100

### What was evaluated
- Null field risks
- Duplicate data risks
- Orphan record risks
- Denormalized counter accuracy
- Data integrity enforcement

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| Unique constraints on business keys | ✅ PARTIAL | email, slug, referralCode, orderCode, paymentCode — but missing on many |
| Timestamps on all tables | ❌ FAIL | order_items, agent_logs, lessons_learned, ai_memories missing updatedAt |
| Counter cache drift risk | ❌ HIGH | customers.totalOrders/totalSpent — no DB trigger |
| Orphan records via soft FKs | ❌ HIGH | 20+ tables with no FK enforcement |
| Duplicate customer risk | ❌ HIGH | customers has no UNIQUE on phone or email |
| Duplicate product risk | ❌ HIGH | products has no UNIQUE on name+source or sku |
| Denormalized product snapshots | ✅ ACCEPTABLE | order_items.productName is intentional snapshot |
| (period, periodDate) unique on scorecards | ❌ FAIL | No unique constraint — duplicates possible |
| recipientEmails as comma-array | ❌ FAIL | Not queryable, not bounded |

**Score reasoning:** Lack of UNIQUE constraints on customer phone/email, no DB-enforced counter sync, 20+ orphan-prone soft refs make data quality unreliable at scale.

**Score: 38/100**

---

## DIMENSION 3: PERFORMANCE — 35 / 100

### What was evaluated
- Index coverage for common query patterns
- N+1 query risks
- Heavy query patterns
- Aggregation risks

### Findings

| Index | Status | Query Impact |
|-------|--------|-------------|
| orders.customerId | ❌ MISSING | Slow CRM queries |
| order_items.orderId | ❌ MISSING | Slow order detail loading |
| order_items.productId | ❌ MISSING | Slow product sales analysis |
| contents.productId + status | ❌ MISSING | Slow AI content queries |
| leads.status + platform | ❌ MISSING | Slow CRM agent queries |
| agent_logs.agent + createdAt | ❌ MISSING | Slow agent monitoring |
| inventory.productId | ❌ MISSING | Slow stock history |
| affiliate_clicks.partnerId | ❌ MISSING | Slow partner reports |
| knowledge.type + domain | ❌ MISSING | Slow AI brain retrieval |
| products.status + source | ❌ MISSING | Slow product filtering |
| payments.orderId | ❌ MISSING | Slow payment lookup |
| price_alerts.productId | ✅ EXISTS | OK |
| ai_memories.(customerId, type) | ✅ EXISTS | OK |
| users.email | ✅ EXISTS | OK |
| N+1: categories tree | ❌ RISK | Recursive loading |
| N+1: orders → items → products | ❌ RISK | Eager loading not configured |
| No materialized views for analytics | ❌ MISSING | Scorecards re-scan full tables |

**Score reasoning:** Only 3 out of ~15 critical indexes exist. N+1 risks on most relational loads. No query optimization infrastructure.

**Score: 35/100**

---

## DIMENSION 4: SCALABILITY — 40 / 100

### What was evaluated
- Partitioning strategy
- High-write table management
- jsonb column management
- External dependency risks

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| agent_logs — partition by date | ❌ MISSING | Unbounded append-only table |
| affiliate_clicks — partition by date | ❌ MISSING | High-volume tracking |
| ai_memories — TTL or archive policy | ❌ MISSING | Unbounded per customer |
| knowledge — vector sync strategy | ❌ RISK | External vector DB dependency |
| TypeORM synchronize OFF in prod | ✅ PASS | Production safe |
| No migration files | ❌ FAIL | Schema changes uncontrolled |
| jsonb in high-write tables | ❌ WARN | WAL pressure at scale |
| simple-array columns | ❌ WARN | Not indexable |
| Performance scorecards — no fact table | ❌ MISSING | Full scan per report |
| No read replicas configured | ❌ UNKNOWN | Not visible in schema |
| Decimal precision for 10M+ records | ✅ PASS | decimal(15,2) appropriate |
| UUID PKs — no sequential risk | ✅ PASS | Random UUID avoids hotspot |

**Score reasoning:** Correct primitives (UUID, decimal) but no operational scaling infrastructure: no partitioning, no archive policies, no materialized views, no read replica hint.

**Score: 40/100**

---

## DIMENSION 5: BUSINESS COVERAGE — 58 / 100

### Module Coverage Assessment

| Module | Coverage | Missing |
|--------|----------|---------|
| **Product Management** | 65% | No variants, no multi-image, no cost price, no formal category FK, no brand link |
| **CRM** | 55% | No customer segments table, no journey events, no churn score, no LTV field, customers table lacks unique constraints |
| **Affiliate (Platform)** | 70% | Good — affiliates, clicks, conversions present. Missing: formal FKs, attribution chain validation |
| **Affiliate (Partner Program)** | 75% | Good — partners, tiers, payouts. Missing: formal FKs to clicks/conversions |
| **Content Factory** | 70% | contents, video_jobs, seo_articles present. Missing: content performance metrics linked to revenue |
| **Revenue Analytics** | 40% | No revenue_snapshots table, scorecards only store scores not raw figures, no fact table |
| **Inventory** | 65% | Ledger pattern works. Missing: reorder points, low-stock alerts, formal supplier FK |
| **Dropship** | 50% | Functional but completely isolated from main commerce, CRM invisible to dropship buyers |
| **Campaigns / Marketing** | 45% | campaigns table present but segment is varchar, no customer→campaign link, duplicate email_campaigns |
| **Marketplace (Vendor)** | 60% | vendors + disputes present. Missing: marketplace orders, vendor products, vendor payouts |
| **White-label** | 55% | white_label_clients present. Missing: link to tenants |
| **Payment** | 70% | Good — all methods covered. Missing: refund workflows, payment split |
| **Order Management** | 60% | Core present. Missing: shipping tracking, coupons, returns |

**Score: 58/100**

---

## DIMENSION 6: AI READINESS — 44 / 100

### What was evaluated
- AI agent infrastructure
- Decision audit trail
- Training data availability
- Context window data access
- Experiment framework

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| agent_configs — 25 agents defined | ✅ PASS | Good coverage |
| agent_logs — full execution audit | ✅ PASS | tokensUsed, cost, input/output |
| workflows — orchestration | ✅ PASS | CRON/EVENT/MANUAL/WEBHOOK triggers |
| experiments — A/B framework | ✅ PASS | Full lifecycle present |
| learning_cycles — 7-phase loop | ✅ PASS | Sophisticated self-improvement |
| ai_decisions table | ❌ MISSING | No record of micro-decisions |
| customer_journey_events | ❌ MISSING | No funnel data for AI to learn |
| AI agent → domain data FK | ❌ MISSING | Agents produce logs but not linked to domain events they triggered |
| knowledge ↔ agent_logs link | ❌ MISSING | Cannot tell which knowledge was used |
| revenue_snapshots for forecasting | ❌ MISSING | AI demand forecaster has no time-series fact table |
| customer behavioral profile | ❌ MISSING | ai_memories is raw; no synthesized profile |
| experiments → decision_memory link | ❌ MISSING | Experiment outcomes not linked to decisions |
| product pricing history | ❌ MISSING | Repricing agent has no history to learn from |

**Score: 44/100**

---

## DIMENSION 7: KNOWLEDGE BRAIN READINESS — 62 / 100

### What was evaluated
- Knowledge table completeness
- Vector integration
- Tiering and quality scoring
- Decision and lesson capture

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| knowledge table with quality scores | ✅ PASS | accuracy, completeness, freshness, businessValue |
| Knowledge tiering | ✅ PASS | SHORT/MEDIUM/LONG_TERM |
| knowledge.domain enum | ✅ PASS | 5 domains |
| decision_memory | ✅ PASS | Full decision lifecycle |
| lessons_learned with confidence | ✅ PASS | isProven, timesApplied/Succeeded |
| vectorId for external embedding | ✅ PARTIAL | Exists but external DB dependency |
| knowledge ↔ source entities (formal) | ❌ MISSING | sourceId/sourceType is varchar — no FK |
| knowledge expiry/refresh workflow | ✅ PARTIAL | expiresAt exists but no trigger |
| experiments ↔ knowledge link | ❌ MISSING | Experiment learnings not formally linked to knowledge |
| knowledge search index (full-text) | ❌ MISSING | No tsvector index on content/title |
| learning_cycles ↔ experiments | ❌ MISSING | Cycle phases not linked to experiment records |

**Score: 62/100**

---

## DIMENSION 8: PRODUCTION READINESS — 30 / 100

### What was evaluated
- Migration strategy
- Schema version control
- Multi-tenancy
- Security (at schema level)
- Observability

### Findings

| Check | Result | Notes |
|-------|--------|-------|
| Migration files exist | ❌ FAIL | Zero migration files — all synchronize |
| Multi-tenancy enforced | ❌ FAIL | No tenantId on any business table |
| Schema version history | ❌ FAIL | Cannot roll back schema changes |
| Synchronize OFF in production | ✅ PASS | Config shows NODE_ENV check |
| Audit log table | ❌ FAIL | No audit_logs table |
| API keys table | ❌ FAIL | No api_keys management |
| Sensitive data encryption (schema) | ❌ UNKNOWN | refreshToken, bankAccount, passwordHash in plain columns |
| Soft delete support | ❌ MISSING | No deletedAt on any table |
| Row-level security (PostgreSQL RLS) | ❌ MISSING | Not implemented |
| Backup/recovery strategy | ❌ UNKNOWN | Not visible in schema |
| Connection pooling config | ✅ PARTIAL | TypeORM defaults |

**Score: 30/100**

---

## FINAL SCORE CALCULATION

| Dimension | Score | Weight | Weighted Score |
|-----------|-------|--------|---------------|
| Schema Design | 42 | 15% | 6.3 |
| Data Quality | 38 | 15% | 5.7 |
| Performance | 35 | 15% | 5.25 |
| Scalability | 40 | 15% | 6.0 |
| Business Coverage | 58 | 20% | 11.6 |
| AI Readiness | 44 | 10% | 4.4 |
| Knowledge Brain Readiness | 62 | 5% | 3.1 |
| Production Readiness | 30 | 5% | 1.5 |
| **TOTAL** | | **100%** | **43.85** |

---

## OVERALL SCORE: **44 / 100**

### Grade: D+ — NOT PRODUCTION READY

---

## SCORE INTERPRETATION

```
0–30   CRITICAL — System cannot function
31–50  POOR     — Functional in dev, dangerous in production   ◄ WE ARE HERE
51–70  FAIR     — Deployable with known risks
71–85  GOOD     — Production-grade with minor gaps
86–100 EXCELLENT — Enterprise-ready
```

---

## TOP 10 ACTIONS TO IMPROVE SCORE

Ranked by score impact per effort:

| # | Action | Dimension(s) | Score Impact |
|---|--------|-------------|-------------|
| 1 | Create migration files for all 40 entities | Schema, Production | +8 pts |
| 2 | Add missing indexes (11 critical indexes) | Performance | +15 pts on that dimension |
| 3 | Add `tenantId` column to all business tables | Schema, Production | +10 pts |
| 4 | Replace soft FKs with formal FK constraints (top 10) | Schema, Data Quality | +8 pts |
| 5 | Create `customer_segments` table + link to campaigns | Business Coverage | +5 pts |
| 6 | Add UNIQUE constraint on customers.phone | Data Quality | +3 pts |
| 7 | Add partition/TTL strategy to agent_logs + affiliate_clicks | Scalability | +6 pts |
| 8 | Create `revenue_snapshots` fact table | AI Readiness, Business | +5 pts |
| 9 | Create `audit_logs` table | Production, Data Quality | +4 pts |
| 10 | Add categoryId FK to products + fix brands link | Schema, Business | +4 pts |

**Estimated score after top 10 actions: ~72/100 (GOOD)**

---

## STRENGTHS TO PRESERVE

- UUID primary keys throughout — good foundation
- Rich enum state machines on status fields — clean lifecycle modeling
- agent_configs + agent_logs — solid AI agent infrastructure
- knowledge table with quality scoring tiers — rare and valuable design
- learning_cycles 7-phase framework — sophisticated self-improvement architecture
- experiments with ADOPT/DISCARD/ITERATE lifecycle — proper scientific method
- decimal(15,2) on all financial fields — no float rounding errors
- Composite index on ai_memories(customerId, type) — shows index awareness
