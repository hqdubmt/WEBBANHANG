# Video Optimization Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. A/B Test Elements for Video

| Element | Variant A | Variant B | Measurement |
|---------|-----------|-----------|-------------|
| **Hook style** | Question hook | Statement hook | 3-second retention |
| **Duration** | 15–20 seconds | 45–60 seconds | Avg watch time |
| **Opening shot** | Product close-up | Person speaking | Hook rate |
| **Benefit format** | Bullet list text | Narrative storytelling | Watch-through rate |
| **CTA style** | "Nhắn tin ngay" | "Link in bio" | Lead rate |
| **Music energy** | Upbeat fast | Calm medium | Engagement rate |
| **Offer position** | First 10 seconds | Last 10 seconds | Conversion |
| **Posting time** | 18:00 | 21:00 | First-hour views |

### Test Design Rules
```
- Thay đổi DUY NHẤT 1 yếu tố per test (A/B không phải A/B/C)
- Minimum sample: 500 views per variant
- Duration: 7 days minimum
- Statistical significance: p < 0.05 (hoặc > 20% absolute difference)
- Platform: Test trên CÙNG platform, không cross-platform
```

---

## 2. Video Optimizer Agent Role

**Agent 17 — Video Optimizer**

**Path:** `apps/api/src/modules/agents/video-optimizer/`

```
VideoOptimizer chạy DAILY sau khi:
  1. Fetch performance data từ platform APIs (planned)
  2. Compute VPS for all published videos < 30 days old
  3. Identify patterns among top-performing videos

Key functions:
  a. getStats()       → aggregate video performance
  b. optimizeVideos() → analysis + learning extraction

Autonomy Level: 3 (Semi-Autonomous)
  - Can: Analyze + recommend + create LessonLearned + flag for regeneration
  - Cannot: Auto-delete poor videos on platforms
  - Cannot: Auto-boost without budget approval
```

---

## 3. Performance Tracking Cycle

```
VIDEO PERFORMANCE TRACKING CYCLE

Day 0: Video Published
  → VideoJob.status = PUBLISHED
  → VideoJob.meta.platformVideoId = "tiktok_video_123"
  → Schedule: check at Day 1, Day 7

Day 1: First Check (VideoOptimizer run)
  → Fetch: views, likes, comments, shares from platform API
  → Compute: Hook rate (watch 3s/total views)
  → Decision: If views < 500 after 24h → flag as "slow starter"
  → Action: Consider re-posting at different time OR boost

Day 7: Full Evaluation (VideoOptimizer run)
  → Full VPS computation
  → Classify: VIRAL/STRONG/AVERAGE/POOR
  → Extract learnings to LessonLearned + Knowledge

Day 30: Long-tail check
  → SEO-style: organic discovery still happening?
  → If views still growing → keep active
  → If views stagnant → archive
```

---

## 4. Learning Extraction Pattern

```
FROM VIDEO PERFORMANCE:

IF VPS ≥ 85 (VIRAL):
  LessonLearned {
    type: WIN,
    domain: CONTENT,
    lesson: "Hook pattern '{hookText[:50]}' achieved {hookRate}% 3s retention",
    applicableTo: ['video_agent'],
    confidence: HIGH
  }
  
  Knowledge {
    type: TRAINING,
    domain: OPERATIONAL,
    title: "Winning Video Script Pattern — {platform} — {date}",
    content: {
      hookStyle: ...,
      scriptStructure: ...,
      product_category: ...,
      postingTime: ...,
      vps: 91
    }
  }

IF VPS < 30 (POOR):
  LessonLearned {
    type: FAILURE,
    lesson: "Generic hook '{hookText[:50]}' only {hookRate}% 3s retention",
    applicableTo: ['video_agent'],
    shouldAvoid: true
  }
```

---

## 5. Platform Algorithm Alignment

### TikTok Algorithm Factors
```
1. Completion Rate (watch %) — #1 factor
   → Optimize: Remove padding, tighter editing
   
2. Re-watch rate — watches video >1x
   → Optimize: Intriguing information gap, unexpected twist
   
3. Shares — strongest signal for viral reach
   → Optimize: Relatable content, "tag a friend" moments
   
4. Comments — shows controversy or engagement
   → Optimize: Ask questions, divisive topics (in good taste)
```

### Facebook Reels Algorithm Factors
```
1. Original audio preferred over popular music
2. Watch time > 60% → Reels gets boosted to non-followers
3. Shares to Stories → Amplification signal
4. Profile visits after watch → Interest signal
```

---

## 6. Current Status

| Feature | Status |
|---------|--------|
| Video Optimizer Agent | DONE — controller + basic service |
| getStats() endpoint | DONE — queries VideoJob table |
| optimizeVideos() endpoint | PARTIAL — no platform API data yet |
| Platform API integration | MISSING — TikTok/FB stats not fetched |
| VPS computation | MISSING |
| A/B variant creation | MISSING |
| LessonLearned integration | MISSING |
