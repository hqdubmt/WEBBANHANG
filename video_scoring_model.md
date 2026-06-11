# Video Scoring Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Video Performance Dimensions

| Dimension | Metric | Mô tả |
|-----------|--------|-------|
| **Hook Score** | % viewers watch past 3s | Hook effectiveness |
| **Retention Score** | Avg watch time / total duration | Content quality signal |
| **Engagement Score** | (Likes + Comments + Shares) / Views | Community response |
| **Lead Score** | Leads generated / Views × 1000 | Lead per thousand views |
| **Revenue Score** | Revenue attributed / Views | Revenue per view |

---

## 2. Video Performance Score (VPS) Formula

```
VPS = w1×HookScore + w2×RetentionScore + w3×EngagementScore
    + w4×LeadScore + w5×RevenueScore

Trọng số:
  w1 = 0.20  (Hook — determines reach potential)
  w2 = 0.25  (Retention — algorithm ranking factor)
  w3 = 0.20  (Engagement — viral coefficient)
  w4 = 0.20  (Lead — business value)
  w5 = 0.15  (Revenue — ultimate metric)

Normalize mỗi component về 0–100:
  HookScore       = min(watch_3s_rate / 0.70, 1) × 100
                    (target: 70% watch past 3 seconds)

  RetentionScore  = min(avg_watch_pct / 0.50, 1) × 100
                    (target: 50% avg watch time)

  EngagementScore = min(engagement_rate / 0.06, 1) × 100
                    (target: 6% engagement rate)

  LeadScore       = min(leads_per_1k_views / 2, 1) × 100
                    (target: 2 leads per 1000 views)

  RevenueScore    = min(revenue_per_view / 1000, 1) × 100
                    (target: 1,000 VND revenue per view)
```

---

## 3. VPS Thresholds

```
VPS ≥ 85 → VIRAL HIT       → Boost immediately, replicate formula
VPS 70–84 → STRONG         → Standard promotion, create 2 variants
VPS 50–69 → AVERAGE        → A/B test hook and CTA
VPS 30–49 → BELOW PAR      → Rework script, new product angle
VPS < 30  → POOR           → Archive, full script rewrite, lesson learned
```

---

## 4. Platform Benchmarks

### TikTok Benchmarks
| Metric | Poor | Average | Good | Viral |
|--------|------|---------|------|-------|
| Views | < 500 | 500–5K | 5K–50K | > 50K |
| Hook (watch 3s+) | < 40% | 40–60% | 60–75% | > 75% |
| Retention (avg %) | < 25% | 25–40% | 40–55% | > 55% |
| Engagement Rate | < 3% | 3–6% | 6–10% | > 10% |
| Leads/1K views | < 0.5 | 0.5–1.5 | 1.5–3 | > 3 |

### Facebook Reels Benchmarks
| Metric | Poor | Average | Good | Viral |
|--------|------|---------|------|-------|
| Reach | < 200 | 200–2K | 2K–20K | > 20K |
| Hook (watch 3s+) | < 35% | 35–55% | 55–70% | > 70% |
| Retention | < 20% | 20–35% | 35–50% | > 50% |
| Engagement Rate | < 2% | 2–5% | 5–8% | > 8% |

### YouTube Shorts Benchmarks
| Metric | Poor | Average | Good | Viral |
|--------|------|---------|------|-------|
| Views | < 100 | 100–1K | 1K–10K | > 10K |
| Retention | < 30% | 30–50% | 50–70% | > 70% |
| CTR (to product) | < 0.5% | 0.5–1.5% | 1.5–3% | > 3% |

---

## 5. Hook Quality Score (Pre-publish)

```
Được tính TRƯỚC khi publish dựa trên script quality:

Hook Quality Score (0–100):
  Has clear question OR bold statement      → +40
  Mentions pain point or benefit            → +20
  Under 10 words                            → +15
  Contains number/statistic                 → +15
  No filler words ("ừm", "à", "thì")       → +10

Target: ≥ 70 before video is scheduled for upload
```

---

## 6. Script-Performance Correlation

```
Pattern recognized từ A/B tests (planned):

Best performing patterns (hypothesis):
  1. Question hook + before/after structure → +35% retention
  2. Price reveal at end (not beginning)    → +20% watch time
  3. 3 specific benefits (not generic)     → +25% conversion
  4. Name-specific CTA ("Nhắn 'ĐẶT HÀNG'")→ +40% message rate

Worst performing patterns:
  1. Generic hook ("Xin chào mọi người")   → -40% hook retention
  2. Listing features instead of benefits  → -30% conversion
  3. No urgency in offer                   → -20% conversion
```

---

## 7. Video Optimizer — How It Uses VPS

```
VideoOptimizer.optimizeVideos():
  1. Query: published videos WHERE publishedAt < NOW()-24h
  2. [TODO] Fetch platform stats via API → populate VideoJob.meta.performance
  3. Compute VPS for each video
  4. Classify: VIRAL/STRONG/AVERAGE/POOR
  5. For VIRAL:
       → Create LessonLearned {type: WIN, domain: content}
       → Feed script pattern to Knowledge Brain
  6. For POOR:
       → Create LessonLearned {type: FAILURE}
       → Flag productId for script regeneration
  7. Return optimization report
```
