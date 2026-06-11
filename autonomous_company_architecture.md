# Autonomous Company Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. 7-Layer Architecture

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    AUTONOMOUS COMPANY ARCHITECTURE                        ║
║                    AI Social Commerce OS V3                               ║
╠═══════════════════════════╦═══════════════════════════════════════════════╣
║  LAYER 7: ORCHESTRATION    ║  Master Agent (16) — Coordinator              ║
║  [Top — Brain]             ║  Self-Improvement Loop                       ║
║                            ║  AI Board (7 executives)                     ║
╠═══════════════════════════╬═══════════════════════════════════════════════╣
║  LAYER 6: INTELLIGENCE     ║  Business OS                                  ║
║  [Executive Thinking]      ║  Forecasting, Risk Detection                 ║
║                            ║  Decision Support, KPI Framework             ║
╠═══════════════════════════╬═══════════════════════════════════════════════╣
║  LAYER 5: AUTOMATION       ║  21 Specialized Agents                        ║
║  [Execution]               ║  Content/Video/SEO/Sales/CRM/etc.            ║
║                            ║  Policy Engine, Agent Health Monitor         ║
╠═══════════════════════════╬═══════════════════════════════════════════════╣
║  LAYER 4: BUSINESS OPS     ║  Revenue Streams                              ║
║  [Revenue Generation]      ║  Direct Sales / Affiliate / Dropship          ║
║                            ║  Marketplace / White-label / Enterprise       ║
╠═══════════════════════════╬═══════════════════════════════════════════════╣
║  LAYER 3: KNOWLEDGE        ║  Knowledge Brain (5 domains)                  ║
║  [Memory & Context]        ║  RAG Service (Qdrant vector store)           ║
║                            ║  Learning Cycles, Lesson Learned             ║
╠═══════════════════════════╬═══════════════════════════════════════════════╣
║  LAYER 2: CORE PLATFORM    ║  NestJS API (50+ modules)                     ║
║  [Application Layer]       ║  PostgreSQL (50+ entities)                   ║
║                            ║  Ollama LLM + AiService                      ║
╠═══════════════════════════╬═══════════════════════════════════════════════╣
║  LAYER 1: INFRASTRUCTURE   ║  Docker Compose                               ║
║  [Foundation]              ║  PostgreSQL + Redis + Qdrant + Nginx          ║
║                            ║  Next.js (apps/web) + NestJS (apps/api)      ║
╚═══════════════════════════╩═══════════════════════════════════════════════╝
```

---

## 2. Current State Per Layer

### Layer 1: Infrastructure
```
Status: PRODUCTION READY (9/10)
  ✓ Docker Compose với PostgreSQL, Qdrant, Nginx
  ✓ apps/api (NestJS) running
  ✓ apps/web (Next.js) running
  ✓ SSL via nginx
  ✓ PM2 ecosystem config (ecosystem.config.js)
  ✗ Redis not yet integrated (planned cache layer)
  ✗ Object storage (S3/R2) for video files missing
```

### Layer 2: Core Platform
```
Status: PRODUCTION READY (8/10)
  ✓ 50+ entities deployed
  ✓ 50+ modules implemented
  ✓ Swagger API docs at /api/docs
  ✓ Multi-tenant support (Tenant entity, TenantPlan)
  ✓ Authentication (auth module)
  ✓ Ollama LLM integration (AiService)
  ✓ RAG service (RagService + Qdrant)
  ✗ No test coverage (unit/integration tests)
  ✗ No rate limiting (API vulnerability)
```

### Layer 3: Knowledge
```
Status: OPERATIONAL (7/10)
  ✓ Knowledge entity: 5 domains, 3 tiers
  ✓ KnowledgeBrainService with 5 intelligence methods
  ✓ Qdrant collections for RAG
  ✓ LearningCycle, LessonLearned, DecisionMemory, Experiment entities
  ✗ No automated knowledge expiry/refresh
  ✗ Qdrant sync not fully bidirectional
```

### Layer 4: Business Ops
```
Status: OPERATIONAL (7/10)
  ✓ Core e-commerce: orders, products, customers, inventory
  ✓ Affiliate program (affiliate, affiliate-portal)
  ✓ Dropship module
  ✓ Marketplace module
  ✓ White-label / Enterprise modules
  ✓ Payment processing
  ✗ No payment gateway integration (payment entity exists)
  ✗ Fulfillment automation incomplete
```

### Layer 5: Automation
```
Status: OPERATIONAL (6/10)
  ✓ 21+ agents defined and deployed
  ✓ All agents with controller + service + module
  ✗ Video pipeline incomplete (TTS + render missing)
  ✗ Follow-up scheduler missing
  ✗ Policy Engine not implemented
  ✗ Agent scheduling is manual (no cron)
```

### Layer 6: Intelligence
```
Status: OPERATIONAL (6/10)
  ✓ Business OS (9 endpoints)
  ✓ AI Board (7 executives)
  ✓ Analytics (6 endpoints)
  ✓ Forecasting via Demand Forecaster
  ✗ Risk detection not proactive (reactive only)
  ✗ No external data integrations (Google Analytics, Search Console)
```

### Layer 7: Orchestration
```
Status: FUNCTIONAL (6/10)
  ✓ Master Agent (evaluateAndAssign)
  ✓ Self-Improvement Service (7-phase cycle)
  ✓ PerformanceScorecard tracking
  ✗ Master Agent not scheduled (manual trigger only)
  ✗ No dependency enforcement between agents
  ✗ Human oversight workflow missing
```

---

## 3. Cross-cutting Concerns

```
Security:         PARTIAL — Auth exists, no rate limiting, no WAF
Observability:    PARTIAL — AgentLog good, no APM (no Prometheus/Grafana)
Reliability:      PARTIAL — maxRetries exist, no circuit breaker
Scalability:      NOT IMPLEMENTED — single instance, no horizontal scaling
Compliance:       PARTIAL — AuditLog exists, not consistently used
Governance:       PARTIAL — Policy rules designed, not enforced
```
