# Implementation Roadmap — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## Phase 1: Foundation (DONE — V1–V6)

**Status: COMPLETED**

```
✓ Core Infrastructure
  - Docker Compose: PostgreSQL + Qdrant + Nginx
  - NestJS API application
  - Next.js frontend

✓ Core Business Platform
  - Products, Categories, Orders, Customers, Leads
  - Inventory, Payments, Campaigns, Coupons
  - Authentication, User management

✓ AI Foundation
  - Ollama LLM integration (AiService)
  - RAG Service (Qdrant vector store)
  - Knowledge Brain service (5 domains)

✓ Initial Agent Set (V1–V2)
  - Agents 1–16: Trend, Content, Publisher, Lead, Sales, CRM, SEO, Video, etc.

✓ Advanced Entities (V3–V6)
  - Self-improvement: LearningCycle, LessonLearned, DecisionMemory, Experiment
  - Performance: PerformanceScorecard, RevenueSnapshot
  - AI Board: 7-executive structure
  - Business OS: 9 endpoints
  - Multi-tenant: Tenant, WhiteLabel, Enterprise modules

Milestone: System operational with 21 agents, all core entities deployed.
Timeline: 2025 Q1 – 2026 Q1
```

---

## Phase 2: Automation (CURRENT — V7+)

**Status: IN PROGRESS — Target: 2026 Q3**

```
SPRINT 1 (June 2026 — 2 weeks):
  P1: Master Agent scheduling cron (every 30min)
  P1: Follow-up scheduler (poll followUpAt, trigger outreach)
  P1: Risk detection cron → WebSocket alerts

SPRINT 2 (July 2026 — 3 weeks):
  P1: TTS integration (ElevenLabs or OpenAI TTS)
  P1: FFmpeg video rendering service
  P1: Object storage integration (S3 or CloudFlare R2)
  P1: PolicyEngine service (validate() method)

SPRINT 3 (August 2026 — 2 weeks):
  P2: Telegram-based human approval workflow
  P2: Publisher Agent scheduling cron
  P2: Content performance tracking (platform API stubs)
  P2: SeoKeyword entity + keyword management API

SPRINT 4 (September 2026 — 2 weeks):
  P2: sitemap.xml auto-generation
  P2: Redis cache layer (tier counts, CRM stats)
  P2: Consistent AuditLog coverage across agents
  P3: Google Search Console API integration

Milestone: All agents running on schedule. Video pipeline complete.
           Human approval workflow in place. Risk alerts proactive.
Expected Autonomy Level: 3.5
```

---

## Phase 3: Intelligence (2026 Q4)

```
MONTH 1 (October 2026):
  P1: Google Analytics 4 integration
  P1: Platform APIs: Facebook Insights, TikTok Analytics
  P1: Content Performance Score (CPS) computation live
  P2: Video Performance Score (VPS) computation live

MONTH 2 (November 2026):
  P1: Formal Forecast API (7/14/30-day revenue + lead forecasts)
  P2: Topic cluster mapping for SEO (pillar/cluster strategy)
  P2: A/B test automation (create variants, measure, auto-decide)
  P2: Customer LTV ML model (improve LTV prediction accuracy)

MONTH 3 (December 2026):
  P2: Schema markup injection (Article + Product + FAQ)
  P2: Company Health Score (CHS) live computation
  P3: Facebook Prophet revenue forecasting model
  P3: Mobile app MVP (alert + quick actions)

Milestone: Full observability. Platform data feeding optimization loops.
           Forecasting accurate to ±12%. CHS tracked daily.
Expected Autonomy Level: 3.8
```

---

## Phase 4: Autonomy (2027 Q1–Q2)

```
MONTH 1 (January 2027):
  P1: Learning cycle auto-trigger daily at 23:00
  P1: Auto-execute Tier 1-2 improvements from learning cycle
  P1: Self-improving prompts (LLM learns from star content patterns)
  P2: ML model for churnRisk (replace formula with trained model)

MONTH 2 (February 2027):
  P1: Budget-based agent throttling (daily spend limits)
  P2: Dynamic content scheduling (ML-based optimal posting times)
  P2: Automated campaign creation (segment → campaign → execute)
  P3: Test coverage (unit + integration tests for core modules)

MONTH 3 (March 2027):
  P2: Horizontal scaling preparation (stateless API, Redis session)
  P2: Rate limiting + WAF configuration
  P3: Payment gateway integration (VNPay, Momo, ZaloPay)
  P3: Tax invoice generation automation

MONTH 4–6 (April–June 2027):
  P2: Level 4 autonomy certification
  P3: Expand to 3+ tenants (white-label validation)
  P3: Marketplace API integrations (Shopee/Lazada partner API)
  P3: Level 5 autonomy research + design

Milestone: System operates at Level 4. < 2 hours/day human oversight.
           Revenue growing autonomously. Learning loop generating gains.
Expected Autonomy Level: 4.0 → 4.5
```

---

## Timeline Summary

```
┌──────────────┬──────────────────────────────────────────────────────────┐
│ Phase        │ Timeline        │ Autonomy Level │ Key Milestone         │
├──────────────┼─────────────────┼────────────────┼───────────────────────┤
│ Phase 1      │ 2025 Q1–2026 Q1 │ 2.0 → 3.0      │ 21 agents, all entities│
│ Foundation   │ (DONE)          │                │ AI Board, Business OS  │
├──────────────┼─────────────────┼────────────────┼───────────────────────┤
│ Phase 2      │ 2026 Q2–Q3      │ 3.0 → 3.5      │ Video complete,        │
│ Automation   │ (CURRENT)       │                │ Schedulers, Policies   │
├──────────────┼─────────────────┼────────────────┼───────────────────────┤
│ Phase 3      │ 2026 Q4         │ 3.5 → 3.8      │ Full observability,    │
│ Intelligence │                 │                │ Platform data live     │
├──────────────┼─────────────────┼────────────────┼───────────────────────┤
│ Phase 4      │ 2027 Q1–Q2      │ 3.8 → 4.5      │ Self-improving AI,     │
│ Autonomy     │                 │                │ < 2h/day human work    │
└──────────────┴─────────────────┴────────────────┴───────────────────────┘
```

---

## Key Dependencies

```
Must complete BEFORE scaling:
  ✓ All 21 agents operational (Phase 1)
  □ PolicyEngine service (Phase 2)
  □ Human approval workflow (Phase 2)
  □ Full audit log coverage (Phase 2)

Must complete BEFORE Phase 4:
  □ Performance tracking live (Phase 3)
  □ Forecasting accurate (Phase 3)
  □ A/B test automation (Phase 3)
```
