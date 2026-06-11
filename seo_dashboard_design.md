# SEO Dashboard Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Dashboard Layout ASCII

```
╔══════════════════════════════════════════════════════════════════════════╗
║              SEO FACTORY — DASHBOARD                                     ║
║              Updated: 2026-06-11 | Data: Google Search Console           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ARTICLE PIPELINE                                                         ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   ║
║  │  DRAFT   │ │REVIEWING │ │PUBLISHED │ │ARCHIVED  │                   ║
║  │    8     │ │    3     │ │   45     │ │    7     │                   ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ORGANIC PERFORMANCE (Last 30 Days)                                       ║
║  ┌──────────────┬──────────────┬──────────────┬──────────────┐           ║
║  │ Total Clicks │ Impressions  │ Avg Position │ Avg CTR      │           ║
║  │    4,520     │   89,400     │    12.4      │   5.1%       │           ║
║  │   (+23% MoM) │  (+35% MoM)  │  (prev: 15.2)│  (prev:4.1%) │           ║
║  └──────────────┴──────────────┴──────────────┴──────────────┘           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  KEYWORD RANKINGS (Top 10 keywords)                                       ║
║  Keyword                    │ Pos │ Change │ Clicks │ Rev (K) │ SPS     ║
║  "kem duong da ban dem"      │  4  │  ▲ 3   │  850   │  2,400  │  82    ║
║  "serum vitamin c review"    │  7  │  ▲ 1   │  420   │  1,100  │  67    ║
║  "mua kem chinh hang"        │ 12  │  ▼ 2   │  180   │    400  │  48    ║
║  "my pham cho da dau"        │ 18  │  ─     │   90   │    200  │  34    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  TOPIC CLUSTER COVERAGE                                                   ║
║  Mỹ phẩm dưỡng da:   ████████████████████  1 pillar + 8 clusters  68%  ║
║  Thực phẩm chức năng: ██████████            1 pillar + 4 clusters  40%  ║
║  Thời trang:          ████                  0 pillar + 2 articles  15%  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  SEO AGENT STATUS                                                         ║
║  Last run: Today 05:00  │  Generated: 3 drafts  │  Status: HEALTHY      ║
║  Quality scores: Avg 74  │  Auto-approved: 1     │  Review queue: 2     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  TOP OPPORTUNITIES (keywords with no article yet)                         ║
║  1. "kem chong nang cho da nhay cam" — Est. 1,200/mo — Difficulty: 32    ║
║  2. "serum ha thanh phan tot" — Est. 800/mo — Difficulty: 28             ║
║  3. "kem mat nao tot nhat 2026" — Est. 600/mo — Difficulty: 35           ║
║  [Create articles for these] ← button → POST /api/agents/seo/run        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Dashboard KPIs

| KPI | Nguồn | Update |
|-----|-------|--------|
| Published Articles | `seo_articles WHERE status='published'` | Real-time |
| Total Organic Clicks | Google Search Console API | Daily |
| Total Impressions | Google Search Console API | Daily |
| Avg Position | Google Search Console API | Daily |
| Avg CTR | Clicks/Impressions | Daily |
| Organic Leads | `leads WHERE meta.source='organic'` | Real-time |
| Organic Revenue | `orders WHERE acquisitionSource='seo'` | Daily |
| Topic Coverage % | Articles per cluster / target | Per agent run |
| Keyword Opportunities | Unwritten keywords in pipeline | Daily |

---

## 3. API Endpoints

```
# Currently Available:
POST /api/agents/seo/run          → generate articles
GET  /api/agents/seo/drafts       → list draft articles

# Needed for Full Dashboard:
GET  /api/seo/dashboard           → aggregate SEO KPIs
GET  /api/seo/articles            → all articles with status + basic metrics
GET  /api/seo/articles/:id        → article detail + performance
GET  /api/seo/keywords/gaps       → keywords without articles
GET  /api/seo/topic-coverage      → cluster coverage per category
GET  /api/seo/rankings            → position data (from Google SC API)
```

---

## 4. Filters

```
Time: Last 7d | 30d | 90d | 12m
Category: All | {category list}
Status: All | Draft | Published | Archived
Performance: All | Performing | Potential | Struggling | Failing
```
