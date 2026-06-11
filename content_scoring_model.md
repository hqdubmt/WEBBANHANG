# Content Scoring Model — Performance Metrics — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Performance Metrics Per Content

| Metric | Mô tả | Nguồn dữ liệu |
|--------|-------|--------------|
| **Views** | Số lần content được hiển thị | Platform API (FB/TikTok) |
| **Reach** | Unique users thấy content | Platform API |
| **Clicks** | Clicks vào link/profile/product | Platform API + UTM |
| **CTR** | Click-through rate = Clicks/Reach × 100 | Computed |
| **Leads** | Leads phát sinh từ content | leads.meta.contentId |
| **Orders** | Orders attributed to content | orders.note/source |
| **Revenue** | Revenue từ content-attributed orders | SUM(order.total) |
| **Shares** | Lần content được share | Platform API |
| **Comments** | Số comments | Platform API |
| **Engagement Rate** | (Likes+Comments+Shares)/Reach × 100 | Computed |

---

## 2. Content Performance Score (CPS) Formula

```
CPS = w1×ReachScore + w2×EngagementScore + w3×ConversionScore + w4×RevenueScore

Trong đó:
  w1 = 0.20  (Reach — visibility)
  w2 = 0.25  (Engagement — content quality signal)
  w3 = 0.30  (Conversion — leads/orders)
  w4 = 0.25  (Revenue — business impact)

Normalize mỗi component về 0–100:
  ReachScore      = min(reach / target_reach, 1) × 100
                    target_reach = 1,000 (Facebook post baseline)

  EngagementScore = min(engagement_rate / target_er, 1) × 100
                    target_er = 5% (Facebook average)

  ConversionScore = min(leads_generated / target_leads, 1) × 100
                    target_leads = 2 per post

  RevenueScore    = min(revenue / target_revenue, 1) × 100
                    target_revenue = 1,000,000 VND per post
```

### CPS Thresholds
```
CPS ≥ 80  → STAR CONTENT     → Repurpose across platforms, boost, replicate
CPS 60–79 → GOOD CONTENT     → Standard retention in content library
CPS 40–59 → AVERAGE CONTENT  → A/B test variants
CPS < 40  → POOR CONTENT     → Archive, learn from failure
```

---

## 3. Platform Benchmarks

| Platform | Target Reach | Target ER | Target CTR | Target Leads/Post |
|----------|-------------|---------|-----------|------------------|
| Facebook Post | 1,000 | 5% | 2% | 2 |
| Facebook Carousel | 2,000 | 7% | 4% | 4 |
| TikTok Video | 5,000 | 8% | 1.5% | 1 |
| Telegram Message | 500 (subscribers) | 15% | 5% | 3 |
| SEO Article | 200 visits/month | N/A | 3% | 1 |

---

## 4. Attribution Model

```
CONTENT ATTRIBUTION — Multi-touch

Touch 1: First content interaction (view/click/comment)
   ↓
Touch 2: Lead creation (message after content)
   ↓
Touch 3: Order placement

Attribution Credit:
  First Touch:  40% credit to content at Touch 1
  Last Touch:   40% credit to content at Touch 2
  Linear:       20% split across all touchpoints

Implementation:
  - Lead.meta.contentId = content ID that drove the message
  - Order.note includes content reference if trackable
  - UTM params: ?utm_source=fb&utm_content={contentId}
```

---

## 5. Content Comparison View

```
CONTENT PERFORMANCE COMPARISON (Last 30 days)
────────────────────────────────────────────────────────────────────────────
Rank  Content                  Platform   Reach   ER    Leads  Rev (K VND)  CPS
────────────────────────────────────────────────────────────────────────────
 #1   "Mẹo dùng sản phẩm A"   TikTok     45,200  9.2%  12     3,450        94
 #2   Flash sale carousel B    Facebook    8,700  7.1%   8     2,100        82
 #3   Product review post C    Facebook    5,300  5.8%   5     1,200        71
 #4   Tutorial video D         TikTok     12,100  6.4%   3       800        65
 #5   SEO article E            Website       450  N/A    4       950        63
────────────────────────────────────────────────────────────────────────────
```

---

## 6. Current Implementation Gap

```
MISSING:
  - content.entity.ts có KHÔNG có performance metrics fields
    (views, reach, clicks, leads, revenue)
  - Sau khi publish, không có feedback loop về performance
  - platformPostId exists nhưng không được dùng để fetch stats

NEEDED:
  - ContentPerformance entity {contentId, views, reach, clicks, leads, revenue, cps}
  - Post-publish performance fetcher (daily cron per platform)
  - CPS computation service
```
