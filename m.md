
# REVENUE_AUTOPILOT_V2.md

## MISSION

Xây dựng Revenue Autopilot — tầng tự động hóa doanh thu hoàn chỉnh.

Mục tiêu:

Tự động theo dõi, phân tích, tối ưu và dự báo doanh thu toàn hệ thống.

Tự động phát hiện điểm nghẽn trong vòng lặp Traffic → Lead → Order → Profit.

Tự động điều phối Agent tăng trưởng.

---

# PRIMARY OBJECTIVE

Biến:

Traffic
↓
Lead
↓
Customer
↓
Revenue
↓
Profit
↓
Growth

thành một vòng lặp tự tối ưu liên tục — không cần con người can thiệp hằng ngày.

---

# IMPLEMENTATION RULES

Claude phải:

1. Mở rộng module `RevenueAutopilotModule` (NestJS) — KHÔNG tạo module mới nếu chưa có.
2. Tận dụng entity `RevenueSnapshot`, `PerformanceScorecard`, `AiDecision` sẵn có.
3. Tận dụng `BusinessOsModule`, `AiBoardModule` hiện có.
4. Tận dụng tất cả Agent hiện có trong `app.module.ts`.
5. Tận dụng PostgreSQL (TypeORM) và Redis (Bull queues) hiện có.
6. Tận dụng `CampaignsModule`, `LeadsModule`, `OrdersModule`, `CustomersModule`.

---

# STRICT RULES

KHÔNG thay đổi schema entity hiện tại.

KHÔNG thay đổi API endpoint hiện tại.

KHÔNG phá workflow hiện tại.

KHÔNG refactor các Agent hiện có.

Chỉ mở rộng tương thích ngược — thêm mới, không sửa cũ.

---

# MODULE ARCHITECTURE

```
RevenueAutopilotModule
├── RevenueKpiService          # Thu thập KPI từ DB
├── RevenueHealthService       # Tính Revenue Health Score (0-100)
├── BottleneckDetectionService # Phát hiện điểm nghẽn tự động
├── RevenueForecastService     # Dự báo 7/30/90 ngày
├── RevenueReportService       # Tạo Daily/Weekly/Monthly report
├── RevenueOptimizationService # Đề xuất hành động tối ưu
└── RevenueAutopilotController # REST API endpoints
```

---

# DATA SOURCES

## Orders (OrdersModule)
- Entity: `Order` — fields: `total`, `status`, `createdAt`, `customerId`
- Query: SUM(total) WHERE status NOT IN ('cancelled') GROUP BY DATE(createdAt)

## Customers (CustomersModule)
- Entity: `Customer` — fields: `tier`, `totalSpent`, `createdAt`
- Query: LTV = AVG(totalSpent), Retention = returning customers / total

## Leads (LeadsModule)
- Entity: `Lead` — fields: `status`, `source`, `convertedAt`, `createdAt`
- Conversion Rate = CONVERTED / total

## Revenue Snapshots
- Entity: `RevenueSnapshot` — đã có sẵn, dùng để lưu daily/weekly/monthly snapshot

## Performance Scorecard
- Entity: `PerformanceScorecard` — đã có sẵn, dùng để lưu score tổng hợp

## AI Decisions
- Entity: `AiDecision` — đã có sẵn, dùng để log quyết định của autopilot

---

# KPI COLLECTION ENGINE

`RevenueKpiService.collectDailyKpis()`:

Thu thập từ DB:

| KPI | Source | Query |
|-----|--------|-------|
| Revenue | orders | SUM(total) WHERE status!=cancelled |
| Profit | orders + cost | revenue - COGS estimate |
| Orders | orders | COUNT(*) |
| Conversion Rate | leads | converted/total |
| Lead Quality | leads | qualified/total |
| LTV | customers | AVG(totalSpent) |
| CAC | campaigns | totalAdSpend / newCustomers |
| Retention | customers | returningCustomers / totalCustomers |
| ROAS | campaigns | revenue / adSpend |
| AOV | orders | AVG(total) |

