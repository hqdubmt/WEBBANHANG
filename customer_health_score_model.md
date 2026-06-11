# Customer Health Score Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Tổng quan

Customer Health Score (CHS) là chỉ số 0–100 phản ánh mức độ gắn kết và xác suất tiếp tục mua của khách hàng. `churnRisk` trong Customer entity là nghịch đảo của CHS: `churnRisk = 100 - CHS`.

---

## 2. Health Score Formula

```
CHS = w1×Recency + w2×Frequency + w3×Monetary + w4×Engagement + w5×Support

Trong đó:
  w1 = 0.30  (Recency — quan trọng nhất)
  w2 = 0.25  (Frequency)
  w3 = 0.20  (Monetary)
  w4 = 0.15  (Engagement — message response rate)
  w5 = 0.10  (Support — ít complaint = healthy)
```

### Chi tiết từng thành phần

#### R — Recency Score (0–100)
```
days_since_last_order = NOW() - MAX(orders.createdAt WHERE status='delivered')

days ≤ 7   → 100
days ≤ 14  → 85
days ≤ 30  → 70
days ≤ 60  → 50
days ≤ 90  → 30
days > 90  → 10
```

#### F — Frequency Score (0–100)
```
orders_per_month = totalOrders / max(months_since_signup, 1)

≥ 3/month  → 100
2/month    → 80
1/month    → 60
1/2months  → 40
1/3months  → 20
< 1/3m     → 5
```

#### M — Monetary Score (0–100)
```
Normalized against VIP threshold (5,000,000 VND)

spent ≥ 10M  → 100
spent ≥ 5M   → 85
spent ≥ 2M   → 65
spent ≥ 1M   → 50
spent ≥ 500K → 30
spent < 500K → 10
```

#### E — Engagement Score (0–100)
```
= (messages_replied / messages_sent) × 100
Proxy: nếu chưa có tracking → default 50 (neutral)
```

#### S — Support Score (0–100)
```
= 100 - (complaints × 20)
Proxy: orders với status=cancelled sẽ cộng vào điểm trừ
```

---

## 3. churnRisk Field trong Customer Entity

```typescript
// customer.entity.ts
@Column('decimal', { precision: 5, scale: 2, default: 0 })
churnRisk: number;
```

```
churnRisk = 100 - CHS

Thresholds:
  churnRisk 0–30   → HEALTHY    (tier: vip/regular, active buyer)
  churnRisk 31–50  → MODERATE   (watch list)
  churnRisk 51–70  → ELEVATED   (nurture campaign needed)
  churnRisk 71–85  → HIGH       (win-back campaign trigger)
  churnRisk 86–100 → CRITICAL   (last-chance intervention)
```

---

## 4. Thresholds và Actions

```
┌────────────────────┬──────────────┬──────────────────────────────────────┐
│ churnRisk Range    │ Health Level │ Automated Action                      │
├────────────────────┼──────────────┼──────────────────────────────────────┤
│ 0 – 30             │ HEALTHY      │ Standard nurture, upsell              │
│ 31 – 50            │ MODERATE     │ Engagement boost: share value content │
│ 51 – 70            │ ELEVATED     │ Personalized offer via preferred ch.  │
│ 71 – 85            │ HIGH         │ Win-back: 15% discount coupon         │
│ 86 – 100           │ CRITICAL     │ Personal outreach + 20% + free ship   │
└────────────────────┴──────────────┴──────────────────────────────────────┘
```

---

## 5. CRM Agent — churnRisk Update

```
CRM Agent Run (POST /api/agents/crm/run)
    │
    ├── For each customer:
    │   1. Compute recencyScore từ last delivered order
    │   2. Compute frequencyScore từ totalOrders / months
    │   3. Compute monetaryScore từ totalSpent
    │   4. Engagement = 50 (default until tracking implemented)
    │   5. Support = 100 - cancelled_orders × 20
    │   6. CHS = 0.3×R + 0.25×F + 0.2×M + 0.15×E + 0.1×S
    │   7. churnRisk = 100 - CHS
    │   8. UPDATE customers SET churnRisk = X WHERE id = Y
    │
    └── Aggregate: return {atRisk: count(churnRisk>70), avgChurnRisk}
```

---

## 6. Tier Auto-Assignment dựa trên Monetary

```typescript
// Logic trong CRM Agent Service
if (totalSpent >= 5_000_000) {
  tier = CustomerTier.VIP;
} else if (totalSpent >= 500_000) {
  tier = CustomerTier.REGULAR;
} else {
  tier = CustomerTier.NEW;
}
```

---

## 7. Churn Prediction Dashboard

```
CUSTOMER HEALTH DASHBOARD
─────────────────────────────────────────
Total Customers: 1,234

  HEALTHY    [████████████████] 60%  (740)
  MODERATE   [████████       ] 20%  (247)
  ELEVATED   [████           ] 10%  (123)
  HIGH RISK  [██             ]  7%  ( 86)
  CRITICAL   [█              ]  3%  ( 38)

Top At-Risk (churnRisk > 80):
  1. Nguyễn Văn A  — last order: 92 days ago — spent: 3.2M
  2. Trần Thị B    — last order: 87 days ago — spent: 1.8M
  3. Lê Văn C      — last order: 75 days ago — spent: 5.1M (VIP!)
─────────────────────────────────────────
```

---

## 8. Gap Analysis

| Feature | Status |
|---------|--------|
| churnRisk DB field | DONE |
| CRM Agent updates churnRisk | PARTIAL — basic logic, Engagement=50 default |
| Engagement tracking | MISSING — cần message response logging |
| Alert khi churnRisk > 70 | MISSING — cần WebSocket notification |
| Automated win-back trigger | MISSING — cần scheduler |
