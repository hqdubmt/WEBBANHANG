# Revenue Score Model — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Overview: Composite Business Revenue Score

**Mục tiêu:** Một con số duy nhất (0-100) phản ánh "sức khỏe revenue" của toàn bộ business, bao gồm 5 sub-scores.

```
Business Revenue Score (BRS) = Weighted average of 5 scores:

  Revenue Score      (30%) — Doanh thu thực tế
  Profit Score       (25%) — Biên lợi nhuận
  Growth Score       (20%) — Tốc độ tăng trưởng
  Retention Score    (15%) — Khả năng giữ khách
  Automation Score   (10%) — Mức độ tự động hóa
```

---

## 2. Revenue Score (30%)

**Định nghĩa:** Đo lường doanh thu thực tế so với target và industry benchmark.

### Input data cần:
- `totalRevenue` (tháng này, tháng trước, cùng kỳ năm ngoái)
- `revenueTarget` (monthly target, thiếu — cần config)
- `orderCount` (từ Orders table)
- `avgOrderValue` (computed)

### Tính toán:

```typescript
function calculateRevenueScore(data: RevenueData): number {
  // Component 1: Target achievement (0-40 points)
  const targetAchievement = data.actualRevenue / data.revenueTarget;
  const targetScore = Math.min(targetAchievement * 40, 40);

  // Component 2: MoM growth (0-30 points)
  const momGrowth = (data.thisMonth - data.lastMonth) / data.lastMonth;
  const growthScore = momGrowth >= 0.20 ? 30 :
                      momGrowth >= 0.10 ? 22 :
                      momGrowth >= 0.05 ? 15 :
                      momGrowth >= 0    ? 8  :
                      momGrowth >= -0.1 ? 3  : 0;

  // Component 3: Revenue consistency (0-30 points)
  const stdDev = computeStdDev(data.lastSixMonths);
  const cvRatio = stdDev / data.avgRevenueLast6Months;
  const consistencyScore = cvRatio < 0.10 ? 30 :
                            cvRatio < 0.20 ? 22 :
                            cvRatio < 0.30 ? 14 :
                            cvRatio < 0.50 ? 7  : 2;

  return targetScore + growthScore + consistencyScore;  // 0-100
}
```

**Sub-metrics displayed:**
| Metric | Formula | Status |
|--------|---------|--------|
| Monthly Revenue | SUM(orders.total WHERE month=X) | CO — /api/orders/revenue |
| Revenue vs Target | actual / target | THIẾU target config |
| MoM Growth Rate | (M - M-1) / M-1 | CO — computable |
| Revenue per Lead | revenue / total_leads | THIẾU |

---

## 3. Profit Score (25%)

**Định nghĩa:** Đo lường biên lợi nhuận và hiệu quả chi phí.

### Input data cần:
- `costOfGoods` (COGS) — THIẾU trong hệ thống
- `operationalCosts` — THIẾU
- `adSpend` — THIẾU integration
- `totalRevenue` — CO

```typescript
function calculateProfitScore(data: ProfitData): number {
  // Gross Margin (0-40 points)
  const grossMargin = (data.revenue - data.cogs) / data.revenue;
  const grossScore = grossMargin >= 0.50 ? 40 :
                     grossMargin >= 0.40 ? 32 :
                     grossMargin >= 0.30 ? 22 :
                     grossMargin >= 0.20 ? 12 :
                     grossMargin >= 0.10 ? 5  : 0;

  // Net Margin (0-35 points)
  const netMargin = (data.revenue - data.cogs - data.opex) / data.revenue;
  const netScore = netMargin >= 0.25 ? 35 :
                   netMargin >= 0.15 ? 26 :
                   netMargin >= 0.10 ? 18 :
                   netMargin >= 0.05 ? 10 :
                   netMargin >= 0    ? 4  : 0;

  // CAC Efficiency (0-25 points)
  const ltv = data.avgLtv;
  const cac = data.totalAdSpend / data.newCustomers;
  const ltvCacRatio = ltv / cac;
  const cacScore = ltvCacRatio >= 5  ? 25 :
                   ltvCacRatio >= 3  ? 18 :
                   ltvCacRatio >= 2  ? 11 :
                   ltvCacRatio >= 1  ? 5  : 0;

  return grossScore + netScore + cacScore;  // 0-100
}
```

**Current state:** THIẾU COGS data, THIẾU ad spend integration. Score = uncomputable hiện tại.

---

## 4. Growth Score (20%)

**Định nghĩa:** Tốc độ tăng trưởng revenue, customer base, và expansion.

```typescript
function calculateGrowthScore(data: GrowthData): number {
  // Revenue Growth Rate (0-40 points)
  const revenueGrowth = data.revenueGrowthMoM;
  const revenueScore = revenueGrowth >= 0.30 ? 40 :
                       revenueGrowth >= 0.20 ? 32 :
                       revenueGrowth >= 0.10 ? 22 :
                       revenueGrowth >= 0.05 ? 12 :
                       revenueGrowth >= 0    ? 5  : 0;

  // Customer Growth Rate (0-30 points)
  const customerGrowth = data.newCustomersThisMonth / data.newCustomersLastMonth - 1;
  const customerScore = customerGrowth >= 0.25 ? 30 :
                        customerGrowth >= 0.15 ? 22 :
                        customerGrowth >= 0.05 ? 14 :
                        customerGrowth >= 0    ? 6  : 0;

  // AOV Growth (0-15 points)
  const aovGrowth = data.avgOrderValueThisMonth / data.avgOrderValueLastMonth - 1;
  const aovScore = aovGrowth >= 0.10 ? 15 :
                   aovGrowth >= 0.05 ? 10 :
                   aovGrowth >= 0    ? 5  : 0;

  // New Channel Contribution (0-15 points)
  const channelDiversityScore = Object.keys(data.revenueByChannel).length >= 4 ? 15 :
                                  Object.keys(data.revenueByChannel).length >= 3 ? 10 :
                                  Object.keys(data.revenueByChannel).length >= 2 ? 6  : 2;

  return revenueScore + customerScore + aovScore + channelDiversityScore;
}
```

