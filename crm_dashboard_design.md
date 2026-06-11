# CRM Dashboard Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Dashboard Layout ASCII

```
╔══════════════════════════════════════════════════════════════════════════╗
║              CRM AUTOMATION ENGINE — DASHBOARD                           ║
║              Last updated: 2026-06-11 08:00 | Auto-refresh: 5min        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  CUSTOMER BASE OVERVIEW                                                   ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      ║
║  │  TOTAL   │ │   NEW    │ │ REGULAR  │ │   VIP    │ │ AT RISK  │      ║
║  │  1,234   │ │   456    │ │   634    │ │   144    │ │    86    │      ║
║  │  (+12%)  │ │  (37%)   │ │  (51%)   │ │  (12%)   │ │churn>70  │      ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  FINANCIAL HEALTH                                                         ║
║  ┌─────────────────────────────┐ ┌─────────────────────────────┐         ║
║  │ TOTAL LTV                   │ │ CLV TRENDS                  │         ║
║  │ ₫ 4,820,000,000             │ │ Avg CLV: ₫ 3,907,000        │         ║
║  │ Avg/customer: ₫ 3,907,000   │ │ VIP CLV: ₫ 42,000,000       │         ║
║  │ VIP contribution: 62%       │ │ Regular CLV: ₫ 2,100,000    │         ║
║  └─────────────────────────────┘ └─────────────────────────────┘         ║
╠══════════════════════════════════════════════════════════════════════════╣
║  RETENTION METRICS                                                        ║
║  ┌────────────────────────────────────────────────────────────────┐       ║
║  │ Retention Rate (30d): 78%  ████████████████░░░░  Target: 75%  │       ║
║  │ Churn Rate (30d):      5%  ████░░░░░░░░░░░░░░░░  Target: <5%  │       ║
║  │ Win-back Rate:        12%  ██████████░░░░░░░░░░  Target: 15%  │       ║
║  │ Repeat Purchase:      42%  ████████████████████  Target: 40%  │       ║
║  └────────────────────────────────────────────────────────────────┘       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  CHURN RISK HEATMAP         │ TOP AT-RISK CUSTOMERS                       ║
║  Critical (86-100):  38     │ 1. Nguyễn Văn A — 92d — ₫3.2M — Risk:94   ║
║  High     (71-85):   48     │ 2. Trần Thị B   — 87d — ₫1.8M — Risk:88   ║
║  Elevated (51-70):  123     │ 3. Lê Văn C     — 75d — ₫5.1M — Risk:82   ║
║  Moderate (31-50):  247     │    [VIP CHURN ALERT!]                       ║
║  Healthy  (0-30):   778     │ 4. Phạm Thị D   — 68d — ₫2.4M — Risk:78   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  LEAD PIPELINE                                                            ║
║  NEW: 145 │ CONTACTED: 89 │ QUALIFIED: 34 │ CONVERTED: 12 │ LOST: 23   ║
║  Conversion rate: 8.3%  │  Avg time to convert: 4.2 days                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║  CRM AGENT STATUS           │ RECENT ACTIONS                              ║
║  Last run: 08:00 today      │ ✓ Updated churnRisk: 1,234 customers        ║
║  Next run: 09:00            │ ✓ Flagged 86 at-risk customers              ║
║  Status: HEALTHY            │ ✓ Upgraded 12 customers to REGULAR tier     ║
║  Duration: 2.3s             │ ✓ Upgraded 3 customers to VIP tier          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Core Metrics

| Metric | Nguồn dữ liệu | API |
|--------|--------------|-----|
| Total Customers | `SELECT COUNT(*) FROM customers` | `GET /api/analytics/customers` |
| Tier Distribution | `GROUP BY tier` | `GET /api/agents/crm/stats` |
| Avg churnRisk | `AVG(churnRisk)` | `GET /api/agents/crm/stats` |
| At Risk count | `WHERE churnRisk > 70` | `GET /api/agents/crm/stats` |
| Total LTV | `SUM(ltv)` | `GET /api/analytics/customers` |
| Avg CLV | `AVG(ltv)` | `GET /api/analytics/customers` |
| Retention Rate | Derived: (total - churned) / prev_total | Computed |
| Lead Pipeline | `GROUP BY status FROM leads` | `GET /api/analytics/leads` |

---

## 3. Current API Endpoints

```
# Customer Analytics
GET  /api/analytics/customers      → tier counts, LTV, churnRisk distribution
GET  /api/analytics/leads          → pipeline stats, conversion rate

# CRM Agent
POST /api/agents/crm/run           → trigger analysis, update churnRisk
GET  /api/agents/crm/stats         → CRM aggregate stats
GET  /api/agents/crm/customer/:id  → individual 360° profile

# Customer Management
GET  /api/customers                → paginated list with filters
GET  /api/customers/:id            → single customer detail

# Leads Management
GET  /api/leads                    → paginated lead list
PUT  /api/leads/:id                → update lead status
```

---

## 4. Dashboard Filters & Drill-down

```
Available Filters:
  - tier: all | new | regular | vip
  - churnRisk: all | healthy | at-risk | critical
  - acquisitionSource: all | facebook | telegram | tiktok | website
  - dateRange: today | 7d | 30d | 90d | custom
  - platform: all | facebook | telegram | zalo | tiktok

Drill-down Actions:
  Click on "At Risk" → filtered list with Win-back campaign button
  Click on "VIP" → VIP segment with LTV breakdown
  Click on customer row → /api/agents/crm/customer/:id modal
```

---

## 5. Planned: Real-time Updates

```
WebSocket Events (Gateway module):
  customer.tier_changed     → update tier panel
  customer.churn_alert      → push notification in dashboard
  lead.converted            → update pipeline numbers
  crm_agent.run_complete    → refresh all panels
```

**Current:** Gateway module exists in `apps/api/src/modules/gateway/` but CRM-specific events not yet emitted.
