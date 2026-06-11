# Executive Command Center — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Command Center Layout

```
╔══════════════════════════════════════════════════════════════════════════════╗
║          AUTONOMOUS COMPANY — EXECUTIVE COMMAND CENTER                      ║
║          Company Health: 77/100  |  Autonomy Level: 3.0  |  2026-06-11     ║
╠═══════════════════════════╦══════════════════════════════════════════════════╣
║  ALERT CENTER              ║  REVENUE COMMAND                               ║
║  ──────────────────────    ║  ──────────────────────────────────────────    ║
║  🔴 video agent failing    ║  TODAY:    ₫  8.5M / ₫ 10M target (85%)       ║
║  🔴 47 leads unprocessed   ║  WEEK:     ₫ 52.0M / ₫ 60M target (87%)       ║
║  🟡 SEO agent degraded     ║  MONTH:    ₫245.0M / ₫300M target (82%)       ║
║  🟡 churn risk: 86 cust.   ║  MoM:      +18%  🟢                           ║
║  🟢 3 VIP upgrades         ║  YoY:      +124% 🟢                           ║
║  🟢 A/B test winner found  ║                                               ║
╠═══════════════════════════╬══════════════════════════════════════════════════╣
║  AGENT COMMAND CENTER      ║  CUSTOMER COMMAND                              ║
║  ──────────────────────    ║  ──────────────────────────────────────────    ║
║  Running:   18/21          ║  Total:     1,234 customers                    ║
║  Degraded:   2 (SEO,video-opt) VIP:      144 (12%)                         ║
║  Failing:    1 (video)     ║  At Risk:    86 (7%)  ⚠️                      ║
║  Offline:    0             ║  Retention:  78%  🟢                          ║
║  SysHealth: 86/100         ║  Avg LTV:   ₫3.9M                             ║
║  Cost today: ₫72,400       ║  New leads today: 89                           ║
╠═══════════════════════════╬══════════════════════════════════════════════════╣
║  AI BOARD STATUS           ║  KNOWLEDGE & LEARNING                          ║
║  ──────────────────────    ║  ──────────────────────────────────────────    ║
║  Today's Meeting:          ║  KB size:    2,847 knowledge items             ║
║  CEO: Revenue stable       ║  Indexed:    2,641 (92%) in Qdrant            ║
║  CFO: Margin holding       ║  Active LCs: 3 learning cycles running         ║
║  CMO: TikTok outperforming ║  Lessons:   124 lessons learned all-time      ║
║  CRO: Conv. rate issue     ║  Decisions:  847 AI decisions logged           ║
║  COO: Video blocker        ║  Experiments: 2 running A/B tests              ║
║  CTO: Tech debt pile       ║  Accuracy:   87/100 avg knowledge quality     ║
╠═══════════════════════════╩══════════════════════════════════════════════════╣
║  CONTENT FACTORY                      SEO FACTORY                           ║
║  Published this week: 156 pieces      Articles published: 45               ║
║  Scheduled next 24h:  28 pieces       Drafts pending:     8                ║
║  Top piece CPS: 94 (TikTok)           Avg position: 12.4 (tracking TBD)   ║
║  A/B test: Statement hook leading     Organic traffic: 4,520/mo            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  QUICK ACTIONS                                                               ║
║  [▶ Run All Agents]  [📊 Daily Report]  [🤖 AI Board Meeting]               ║
║  [⚠️  Manage Alerts] [📋 Review Decisions] [⚙️  Agent Configs]              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. All Dashboards Integrated

```
INTEGRATED DASHBOARD MAP:
  
  Command Center (this page)
      ├── Revenue Command ─────→ GET /api/analytics/revenue
      ├── Alert Center ────────→ WebSocket: risk_alerts
      ├── Agent Command ───────→ GET /api/agents/master/kpi
      ├── Customer Command ────→ GET /api/analytics/customers
      ├── AI Board Status ─────→ GET /api/ai-board/meeting
      ├── Knowledge ───────────→ GET /api/knowledge-brain/stats (planned)
      ├── Content Factory ─────→ GET /api/analytics/content
      └── SEO Factory ─────────→ GET /api/seo/dashboard (planned)

Drill-down links:
  Click "Revenue" → Revenue dashboard (full analytics)
  Click "Agent" → Master Agent dashboard
  Click "Customer" → CRM dashboard
  Click "Content" → Content Factory dashboard
  Click "SEO" → SEO dashboard
  Click "AI Board" → Full board meeting view
  Click "Learning" → Self-Improvement loop view
```

---

## 3. Alert Center Details

```
ALERT SEVERITY SYSTEM:
  🔴 CRITICAL — Revenue-impacting or system failure — immediate action
  🟡 WARNING  — Performance degradation or opportunity missed — 24h action
  🟢 INFO     — Positive events or routine notifications

ALERT TYPES IN SYSTEM:
  Revenue:    Revenue drops, margin compression, cost overruns
  Operations: Agent failures, system downtime, queue backlog
  Sales:      Lead volume drops, conversion rate issues
  Customer:   VIP churn risk, mass at-risk spike
  Content:    Publisher failures, content quality drops
  Technical:  DB slow queries, Qdrant unavailable, LLM errors
  Learning:   Learning cycle completed, new lesson learned

ALERT ROUTING:
  CRITICAL → Telegram notification to owner + Dashboard banner
  WARNING  → Dashboard banner + Daily report section
  INFO     → Dashboard notification (no push)

CURRENT: Alert generation exists in Business OS priorities endpoint
MISSING: Real-time alert emit via WebSocket
```

---

## 4. Quick Actions Panel

| Action | API Call | Permission Level |
|--------|----------|-----------------|
| Run All Agents | `POST /api/agents/master/run` | Owner only |
| Daily Report | `GET /api/business-os/report/daily` | Manager+ |
| AI Board Meeting | `GET /api/ai-board/meeting` | Manager+ |
| Manage Alerts | View/acknowledge alert list | Manager+ |
| Review Decisions | View pending AiDecisions | Owner only |
| Agent Configs | View/edit AgentConfig records | Owner only |
| Force Run Agent | `POST /api/agents/{name}/run` | Manager+ |
| Export Data | Reports download | Owner only |

---

## 5. Mobile Command Center (Future)

```
Mobile app (apps/mobile — using Mobile Session entity):
  - Push notification for CRITICAL alerts
  - Quick approve/reject pending decisions
  - Revenue glance widget
  - Agent health quick view
  - One-tap force-run agents

Current: mobile module exists in API
Entity: MobileSession {deviceId, platform, pushToken, lastSeen}
Status: API ready, mobile app not yet built
```