Lưu vào `RevenueSnapshot` với period = 'daily'.

Cron: `@Cron('0 23 * * *')` — chạy 23:00 hằng ngày.

---

# REVENUE HEALTH SCORE

`RevenueHealthService.calculateScore()`:

```typescript
interface RevenueHealthScore {
  salesPerformance: number;   // 0-20: revenue vs target
  leadQuality: number;        // 0-15: conversion rate
  conversionRate: number;     // 0-15: lead→order ratio
  retention: number;          // 0-20: repeat customers
  growthRate: number;         // 0-15: MoM growth
  profitability: number;      // 0-15: gross margin
  total: number;              // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
```

Lưu vào `PerformanceScorecard` với `overallScore`.

---

# BOTTLENECK DETECTION

`BottleneckDetectionService.detect()`:

```typescript
interface Bottleneck {
  type: 'traffic' | 'lead' | 'conversion' | 'retention' | 'affiliate' | 'campaign';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  recommendedAction: string;
}
```

Logic phát hiện:

- Traffic Bottleneck: leads/day < threshold (< 5 leads/ngày)
- Lead Bottleneck: conversion < 5%
- Conversion Bottleneck: order rate < 10%
- Retention Bottleneck: repeat purchase rate < 20%
- Affiliate Bottleneck: affiliate revenue < 10% total
- Campaign Bottleneck: ROI < 1.5x

Lưu vào `AiDecision` với `decisionType = 'bottleneck_detected'`.

---

# REVENUE FORECAST ENGINE

`RevenueForecastService.forecast(days: 7 | 30 | 90 | 365)`:

```typescript
interface RevenueForecast {
  period: number;         // days
  bestCase: number;       // +20% growth trajectory
  expectedCase: number;   // linear regression từ 30 ngày
  worstCase: number;      // -15% decline trajectory
  confidence: number;     // 0-1
  assumptions: string[];
}
```

Algorithm:
1. Lấy `RevenueSnapshot` 90 ngày gần nhất
2. Tính linear regression (least squares)
3. Apply seasonal adjustment nếu có data đủ
4. Generate 3 scenarios

---

# REVENUE OPTIMIZATION ENGINE

`RevenueOptimizationService.getRecommendations()`:

Phân tích:

```typescript
interface RevenueRecommendation {
  priority: 1 | 2 | 3;
  action: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  targetAgent: string;    // agent to trigger
  triggerQueue: string;   // Bull queue name
}
```

Ví dụ recommendations:

| Condition | Action | Trigger |
|-----------|--------|---------|
| conversion < 5% | "Kích hoạt Sales Agent review leads" | sales-agent queue |
| traffic < baseline | "Tăng Content Factory output" | content-factory queue |
| retention < 20% | "Kích hoạt CRM retention campaign" | crm-agent queue |
| affiliate ROI < 1x | "Review affiliate program" | affiliate-agent queue |

---

# CUSTOMER VALUE ENGINE

`RevenueKpiService.getCustomerValueMetrics()`:

```typescript
interface CustomerValueMetrics {
  aov: number;              // Average Order Value
  ltv: number;              // Customer Lifetime Value
  repeatPurchaseRate: number;
  revenuePerCustomer: number;
  topCustomerTiers: {
    VIP: { count: number; revenue: number };
    REGULAR: { count: number; revenue: number };
    NEW: { count: number; revenue: number };
  };
}
```

Dữ liệu từ entity `Customer` (trường `totalSpent`, `tier`) + `Order`.

---

# PROFIT ENGINE

`RevenueKpiService.getProfitMetrics()`:

```typescript
interface ProfitMetrics {
  revenue: number;
  estimatedCOGS: number;     // 40% revenue (configurable)
  estimatedCommission: number; // affiliate commission từ AffiliateClick
  marketingCost: number;      // campaigns budget
  grossProfit: number;
  grossMarginPercent: number;
  netProfit: number;
}
```

Dữ liệu từ `RevenueSnapshot.grossProfit`, `RevenueSnapshot.totalCost`.

