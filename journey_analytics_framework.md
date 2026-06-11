# Journey Analytics Framework — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Current Analytics State

Hệ thống có endpoint: `GET /api/analytics/customers`

Endpoint này trả về aggregated customer data, nhưng chưa có:
- Funnel conversion tracking
- Drop-off detection
- Cohort analysis
- Journey event timeline per customer

---

## 2. Analytics Architecture

```
DATA SOURCES                 ANALYTICS LAYER           OUTPUTS
─────────────────────────────────────────────────────────────────
Lead events ─────────────┐
Order events ─────────── ├──→ Journey Analytics ──→ Conversion Report
Customer updates ─────── │    Service              → Drop-off Alerts
Chat events ─────────── ─┤                         → Cohort Dashboard
Platform events ──────── │                         → Funnel Visualization
                         └──→ Real-time Stream ───→ Live Dashboard
                                                    → Alert System
```

---

## 3. Funnel Metrics Per Stage

### 3.1 Stage Conversion Rates

| Stage Transition | Metric Name | Formula | Benchmark Target |
|-----------------|-------------|---------|-----------------|
| Stranger → Lead | Lead Capture Rate | Leads / Impressions | 2-5% |
| Lead → Prospect | Lead Qualification Rate | Qualified / Total Leads | 30-50% |
| Prospect → Customer | Conversion Rate | Customers / Prospects | 20-40% |
| Customer → Repeat | Repeat Purchase Rate | Repeat / Total Customers | 30-50% |
| Repeat → Advocate | Advocacy Rate | Advocates / Repeat Customers | 10-20% |

### 3.2 API Endpoints Cần Xây

```
GET /api/analytics/funnel
{
  "period": "2026-06",
  "data": {
    "stranger_to_lead": { "impressions": 10000, "leads": 320, "rate": 0.032 },
    "lead_to_prospect": { "leads": 320, "qualified": 128, "rate": 0.40 },
    "prospect_to_customer": { "prospects": 128, "converted": 38, "rate": 0.30 },
    "customer_to_repeat": { "new_customers": 38, "repeated": 15, "rate": 0.39 },
    "repeat_to_advocate": { "repeat": 15, "advocates": 2, "rate": 0.13 }
  }
}

GET /api/analytics/customers  ← CÓ SẴN (hiện tại)
GET /api/analytics/funnel     ← CẦN XÂY
GET /api/analytics/cohort     ← CẦN XÂY
GET /api/analytics/dropoff    ← CẦN XÂY
GET /api/analytics/journey/:customerId  ← CẦN XÂY
```

---

## 4. Conversion Metrics Chi Tiết

### 4.1 Lead-level Metrics

```typescript
interface LeadMetrics {
  // Volume
  totalLeads: number;
  newLeadsToday: number;
  newLeadsThisMonth: number;

  // Conversion
  contactedRate: number;         // contacted / total
  qualificationRate: number;     // qualified / contacted
  conversionRate: number;        // converted / qualified
  lostRate: number;              // lost / total

  // Time-based
  avgTimeToContact: number;      // hours from created to contacted
  avgTimeToQualify: number;      // hours from contacted to qualified
  avgTimeToConvert: number;      // hours from qualified to converted

  // By platform
  byPlatform: {
    facebook: ConversionStats;
    telegram: ConversionStats;
    tiktok: ConversionStats;
    zalo: ConversionStats;
    website: ConversionStats;
  };
}
```

### 4.2 Customer-level Metrics

```typescript
interface CustomerMetrics {
  // Acquisition
  newCustomersThisMonth: number;
  acquisitionByChannel: Record<string, number>;
  acquisitionCost: number;           // THIẾU — cần ad spend data

  // Retention
  repeatPurchaseRate: number;        // % customers who buy again
  churnRate: number;                 // % customers who stopped
  retentionRate: number;             // % customers retained

  // Revenue
  avgOrderValue: number;
  avgOrdersPerCustomer: number;
  avgLtv: number;
  revenueByTier: { new: number; regular: number; vip: number };

  // Health
  avgHealthScore: number;            // THIẾU hiện tại
  customersAtRisk: number;           // churnRisk > 0.6
  customersBySegment: Record<string, number>;  // THIẾU
}
```

---

## 5. Drop-off Detection System

### 5.1 Lead Drop-off Signals

```
LEAD DROP-OFF RULES:
─────────────────────────────────────────────────────
Status = 'new' AND created > 24h ago        → "Uncontacted" alert
Status = 'contacted' AND updated > 48h ago  → "Stalled" alert
Status = 'qualified' AND updated > 72h ago  → "Closing stalled" alert
No response from customer for > 72h         → "Gone cold" alert
Lead age > 30 days without conversion       → "Aged lead" alert
```

### 5.2 Customer Drop-off Signals

```
CUSTOMER CHURN SIGNALS:
─────────────────────────────────────────────────────
lastPurchaseDate > 60 days           → "At risk" flag
lastPurchaseDate > 90 days           → "Churning" flag
lastPurchaseDate > 180 days          → "Churned" flag
healthScore drops > 20pts in 7 days  → "Health decline" alert
No message response for > 30 days    → "Gone silent" alert
Order cancellation after 2+ orders   → "Cancellation spike" alert
```

### 5.3 Drop-off Detection API

