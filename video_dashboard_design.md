# Video Factory Dashboard Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Dashboard Layout ASCII

```
╔══════════════════════════════════════════════════════════════════════════╗
║              VIDEO FACTORY — DASHBOARD                                   ║
║              Period: Last 30 days | Platform: ALL                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  VIDEO JOB PIPELINE                                                      ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     ║
║  │ PENDING  │ │GENERATING│ │RENDERING │ │PUBLISHED │ │  FAILED  │     ║
║  │    4     │ │    2     │ │    0     │ │   87     │ │    3     │     ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  KPIs — PUBLISHED VIDEOS (Last 30 Days)                                  ║
║  ┌──────────────────┬───────────────────┬────────────────────────┐       ║
║  │ Total Views      │ Avg Watch Time     │ Total Leads            │       ║
║  │   1,240,500      │   38% (17s avg)    │      312               │       ║
║  ├──────────────────┼───────────────────┼────────────────────────┤       ║
║  │ Engagement Rate  │ Total Shares       │ Est. Revenue           │       ║
║  │    6.2%          │   8,450            │   ₫ 45,000,000         │       ║
║  └──────────────────┴───────────────────┴────────────────────────┘       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PLATFORM BREAKDOWN                                                      ║
║  TikTok:   ████████████████████ 45 videos  Views: 890,000  ER: 7.1%    ║
║  FB Reels: ████████████         28 videos  Views: 290,000  ER: 5.4%    ║
║  YT Shorts:████████             14 videos  Views:  60,500  ER: 3.8%    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  TOP PERFORMING VIDEOS (by VPS)                                          ║
║  #1 Product A TikTok — VPS:92 — 145K views — Hook:78% — 45 leads       ║
║  #2 Product B Reels  — VPS:84 —  42K views — Hook:72% — 18 leads       ║
║  #3 Product C TikTok — VPS:79 —  38K views — Hook:68% — 14 leads       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  VIDEO OPTIMIZER STATUS                                                  ║
║  Last run: Today 06:00  │  Next: Today 18:00  │  Status: HEALTHY       ║
║  Analyzed:  23 videos   │  VIRAL: 3  STRONG: 8  AVERAGE: 10  POOR: 2  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ACTIVE A/B TESTS                                                        ║
║  Hook Style Test — TikTok — Day 5/7                                     ║
║    Variant A (Question): 68% hook rate, 2.1 leads/1K                   ║
║    Variant B (Statement): 74% hook rate, 2.8 leads/1K ← LEADING        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. KPI Definitions

| KPI | Công thức | Target | Nguồn |
|-----|-----------|--------|-------|
| Total Views | SUM(VideoJob.meta.views) | Growing MoM | Platform API |
| Avg Watch Time % | AVG(watchTime/duration) | > 40% | Platform API |
| Total Leads | COUNT(leads WHERE meta.videoId) | > 200/month | `leads` table |
| Engagement Rate | (likes+comments+shares)/views | > 5% | Platform API |
| Total Shares | SUM(meta.shares) | Growing | Platform API |
| Revenue | SUM(orders WHERE source=video) | > 30M VND/month | `orders` table |
| VPS Average | AVG(VPS) across all videos | > 60 | Computed |
| Hook Rate | AVG(watch3sRate) | > 60% | Platform API |

---

## 3. Video Detail Drill-down

```
Khi click vào video trong dashboard:
  - Script text
  - Storyboard timeline
  - Platform: TikTok/Reels/Shorts
  - Performance over time: views/day chart
  - VPS breakdown: Hook/Retention/Engagement/Lead/Revenue
  - A/B variant comparison (nếu có)
  - "Regenerate" button → POST /api/agents/video/run với productId
```

---

## 4. Required API Endpoints

```
# Already Available:
GET /api/agents/video/pending          → pending + processing jobs
POST /api/agents/video/run             → create video jobs
GET /api/agents/video-optimizer/stats  → optimization stats
POST /api/agents/video-optimizer/run   → trigger optimization

# Needed for Full Dashboard:
GET /api/video/dashboard               → aggregate KPIs
GET /api/video/top-performing          → top 10 by VPS
GET /api/video/:id/performance         → single video detail + metrics
GET /api/video/platform-breakdown      → stats grouped by platform
```

---

## 5. Alerts

```
Conditions triggering alerts on dashboard:
  🔴 Video Agent failed (check agent_logs WHERE agent='video')
  🔴 3+ consecutive failed video jobs (rendering/upload errors)
  🟡 Average VPS < 40 this week (quality problem)
  🟡 Hook rate dropping > 10% vs last week
  🟢 New viral video detected (VPS ≥ 85)
  🟢 A/B test has statistical winner (p < 0.05)
```
