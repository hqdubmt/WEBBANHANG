# Customer Health Score — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Overview

**Customer Health Score (CHS)** là điểm số tổng hợp từ 0-100 phản ánh "sức khỏe" của mối quan hệ giữa khách hàng và thương hiệu.

- **Score cao (70-100):** Khách hàng engaged, đang active, có khả năng mua lại cao
- **Score trung bình (40-69):** Cần attention, có tín hiệu giảm sút
- **Score thấp (0-39):** Nguy cơ churn cao, cần intervention ngay

**Current state:** `Customer.churnRisk` field tồn tại (0-1) nhưng là **churn risk**, không phải health score. Chưa có health score tổng hợp, chưa có logic tính toán nào.

---

## 2. Health Score Model (0-100)

### Thành phần và trọng số:

```
Customer Health Score (0-100)
├── Recency Score      (30%) — mua gần đây không?
├── Frequency Score    (25%) — mua thường xuyên không?
├── Monetary Score     (20%) — chi bao nhiêu?
└── Engagement Score   (25%) — có tương tác không?
    ├── Message response rate
    ├── Open rate
    └── Click/reply rate
```

---

## 3. Chi Tiết Từng Component

### 3.1 Recency Score (30 điểm max)

**Input:** `lastPurchaseDate` (THIẾU — cần thêm vào entity)

```
Ngày kể từ lần mua cuối → Score (0-30):

0-7 ngày    → 30 điểm
8-14 ngày   → 27 điểm
15-30 ngày  → 23 điểm
31-60 ngày  → 17 điểm
61-90 ngày  → 10 điểm
91-180 ngày → 5 điểm
> 180 ngày  → 0 điểm
```

**Formula:**
```typescript
function recencyScore(lastPurchaseDate: Date): number {
  const daysSince = differenceInDays(new Date(), lastPurchaseDate);
  if (daysSince <= 7)  return 30;
  if (daysSince <= 14) return 27;
  if (daysSince <= 30) return 23;
  if (daysSince <= 60) return 17;
  if (daysSince <= 90) return 10;
  if (daysSince <= 180) return 5;
  return 0;
}
```

**Current availability:** THIẾU `lastPurchaseDate` field → cần compute từ Orders.

---

### 3.2 Frequency Score (25 điểm max)

**Input:** `totalOrders`, `firstPurchaseDate` (THIẾU)

```
Purchase Frequency Rate (orders/month):

> 2 orders/month   → 25 điểm
1-2 orders/month   → 20 điểm
0.5-1 order/month  → 15 điểm
0.25-0.5/month     → 10 điểm
< 0.25/month       → 5 điểm
Chưa mua lại       → 0 điểm
```

**Formula:**
```typescript
function frequencyScore(totalOrders: number, firstPurchaseDate: Date): number {
  if (totalOrders <= 1) return 0;
  const monthsSinceFirst = differenceInMonths(new Date(), firstPurchaseDate);
  const rate = totalOrders / Math.max(monthsSinceFirst, 1);

  if (rate > 2)    return 25;
  if (rate >= 1)   return 20;
  if (rate >= 0.5) return 15;
  if (rate >= 0.25) return 10;
  return 5;
}
```

---

### 3.3 Monetary Score (20 điểm max)

**Input:** `totalSpent` (CÓ SẴN), `avgOrderValue` (THIẾU — computed)

```
Dựa trên totalSpent (VND):

≥ 10,000,000  → 20 điểm
5,000,000-9,999,999  → 17 điểm
2,000,000-4,999,999  → 13 điểm
1,000,000-1,999,999  → 9 điểm
500,000-999,999      → 5 điểm
< 500,000            → 2 điểm
0                    → 0 điểm
```

**Formula:**
```typescript
function monetaryScore(totalSpent: number): number {
  if (totalSpent >= 10_000_000) return 20;
  if (totalSpent >= 5_000_000)  return 17;
  if (totalSpent >= 2_000_000)  return 13;
  if (totalSpent >= 1_000_000)  return 9;
  if (totalSpent >= 500_000)    return 5;
  if (totalSpent > 0)           return 2;
  return 0;
}
```

**Current availability:** CO — `totalSpent` có sẵn.

---

### 3.4 Engagement Score (25 điểm max)

**Input:** THIẾU toàn bộ — cần build engagement tracking

Gồm 3 sub-components:

