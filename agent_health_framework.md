# Agent Health Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. AgentLog Entity — Complete Reference

```typescript
// apps/api/src/database/entities/agent-log.entity.ts
@Index(['agent', 'createdAt'])
@Index(['status', 'createdAt'])
@Entity('agent_logs')
class AgentLog {
  id: uuid
  agent: AgentName    // 25+ agent names defined
  status: AgentRunStatus  // RUNNING | SUCCESS | FAILED
  input: jsonb
  output: jsonb
  errorMessage: string
  tokensUsed: number
  cost: decimal(10,6)
  durationMs: number
  createdAt: Date
}
```

---

## 2. Health Metrics Per Agent

```
For each agent, compute over last 24 hours:

  successRate   = success_count / total_runs × 100
  avgDuration   = AVG(durationMs) in ms
  p95Duration   = 95th percentile duration
  totalCost     = SUM(cost)
  totalTokens   = SUM(tokensUsed)
  lastRunAt     = MAX(createdAt)
  errorPattern  = ARRAY_AGG(DISTINCT errorMessage LIMIT 3)
  throughput    = total_runs / 24  (runs per hour)
```

### Health Status Classification

```
HEALTHY:
  successRate ≥ 95%
  avgDuration within 2× baseline
  No consecutive failures
  lastRunAt within expected schedule window

DEGRADED:
  successRate 80–94%
  OR avgDuration 2–5× baseline
  OR occasional failures (non-consecutive)
  OR lastRunAt slightly overdue

FAILING:
  successRate < 80%
  OR avgDuration > 5× baseline
  OR 3+ consecutive failures
  OR lastRunAt > 2× schedule interval overdue

OFFLINE:
  No runs in last 24h (for agents with hourly+ schedule)
  isEnabled = false
```

---

## 3. Agent Health Dashboard

```
AGENT HEALTH MONITOR
─────────────────────────────────────────────────────────────────────
Agent              Status    SuccRate  AvgDur   Cost/day  Last Run
─────────────────────────────────────────────────────────────────────
trend              HEALTHY   98%       1.2s     ₫ 2,400   6m ago
content            HEALTHY   96%       4.5s     ₫ 12,800  45m ago
publisher          HEALTHY   94%       2.1s     ₫ 800     12m ago
lead_hunter        HEALTHY   97%       0.8s     ₫ 1,200   3m ago
sales              HEALTHY   95%       3.2s     ₫ 8,400   18m ago
crm                HEALTHY   99%       6.1s     ₫ 4,200   2h ago
seo                DEGRADED  84%       12.3s    ₫ 9,600   3h ago   ⚠️
video              FAILING   67%       N/A      ₫ 3,200   8h ago   ❌
knowledge          HEALTHY   100%      8.9s     ₫ 6,000   6h ago
master             HEALTHY   100%      45.2s    ₫ 1,600   30m ago
email              HEALTHY   98%       2.4s     ₫ 1,800   9h ago
telegram           HEALTHY   99%       0.3s     ₫ 3,600   1m ago
segmentation       HEALTHY   100%      3.8s     ₫ 2,200   24h ago
competitor_monitor HEALTHY   97%       15.4s    ₫ 4,800   7h ago
demand_forecaster  HEALTHY   100%      4.2s     ₫ 2,000   6h ago
repricing          HEALTHY   95%       1.8s     ₫ 2,400   4h ago
video_optimizer    DEGRADED  80%       8.7s     ₫ 1,400   18h ago ⚠️
─────────────────────────────────────────────────────────────────────
SYSTEM HEALTH SCORE: 82/100
```

---

## 4. Operational Intelligence Domain

```
Knowledge entity: domain = OPERATIONAL

What gets stored:
  - Agent performance patterns: "SEO Agent slow when > 2000 word articles"
  - Error patterns: "Video Agent fails when product has no images"
  - Cost patterns: "Knowledge Agent uses 3× more tokens on Mondays"
  - Success patterns: "Content Agent best performance at 20:00 runs"

Query for pattern:
  SELECT content, usageCount FROM knowledge 
  WHERE domain = 'operational'
  AND type = 'training'
  ORDER BY usageCount DESC, createdAt DESC
  LIMIT 10

Master Agent uses these patterns to:
  - Adjust schedules (run Content Agent at 20:00)
  - Set expectations (SEO Agent = allow 15s timeout)
  - Avoid known failure conditions
```

---

## 5. Self-healing Mechanisms

```
Level 1: Automatic Retry
  Agent fails → Master Agent retries after 5 minutes
  Max retries: AgentConfig.maxRetries (default: 3)
  Backoff: 5min, 15min, 45min

Level 2: Fallback Mode
  Agent fails after max retries → switch to simpler mode
  Example: LLM unavailable → skip AI generation, log alert
  
Level 3: Graceful Degradation
  Non-critical agent fails → skip, log, continue other agents
  Critical agent (Lead Hunter, Sales) fails → alert + human notification
  
Level 4: Human Escalation
  ≥ 3 critical agents FAILING → alert via Telegram to owner
  Revenue agent cascade → AI Board emergency meeting trigger
```

---

## 6. Agent Health Queries

```sql
-- Current agent health summary
SELECT 
  agent,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_duration_sec,
  ROUND(SUM(cost), 2) as total_cost,
  MAX(created_at) as last_run
FROM agent_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent
ORDER BY success_rate ASC;

-- Consecutive failures detection
SELECT agent, 
       STRING_AGG(status, ' → ' ORDER BY created_at DESC) as last_3_runs
FROM (
  SELECT agent, status, created_at,
         ROW_NUMBER() OVER (PARTITION BY agent ORDER BY created_at DESC) as rn
  FROM agent_logs
  WHERE created_at > NOW() - INTERVAL '6 hours'
) ranked
WHERE rn <= 3
GROUP BY agent
HAVING COUNT(*) = 3 AND EVERY(status = 'failed');
```
