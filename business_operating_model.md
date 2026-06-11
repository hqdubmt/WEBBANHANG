# Business Operating Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Revenue Autopilot Loop

```
REVENUE AUTOPILOT — 24h Continuous Cycle

        ┌─────────────────────────────────────────────────────┐
        │                                                     │
        ▼                                                     │
[01] TREND DETECTION (Trend Agent)                           │
  Identifies: trending products, hashtags, topics            │
  Output: Knowledge{domain:MARKET}                           │
        │                                                     │
        ▼                                                     │
[02] CONTENT CREATION (Content + Video + SEO Agents)         │
  Creates: Posts, Scripts, Articles optimized for trends     │
  Schedules: Optimal posting times per platform              │
        │                                                     │
        ▼                                                     │
[03] DISTRIBUTION (Publisher Agent)                          │
  Publishes: FB / Telegram / TikTok / Website                │
  Reaches: 100K+ people per week (target)                    │
        │                                                     │
        ▼                                                     │
[04] LEAD CAPTURE (Lead Hunter Agent)                        │
  Captures: All inbound messages/comments/clicks             │
  Scores: AI-powered intent scoring (0–100)                  │
  Creates: Lead records with platform, intent, content       │
        │                                                     │
        ▼                                                     │
[05] SALES CONVERSION (Sales + Telegram Agents)              │
  Qualifies: Lead scoring → qualified tier                   │
  Responds: Personalized AI messages < 5 minutes             │
  Converts: Qualified lead → Order confirmation              │
        │                                                     │
        ▼                                                     │
[06] ORDER FULFILLMENT (Orders + Inventory + Dropship)       │
  Confirms: Order → assign to supplier                       │
  Tracks: Shipping → delivered                               │
  Updates: Customer.totalOrders, totalSpent, tier            │
        │                                                     │
        ▼                                                     │
[07] RETENTION (CRM + Email + Telegram Agents)               │
  Follows up: Post-delivery satisfaction                     │
  Upsells: Cross-sell recommendations                        │
  Retains: churnRisk monitoring + win-back campaigns         │
        │                                                     │
        └─────────── REVENUE → feeds → next trend cycle ─────┘
```

---

## 2. Knowledge Loop

```
KNOWLEDGE ACCUMULATION LOOP

Every interaction generates knowledge:
  - Customer asks question → FAQ knowledge
  - Product sells → Product performance knowledge
  - Campaign runs → Campaign effectiveness knowledge
  - Agent makes decision → Decision memory knowledge
  - Competitor changes price → Market intelligence knowledge

Knowledge flows:
  DB Data → KnowledgeBrainService.extract()
         → Knowledge entity (PostgreSQL)
         → RagService.index()
         → Qdrant (vector embeddings)
         ← All agents query via RAG
  
Quality metrics per knowledge:
  accuracy: 0–100
  completeness: 0–100
  freshness: 0–100
  businessValue: 0–100

Knowledge tiers:
  SHORT_TERM:  24–72h data (real-time market signals)
  MEDIUM_TERM: 7–30d data (trend patterns)
  LONG_TERM:   3M+ data (strategic insights)
  
KnowledgeStatus lifecycle:
  PENDING → ACTIVE → INACTIVE (expired/superseded)
```

---

## 3. Learning Loop

```
CONTINUOUS LEARNING LOOP (7 Phases — Self-Improvement Service)

Every 24 hours:
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 1: OBSERVE                                           │
  │    Collect: revenues, leads, orders, agent performance      │
  │    Timeframes: today vs yesterday vs 7d avg vs 30d avg      │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  PHASE 2: MEASURE                                           │
  │    Compare: all KPIs vs targets                             │
  │    Compute: delta %, trends, anomalies                      │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  PHASE 3: ANALYZE                                           │
  │    LLM prompt: "Given this data, what are the key insights?" │
  │    Generates: root cause analysis, pattern recognition       │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  PHASE 4: LEARN                                             │
  │    Save: LessonLearned {type, domain, lesson, confidence}   │
  │    Update: DecisionMemory (outcomes of past decisions)       │
  │    Save: PerformanceScorecard                               │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  PHASE 5: IMPROVE                                           │
  │    Generate: Improvement actions list                       │
  │    Prioritize: by expected impact + confidence              │
  │    Update: AgentConfig parameters (if needed)              │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  PHASE 6: EXECUTE                                           │
  │    Run: autonomous improvements within policy               │
  │    Flag: improvements needing human approval                │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  PHASE 7: VALIDATE                                          │
  │    After 24–72h: did improvements work?                     │
  │    Update: LearningCycle.validationResults                  │
  │    Increment: iterationCount → system gets smarter over time │
  └─────────────────────────────────────────────────────────────┘
```

---

## 4. Revenue Streams

```
Stream 1: Direct E-commerce Sales
  Path: Content → Lead → Sales Agent → Order → Fulfillment
  Margin: 35–60% (owned inventory)
  Volume: Primary revenue source

Stream 2: Affiliate Revenue
  Path: Content with affiliate links → Clicks → Sales on partner sites
  Commission: 5–15% of sale value
  Agent: Affiliate Agent (02)

Stream 3: Dropship Revenue
  Path: Lead → Order → Supplier fulfillment (no stock needed)
  Margin: 15–30%
  Agent: Dropship module + Supplier module

Stream 4: Marketplace Revenue
  Path: Listings on Shopee/Lazada/Tiki → Orders → Fulfillment
  Margin: 20–40% after platform fees
  Agent: Marketplace Optimizer (21)

Stream 5: White-label / Enterprise
  Path: Sell the OS itself to other businesses
  Model: Monthly SaaS fee per tenant
  Entity: Tenant (starter/professional/enterprise plans)
  Agent: WhiteLabel Onboarding, Enterprise Health
```