```
Engagement Score = messageResponseScore + openRateScore + recentActivityScore

messageResponseScore (0-10):
  Response rate ≥ 70%  → 10 điểm
  Response rate 50-69% → 7 điểm
  Response rate 30-49% → 4 điểm
  Response rate < 30%  → 1 điểm
  No data              → 5 điểm (default/neutral)

openRateScore (0-8):
  Open rate ≥ 60%      → 8 điểm
  Open rate 40-59%     → 6 điểm
  Open rate 20-39%     → 4 điểm
  Open rate < 20%      → 1 điểm
  No data              → 4 điểm (default/neutral)

recentActivityScore (0-7):
  Active trong 7 ngày  → 7 điểm
  Active trong 30 ngày → 5 điểm
  Active trong 60 ngày → 3 điểm
  Active trong 90 ngày → 1 điểm
  > 90 ngày không active → 0 điểm
```

---

## 4. Health Score Calculation

```typescript
// Customer Health Score Engine

interface HealthScoreInput {
  totalOrders: number;
  totalSpent: number;
  lastPurchaseDate: Date | null;
  firstPurchaseDate: Date | null;
  openRate: number | null;       // 0-1
  responseRate: number | null;   // 0-1
  lastEngagementDate: Date | null;
}

function calculateHealthScore(input: HealthScoreInput): {
  score: number;
  breakdown: Record<string, number>;
  risk: 'healthy' | 'warning' | 'critical';
} {
  const r = recencyScore(input.lastPurchaseDate);
  const f = frequencyScore(input.totalOrders, input.firstPurchaseDate);
  const m = monetaryScore(input.totalSpent);
  const e = engagementScore(input.openRate, input.responseRate, input.lastEngagementDate);

  const total = r + f + m + e;  // max = 100

  return {
    score: total,
    breakdown: { recency: r, frequency: f, monetary: m, engagement: e },
    risk: total >= 70 ? 'healthy' : total >= 40 ? 'warning' : 'critical'
  };
}
```

---

## 5. Health Score → churnRisk Mapping

```
Health Score → churnRisk (Customer.churnRisk):

80-100  → churnRisk = 0.05 (5%)
60-79   → churnRisk = 0.15 (15%)
40-59   → churnRisk = 0.35 (35%)
20-39   → churnRisk = 0.65 (65%)
0-19    → churnRisk = 0.85 (85%)
```

**Hiện tại:** `churnRisk` trong Customer entity có nhưng không có logic tính. Sau khi build health score engine, churnRisk sẽ được derive tự động từ healthScore.

---

## 6. Health Score Thresholds & Alerts

| Score Range | Label | Color | Action |
|-------------|-------|-------|--------|
| 80-100 | Healthy | Green | Maintain, upsell |
| 60-79 | Good | Blue | Engage, grow |
| 40-59 | Warning | Yellow | Nurture, check-in |
| 20-39 | At Risk | Orange | Win-back campaign |
| 0-19 | Critical | Red | Emergency intervention |

**Automated alerts (cần xây):**
```
Score drops > 20 points in 7 days → Alert admin
Score < 20 → Trigger CANNOT_LOSE_THEM campaign
Score drops from >60 to <40 → Trigger AT_RISK sequence
New customer (7 days) score < 30 → Review onboarding
```

---

## 7. Health Score Dashboard Metrics

```
Portfolio Health Summary:
┌────────────────────────────────────┐
│  Total Customers: 1,247            │
│                                    │
│  Healthy  (80-100): 312  (25%)     │
│  Good     (60-79):  487  (39%)     │
│  Warning  (40-59):  285  (23%)     │
│  At Risk  (20-39):  112   (9%)     │
│  Critical  (0-19):   51   (4%)     │
│                                    │
│  Avg Health Score: 63.2            │
│  Score trend (7d): ▲ +2.1          │
└────────────────────────────────────┘
```

---

## 8. Implementation Checklist

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Thêm `lastPurchaseDate`, `firstPurchaseDate` vào Customer entity | P0 | Low | THIẾU |
| Build HealthScoreService | P0 | Medium | THIẾU |
| Daily cron job tính health score | P0 | Low | THIẾU |
| Engagement tracking (message open/click) | P1 | High | THIẾU |
| Automated alerts khi score drop | P1 | Medium | THIẾU |
| Health score dashboard | P2 | Medium | THIẾU |
| ML-based churnRisk prediction | P3 | High | THIẾU |

**Current implementation score: 8/100** — chỉ có `churnRisk` field, không có logic.

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