---

# CAMPAIGN IMPACT ENGINE

`RevenueKpiService.getCampaignImpact()`:

Query từ `Campaign` entity:

```typescript
interface CampaignImpact {
  campaignId: string;
  name: string;
  revenue: number;
  cost: number;
  roi: number;
  roas: number;
  leads: number;
  orders: number;
}
```

---

# AFFILIATE IMPACT ENGINE

`RevenueKpiService.getAffiliateImpact()`:

Query từ `AffiliateClick`, `Order` (via `affiliateCode`):

```typescript
interface AffiliateImpact {
  totalAffiliateRevenue: number;       // từ RevenueSnapshot.affiliateRevenue
  affiliateOrders: number;
  conversionRate: number;
  commissionCost: number;
  affiliateROI: number;
}
```

---

# AI DECISION ENGINE

`RevenueOptimizationService.makeDecision()`:

Luồng quyết định:

```
RevenueHealth < 60
  → BottleneckDetection.detect()
  → Tìm bottleneck với severity = 'critical'
  → Tạo AiDecision với confidence score
  → Emit event 'revenue.action.required'
  → Master Agent nhận và điều phối
```

Lưu mọi quyết định vào `AiDecision`:
- `agentName`: 'revenue_autopilot'
- `decisionType`: 'revenue_optimization'
- `confidence`: 0-1
- `outcome`: pending → success/failure

---

# ALERT ENGINE

Bull Queue: `revenue-autopilot-alerts`

Trigger khi:

| Condition | Alert Level | Action |
|-----------|-------------|--------|
| Revenue drop > 20% DoD | CRITICAL | Notify + auto-trigger Sales Agent |
| Conversion drop > 30% WoW | HIGH | Notify + trigger review |
| Lead count = 0 for 24h | HIGH | Trigger Lead Hunter |
| Profit margin < 10% | MEDIUM | Review campaign spend |
| Traffic drop > 40% WoW | HIGH | Trigger SEO + Content |

Event emitted: `revenue.alert.{level}` — Gateway module phát WebSocket.

---

# EXECUTIVE REPORTING

`RevenueReportService`:

```typescript
// Daily Report — chạy 07:00 sáng
@Cron('0 7 * * *')
async generateDailyReport(): Promise<RevenueReport>

// Weekly Report — Thứ Hai 08:00
@Cron('0 8 * * 1')
async generateWeeklyReport(): Promise<RevenueReport>

// Monthly Report — Ngày 1 hàng tháng
@Cron('0 8 1 * *')
async generateMonthlyReport(): Promise<RevenueReport>
```

Report structure:

```typescript
interface RevenueReport {
  period: 'daily' | 'weekly' | 'monthly';
  revenue: number;
  profit: number;
  orders: number;
  leads: number;
  healthScore: number;
  bottlenecks: Bottleneck[];
  recommendations: RevenueRecommendation[];
  forecast: RevenueForecast;
  topProducts: { id: string; name: string; revenue: number }[];
  topChannels: { channel: string; revenue: number }[];
}
```

Lưu vào `PerformanceScorecard`.

---

# API ENDPOINTS

```
GET  /revenue-autopilot/health-score
GET  /revenue-autopilot/kpis
GET  /revenue-autopilot/bottlenecks
GET  /revenue-autopilot/recommendations
GET  /revenue-autopilot/forecast?days=30
GET  /revenue-autopilot/report/daily
GET  /revenue-autopilot/report/weekly
GET  /revenue-autopilot/report/monthly
GET  /revenue-autopilot/customer-value
GET  /revenue-autopilot/profit-metrics
GET  /revenue-autopilot/campaign-impact
GET  /revenue-autopilot/affiliate-impact
POST /revenue-autopilot/run-analysis    # Manual trigger
```

---

# BULL QUEUES

```
revenue-autopilot-kpi       # KPI collection jobs
revenue-autopilot-analysis  # Analysis jobs
revenue-autopilot-alerts    # Alert jobs
revenue-autopilot-reports   # Report generation jobs
```

