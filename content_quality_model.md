# Content Quality Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Quality Dimensions

| # | Dimension | Trọng số | Mô tả |
|---|-----------|---------|-------|
| 1 | **Relevance** | 20% | Nội dung phù hợp với sản phẩm và nhu cầu khách hàng |
| 2 | **Accuracy** | 20% | Thông tin chính xác: giá, specs, chính sách |
| 3 | **Clarity** | 15% | Dễ đọc, rõ ràng, không mơ hồ |
| 4 | **Engagement** | 20% | Hook mạnh, gây tương tác (like/comment/share) |
| 5 | **Conversion** | 15% | CTA rõ ràng, thúc đẩy mua hàng |
| 6 | **Brand Voice** | 10% | Phù hợp tông giọng thương hiệu |

---

## 2. Scoring Per Dimension

### Relevance Score (0–100)
```
- Product name xuất hiện ≥ 2 lần           → +30
- Product category keyword xuất hiện        → +20
- Customer pain point addressed             → +25
- Off-topic content penalty                 → -50
- Plagiarism / generic template detected    → -40
```

### Accuracy Score (0–100)
```
- Price mentioned matches product.price     → +40
- Specs match product description           → +30
- No outdated promotion dates               → +20
- Policy information correct                → +10
- Incorrect price/spec penalty              → -60 (CRITICAL)
```

### Clarity Score (0–100)
```
- Sentences ≤ 20 words average              → +25
- No jargon without explanation             → +20
- Clear structure (intro/body/cta)          → +30
- Readability score (Flesch-Kincaid equiv)  → +25
```

### Engagement Score (0–100)
```
- Hook in first sentence (question/bold)    → +35
- Emotional trigger word presence           → +25
- Social proof element                      → +20
- Call to action present                    → +20
- No hook penalty                           → -40
```

### Conversion Score (0–100)
```
- Clear CTA present                         → +40
- Urgency element (limited time/stock)      → +20
- Price/discount mentioned                  → +20
- Contact channel clearly stated            → +20
- Missing CTA penalty                       → -60
```

### Brand Voice Score (0–100)
```
- Vietnamese language correct (no translation artifacts)  → +40
- Tone matches: friendly, professional                    → +30
- No inappropriate content                               → +30
- Auto-translated / machine-tone penalty                 → -50
```

---

## 3. Overall Quality Score

```
Quality Score = 0.20×Relevance + 0.20×Accuracy + 0.15×Clarity
              + 0.20×Engagement + 0.15×Conversion + 0.10×Brand

Thresholds:
  ≥ 80  → APPROVED → status = 'scheduled'
  60–79 → REVIEW   → flag for human review
  < 60  → REJECTED → status = 'failed', regenerate with improved prompt
```

---

## 4. Auto-Review Checklist

```
PRE-PUBLISH CHECKLIST (automated before status → scheduled)
────────────────────────────────────────────────────────────
☐ Price trong nội dung = product.price trong DB
☐ Content dài hơn min length requirement
☐ Có ít nhất 1 CTA
☐ Có hashtags (nếu platform = facebook/tiktok)
☐ Không chứa phone number (security policy)
☐ Không chứa competitor brand names
☐ Image URL valid (HTTP 200)
☐ No duplicate: không có content giống >80% đã published trong 7 ngày
☐ Scheduled time trong business hours cho platform
```

---

## 5. Quality Gate Flow

```
Content Generated (status=draft)
        │
        ▼
[Auto Quality Check]
  - Run checklist
  - Compute Quality Score
        │
        ├── Score ≥ 80? → APPROVED → status = scheduled
        │
        ├── 60–79?      → REVIEW   → Add to pending queue
        │                           GET /api/agents/content/pending
        │
        └── < 60?       → REJECTED → Log reason
                                    Regenerate with adjusted prompt
                                    Max 2 retries
```

---

## 6. Current Implementation

```typescript
// Hiện tại: chưa có Quality Scoring service riêng
// Content Agent service tạo content và lưu draft
// publishContent() publish trực tiếp không qua quality gate

// TODO: Implement ContentQualityService
// - computeQualityScore(content: Content): number
// - runAutoChecklist(content: Content): ChecklistResult
// - approveOrReject(content: Content): void
```

**Gap:** Quality Model được thiết kế nhưng chưa implement. Tất cả content hiện được publish không qua quality gate.
