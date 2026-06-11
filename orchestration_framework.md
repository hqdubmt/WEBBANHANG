# Orchestration Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Workflow Examples

### Workflow A: Revenue Autopilot (Daily)

```
06:00  Knowledge Agent runs
  └── Syncs products → knowledge (Qdrant indexed)
  └── Updates FAQ knowledge from recent leads
  
06:30  Trend Agent runs
  └── Analyzes trending topics, hashtags
  └── Identifies top product trends
  └── Feeds: Knowledge{domain:MARKET}
  
07:00  Content Agent runs
  └── Reads: product knowledge + trend data
  └── Generates: 14 posts for day's schedule
  └── Saves: Content{status:scheduled}
  
07:30  SEO Agent runs
  └── Reads: keyword opportunities
  └── Generates: 2–3 SEO articles
  └── Saves: SeoArticle{status:draft}
  
08:00  Publisher Agent runs (continuous loop)
  └── Reads: Content{status:scheduled, scheduledAt<=NOW()}
  └── Publishes to: Facebook, Telegram, TikTok
  └── Updates: Content{status:published, platformPostId}
  
09:00  Lead Hunter Agent runs
  └── Reads: new messages/comments from platforms
  └── Creates: Lead records with score/intent
  └── Sets: Lead.followUpAt = NOW() + 5min
  
10:00  Sales Agent runs
  └── Reads: leads WHERE status=new OR followUpAt<=NOW()
  └── Responds with AI-generated messages
  └── Updates: Lead.status = contacted
  
[Continuous] Telegram Agent
  └── Real-time: responds to inbound Telegram messages
  └── Creates: Lead records
  └── Handles: Order inquiries
  
18:00  CRM Agent runs
  └── Reads: all customers
  └── Updates: churnRisk scores
  └── Identifies: at-risk customers
  
20:00  Price Agent runs
  └── Analyzes: competitor prices
  └── Adjusts: product prices within policy bounds
  
23:00  Master Agent reports
  └── Aggregates: all agent runs
  └── Saves: PerformanceScorecard
  └── Triggers: Business OS daily report
```

---

## 2. Workflow B: Trend→Content→Publish→Lead→Sales

```
[EVENT: New TikTok Trend Detected]

Trend Agent detects:
  → topic: "Kem chống nắng cho da nhạy cảm"
  → platform: TikTok
  → trending_score: 87

  ┌──────────────────────────────────────────────────────┐
  │ Knowledge Brain update                                │
  │ Knowledge {domain:MARKET, title: "Trend: ..."}       │
  └──────────────────────────────────────────────────────┘
            │
            ▼ (Content Agent triggered)
  ┌──────────────────────────────────────────────────────┐
  │ Content Agent creates:                               │
  │ - TikTok script for "kem chong nang nhaycam" product │
  │ - Facebook post with trending hashtags               │
  │ - SEO article: "Kem chong nang tot cho da nhay cam"  │
  └──────────────────────────────────────────────────────┘
            │
            ▼ (Publisher Agent)
  ┌──────────────────────────────────────────────────────┐
  │ Published to:                                        │
  │ - TikTok: script queued for Video Agent              │
  │ - Facebook: post published with hashtags             │
  │ - Website: SEO article published                     │
  └──────────────────────────────────────────────────────┘
            │
            ▼ (Lead Hunter picks up engagement)
  ┌──────────────────────────────────────────────────────┐
  │ Leads created from:                                  │
  │ - Facebook comments "Bán ở đâu?"                    │
  │ - TikTok DMs after video                            │
  └──────────────────────────────────────────────────────┘
            │
            ▼ (Sales Agent)
  ┌──────────────────────────────────────────────────────┐
  │ Sales Agent qualifies lead:                          │
  │ → intent: buy, score: 78                            │
  │ → Sends product info + price + offer                 │
  │ → Follow-up at +4h if no response                   │
  └──────────────────────────────────────────────────────┘
            │
            ▼ (Order created)
            Revenue ←─────────────────────────────────────
```

---

## 3. Event Bus (WebSocket Events)

```typescript
// Gateway module: apps/api/src/modules/gateway/

Available event types:
  'agent.started'    → {agent: string, runId: string}
  'agent.completed'  → {agent: string, runId: string, status: string, output: any}
  'agent.failed'     → {agent: string, error: string}
  'lead.created'     → {leadId: string, platform: string, score: number}
  'lead.converted'   → {leadId: string, orderId: string}
  'order.placed'     → {orderId: string, amount: number}
  'customer.tier_changed' → {customerId: string, from: string, to: string}
  'risk_alert'       → {severity: string, category: string, message: string}
  
Subscriptions from frontend:
  socket.on('agent.completed', updateAgentPanel)
  socket.on('lead.created', incrementLeadCounter)
  socket.on('order.placed', updateRevenueCounter)
  socket.on('risk_alert', showNotification)
```

---

## 4. Dependency Management

```
DEPENDENCY RULES (enforced by Master Agent):

  Content Agent REQUIRES:
    - Knowledge Agent ran < 24h ago
    - Trend Agent ran < 6h ago (for fresh trends)
  
  Publisher Agent REQUIRES:
    - Content Agent ran (has scheduled contents)
  
  Sales Agent REQUIRES:
    - Lead Hunter ran (has new leads to process)
  
  CRM Agent REQUIRES:
    - Orders updated (has fresh order data)
  
  Repricing Agent REQUIRES:
    - Competitor Monitor ran < 24h ago (fresh competitor prices)
    - Demand Forecaster ran < 24h ago (demand signals)
  
  Knowledge Agent:
    - No dependencies (first in chain)
  
  Trend Agent:
    - No dependencies (market data independent)

Master Agent checks:
  AgentLog.agent = dependency AND status = SUCCESS 
  AND createdAt > NOW() - required_freshness
```

---

## 5. Parallel vs Sequential Execution

```
Sequential (must wait):
  Knowledge Agent → Content Agent → Publisher Agent
  Lead Hunter → Sales Agent → CRM Agent
  Competitor Monitor → Repricing Agent

Parallel (safe to run simultaneously):
  Trend Agent || Competitor Monitor || Demand Forecaster
  Email Agent || Telegram Agent
  SEO Agent || Video Agent (independent pipelines)

Master Agent execution plan:
  Batch 1 (parallel): Trend, Competitor Monitor, Demand Forecaster
  Batch 2 (parallel): Knowledge Agent, Segmentation Agent
  Batch 3 (parallel): Content Agent, SEO Agent, Video Agent
  Batch 4 (sequential): Publisher Agent
  Batch 5 (parallel): Lead Hunter, Price Agent, Repricing Agent
  Batch 6 (sequential): Sales Agent
  Batch 7 (sequential): CRM Agent
  Batch 8 (parallel): Email Agent, Telegram Agent
  Batch 9: Analytics + Business OS + AI Board
```
