# Company Health Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. 7 Health Dimensions

| # | Dimension | Trọng số | Mô tả |
|---|-----------|---------|-------|
| 1 | **Financial Health** | 20% | Revenue growth, profitability, cash flow, ROI |
| 2 | **Customer Health** | 20% | Retention, LTV, churn rate, satisfaction |
| 3 | **Marketing Health** | 15% | Reach, engagement, lead generation efficiency |
| 4 | **Sales Health** | 15% | Conversion rates, pipeline health, speed |
| 5 | **Operational Health** | 15% | Fulfillment, agent performance, system reliability |
| 6 | **Knowledge Health** | 10% | KB quality, learning velocity, decision accuracy |
| 7 | **Growth Health** | 5% | New customer acquisition, revenue per customer growth |

---

## 2. Company Health Score (CHS) Formula

```
CHS = Σ (weight_i × score_i)

Each dimension scored 0–100 based on:
  - KPI performance vs targets
  - Trend direction (improving/stable/declining)
  - Anomaly detection (sudden drops flagged)
```

### Dimension Scoring Details

#### Financial Health (0–100)
```
Revenue_attainment = actual_MRR / target_MRR × 100 (capped at 100)
Profit_margin = gross_margin / target_margin × 100 (capped at 100)
Cost_efficiency = max(0, 100 - (ai_cost_ratio / 2%) × 100)
Financial Score = 0.5×Revenue_attainment + 0.3×Profit_margin + 0.2×Cost_efficiency
```

#### Customer Health (0–100)
```
Retention = retention_rate / 75% × 100
Anti_churn = (1 - churn_rate / 5%) × 100
LTV_growth = (current_avg_ltv / baseline_ltv) × 100
Customer Score = 0.4×Retention + 0.4×Anti_churn + 0.2×LTV_growth
```

#### Marketing Health (0–100)
```
Lead_velocity = (leads_this_week / leads_last_week - 1) × 100 + 50 (baseline 50)
Content_coverage = published_count / target_count × 100
Engagement = avg_er / target_er × 100
Marketing Score = 0.4×Lead_velocity + 0.3×Content_coverage + 0.3×Engagement
```

#### Sales Health (0–100)
```
Conversion = actual_conversion_rate / target_10% × 100
Speed = target_days_5 / avg_days_to_convert × 100 (capped at 100)
Pipeline = qualified_leads / total_leads × 100
Sales Score = 0.5×Conversion + 0.25×Speed + 0.25×Pipeline
```

#### Operational Health (0–100)
```
Fulfillment = fulfilled_orders / total_orders × 100
Agent_health = healthy_agents / total_agents × 100
System_uptime = uptime_percent
Ops Score = 0.4×Fulfillment + 0.4×Agent_health + 0.2×System_uptime
```

#### Knowledge Health (0–100)
```
KB_size = min(knowledge_count / 1000, 1) × 100
Freshness = AVG(knowledge.freshness) (0–100 field in entity)
Learning_rate = learning_cycles_completed_this_month × 10 (capped at 100)
Knowledge Score = 0.3×KB_size + 0.4×Freshness + 0.3×Learning_rate
```

#### Growth Health (0–100)
```
New_customer_rate = new_customers / total_customers × 100 / 5%_target
Revenue_per_customer = avg_ltv / prev_month_avg_ltv × 100
Growth Score = 0.6×New_customer_rate + 0.4×Revenue_per_customer
```

---

## 3. Company Health Score Example

```
Given current metrics:
  Financial:    85 (revenue at 82% target, margin good)
  Customer:     78 (retention 78%, churn 5%)
  Marketing:    84 (strong content output, ER 5%)
  Sales:        72 (conversion 8.3% vs 10% target)
  Operational:  76 (18/21 agents healthy, 94% fulfillment)
  Knowledge:    65 (KB growing but freshness lagging)
  Growth:       70 (new customers growing but LTV flat)

CHS = 0.20×85 + 0.20×78 + 0.15×84 + 0.15×72 + 0.15×76 + 0.10×65 + 0.05×70
    = 17.0 + 15.6 + 12.6 + 10.8 + 11.4 + 6.5 + 3.5
    = 77.4 / 100
```

---

## 4. CHS Thresholds

```
CHS ≥ 85  → THRIVING    → Accelerate growth, explore new markets
CHS 70–84 → HEALTHY     → Standard operations, optimize weak spots
CHS 55–69 → STRUGGLING  → Focused improvement required
CHS 40–54 → CRITICAL    → Emergency interventions, pause scaling
CHS < 40  → FAILING     → Business survival mode
```

---

## 5. Monitoring Approach

```
WHEN to compute CHS:
  - Daily: after Business OS daily report
  - Triggers: any dimension drops > 15 points in 24h
  - Weekly: as part of PerformanceScorecard.overallScore

WHERE to store:
  PerformanceScorecard.overallScore = CHS
  PerformanceScorecard.rawMetrics.dimensionScores = {...}

WHO reads it:
  - Business OS dashboard (/api/business-os/dashboard)
  - AI Board daily meeting (/api/ai-board/meeting)
  - Master Agent KPI (/api/agents/master/kpi)
  - Frontend executive command center
```

---

## 6. Correlation Analysis

```
CHS vs Specific Metrics (observed patterns):
  
  CHS drop > 10 in 1 day:
    → Almost always Revenue or Customer dimension
    → Investigate: agent failures, lead volume drop, competitor pricing
  
  CHS growing despite low Sales score:
    → Knowledge + Marketing compensating
    → Good sign: pipeline building even if conversion not optimized yet
  
  CHS stable at 70–75 for > 30 days:
    → System in "steady state"
    → Need deliberate improvement project to break through
```