---

# INTEGRATION POINTS

| Module | Integration |
|--------|-------------|
| `BusinessOsModule` | Đọc business funnel data |
| `AiBoardModule` | Chia sẻ CEO report data |
| `MasterAgentModule` | Nhận recommendations → điều phối agents |
| `GatewayModule` | Phát WebSocket alerts |
| `SalesAgentModule` | Trigger khi conversion thấp |
| `CrmAgentModule` | Trigger khi retention thấp |
| `ContentFactoryModule` | Trigger khi traffic thấp |

---

# DASHBOARD

Endpoint: `GET /revenue-autopilot/dashboard`

```typescript
interface RevenueDashboard {
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  profit: number;
  orders: number;
  ltv: number;
  cac: number;
  roas: number;
  roi: number;
  healthScore: number;     // 0-100
  healthGrade: string;     // A/B/C/D/F
  activeBottlenecks: number;
  topRecommendation: string;
}
```

---

# AGENT INTEGRATION

| Agent | Trigger Condition |
|-------|-------------------|
| Sales Agent | Conversion < 5% |
| CRM Agent | Retention < 20% |
| Affiliate Agent | Affiliate ROI < 1x |
| Content Factory | Traffic drop > 30% |
| SEO Agent | Organic traffic drop > 40% |
| Campaign Engine | ROAS < 2x |
| Executive AI | Health Score < 50 |
| Master Agent | Tổng điều phối |

---

# SECURITY

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'executive', 'analyst')
```

Áp dụng cho tất cả endpoint.

Audit log: mọi quyết định ghi vào `AiDecision` với `agentLogId`.

---

# OUTPUT 1

`revenue_autopilot_architecture.md`

Module diagram, dependency graph, queue topology.

---

# OUTPUT 2

`revenue_health_model.md`

Công thức tính từng thành phần Health Score, ngưỡng cảnh báo.

---

# OUTPUT 3

`revenue_optimization_framework.md`

Decision tree: từ KPI → Bottleneck → Recommendation → Agent trigger.

---

# OUTPUT 4

`forecasting_framework.md`

Algorithm chi tiết: linear regression, seasonal adjustment, confidence interval.

---

# OUTPUT 5

`bottleneck_detection_framework.md`

Ngưỡng phát hiện theo từng loại bottleneck, logic severity scoring.

---

# OUTPUT 6

`executive_reporting_framework.md`

Template Daily/Weekly/Monthly report, field mapping đến entity.

---

# OUTPUT 7

`revenue_dashboard_design.md`

API spec đầy đủ, field types, refresh interval.

---

# OUTPUT 8

`revenue_autopilot_readiness_score.md`

Đánh giá:

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| Revenue Visibility | 15% | RevenueSnapshot đang ghi đủ fields |
| Forecast Accuracy | 15% | >= 30 ngày data, MAPE < 15% |
| Optimization Capability | 15% | >= 5 recommendation types |
| Automation Level | 15% | Cron + Queue đang chạy |
| Profit Tracking | 10% | grossProfit được ghi |
| Scalability | 10% | Bull queue, không blocking |
| AI Readiness | 10% | AiDecision entity đang dùng |
| Production Readiness | 10% | Auth + Audit + Error handling |

Tổng điểm 0-100.

---

# SUCCESS CRITERIA

Revenue Autopilot V2 phải:

* tự động thu thập KPI mỗi ngày qua Cron
* tự động tính Revenue Health Score (0-100)
* tự động phát hiện bottleneck với severity + recommended action
* tự động dự báo doanh thu 3 scenarios (best/expected/worst)
* tự động trigger đúng Agent khi phát hiện vấn đề
* cung cấp Dashboard API cho Executive AI và AiBoard
* tích hợp Bull queue cho async processing
* không phá hệ thống hiện tại

---

# NORTH STAR METRIC

Revenue Growth (MoM)

×

Profit Margin

×

Revenue Health Score

×

Customer Lifetime Value

---

# END OF FILE
