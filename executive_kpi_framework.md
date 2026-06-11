# Executive KPI Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Revenue KPIs

| KPI | Endpoint | Mô tả | Target |
|-----|----------|-------|--------|
| Monthly Revenue | `GET /api/analytics/revenue` | SUM(order.total WHERE status≠cancelled) | > ₫ 300M |
| Revenue Growth MoM | Computed | (current - prev) / prev × 100 | > 10% |
| Gross Profit Margin | `GET /api/business-os/kpi` | (Revenue - COGS) / Revenue × 100 | > 35% |
| Average Order Value | `GET /api/analytics/revenue` | total_revenue / total_orders | > ₫ 500K |
| Revenue per Agent | `GET /api/analytics/ai` | Revenue / active_agents | > ₫ 10M |
| AI Cost Ratio | `GET /api/analytics/ai` | AI_cost / Revenue × 100 | < 1% |

---

## 2. Marketing KPIs

| KPI | Endpoint | Mô tả | Target |
|-----|----------|-------|--------|
| Total Content Published | `GET /api/analytics/content` | COUNT(contents WHERE status=published) | > 100/month |
| Organic Reach | Platform APIs (planned) | Sum reach across all platforms | Growing |
| Avg Engagement Rate | Computed | (likes+comments+shares)/reach | > 5% |
| Lead Generation Rate | `GET /api/analytics/leads` | New leads / content pieces | > 2 leads/post |
| Content→Lead Conversion | Computed | Leads from content / total leads | > 30% |
| SEO Organic Traffic | Google Search Console (planned) | Monthly organic visits | > 5,000/month |
| Email Open Rate | `email_campaigns` table | Opens / Sent × 100 | > 25% |

---

## 3. Sales KPIs

| KPI | Endpoint | Mô tả | Target |
|-----|----------|-------|--------|
| New Leads / Day | `GET /api/analytics/leads` | COUNT(leads WHERE createdAt = today) | > 50/day |
| Lead Score Avg | Computed | AVG(lead.score) | > 60 |
| Lead → Qualified Rate | Computed | qualified / total_new | > 35% |
| Lead → Order Rate | `GET /api/business-os/funnel` | converted / total_new | > 8% |
| Avg Days to Convert | Computed | AVG(order.createdAt - lead.createdAt) | < 5 days |
| Sales Agent Success | `GET /api/analytics/ai` | Agent successful runs / total | > 95% |
| Pipeline Value | Computed | SUM(qualified_leads × avg_order_value) | > ₫ 50M |

---

## 4. CRM KPIs

| KPI | Endpoint | Mô tả | Target |
|-----|----------|-------|--------|
| Customer Retention Rate | `GET /api/analytics/customers` | (end - new) / start × 100 | > 75% |
| Monthly Churn Rate | `GET /api/agents/crm/stats` | churned / total × 100 | < 5% |
| Avg LTV | Computed | AVG(customer.ltv) | > ₫ 4M |
| VIP Customer Count | `GET /api/agents/crm/stats` | COUNT(tier='vip') | Growing |
| At-Risk Customers | `GET /api/agents/crm/stats` | COUNT(churnRisk > 70) | < 7% |
| Win-back Rate | Computed | reactivated / at_risk | > 15% |
| Repeat Purchase Rate | Computed | customers with ≥2 orders / total | > 40% |

---

## 5. Operational KPIs

| KPI | Endpoint | Mô tả | Target |
|-----|----------|-------|--------|
| Order Fulfillment Rate | `GET /api/analytics/dashboard` | delivered / confirmed × 100 | > 95% |
| Avg Shipping Time | Computed | AVG(delivered - confirmed) | < 3 days |
| Agent Success Rate | `GET /api/analytics/ai` | success / (success+failed) | > 90% |
| Agent Avg Duration | `GET /api/analytics/ai` | AVG(agent_log.durationMs) | < 30s |
| Total AI Cost / Day | `GET /api/analytics/ai` | SUM(agent_log.cost WHERE today) | < ₫ 100K |
| System Uptime | Infrastructure monitoring | % time API responding | > 99.5% |
| Knowledge Base Size | `GET /api/knowledge-brain/stats` | COUNT(knowledge WHERE active) | Growing |

---

## 6. KPI Computation — Current Endpoints

```
Available NOW:
  GET /api/analytics/dashboard  → revenue, leads, customers, agents summary
  GET /api/analytics/revenue    → revenue breakdown by period
  GET /api/analytics/leads      → lead stats by platform, status
  GET /api/analytics/customers  → customer tier distribution, LTV
  GET /api/analytics/ai         → token usage, cost, agent success rates
  GET /api/analytics/content    → content by platform, status
  
  GET /api/business-os/kpi      → formatted KPI framework with targets
  GET /api/business-os/funnel   → full conversion funnel
  GET /api/business-os/dashboard → executive overview

Missing:
  - Google Analytics integration (website traffic KPIs)
  - Platform API integrations (social media reach KPIs)
  - Google Search Console (SEO position KPIs)
```

---

## 7. Performance Scorecard Entity

```typescript
// performance-scorecard.entity.ts
PerformanceScorecard {
  period: daily | weekly | monthly
  periodDate: Date
  revenueScore: 0–100
  profitScore: 0–100
  marketingScore: 0–100
  operationsScore: 0–100
  technologyScore: 0–100
  customerScore: 0–100
  growthScore: 0–100
  overallScore: 0–100  // weighted average
  
  dailyAnswers: {
    bestPerforming: string    // which agent/product/campaign
    worstPerforming: string
    revenueDriver: string
    revenueDrain: string
    shouldContinue: string
    shouldStop: string
  }
}
```

**Saved by:** Self-Improvement Service after each daily report cycle.
