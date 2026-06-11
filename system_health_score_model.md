# System Health Score Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Health Dimensions

| Dimension | Trọng số | Mô tả |
|-----------|---------|-------|
| **Revenue Health** | 25% | Is the business generating revenue as expected? |
| **Marketing Health** | 20% | Are content and lead gen working? |
| **Sales Health** | 20% | Are leads converting to orders? |
| **CRM Health** | 15% | Are customers retained and healthy? |
| **Infrastructure Health** | 10% | Is the technical stack running? |
| **Agent Health** | 10% | Are all 21 agents operational? |

---

## 2. System Health Score Formula

```
SHS = w1×RevenueHealth + w2×MarketingHealth + w3×SalesHealth
    + w4×CRMHealth + w5×InfraHealth + w6×AgentHealth

Where each dimension is scored 0–100.
```

### Revenue Health (0–100)
```
Revenue_vs_target = (actual_revenue / target_revenue) × 100
  If actual ≥ 110% target → 100
  If actual ≥ 90% target  → 85
  If actual ≥ 70% target  → 60
  If actual ≥ 50% target  → 35
  If actual < 50% target  → 10

MoM_growth_bonus = +10 if growing > 10% MoM
```

### Marketing Health (0–100)
```
content_score = (contents_published / content_target) × 40
lead_volume_score = (leads_today / lead_target) × 30
engagement_score = (avg_er / er_target) × 30
```

### Sales Health (0–100)
```
conversion_score = (conversion_rate / 10%) × 60
pipeline_score = (qualified_leads / leads_total) × 20
speed_score = (5 / avg_days_to_convert) × 20 (max 20)
```

### CRM Health (0–100)
```
retention_score = (retention_rate / 75%) × 40
churn_risk_score = (1 - at_risk_percentage / 15%) × 30
vip_growth_score = vip_growth_positive ? 30 : 15
```

### Infrastructure Health (0–100)
```
api_uptime = uptime_percent  (target: 99.5% = 100 score)
db_health = postgres_ok ? 40 : 0
qdrant_health = qdrant_ok ? 30 : 0
api_latency = (300 / avg_latency_ms) × 30 (capped at 30)
```

### Agent Health (0–100)
```
active_agents = (healthy_count / total_count) × 60
system_cost = max(0, 100 - (cost_today / daily_budget) × 100) × 20
success_rate = avg_success_rate × 20 (capped at 20)
```

---

## 3. SHS Computation Example

```
Given:
  Revenue today: ₫ 8.5M (target ₫ 10M) → RevenueHealth = 85 × 0.25 = 21.25
  Leads: 67/day (target 50) → MarketingHealth = 90 × 0.20 = 18.00
  Conversion: 8.3% (target 10%) → SalesHealth = 78 × 0.20 = 15.60
  Retention: 78% (target 75%) → CRMHealth = 88 × 0.15 = 13.20
  API uptime: 99.8%, latency 124ms → InfraHealth = 95 × 0.10 = 9.50
  18/21 agents healthy → AgentHealth = 82 × 0.10 = 8.20

SHS = 21.25 + 18.00 + 15.60 + 13.20 + 9.50 + 8.20 = 85.75 ≈ 86/100
```

---

## 4. Alert Thresholds

```
SHS ≥ 85  → EXCELLENT  → All systems operating optimally
SHS 70–84 → GOOD       → Minor issues, no immediate action
SHS 55–69 → MODERATE   → 1–2 dimensions need attention
SHS 40–54 → POOR       → Multiple issues, business impact
SHS < 40  → CRITICAL   → System failure risk, immediate action needed
```

### Dimension-level Thresholds
```
Any dimension < 50 AND weight ≥ 20% → HIGH alert
Any dimension < 30 AND weight ≥ 15% → CRITICAL alert
Infrastructure < 70 → CRITICAL (system availability risk)
Revenue < 50       → CRITICAL (business survival risk)
```

---

## 5. Master Agent KPI = System Health Score

```
GET /api/agents/master/kpi
{
  "systemHealth": 86,                 // SHS
  "dimensions": {
    "revenue": 85,
    "marketing": 90,
    "sales": 78,
    "crm": 88,
    "infrastructure": 95,
    "agents": 82
  },
  "alerts": [
    {"level": "MEDIUM", "dimension": "sales", "message": "Conversion below target"}
  ],
  "trend": "+3 vs yesterday",
  "timestamp": "2026-06-11T08:00:00Z"
}
```

---

## 6. Saved to PerformanceScorecard

```
PerformanceScorecard {
  revenueScore:    = Revenue Health
  marketingScore:  = Marketing Health
  operationsScore: = (Sales Health + CRM Health) / 2
  technologyScore: = Infrastructure Health × 0.5 + Agent Health × 0.5
  customerScore:   = CRM Health
  growthScore:     = MoM revenue growth normalized
  overallScore:    = SHS
}
```

**Saved daily by:** Self-Improvement Service after Business OS daily report.
