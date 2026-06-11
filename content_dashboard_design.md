# Content Factory Dashboard Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Dashboard Layout ASCII

```
╔══════════════════════════════════════════════════════════════════════════╗
║              CONTENT FACTORY — DASHBOARD                                 ║
║              Period: 2026-06-04 → 2026-06-11 | Platform: ALL            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  CONTENT PIPELINE STATUS                                                  ║
║  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            ║
║  │   DRAFT    │ │ SCHEDULED  │ │ PUBLISHED  │ │   FAILED   │            ║
║  │     23     │ │     12     │ │    156     │ │      4     │            ║
║  │  awaiting  │ │  in queue  │ │  this week │ │  retry     │            ║
║  └────────────┘ └────────────┘ └────────────┘ └────────────┘            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PLATFORM BREAKDOWN                                                       ║
║  Facebook:  ████████████████████ 68 posts   (44%)                        ║
║  Telegram:  ████████████████     54 msgs    (35%)                        ║
║  TikTok:    ████████             28 scripts (18%)                        ║
║  Website:   ████                 6 articles  (4%)                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PERFORMANCE METRICS (this week)                                          ║
║  ┌──────────────────┬───────────────────┬────────────────────────┐        ║
║  │ Total Reach      │ Total Engagement   │ Leads Generated        │        ║
║  │   142,500        │   7,125 (5.0% ER)  │      89               │        ║
║  ├──────────────────┼───────────────────┼────────────────────────┤        ║
║  │ Avg CTR          │ Content→Lead Rate  │ Est. Revenue           │        ║
║  │   2.3%           │   0.06%            │   ₫ 24,500,000         │        ║
║  └──────────────────┴───────────────────┴────────────────────────┘        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  TOP PERFORMING CONTENT                                                   ║
║  #1 "Mẹo dùng sản phẩm A" — TikTok — CPS:94 — 45,200 reach — 12 leads  ║
║  #2 Flash sale carousel B  — FB     — CPS:82 — 8,700 reach  —  8 leads  ║
║  #3 Product review post C  — FB     — CPS:71 — 5,300 reach  —  5 leads  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  CONTENT AGENT STATUS                                                     ║
║  Last run: Today 07:00  │  Next: Today 13:00  │  Status: HEALTHY         ║
║  Generated: 35 drafts   │  Auto-scheduled: 28 │  Review queue: 7         ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ACTIVE EXPERIMENTS                                                       ║
║  A/B Test: Hook Style — Facebook — Day 4/7                               ║
║    Variant A: CTR 2.1% (340 reach)                                       ║
║    Variant B: CTR 3.4% (312 reach) ← LEADING                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Dashboard Metrics

| Panel | Metric | Nguồn dữ liệu | Update Frequency |
|-------|--------|--------------|-----------------|
| Pipeline Status | draft/scheduled/published/failed counts | `contents` table | Real-time |
| Platform Breakdown | Posts per platform | `GROUP BY platform` | Per agent run |
| Total Reach | Sum of all content reach | Platform APIs (planned) | Daily |
| Engagement Rate | (likes+comments+shares)/reach | Platform APIs (planned) | Daily |
| Leads Generated | COUNT leads WHERE meta.contentId | `leads` table | Real-time |
| Avg CTR | clicks/reach avg | Platform APIs (planned) | Daily |
| Content→Lead Rate | leads/published posts | Computed | Daily |
| Revenue | SUM orders attributed to content | `orders` (indirect) | Daily |
| Top Content | Ordered by CPS | `contents` + performance | Daily |
| Agent Status | Last run time, next run | `agent_logs` WHERE agent='content' | Per run |

---

## 3. API Endpoints Required

```
# Already Available:
GET /api/agents/content/pending         → pending content list
POST /api/agents/content/run            → trigger generation
POST /api/agents/content/:id/publish    → manual publish
GET /api/analytics/content              → content summary (exists)

# Needed for Full Dashboard:
GET /api/content/stats                  → pipeline counts by status/platform
GET /api/content/performance            → CPS scores, reach, leads per content
GET /api/content/top-performing         → top 10 by CPS
GET /api/content/experiments            → active A/B tests
```

---

## 4. Filter Options

```
Time Period:  Today | This Week | This Month | Custom
Platform:     All | Facebook | Telegram | TikTok | Website
Status:       All | Draft | Scheduled | Published | Failed
Content Type: All | Post | Carousel | Script | Article
Product:      All | {product select}
```

---

## 5. Alerts

```
🔴 CRITICAL: Content Agent failed last run (check agent_logs)
🟡 WARNING:  12 contents pending review > 24 hours
🟡 WARNING:  4 failed publishes need retry
🟢 INFO:     28 contents scheduled for next 48 hours
🟢 INFO:     A/B Test Variant B leading by +1.3% CTR
```
