# Executive Dashboard Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. AI Board Meeting View

```
╔══════════════════════════════════════════════════════════════════════════╗
║              AI BOARD DAILY MEETING — 2026-06-11 08:00                  ║
║              GET /api/ai-board/meeting                                   ║
╠════════════════════════╦═════════════════════════════════════════════════╣
║  🏢 CEO REPORT          ║  Revenue this month: ₫ 245M (+18% MoM)         ║
║  Strategic Overview    ║  Top issue: Lead quality declining (-12%)       ║
║                        ║  Recommendation: Refocus on TikTok lead gen     ║
╠════════════════════════╬═════════════════════════════════════════════════╣
║  💰 CFO REPORT          ║  Gross margin: 34% | AI cost: ₫ 2.1M/month      ║
║  Financial Health      ║  ROI on AI: 1,168% | Burn rate: sustainable     ║
║                        ║  Alert: Ad spend efficiency down 8%             ║
╠════════════════════════╬═════════════════════════════════════════════════╣
║  ⚙️  COO REPORT          ║  Agents running: 18/21 | Failed: 2 (video,seo) ║
║  Operations            ║  Order fulfill rate: 94% | Avg ship: 2.3 days  ║
║                        ║  Blocker: Video rendering pipeline incomplete   ║
╠════════════════════════╬═════════════════════════════════════════════════╣
║  🔧 CTO REPORT          ║  DB health: OK | API latency: 124ms avg         ║
║  Technology            ║  Ollama tokens: 2.4M/week | Qdrant: 45K vectors ║
║                        ║  Tech debt: TTS service, sitemap.xml needed     ║
╠════════════════════════╬═════════════════════════════════════════════════╣
║  📣 CMO REPORT          ║  Content published: 156/week | Reach: 142K     ║
║  Marketing             ║  Best channel: TikTok (7.1% ER) | FB: 5.4%     ║
║                        ║  Opportunity: SEO — 0 rankings in top 5 yet    ║
╠════════════════════════╬═════════════════════════════════════════════════╣
║  📈 CRO REPORT          ║  Conversion: Lead→Order 8.3% (target: 10%)     ║
║  Revenue Ops           ║  AOV: ₫ 485K (target: ₫ 500K)                  ║
║                        ║  A/B test running: checkout step simplification ║
╠════════════════════════╬═════════════════════════════════════════════════╣
║  🤝 CSO REPORT          ║  New leads today: 89 | Conversion lag: 4.2 days ║
║  Sales                 ║  churnRisk > 70: 86 customers (WIN-BACK needed) ║
║                        ║  VIP new this week: 3 | Total VIP: 144          ║
╚════════════════════════╩═════════════════════════════════════════════════╝
```

---

## 2. Business OS Dashboard

```
╔══════════════════════════════════════════════════════════════════════════╗
║              BUSINESS OS — COMMAND CENTER                                ║
║              GET /api/business-os/dashboard                              ║
╠══════════════════════════════════════════════════════════════════════════╣
║  BUSINESS FUNNEL (GET /api/business-os/funnel)                           ║
║                                                                          ║
║  REACH     ENGAGE      LEAD      QUALIFY     ORDER     DELIVER    LTV   ║
║  142,500 → 7,125    → 1,240   → 412      → 103    →  98      → ₫3.9M  ║
║            (5% ER)    (17.4%)   (33%)       (25%)     (95%)             ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  KPI SCORECARD (GET /api/business-os/kpi)                                ║
║  Revenue (monthly):     ₫ 245M    Target: ₫ 300M   ▓▓▓▓▓▓▓▓░░  82%   ║
║  Lead Generation:       1,240/wk  Target: 1,500    ▓▓▓▓▓▓▓░░░  83%   ║
║  Conversion Rate:       8.3%      Target: 10%       ▓▓▓▓▓▓▓▓░░  83%   ║
║  Customer Retention:    78%       Target: 80%       ▓▓▓▓▓▓▓▓▓░  97%   ║
║  Agent Uptime:          86%       Target: 95%       ▓▓▓▓▓▓▓▓░░  90%   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PRIORITIES (GET /api/business-os/priorities)                            ║
║  P1: Video pipeline incomplete — TTS + render blocking Revenue Autopilot║
║  P2: 86 customers at churn risk — win-back campaign not triggered       ║
║  P3: SEO articles not ranking yet — technical SEO missing               ║
║  P4: Follow-up scheduler missing — leads going cold automatically       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  AUTONOMOUS PLAN (GET /api/business-os/plan)                             ║
║  Next 24h actions:                                                       ║
║  → Content Agent: Create 14 posts for today's schedule                  ║
║  → SEO Agent: Generate 3 articles on top opportunity keywords           ║
║  → CRM Agent: Run churnRisk update + flag at-risk for win-back          ║
║  → Master Agent: Coordinate all scheduled agent runs                    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. KPI Panels

```
KPI PANEL DESIGN:
  Each KPI shows:
    - Current value
    - Target value
    - Progress bar (current/target × 100%)
    - Trend: ▲ (up) / ▼ (down) / ─ (flat)
    - Color: 🟢 ≥90% target / 🟡 70-89% / 🔴 <70%

Revenue KPIs:     Revenue, Gross Profit, AOV, LTV, MRR
Marketing KPIs:   Reach, ER, CTR, Content published, SEO traffic
Sales KPIs:       Leads/day, Lead conversion, Pipeline value
CRM KPIs:         Retention rate, Churn rate, VIP count, At-risk count
Ops KPIs:         Order fulfill rate, Shipping time, Agent success rate
```

---

## 4. Alert Center

```
ALERT CENTER — Real-time Notifications
  Priority  │ Alert                              │ Action
  ──────────┼────────────────────────────────────┼──────────────────
  CRITICAL  │ Revenue -20% vs last week          │ AI Board review
  CRITICAL  │ Agent failure cascade (>3 agents)  │ Master Agent escalate
  HIGH      │ 3 VIP customers at churn risk      │ CRM Agent win-back
  HIGH      │ Lead volume drops -30% in 24h      │ Marketing review
  MEDIUM    │ Content Agent queue empty           │ Trend Agent resupply
  LOW       │ Daily report ready for review      │ Business OS report
  ──────────┼────────────────────────────────────┼──────────────────
  Delivery: WebSocket via Gateway module (apps/api/src/modules/gateway/)
```

---

## 5. Self-improvement Loop Integration

```
Connected to: GET /api/business-os/report/daily
              GET /api/business-os/report/weekly

Feeds into: PerformanceScorecard (daily/weekly/monthly)
            LearningCycle (observe → measure → analyze → learn → improve)
            LessonLearned (what worked, what didn't)
            DecisionMemory (decisions and outcomes)

Cycle:
  Daily report → PerformanceScorecard saved
  Weekly report → LearningCycle.weeklyRetrospective
  Monthly → monthlyEvolution tracking
```