**Data availability:**
| Data Point | Available | Source |
|-----------|-----------|--------|
| Revenue by month | CO | /api/orders/revenue |
| New customers by month | CO (computable) | Customer.createdAt |
| AOV | THIẾU | Computed from Orders |
| Revenue by channel | THIẾU | Needs platform tracking |

---

## 5. Retention Score (15%)

**Định nghĩa:** Khả năng giữ khách hàng và tạo repeat revenue.

```typescript
function calculateRetentionScore(data: RetentionData): number {
  // Repeat Purchase Rate (0-35 points)
  const repeatRate = data.customersWithRepeatOrders / data.totalCustomers;
  const repeatScore = repeatRate >= 0.50 ? 35 :
                      repeatRate >= 0.40 ? 28 :
                      repeatRate >= 0.30 ? 20 :
                      repeatRate >= 0.20 ? 12 :
                      repeatRate >= 0.10 ? 6  : 0;

  // Churn Rate (0-30 points)  — inverse scoring
  const monthlyChurnRate = data.churnedThisMonth / data.activeLastMonth;
  const churnScore = monthlyChurnRate <= 0.02 ? 30 :
                     monthlyChurnRate <= 0.04 ? 23 :
                     monthlyChurnRate <= 0.06 ? 15 :
                     monthlyChurnRate <= 0.10 ? 8  :
                     monthlyChurnRate <= 0.15 ? 3  : 0;

  // LTV Growth (0-20 points)
  const ltvGrowth = data.avgLtvThisMonth / data.avgLtvLastMonth - 1;
  const ltvScore = ltvGrowth >= 0.05 ? 20 :
                   ltvGrowth >= 0    ? 12 :
                   ltvGrowth >= -0.05 ? 5 : 0;

  // Revenue from Existing Customers (0-15 points)
  const existingRatio = data.revenueFromExisting / data.totalRevenue;
  const existingScore = existingRatio >= 0.60 ? 15 :
                        existingRatio >= 0.40 ? 10 :
                        existingRatio >= 0.20 ? 5  : 2;

  return repeatScore + churnScore + ltvScore + existingScore;
}
```

**Data availability:**
| Data Point | Available | Note |
|-----------|-----------|------|
| Customers with repeat orders | CO (computable) | totalOrders > 1 |
| Churn rate | THIẾU | Cần lastPurchaseDate |
| LTV | CO (field exists) | churnRisk exists too |
| Revenue from existing | THIẾU | Cần customer join date |

---

## 6. Automation Score (10%)

**Định nghĩa:** Mức độ tự động hóa của revenue operations (tự chạy không cần người).

```typescript
function calculateAutomationScore(data: AutomationData): number {
  const automatedSteps = [
    data.hasLeadAutoCapture,          // CO
    data.hasAiQualification,          // PHẦN
    data.hasAutoOrderCreation,        // CO (manual confirm)
    data.hasPaymentAutomation,        // THIẾU
    data.hasShippingAutomation,       // THIẾU
    data.hasFollowUpSequence,         // THIẾU
    data.hasSegmentationAutoUpdate,   // THIẾU
    data.hasChurnDetectionAlert,      // THIẾU
    data.hasRevenueForecasting,       // THIẾU
    data.hasSelfImprovementLoop,      // CO (partial)
  ];

  const automatedCount = automatedSteps.filter(Boolean).length;
  return (automatedCount / automatedSteps.length) * 100;
}

// Current: 3/10 automated = 30/100
```

---

## 7. Composite Business Revenue Score

```typescript
function calculateBRS(scores: {
  revenue: number;    // 0-100
  profit: number;     // 0-100
  growth: number;     // 0-100
  retention: number;  // 0-100
  automation: number; // 0-100
}): number {
  return (
    scores.revenue    * 0.30 +
    scores.profit     * 0.25 +
    scores.growth     * 0.20 +
    scores.retention  * 0.15 +
    scores.automation * 0.10
  );
}
```

---

## 8. Current BRS Estimate

| Score Component | Estimated Score | Weighted |
|----------------|-----------------|---------|
| Revenue Score | 45/100 (computable, needs target) | 13.5 |
| Profit Score | 15/100 (COGS missing) | 3.75 |
| Growth Score | 35/100 (basic growth computable) | 7.0 |
| Retention Score | 25/100 (repeat rate computable) | 3.75 |
| Automation Score | 30/100 (3/10 steps automated) | 3.0 |
| **BRS** | | **31/100** |

**Verdict:** Revenue operations đang ở mức survival mode. Cần 60+ để có thể gọi là "Autopilot".

---

## 9. BRS Improvement Roadmap

| Action | Score Impact | Timeline |
|--------|-------------|----------|
| Add revenue target config | +5 Revenue | 1 day |
| Add COGS per product | +10 Profit | 3 days |
| Integrate ad spend tracking | +8 Profit | 1 week |
| Add lastPurchaseDate compute | +5 Retention | 4 hours |
| Implement churn detection | +8 Retention | 3 days |
| Build follow-up automation | +15 Automation | 1 week |
| Add payment gateway | +10 Automation | 2 weeks |
| Add shipping API | +8 Automation | 1 week |

**Total potential: +69 points → BRS from 31 → ~75**

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
