# Master Agent Dashboard Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Master Dashboard Layout ASCII

```
╔══════════════════════════════════════════════════════════════════════════╗
║              MASTER AGENT — SYSTEM COMMAND CENTER                        ║
║              System Health: 86/100 🟢  |  2026-06-11 10:30             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  AGENT STATUS GRID                                                        ║
║  ┌────────────┬───────┬────────────┬───────┬────────────┬───────┐       ║
║  │ trend      │  🟢   │ content    │  🟢   │ publisher  │  🟢   │       ║
║  │ 98%  1.2s  │       │ 96%  4.5s  │       │ 94%  2.1s  │       │       ║
║  ├────────────┼───────┼────────────┼───────┼────────────┼───────┤       ║
║  │ lead_hunter│  🟢   │ sales      │  🟢   │ crm        │  🟢   │       ║
║  │ 97%  0.8s  │       │ 95%  3.2s  │       │ 99%  6.1s  │       │       ║
║  ├────────────┼───────┼────────────┼───────┼────────────┼───────┤       ║
║  │ seo        │  🟡   │ video      │  🔴   │ knowledge  │  🟢   │       ║
║  │ 84% 12.3s  │       │ 67%  FAIL  │       │ 100%  8.9s │       │       ║
║  ├────────────┼───────┼────────────┼───────┼────────────┼───────┤       ║
║  │ email      │  🟢   │ telegram   │  🟢   │ repricing  │  🟢   │       ║
║  │ 98%  2.4s  │       │ 99%  0.3s  │       │ 95%  1.8s  │       │       ║
║  └────────────┴───────┴────────────┴───────┴────────────┴───────┘       ║
║  🟢 HEALTHY(18)  🟡 DEGRADED(2)  🔴 FAILING(1)  ⚫ OFFLINE(0)           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  REVENUE STATUS                                                           ║
║  ┌──────────────┬──────────────┬──────────────┬──────────────┐           ║
║  │ Today Rev    │ Week Rev     │ Month Rev    │ MoM Growth   │           ║
║  │  ₫ 8.5M      │  ₫ 52M       │  ₫ 245M      │  +18%        │           ║
║  │  vs 10M tgt  │  vs 60M tgt  │  vs 300M tgt │  🟢 growing  │           ║
║  └──────────────┴──────────────┴──────────────┴──────────────┘           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  QUEUE STATUS                                                             ║
║  Content queue:   14 scheduled (next: 12:00)                             ║
║  Lead queue:      47 unprocessed leads (Sales Agent: running)            ║
║  Follow-up queue: 23 due within 1 hour                                   ║
║  Video queue:     4 pending (BLOCKED — video render unavailable)         ║
╠══════════════════════════════════════════════════════════════════════════╣
║  MASTER AGENT RUNS                                                        ║
║  Last run: 10:00 (30m ago)  │  Next run: 10:30  │  Runs today: 20        ║
║  Last run: evaluateAndAssign() ─ Triggered: 9 agents, All OK             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ALERTS (4 active)                                                        ║
║  🔴 [FAILING] video agent — 3 consecutive failures — needs investigation ║
║  🟡 [DEGRADED] seo agent — high latency (12.3s avg) — check LLM load    ║
║  🟡 [QUEUE] 47 leads unprocessed > 30min — Sales Agent capacity issue    ║
║  🟢 [INFO] 3 customers upgraded to VIP tier today                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Agent Status Panel Details

```
Per agent status panel shows:
  - Agent name
  - Health icon: 🟢 / 🟡 / 🔴 / ⚫
  - Success rate (last 24h)
  - Average duration
  - Last run time
  - Click → drill into agent detail
    → Last 10 runs timeline
    → Error messages (if failing)
    → Token usage + cost
    → "Force Run" button → POST /api/agents/{name}/run
    → "Disable" button → PATCH /api/agent-configs/{name}
```

---

## 3. Queue Status View

```
Queue types:
  Content queue:
    SELECT COUNT(*) FROM contents WHERE status='scheduled' AND scheduled_at > NOW()
    Breakdown: by platform, by time slot
  
  Lead queue:
    SELECT COUNT(*) FROM leads WHERE status='new' AND created_at < NOW()-5m
    (leads waiting > 5 min = unprocessed)
  
  Follow-up queue:
    SELECT COUNT(*) FROM leads WHERE follow_up_at <= NOW()+1h AND status!='converted'
  
  Video queue:
    SELECT COUNT(*) FROM video_jobs WHERE status='pending' OR status='generating_script'
  
  Order queue:
    SELECT COUNT(*) FROM orders WHERE status='pending'
```

---

## 4. Required API Endpoints

```
Available:
  POST /api/agents/master/run    → trigger evaluateAndAssign
  GET  /api/agents/master/kpi    → system KPI

Per-agent run endpoints:
  POST /api/agents/{name}/run    → all agents have this
  GET  /api/agents/{name}/stats  → most agents have this

Needed for full dashboard:
  GET /api/system/health         → full SHS breakdown
  GET /api/system/queues         → all queue lengths
  GET /api/agent-configs         → all configs + enable/disable
  PATCH /api/agent-configs/:name → update isEnabled
```

---

## 5. WebSocket Real-time Updates

```
Dashboard subscribes to:
  'agent.started'   → flash agent panel yellow
  'agent.completed' → update success rate + duration
  'agent.failed'    → turn agent panel red + alert
  'order.placed'    → increment revenue counter
  'lead.created'    → increment lead counter
  'risk_alert'      → show banner notification
```