```typescript
// Endpoint: GET /api/analytics/dropoff
// Returns customers at each drop-off stage

interface DropoffReport {
  timestamp: Date;
  leads: {
    uncontacted: Lead[];          // new > 24h
    stalled: Lead[];              // contacted > 48h
    closingStalled: Lead[];       // qualified > 72h
    aged: Lead[];                 // > 30 days old
  };
  customers: {
    atRisk: Customer[];           // 60-90 days no purchase
    churning: Customer[];         // 90-180 days
    churned: Customer[];          // > 180 days
    healthDecline: Customer[];    // score dropped
    goneSilent: Customer[];       // no message > 30 days
  };
  summary: {
    totalDropoffs: number;
    estimatedRevenueLoss: number; // THIẾU — cần LTV data
  };
}
```

---

## 6. Cohort Analysis Framework

### 6.1 Acquisition Cohorts

```
Cohort = nhóm customers theo tháng đầu tiên mua hàng

Example:
Cohort 2026-01: 45 customers
  Month 0 (2026-01): 100% active (45 customers)
  Month 1 (2026-02): 42% retained (19 customers)
  Month 2 (2026-03): 31% retained (14 customers)
  Month 3 (2026-04): 22% retained (10 customers)
  Month 6 (2026-07): 15% retained (7 customers)
```

### 6.2 Cohort Retention Table

```
         M0    M1    M2    M3    M4    M5    M6
2025-07: 100%  38%   22%   18%   15%   13%   11%
2025-08: 100%  41%   25%   20%   17%   14%    -
2025-09: 100%  43%   27%   21%   18%    -     -
2025-10: 100%  44%   29%   23%    -     -     -
2025-11: 100%  45%   31%    -     -     -     -
2025-12: 100%  47%    -     -     -     -     -
2026-01: 100%   -     -     -     -     -     -
```

**Target M1 retention: 40%+**
**Target M3 retention: 20%+**

---

## 7. Journey Timeline Per Customer

### 7.1 Customer Journey Events

```typescript
interface JourneyEvent {
  customerId: string;
  timestamp: Date;
  eventType: JourneyEventType;
  channel: string;
  data: Record<string, any>;
}

enum JourneyEventType {
  FIRST_CONTACT       = 'first_contact',
  LEAD_CREATED        = 'lead_created',
  FIRST_MESSAGE       = 'first_message',
  QUALIFIED           = 'qualified',
  FIRST_ORDER         = 'first_order',
  ORDER_DELIVERED     = 'order_delivered',
  REPEAT_ORDER        = 'repeat_order',
  TIER_UPGRADE        = 'tier_upgrade',
  HEALTH_DECLINE      = 'health_decline',
  WIN_BACK_SENT       = 'win_back_sent',
  REACTIVATED         = 'reactivated',
  CHURNED             = 'churned',
}
```

### 7.2 Journey Visualization API

```
GET /api/analytics/journey/:customerId

Response:
{
  "customerId": "uuid",
  "currentStage": "REPEAT",
  "currentTier": "regular",
  "healthScore": 72,
  "events": [
    { "date": "2025-10-01", "type": "first_contact", "channel": "facebook" },
    { "date": "2025-10-01", "type": "lead_created", "channel": "facebook" },
    { "date": "2025-10-03", "type": "qualified", "data": { "estimatedValue": 500000 } },
    { "date": "2025-10-05", "type": "first_order", "data": { "orderId": "...", "amount": 350000 } },
    { "date": "2025-10-15", "type": "order_delivered" },
    { "date": "2025-11-02", "type": "repeat_order", "data": { "amount": 420000 } },
    { "date": "2025-12-01", "type": "tier_upgrade", "data": { "from": "new", "to": "regular" } }
  ],
  "summary": {
    "daysAsCustomer": 71,
    "totalOrders": 2,
    "totalSpent": 770000,
    "avgOrderValue": 385000
  }
}
```

---

## 8. KPIs Dashboard

| KPI | Formula | Current | Target | Status |
|-----|---------|---------|--------|--------|
| Lead → Customer CVR | converted/totalLeads | N/A | 15%+ | THIẾU tracking |
| Time-to-Convert | avg hours Lead→Order | N/A | < 48h | THIẾU tracking |
| Repeat Purchase Rate | repeat/total customers | N/A | 35%+ | THIẾU tracking |
| Customer Retention (M1) | cohort M1 / M0 | N/A | 40%+ | THIẾU cohort |
| Avg Health Score | mean(healthScore) | N/A | 65+ | THIẾU health score |
| Drop-off Rate | dropoffs/total | N/A | < 20% | THIẾU detection |
| CAC | ad spend / new customers | N/A | < 150k VND | THIẾU ad data |
| LTV:CAC Ratio | ltv / cac | N/A | > 3:1 | THIẾU both |

---

## 9. Analytics Implementation Roadmap

| Phase | Tasks | Timeline |
|-------|-------|----------|
| Phase 1 | Compute lastPurchaseDate, fix totalOrders update trigger | Week 1 |
| Phase 2 | Build /api/analytics/funnel endpoint | Week 2 |
| Phase 3 | Drop-off detection service + alerts | Week 3 |
| Phase 4 | Journey event log table + API | Week 4 |
| Phase 5 | Cohort analysis | Week 5-6 |
| Phase 6 | Real-time dashboard | Week 7-8 |

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
