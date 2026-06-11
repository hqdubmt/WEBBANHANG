# Content Optimization Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. A/B Test Framework

### Test Design

```
Experiment entity (experiments table) được dùng cho content A/B tests:

Experiment {
  title: "Hook Style Test — Product A — Facebook"
  hypothesis: "Câu hỏi hook > statement hook về CTR"
  experimentPlan: {
    variant_a: "Statement: Sản phẩm X giúp bạn tiết kiệm 2 giờ/ngày",
    variant_b: "Question: Bạn có đang tốn 2 giờ/ngày làm việc này không?"
  }
  scope: "content"
  startDate: 2026-06-11
  endDate: 2026-06-18
  status: RUNNING
}
```

### A/B Test Elements Per Platform

| Platform | Yếu tố test | Variant A | Variant B |
|----------|------------|-----------|-----------|
| Facebook | Hook style | Statement | Question |
| Facebook | Post length | Short (300 chars) | Long (800 chars) |
| Facebook | CTA | "Nhắn tin ngay" | "Xem chi tiết" |
| TikTok | Opening shot | Product close-up | Person speaking |
| TikTok | Duration | 15s | 45s |
| Email | Subject line | Discount-focused | Curiosity-focused |
| Telegram | Send time | 8:00am | 8:00pm |

### Test Metrics
```
Primary:    CTR (Click-through rate)
Secondary:  Lead conversion, Engagement rate
Sample:     Minimum 500 reach per variant before evaluation
Duration:   7 days minimum
Decision:   p-value < 0.05 → adopt winner, discard loser
```

---

## 2. Content Refresh Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| **Performance degradation** | CPS drops > 20% week-over-week | Regenerate with new angle |
| **Outdated price** | product.price ≠ content mentioned price | Auto-update or archive |
| **Product out of stock** | inventory.quantity = 0 | Pause/archive content |
| **Trending topic** | New trend detected by Trend Agent | Create new content, pause old |
| **Seasonal event** | Campaign.startDate approaching | Generate themed variant |
| **Low engagement** | ER < 2% after 48h | Boost or rewrite |
| **Age-out** | Content > 30 days old + CPS < 40 | Archive |

---

## 3. Content Refresh Pipeline

```
Nightly Job (02:00 AM):
    │
    ├── Query: published contents older than 14 days
    │
    ├── For each content:
    │   1. Fetch current product.price → compare with content
    │   2. Fetch inventory.quantity → if 0, archive
    │   3. Check if product still active
    │
    ├── Query: contents with CPS < 40 (after 7 days live)
    │   → Generate refresh version with different angle/hook
    │
    └── Query: trending topics from Knowledge{domain:MARKET}
        → Generate new content for top 3 trends not yet covered
```

---

## 4. Performance-based Optimization Loop

```
CONTENT OPTIMIZATION FEEDBACK LOOP

  [Generate Content]
        │
        ▼
  [Publish & Measure] ──── 7 days ────
        │
        ▼
  [Compute CPS Score]
        │
        ├── CPS ≥ 80 ──▶ STAR: Replicate formula
        │                  Extract: hook style, topic, length, time
        │                  Feed into: Knowledge{type:training}
        │                  Instruct: Content Agent to use this template
        │
        ├── CPS 40–79 ──▶ OPTIMIZE: A/B test variants
        │                  Create Experiment record
        │                  Generate 2 variants
        │                  Run for 7 more days
        │
        └── CPS < 40 ──▶ RETIRE + LEARN
                          LessonLearned record: {domain:'content', lesson:'...'}
                          Update Content Agent prompt with negative examples
                          Do NOT republish
```

---

## 5. Learning from Star Content

```
When content reaches CPS ≥ 80:
  1. Extract content features:
     - Hook pattern
     - Topic category
     - Content length
     - Posting time
     - Platform

  2. Create Knowledge record:
     Knowledge {
       type: TRAINING,
       domain: OPERATIONAL,
       title: "Star Content Pattern — {platform} — {date}",
       content: JSON with extracted features,
       businessValue: 90,
       tier: LONG_TERM
     }

  3. Index in Qdrant for future RAG retrieval

  4. Content Agent reads this pattern for future generation
```

---

## 6. Current Optimization Gaps

| Feature | Status |
|---------|--------|
| Experiment entity | DONE — table exists |
| A/B test execution | MISSING — no variant tracking in Content entity |
| CPS computation | MISSING — no performance data fetched from platforms |
| Refresh cron | MISSING — content aging/refresh not automated |
| Learning loop | PARTIAL — LessonLearned entity exists, integration pending |
| Star content pattern extraction | MISSING |
