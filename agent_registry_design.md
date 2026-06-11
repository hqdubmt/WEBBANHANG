# Agent Registry Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Complete Agent Registry

| ID | Agent | Endpoint (POST/GET) | Schedule | Priority | Status |
|----|-------|---------------------|---------|---------|--------|
| 01 | Trend Agent | `/api/agents/trend/run` | Every 4h | 1 | ACTIVE |
| 02 | Affiliate Agent | `/api/agents/affiliate/run` | Daily 02:00 | 5 | ACTIVE |
| 03 | Content Agent | `/api/agents/content/run` | Every 6h | 2 | ACTIVE |
| 04 | Publisher Agent | `/api/agents/publisher/run` | Hourly | 2 | ACTIVE |
| 05 | Lead Hunter | `/api/agents/lead-hunter/run` | Every 30m | 1 | ACTIVE |
| 06 | Sales Agent | `/api/agents/sales/run` | Every 1h | 1 | ACTIVE |
| 07 | CRM Agent | `/api/agents/crm/run` | Daily 03:00 | 3 | ACTIVE |
| 08 | Video Agent | `/api/agents/video/run` | Daily 08:00 | 3 | PARTIAL |
| 09 | SEO Agent | `/api/agents/seo/run` | Daily 05:00 | 3 | ACTIVE |
| 10 | Trend Predictor | `/api/agents/trend-predictor/run` | Daily 04:00 | 4 | ACTIVE |
| 11 | Price Agent | `/api/agents/price/run` | Every 2h | 2 | ACTIVE |
| 12 | Segmentation | `/api/agents/segmentation/run` | Daily 02:00 | 4 | ACTIVE |
| 13 | Email Agent | `/api/agents/email/run` | Daily 09:00 | 4 | ACTIVE |
| 14 | Telegram Agent | `/api/agents/telegram/run` | Real-time | 1 | ACTIVE |
| 15 | Knowledge Agent | `/api/agents/knowledge/run` | Daily 06:00 | 4 | ACTIVE |
| 16 | Master Agent | `/api/agents/master/run` | Every 30m | 0 | ACTIVE |
| 17 | Video Optimizer | `/api/agents/video-optimizer/run` | Daily 18:00 | 5 | PARTIAL |
| 18 | Competitor Monitor | `/api/agents/competitor-monitor/run` | Daily 07:00 | 5 | ACTIVE |
| 19 | Demand Forecaster | `/api/agents/demand-forecaster/run` | Daily 06:00 | 4 | ACTIVE |
| 20 | Repricing Agent | `/api/agents/repricing/run` | Every 4h | 2 | ACTIVE |
| 21 | Marketplace Opt. | `/api/agents/marketplace-optimizer/run` | Daily 10:00 | 5 | ACTIVE |

---

## 2. Agent Lifecycle States

```
Agent Lifecycle State Machine:

  ┌───────────────┐
  │  REGISTERED   │  AgentConfig record created
  └───────┬───────┘
          │ isEnabled = true
          ▼
  ┌───────────────┐
  │    READY      │  Waiting for next scheduled run
  └───────┬───────┘
          │ Schedule trigger OR manual run
          ▼
  ┌───────────────┐
  │    RUNNING    │  AgentLog.status = RUNNING
  └───────┬───────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌───────┐  ┌────────┐
│COMPL. │  │ FAILED │  AgentLog.status = SUCCESS | FAILED
└───────┘  └───┬────┘
               │ totalRetries < maxRetries
               ▼
          ┌────────┐
          │ RETRY  │  Re-queue with backoff
          └────────┘
               │ maxRetries exceeded
               ▼
          ┌────────┐
          │ DEAD   │  Alert + human intervention required
          └────────┘
```

---

## 3. AgentLog — Health Monitoring

```typescript
// agent-log.entity.ts
AgentLog {
  agent: AgentName     // indexed
  status: SUCCESS | FAILED | RUNNING
  input: jsonb
  output: jsonb
  errorMessage: string
  tokensUsed: number
  cost: decimal(10,6)  // in USD or VND
  durationMs: number
  createdAt: Date      // indexed with agent
}
```

### Health Metrics Per Agent
```
getAgentHealth(agentName):
  last_24h_runs = COUNT(WHERE agent=name AND createdAt>NOW()-24h)
  success_rate  = success_count / last_24h_runs × 100
  avg_duration  = AVG(durationMs)
  total_cost_24h = SUM(cost WHERE today)
  last_run_time = MAX(createdAt)
  
Health score:
  ≥ 95% success → HEALTHY (green)
  80–94%         → DEGRADED (yellow)
  < 80%          → FAILING  (red)
  No runs 24h    → OFFLINE  (grey)
```

---

## 4. Agent Priority Queue

```
Master Agent builds priority queue:
  1. Sort by: priority ASC (lower = higher priority)
  2. Filter: isEnabled=true
  3. Filter: lastRunAt + cronInterval <= NOW()
  4. Dependencies: check prerequisite agents completed

Dependency Graph:
  Trend Agent     → feeds → Content Agent, Video Agent, SEO Agent
  Content Agent   → feeds → Publisher Agent
  Lead Hunter     → feeds → Sales Agent
  Sales Agent     → feeds → CRM Agent
  CRM Agent       → feeds → Segmentation Agent
  Knowledge Agent → feeds → ALL agents (via RAG)
  Master Agent    → runs LAST (after collecting results)
```

---

## 5. Agent Registry API

```
GET /api/agents/master/kpi  → system-wide overview
GET /api/agents/{name}/stats → per-agent stats (most have /stats)

AgentConfig management (no current dedicated endpoint):
  Needs: GET/PUT /api/agent-configs     → enable/disable, adjust cron
  Needs: GET /api/agent-configs/:name   → single config
```

---

## 6. Agent Cost Tracking

```
Per-agent cost tracking via AgentLog.cost:
  Total AI cost today = SUM(agent_logs.cost WHERE DATE(createdAt) = TODAY)
  Cost per agent = SUM grouped by agent.name
  
Budget controls (to implement):
  AgentConfig.config.dailyBudgetLimit = 10000  // VND
  If SUM(cost today) > dailyBudgetLimit → pause agent until next day
  
Current: No budget controls, agents run freely
```
