# Revenue Intelligence Framework — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Revenue Intelligence Overview

**Revenue Intelligence** = khả năng hệ thống tự hỏi và tự trả lời các câu hỏi quan trọng về revenue, từ đó đưa ra quyết định kinh doanh tự động.

Hệ thống có:
- `GET /api/analytics/revenue` — Revenue analytics endpoint
- `GET /api/orders/revenue` — Revenue từ orders
- Knowledge Brain service
- 21 AI agents
- Self-Improvement Loop

---

## 2. Revenue Intelligence Questions Taxonomy

### Tier 1: Descriptive (Đã xảy ra gì?)

| Question | Data Source | API Available | Status |
|----------|-------------|---------------|--------|
| Doanh thu hôm nay / tuần / tháng là bao nhiêu? | Orders table | /api/analytics/revenue | CO |
| Top 10 sản phẩm bán chạy nhất? | Orders + Products | /api/analytics/dashboard | CO PHẦN |
| Kênh nào mang lại nhiều orders nhất? | Lead.platform + Orders | THIẾU endpoint | THIẾU |
| Tỷ lệ chuyển đổi lead → order là bao nhiêu? | Lead + Order tables | THIẾU endpoint | THIẾU |
| Giá trị đơn hàng trung bình (AOV) là bao nhiêu? | Orders | /api/orders/revenue | CO PHẦN |
| Bao nhiêu khách mới vs khách cũ đặt hàng? | Customer + Order | THIẾU endpoint | THIẾU |

### Tier 2: Diagnostic (Tại sao?)

| Question | Data Source | Status |
|----------|-------------|--------|
| Tại sao tháng này doanh thu giảm? | Multi-source comparison | THIẾU |
| Lead nào đang bị bỏ sót? | Lead status tracking | THIẾU automation |
| Sản phẩm nào có return rate cao? | Orders + Returns | THIẾU return tracking |
| Kênh nào có CAC cao nhất? | Leads + Ad spend | THIẾU ad spend data |
| Tại sao khách hàng tier VIP không mua lại? | Customer + Order history | THIẾU |

### Tier 3: Predictive (Điều gì sẽ xảy ra?)

| Question | Data Source | Status |
|----------|-------------|--------|
| Doanh thu tháng tới ước tính là bao nhiêu? | Historical orders | THIẾU forecasting |
| Khách hàng nào sắp churn? | churnRisk field | CO (field) nhưng không compute |
| Sản phẩm nào sắp hết hàng dựa trên demand? | Orders + inventory | THIẾU inventory module |
| Khách hàng nào sẵn sàng mua ngay bây giờ? | Behavioral signals | THIẾU scoring |

### Tier 4: Prescriptive (Phải làm gì?)

| Question | Data Source | Status |
|----------|-------------|--------|
| Nên chạy offer nào cho segment AT_RISK? | RFM + Campaign history | THIẾU |
| Nên tăng ngân sách ads cho kênh nào? | CAC by channel | THIẾU |
| Nên suggest sản phẩm nào cho khách VIP? | AI recommendation | THIẾU recommendation engine |
| Nên giảm giá sản phẩm nào để boost volume? | Price elasticity | THIẾU |

---

## 3. Data Sources Mapping

### 3.1 Internal Data Sources (CO)

```
PostgreSQL Tables:
├── orders          → Revenue, AOV, order count, conversion
├── leads           → Acquisition metrics, conversion funnel
├── customers       → LTV, tier distribution, churn risk
├── products        → Product performance, pricing
└── tenants         → Multi-tenant segmentation

Analytics Endpoints (CO):
├── GET /api/analytics/revenue     → Revenue time series
├── GET /api/analytics/customers   → Customer metrics
├── GET /api/analytics/dashboard   → Dashboard aggregates
├── GET /api/orders/revenue        → Order-level revenue
└── GET /api/business-os/dashboard → BOS metrics
```

### 3.2 External Data Sources (THIẾU)

```
THIẾU:
├── Facebook Ads API       → Ad spend, impressions, CPM, CPL
├── TikTok Ads API         → TikTok performance
├── Google Analytics       → Website traffic, bounce rate
├── Shipping APIs          → Delivery success rate, shipping cost
├── Payment Gateway        → Payment success rate, fee per transaction
└── Competitor Prices      → Market positioning data
```

### 3.3 AI-Generated Data (CO PHẦN)

