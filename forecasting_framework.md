# Forecasting Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Forecasting Scope

| What to Forecast | Horizon | Method | Agent |
|-----------------|---------|--------|-------|
| Revenue (daily/weekly/monthly) | 7–30 days | Trend extrapolation | Business OS |
| Order volume | 7–14 days | Moving average + seasonal | Demand Forecaster |
| Lead generation | 7 days | Platform trend | Trend Agent |
| Product demand | 14–30 days | Sales velocity | Demand Forecaster |
| Customer churnRisk | 30 days | CHS decay model | CRM Agent |
| Inventory needs | 14–30 days | Demand × lead time | Demand Forecaster |

---

## 2. Demand Forecaster Agent (Agent 19)

**Path:** `apps/api/src/modules/agents/demand-forecaster/`

```
Role: Predict future demand for products to:
  1. Inform inventory purchasing decisions
  2. Prioritize content creation for high-demand products
  3. Adjust pricing (feed to Repricing Agent)
  4. Plan supply chain (feed to Supplier/Dropship)

Method (current): Moving average of last 30 days order data
```

---

## 3. Revenue Forecasting

### Method 1: Trend Extrapolation (Current — Available via Business OS)

```
Data: revenue_snapshots table (daily, weekly, monthly)

Algorithm:
  1. Load last 30 daily snapshots
  2. Compute linear trend: y = mx + b
     m = slope (daily revenue change rate)
     b = baseline
  3. Project: forecast[day+N] = current + m × N

Accuracy: ±15-20% for 7-day horizon
           ±30-40% for 30-day horizon

Seasonal adjustment (to implement):
  - Vietnamese holidays (Tết, National Day, etc.)
  - Month-end shopping pattern
  - Payday effect (1st and 15th of month)
```

### Method 2: ML-based Forecasting (Planned)

```
Model: Facebook Prophet (time series) OR custom LSTM
Training data:
  - revenue_snapshots (historical)
  - campaigns (promotion calendar)
  - Vietnamese holiday calendar
  - Seasonal factors

Features:
  - day_of_week (Friday/weekend higher)
  - payday_flag (1st and 15th)
  - campaign_active_flag
  - holiday_flag
  - weather (optional proxy for some product types)

Expected accuracy: ±8-12% for 7-day horizon
```

---

## 4. Revenue Snapshot Entity

```typescript
// revenue-snapshot.entity.ts
RevenueSnapshot {
  period: DAILY | WEEKLY | MONTHLY
  snapshotDate: Date
  totalRevenue: decimal        // basis for trend analysis
  totalCost: decimal
  grossProfit: decimal
  grossMarginPercent: decimal
  totalOrders: number
  totalNewCustomers: number
  avgOrderValue: decimal
  affiliateRevenue: decimal
  dropshipRevenue: decimal
  conversionRate: decimal
  breakdown: jsonb             // by platform, by product category
}
```

**Unique index:** (period, snapshotDate) — prevents duplicate snapshots.

---

## 5. Lead Forecasting

```
Lead Forecast Model:
  basis_leads_per_day = AVG(leads.count per day, last 14 days)
  
  Adjustments:
    campaign_multiplier = 1.3 if campaign.status='active'
    trend_factor = slope from 7-day lead trend
    platform_weight = {
      tiktok: 0.35,
      facebook: 0.40,
      telegram: 0.15,
      zalo: 0.05,
      website: 0.05
    }
  
  Forecast = basis × campaign_multiplier × (1 + trend_factor)
  
  Output → Business OS daily plan
           → Content Agent: how many posts to create per platform
           → Master Agent: how many agent runs to schedule
```

---

## 6. Product Demand Forecast

```
Demand Forecaster Agent computes:
  For each product:
    velocity = units_sold_last_30d / 30  (units per day)
    trend = (last_7d_velocity - prev_7d_velocity) / prev_7d_velocity
    forecast_30d = velocity × 30 × (1 + trend)
    
    Outputs to:
      → inventory check: does current stock cover forecast_30d?
      → content priority: high forecast = prioritize content
      → repricing: high demand = can increase price 5-10%
      → supplier: order point = forecast_30d × 0.5 (2-week buffer)
```

---

## 7. Forecasting API

```
Currently available:
  GET /api/business-os/intelligence → includes market forecasts
  GET /api/business-os/plan         → includes demand-informed planning
  
Missing (planned):
  GET /api/forecasting/revenue      → 7/14/30-day revenue forecast
  GET /api/forecasting/demand       → per-product demand forecast
  GET /api/forecasting/leads        → lead volume forecast by platform
```

---

## 8. Forecast Accuracy Tracking

```
After each forecast period ends:
  - Compare forecast vs actual
  - Compute MAPE (Mean Absolute Percentage Error)
  - Log to LearningCycle
  - Adjust model weights if MAPE > 20%

Target: MAPE < 15% for 7-day horizon
Current: Not yet tracked (forecasting just started)
```
