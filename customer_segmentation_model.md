# Customer Segmentation Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Segment Matrix

| Segment | Điều kiện | DB Filter | Số lượng điển hình |
|---------|-----------|-----------|-------------------|
| **New** | totalOrders = 0–1, age < 30 ngày | `tier='new' AND totalOrders<=1` | 40% base |
| **Active** | totalOrders ≥ 2, lastOrder < 30 ngày | `tier='regular' AND recent_order` | 25% |
| **Repeat** | totalOrders ≥ 3, avg frequency ≥ 1/month | `totalOrders>=3` | 15% |
| **VIP** | totalSpent ≥ 5M VND hoặc tier='vip' | `tier='vip'` | 5% |
| **At Risk** | churnRisk ≥ 70 | `churnRisk>=70` | 8% |
| **Lost** | lastOrder > 90 ngày, churnRisk > 90 | `churnRisk>90` | 5% |
| **Advocate** | totalOrders ≥ 5 + acquisitionSource='referral' giver | custom query | 2% |

---

## 2. RFM Scoring Model

**R = Recency** (ngày kể từ lần mua cuối)
**F = Frequency** (tổng số đơn)
**M = Monetary** (tổng chi tiêu)

### Scoring Matrix
```
R Score:
  ≤ 7 ngày   → R=5
  8–14 ngày  → R=4
  15–30 ngày → R=3
  31–60 ngày → R=2
  > 60 ngày  → R=1

F Score:
  ≥ 10 đơn   → F=5
  6–9 đơn    → F=4
  3–5 đơn    → F=3
  2 đơn      → F=2
  1 đơn      → F=1

M Score:
  ≥ 10M VND  → M=5
  5M–9.9M    → M=4
  1M–4.9M    → M=3
  500K–999K  → M=2
  < 500K     → M=1
```

### RFM → Segment Mapping
```
RFM Score    Segment
─────────────────────────────────────
5-5-5        Champion / VIP
4-5-4        Loyal Customer
5-4-4        Potential Loyalist
5-1-1        New Customer (promising)
4-2-2        Promising
3-3-3        Need Attention
2-3-2        About to Sleep
1-4-4        At Risk (was loyal)
1-2-2        Hibernating
1-1-1        Lost
```

---

## 3. CustomerSegment Entity

```typescript
// apps/api/src/database/entities/customer-segment.entity.ts
CustomerSegment {
  id: uuid
  name: string          // "VIP Q4 2025"
  description: text
  criteria: jsonb       // {tier: 'vip', minLtv: 5000000}
  customerCount: number
  lastUpdated: Date
}
```

**Segmentation Agent:** `apps/api/src/modules/agents/segmentation/`
- POST `/api/agents/segmentation/run` — rebuild all segments

---

## 4. CRM Actions Per Segment

```
┌──────────────────┬──────────────────────────────────────────────────────┐
│ Segment          │ CRM Action                                            │
├──────────────────┼──────────────────────────────────────────────────────┤
│ New              │ Welcome sequence D+1, D+3, D+7                        │
│                  │ Onboarding offer: Giảm 10% đơn tiếp theo             │
│                  │ Agent: Telegram/Facebook welcome message              │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Active           │ Nurture content: weekly product tips                  │
│                  │ Upsell: gợi ý sản phẩm liên quan                     │
│                  │ Loyalty points preview                                │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Repeat           │ Loyalty reward at order #5                            │
│                  │ VIP upgrade preview khi gần 5M threshold             │
│                  │ Referral program invitation                           │
├──────────────────┼──────────────────────────────────────────────────────┤
│ VIP              │ Exclusive early access to new products                │
│                  │ Personal shopper AI (SalesAgent priority)             │
│                  │ Birthday gift / anniversary offer                     │
├──────────────────┼──────────────────────────────────────────────────────┤
│ At Risk          │ Win-back campaign: offer 15% discount                 │
│                  │ Personal message from "team" via Telegram             │
│                  │ churnRisk alert → Dashboard notification              │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Lost             │ Last-chance campaign: 20% discount                    │
│                  │ Feedback survey: "Tại sao bạn chưa quay lại?"        │
│                  │ 90-day re-engagement sequence                         │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Advocate         │ Referral commission program                           │
│                  │ Co-marketing opportunities                            │
│                  │ Testimonial/review request                            │
└──────────────────┴──────────────────────────────────────────────────────┘
```

---

## 5. Segment Transition Rules

```
        ┌─────────────┐
        │     NEW     │ ──→ Order placed ──→ ACTIVE
        └─────────────┘
               │
        No order > 30d → AT RISK (New)
               │
        ┌─────────────┐
        │   ACTIVE    │ ──→ Order #3 ──→ REPEAT
        └─────────────┘
               │
        30d no order → AT RISK
               │
        ┌─────────────┐
        │   REPEAT    │ ──→ spent≥5M ──→ VIP
        └─────────────┘
               │
        60d no order → AT RISK
               │
        ┌─────────────┐
        │   AT RISK   │ ──→ Responds to win-back ──→ ACTIVE
        └─────────────┘
               │
        90d no response → LOST
               │
        ┌─────────────┐
        │    LOST     │ ──→ Re-engagement success ──→ ACTIVE (re-acq)
        └─────────────┘
```

---

## 6. Implementation Status

| Feature | Status |
|---------|--------|
| CustomerSegment entity | DONE — table exists |
| Segmentation Agent | DONE — `/api/agents/segmentation/run` |
| RFM scoring | PARTIAL — score field exists in Lead, not Customer |
| Auto segment rebuild | MISSING — cần cron job |
| Segment-based messaging | MISSING — Email Agent + Telegram Agent cần integrate |