```
CO:
├── Ollama LLM             → Natural language answers
├── Knowledge Brain        → Contextual answers about products/policies
└── Self-Improvement       → Performance pattern detection

THIẾU:
├── Revenue forecasting model
├── Churn prediction model
├── Product recommendation engine
└── Price optimization AI
```

---

## 4. Revenue Intelligence Query Examples

### 4.1 Direct API Queries

```bash
# Revenue analytics (CO)
GET /api/analytics/revenue?period=month&year=2026&month=6

# Order revenue (CO)
GET /api/orders/revenue?startDate=2026-06-01&endDate=2026-06-11

# Business dashboard (CO)
GET /api/business-os/dashboard

# KPI từ Master Agent (CO)
GET /api/agents/master/kpi
```

### 4.2 Composite Intelligence Queries (CẦN XÂY)

```bash
# Funnel analysis (THIẾU)
GET /api/analytics/funnel?period=2026-06

# Revenue by channel (THIẾU)
GET /api/analytics/revenue?groupBy=channel

# Customer cohort retention (THIẾU)
GET /api/analytics/cohort?cohortType=acquisition&period=month

# Churn prediction (THIẾU)
GET /api/analytics/churn-risk?threshold=0.6

# Revenue forecast (THIẾU)
GET /api/analytics/forecast?horizon=3months
```

### 4.3 Natural Language Intelligence (CO PHẦN)

```
Qua Knowledge Brain / AI Agent:

"Doanh thu tháng này so với tháng trước thế nào?"
→ AI query orders table → format answer → respond

"Có bao nhiêu khách VIP chưa mua trong 60 ngày?"
→ AI query customers WHERE tier=vip AND lastPurchaseDate < 60d ago

"Sản phẩm nào đang sell tốt nhất tuần này?"
→ AI query orders GROUP BY productId ORDER BY COUNT

Current state: Knowledge Brain có thể xử lý nếu được trained đúng.
```

---

## 5. Revenue Intelligence Dashboard Design

```
REVENUE INTELLIGENCE PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TODAY AT A GLANCE:
  Revenue Today:    12,500,000 VND   ▲ 8% vs yesterday
  Orders Today:     28               ▲ 3 vs yesterday
  New Leads:        15               ▼ 2 vs yesterday
  Conv. Rate:       24%              ▲ 1% vs yesterday

THIS MONTH:
  MTD Revenue:      287,000,000 VND  → 64% of monthly target
  New Customers:    89               → 44 days left
  Projected EOMonth: 480,000,000 VND

ALERTS:
  🔴 12 customers at churn risk (> 60 days no purchase)
  🟡 23 leads stalled > 48 hours
  🟢 Top product "X" trending +35% this week

AI INSIGHTS:
  "Doanh thu từ kênh Telegram tăng 22% so với tháng trước.
   Đề xuất tăng ngân sách Telegram ads thêm 20%."
```

---

## 6. Revenue Intelligence API Design

```typescript
// Proposed /api/analytics/intelligence endpoint

interface RevenueIntelligenceResponse {
  generatedAt: Date;
  period: string;

  summary: {
    totalRevenue: number;
    orderCount: number;
    newCustomers: number;
    repeatCustomers: number;
    conversionRate: number;
    avgOrderValue: number;
  };

  trends: {
    revenueMoM: number;       // % change
    ordersMoM: number;
    customersMoM: number;
    aovMoM: number;
  };

  alerts: RevenueAlert[];

  insights: AIInsight[];       // Generated by Ollama

  recommendations: Action[];   // Prescriptive actions
}
```

---

## 7. Implementation Plan

| Component | Priority | Data Needed | Endpoint |
|-----------|----------|-------------|----------|
| Revenue by channel | P0 | Lead.platform + Orders join | /api/analytics/revenue?groupBy=channel |
| Funnel conversion rates | P0 | Lead + Order join | /api/analytics/funnel |
| Churn risk customers list | P0 | lastPurchaseDate | /api/analytics/at-risk |
| Revenue forecast | P1 | Historical orders (3+ months) | /api/analytics/forecast |
| AI natural language insights | P1 | All analytics data | /api/analytics/insights |
| Cohort analysis | P2 | Customer join date + Orders | /api/analytics/cohort |
| Competitor intelligence | P3 | External scraping | /api/intelligence/market |

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
