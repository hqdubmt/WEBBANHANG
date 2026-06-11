# Executive Reporting Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Report Structure

### Daily Report (GET /api/business-os/report/daily)

```
DAILY BUSINESS REPORT — {date}
─────────────────────────────────────────────────────────────
EXECUTIVE SUMMARY:
  Revenue today: ₫ X vs target ₫ Y (Z%)
  New leads: N vs 7-day avg M (Δ%)
  Orders completed: N | Conversion: X%
  Agents: N/21 running | Failures: N

YESTERDAY'S PERFORMANCE:
  [CEO perspective: overall business health]
  [CFO: financial snapshot]
  [CMO: marketing performance]

TOP ACHIEVEMENTS TODAY:
  1. [Best performing content/agent/product]
  2. [Milestone reached]
  3. [Problem solved]

ALERTS & ISSUES:
  [CRITICAL] ...
  [HIGH] ...
  [MEDIUM] ...

AUTONOMOUS ACTIONS TAKEN:
  - Content Agent: Generated 14 posts (scheduled for next 24h)
  - CRM Agent: Updated churnRisk for 1,234 customers
  - SEO Agent: Published 2 articles
  - Trend Agent: Identified 3 trending topics for tomorrow

PLAN FOR TOMORROW:
  [Business OS autonomous plan]
─────────────────────────────────────────────────────────────
```

### Weekly Report (GET /api/business-os/report/weekly)

```
WEEKLY RETROSPECTIVE — Week {N}, {year}
─────────────────────────────────────────────────────────────
WINS THIS WEEK:
  1. ...
  2. ...

LOSSES THIS WEEK:
  1. ...
  2. ...

METRICS vs TARGETS:
  [KPI scorecard table: all 15 KPIs vs targets]

AGENT PERFORMANCE SUMMARY:
  Top agents by value: [list]
  Underperforming agents: [list]
  Suggestions: [LLM-generated]

STRATEGIC RECOMMENDATIONS (AI Board):
  CEO: ...
  CFO: ...
  CMO: ...

NEXT WEEK PRIORITIES:
  1. ...
  2. ...
─────────────────────────────────────────────────────────────
```

---

## 2. Self-Improvement Loop Integration

```
SELF-IMPROVEMENT SERVICE (SelfImprovementService)
Path: apps/api/src/modules/self-improvement/

7-Phase Cycle (LearningCycle entity):
  PHASE 1: OBSERVE
    - Collect all metrics from last 24h
    - Orders, leads, customers, agent runs, content
    
  PHASE 2: MEASURE
    - Compare against targets
    - Compute deviation percentages
    - Flag items above/below threshold
    
  PHASE 3: ANALYZE
    - LLM analysis: "What drove the best results?"
    - LLM analysis: "What caused the worst results?"
    - Identify patterns across multiple data points
    
  PHASE 4: LEARN
    - Create LessonLearned records
    - Update DecisionMemory
    - Feed insights to Knowledge Brain
    
  PHASE 5: IMPROVE
    - Generate improvement actions
    - Update agent configurations (AgentConfig)
    - Prioritize next actions
    
  PHASE 6: EXECUTE
    - Execute improvement actions autonomously (if policy allows)
    - Flag higher-risk changes for human approval
    
  PHASE 7: VALIDATE
    - After 24h/7d: did improvement actions work?
    - Update LearningCycle.validationResults
    - Increment iterationCount
```

---

## 3. Report Entities

```typescript
// PerformanceScorecard (daily/weekly/monthly)
PerformanceScorecard {
  period: DAILY | WEEKLY | MONTHLY
  periodDate: Date
  revenueScore, profitScore, marketingScore,
  operationsScore, technologyScore, customerScore, growthScore,
  overallScore: all 0–100
  
  dailyAnswers: {
    bestPerforming, worstPerforming,
    revenueDriver, revenueDrain,
    shouldContinue, shouldStop
  }
  
  weeklyRetrospective: {
    wins[], losses[], opportunities[], risks[],
    strategicAdjustments[]
  }
  
  monthlyEvolution: {
    revenueGrowth, profitGrowth, marketPosition,
    customerGrowth, aiPerformance
  }
}
```

---

## 4. Report Delivery

```
Report delivery channels:
  1. API endpoint (primary) → Dashboard real-time
  2. Telegram notification → Daily summary to owner's Telegram
  3. Email → Weekly report to management email
  
Currently implemented:
  - API endpoints: DONE — /report/daily, /report/weekly
  - Telegram delivery: PARTIAL — Telegram Agent exists
  - Email delivery: PARTIAL — Email Agent exists
  
Missing:
  - Auto-trigger daily report at 07:00 (no cron)
  - Auto-send to Telegram/Email on schedule
```

---

## 5. Self-Improvement API

```
Module: apps/api/src/modules/self-improvement/

Available endpoints (from self-improvement service):
  Cần confirm từ controller — service có:
    - observe()     → collect metrics
    - measure()     → compare vs targets
    - analyze()     → LLM analysis
    - runFullCycle()→ complete OMALIEV cycle
    
Related entities:
  learning_cycles
  lessons_learned
  decision_memory
  experiments
  performance_scorecards
```

---

## 6. Report Quality Metrics

```
Good report requires:
  - Data freshness: < 15 minutes old
  - Coverage: all 5 Knowledge Domains
  - Actionability: ≥ 3 specific next actions
  - Insights: LLM-generated analysis (not just numbers)
  - Alerts: highlighted by severity (CRITICAL/HIGH/MEDIUM)
  
Current quality: PARTIAL
  - Data freshness: GOOD (DB queries real-time)
  - Coverage: PARTIAL (Operational + Business domains strong)
  - Actionability: PARTIAL (Business OS plan endpoint)
  - Insights: GOOD (AI Board LLM generates perspectives)
  - Alerts: PARTIAL (logged, not systematically highlighted)
```
