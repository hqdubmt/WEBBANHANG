# Executive AI Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. AI Board — 7 Roles

**Path:** `apps/api/src/modules/ai-board/`

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AI BOARD OF DIRECTORS                         │
│                   Daily Meeting: GET /api/ai-board/meeting           │
├──────────────┬──────────────────────────────────────────────────────┤
│ Role         │ API Endpoint          │ Responsibility                │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ CEO          │ GET /api/ai-board/ceo │ Overall company performance,  │
│              │                       │ strategic direction, growth    │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ CFO          │ GET /api/ai-board/cfo │ Revenue, profit, cost,        │
│              │                       │ financial health              │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ COO          │ GET /api/ai-board/coo │ Operations, fulfillment,      │
│              │                       │ agent performance, SLAs        │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ CTO          │ GET /api/ai-board/cto │ System health, infrastructure, │
│              │                       │ AI performance, tech debt      │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ CMO          │ GET /api/ai-board/cmo │ Marketing, content, traffic,  │
│              │                       │ campaigns, social performance  │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ CRO          │ GET /api/ai-board/cro │ Revenue optimization,         │
│ (Rev. Ops)   │                       │ conversion rates, pricing      │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ CSO          │ GET /api/ai-board/cso │ Sales, leads, CRM,            │
│ (Sales)      │                       │ pipeline health                │
└──────────────┴───────────────────────┴──────────────────────────────┘
```

---

## 2. Business OS — Endpoints

**Path:** `apps/api/src/modules/business-os/`

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/business-os/dashboard` | Tổng quan toàn bộ business metrics |
| `GET /api/business-os/funnel` | Revenue funnel: Lead→Qualified→Order→Delivered |
| `GET /api/business-os/kpi` | KPI framework với targets và actuals |
| `GET /api/business-os/intelligence` | Business intelligence summary |
| `GET /api/business-os/priorities` | Top priority issues needing attention |
| `GET /api/business-os/plan` | Autonomous plan for next actions |
| `GET /api/business-os/questions` | Core strategic questions và answers |
| `GET /api/business-os/report/daily` | Daily business report |
| `GET /api/business-os/report/weekly` | Weekly business retrospective |

---

## 3. Data Sources — 5 Knowledge Domains

```
Knowledge Entity: domain field = KnowledgeDomain enum

DOMAIN 1: PRODUCT
  - Product catalog, pricing, inventory
  - Best sellers, margin analysis
  - Source: products, product_variants, inventory tables

DOMAIN 2: CUSTOMER  
  - Customer profiles, segments, LTV
  - churnRisk distribution, tier breakdown
  - Source: customers, leads, orders tables

DOMAIN 3: BUSINESS
  - Revenue snapshots, P&L
  - Campaign performance, ROI
  - Source: revenue_snapshots, campaigns, orders tables

DOMAIN 4: MARKET
  - Competitor intelligence
  - Trend analysis, demand forecasts
  - Source: Knowledge{domain:MARKET} + agent outputs

DOMAIN 5: OPERATIONAL
  - Agent performance, system health
  - Learning cycles, decisions
  - Source: agent_logs, agent_configs, learning_cycles
```

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXECUTIVE AI LAYER                               │
├──────────────────────────┬──────────────────────────────────────────────┤
│  AI BOARD (ai-board/)    │  BUSINESS OS (business-os/)                  │
│  ─────────────────────   │  ──────────────────────────────────────────  │
│  7 Board Members         │  dashboard, funnel, kpi                      │
│  Daily Board Meeting     │  intelligence, priorities, plan               │
│  LLM generates reports   │  questions, daily/weekly reports             │
│  per role perspective    │  Self-improvement loop integration           │
├──────────────────────────┴──────────────────────────────────────────────┤
│  ANALYTICS MODULE (analytics/)                                           │
│  dashboard, revenue, leads, customers, ai, content                      │
├─────────────────────────────────────────────────────────────────────────┤
│  SELF-IMPROVEMENT (self-improvement/)                                    │
│  observe → measure → analyze → learn → improve → execute → validate     │
│  PerformanceScorecard, LearningCycle, LessonLearned, DecisionMemory     │
├─────────────────────────────────────────────────────────────────────────┤
│           DATA LAYER — PostgreSQL                                        │
│  revenue_snapshots, performance_scorecards, agent_logs                  │
│  orders, customers, leads, knowledge, campaigns                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Executive AI Service Architecture

```typescript
// AiBoardService — ai-board.service.ts
class AiBoardService {
  // Each board member calls Knowledge Brain for their domain
  async getCeoReport() {
    const productIntel = await this.kb.getProductIntelligence();
    const customerIntel = await this.kb.getCustomerIntelligence();
    const businessIntel = await this.kb.getBusinessIntelligence();
    const prompt = buildCeoPrompt(productIntel, customerIntel, businessIntel);
    return this.aiService.generate(prompt);
  }
  
  // Board meeting aggregates all 7 reports
  async runDailyBoardMeeting() {
    const [ceo, cfo, coo, cto, cmo, cro, cso] = await Promise.all([...]);
    return { reports: {ceo, cfo, coo, cto, cmo, cro, cso}, timestamp: new Date() };
  }
}
```
