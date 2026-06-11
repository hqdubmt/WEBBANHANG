# Master Agent Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Master Agent Role

Master Agent (Agent 16) là **trung tâm điều phối** toàn bộ hệ thống 21+ agents:
- **Scheduler:** Quyết định agent nào chạy, khi nào
- **Coordinator:** Đảm bảo agents chạy theo đúng thứ tự dependencies
- **Supervisor:** Monitor health, restart failed agents, escalate critical failures

**Path:** `apps/api/src/modules/agents/master/`

---

## 2. API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/agents/master/run` | Trigger Master Agent cycle: `evaluateAndAssign()` |
| `GET`  | `/api/agents/master/kpi` | System-wide KPI: `getSystemKpi()` |

---

## 3. Master Agent Workflow

```
POST /api/agents/master/run → evaluateAndAssign()
    │
    ├── 1. Load all AgentConfig (isEnabled=true, ordered by priority)
    │
    ├── 2. For each agent:
    │       a. Check: is agent overdue? (lastRunAt + cronInterval < NOW())
    │       b. Check: is agent healthy? (failure rate < threshold)
    │       c. Check: prerequisites met? (dependency agents ran first)
    │       d. Check: system resources OK? (token budget, cost limit)
    │
    ├── 3. Build execution queue (priority-ordered)
    │
    ├── 4. Execute agents sequentially or in parallel (where safe)
    │
    ├── 5. Monitor execution:
    │       - Log to AgentLog
    │       - Track: durationMs, tokensUsed, cost, status
    │
    ├── 6. Post-run:
    │       - Update AgentConfig.lastRunAt
    │       - Update AgentConfig.lastRunStatus
    │       - Increment AgentConfig.totalRuns
    │
    └── 7. Return: {ran: N, succeeded: N, failed: N, skipped: N}
```

---

## 4. 21 Agents Registry

| # | Agent Name | Enum | Module Path | Key Function |
|---|-----------|------|------------|-------------|
| 01 | Trend Agent | `trend` | `agents/trend` | Market trend analysis |
| 02 | Affiliate Agent | `affiliate` | `agents/affiliate` | Affiliate program management |
| 03 | Content Agent | `content` | `agents/content` | Social media content creation |
| 04 | Publisher Agent | `publisher` | `agents/publisher` | Cross-platform publishing |
| 05 | Lead Hunter Agent | `lead` | `agents/lead-hunter` | Lead capture & scoring |
| 06 | Sales Agent | `sales` | `agents/sales` | Lead-to-order conversion |
| 07 | CRM Agent | `crm` | `agents/crm` | Customer lifecycle management |
| 08 | Video Agent | `video` | `agents/video` | Video content creation |
| 09 | SEO Agent | `seo` | `agents/seo` | SEO article generation |
| 10 | Trend Predictor | `trend_predictor` | `agents/trend-predictor` | Demand forecasting signals |
| 11 | Price Agent | `price` | `agents/price` | Pricing optimization |
| 12 | Segmentation Agent | `segmentation` | `agents/segmentation` | Customer segmentation |
| 13 | Email Agent | `email` | `agents/email` | Email campaign management |
| 14 | Telegram Agent | `telegram` | `agents/telegram` | Telegram bot interactions |
| 15 | Knowledge Agent | `knowledge` | `agents/knowledge` | Knowledge Brain curation |
| 16 | **Master Agent** | `master` | `agents/master` | **Orchestration & coordination** |
| 17 | Video Optimizer | `video_optimizer` | `agents/video-optimizer` | Video performance optimization |
| 18 | Competitor Monitor | `competitor_monitor` | `agents/competitor-monitor` | Competitor intelligence |
| 19 | Demand Forecaster | `demand_forecaster` | `agents/demand-forecaster` | Demand prediction |
| 20 | Repricing Agent | `repricing` | `agents/repricing` | Dynamic repricing |
| 21 | Marketplace Optimizer | `marketplace_optimizer` | `agents/marketplace-optimizer` | Marketplace performance |
| + | Mobile Engagement | `mobile_engagement` | `agents/mobile-engagement` | Mobile app engagement |
| + | Enterprise Health | `enterprise_health` | `agents/enterprise-health` | Enterprise tenant monitoring |
| + | WhiteLabel Onboarding | `whitelabel_onboarding` | `agents/whitelabel-onboarding` | Tenant onboarding automation |

---

## 5. AgentConfig Entity

```typescript
// agent-config.entity.ts
AgentConfig {
  agentName: string (unique)    // matches AgentName enum
  displayName: string
  description: text
  isEnabled: boolean            // global on/off
  cronExpression: string        // "0 * * * *" = hourly
  priority: number              // 1 = highest priority
  maxRetries: number
  timeoutMs: number
  config: jsonb                 // agent-specific settings
  lastRunAt: Date
  lastRunStatus: string
  totalRuns: number
  totalTokensUsed: number
  totalCost: decimal
}
```

---

## 6. Master Agent — KPI Response

```
GET /api/agents/master/kpi
Response:
{
  "systemHealth": 87,
  "agentsRunning": 18,
  "agentsFailed": 2,
  "agentsDisabled": 1,
  "totalRunsToday": 142,
  "totalTokensToday": 890000,
  "totalCostToday": 75000,  // VND
  "topAgentByValue": "content",
  "failingAgents": ["video", "seo"],
  "scheduledNext": [
    {"agent": "trend", "in": "45 minutes"},
    {"agent": "crm", "in": "2 hours"}
  ]
}
```
