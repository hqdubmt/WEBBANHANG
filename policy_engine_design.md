# Policy Engine Design — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Autonomy Levels 1–5

| Level | Name | Description | Human Involvement |
|-------|------|-------------|------------------|
| **1** | Manual | Agent only analyzes, all actions require human | 100% approval |
| **2** | Advisory | Agent recommends, human approves before execute | Pre-approval required |
| **3** | Assisted | Agent executes with post-action notification | Notification only |
| **4** | Semi-Autonomous | Agent acts within bounds; exceptions escalate | Exception-only |
| **5** | Autonomous | Agent fully autonomous within defined policy | Audit log only |

---

## 2. Current Autonomy Per Agent

```
┌───────────────────────┬───────┬──────────────────────────────────────┐
│ Agent                 │ Level │ Rationale                            │
├───────────────────────┼───────┼──────────────────────────────────────┤
│ Trend Agent           │  5    │ Read-only analysis, no actions       │
│ Knowledge Agent       │  5    │ Data ingestion, no external impact   │
│ Demand Forecaster     │  5    │ Analysis only                        │
│ Competitor Monitor    │  5    │ Monitoring only                      │
│ Segmentation Agent    │  5    │ DB classification, reversible        │
│ Content Agent         │  4    │ Creates drafts, Publisher publishes  │
│ Publisher Agent       │  4    │ Publishes within scheduled window    │
│ SEO Agent             │  4    │ Creates drafts, human reviews option │
│ Video Agent           │  4    │ Creates jobs, upload is manual step  │
│ Email Agent           │  4    │ Sends to opted-in subscribers        │
│ CRM Agent             │  4    │ Updates scores/tiers, no messages    │
│ Sales Agent           │  4    │ Responds to leads via script bounds  │
│ Lead Hunter           │  4    │ Captures + scores, doesn't spend $   │
│ Telegram Agent        │  4    │ Responds within defined scripts      │
│ Price Agent           │  3    │ Analyzes only, suggests price        │
│ Repricing Agent       │  3    │ Changes price ±5% without approval   │
│ Video Optimizer       │  3    │ Analyzes + recommends                │
│ Marketplace Optimizer │  3    │ Adjusts listings within bounds       │
│ Affiliate Agent       │  3    │ Commission/partner management        │
│ Master Agent          │  4    │ Coordinates all, escalates critical  │
│ Enterprise Health     │  5    │ Monitoring only                      │
└───────────────────────┴───────┴──────────────────────────────────────┘
```

---

## 3. Policy Rules Per Agent

### Content Agent Policy
```
ALLOWED (Autonomy 4):
  ✓ Generate content for any product in catalog
  ✓ Schedule content within operating hours
  ✓ Use approved hashtag library
  ✓ Reference current prices from DB

NOT ALLOWED without human approval:
  ✗ Publish content that mentions competitor names
  ✗ Content claiming health benefits (regulatory risk)
  ✗ Content with discounts > 30%

Config: AgentConfig.config = {
  "maxDiscountMention": 30,
  "forbiddenTopics": ["health_claims", "competitor_names"],
  "postingHours": {"start": 7, "end": 23}
}
```

### Repricing Agent Policy
```
ALLOWED (Autonomy 3):
  ✓ Increase price up to +5% if competitor higher
  ✓ Decrease price up to -5% if competitor lower
  ✓ Apply campaign discount as configured

NOT ALLOWED:
  ✗ Change price > ±10% in single operation
  ✗ Price below cost (min_price_floor = cost × 1.15)
  ✗ Change VIP pricing without approval

Config: AgentConfig.config = {
  "maxPriceChangePercent": 5,
  "minMarginPercent": 15,
  "requireApprovalAbove": 10
}
```

### Sales Agent Policy
```
ALLOWED (Autonomy 4):
  ✓ Respond to leads within 5 minutes
  ✓ Offer standard discounts (≤ 10%)
  ✓ Create orders on behalf of confirmed customers
  ✓ Update lead status (new → contacted → qualified)

NOT ALLOWED:
  ✗ Offer discount > 10% (needs human)
  ✗ Refund or cancel delivered orders
  ✗ Share customer data externally

Config: {
  "maxDiscountAutonomous": 10,
  "requireHumanForRefund": true,
  "responseDelaySeconds": 30  // simulate human response time
}
```

---

## 4. Human Approval Requirements

```
ALWAYS REQUIRES HUMAN APPROVAL:
  - Price change > 10%
  - Order refund or cancellation after shipped
  - Bulk email to > 1,000 customers (new campaign)
  - Changing VIP customer tier downward
  - Publishing content mentioning health/medical claims
  - Agent configuration changes in production
  - New platform API credentials

AUTONOMOUS (no approval needed):
  - All content generation (drafts)
  - Lead scoring updates
  - churnRisk calculations
  - Product knowledge indexing
  - Daily/weekly reports
  - Competitor price monitoring
  - Demand forecasting

NOTIFICATION ONLY (async):
  - Price changes ≤ ±5%
  - Tier upgrades (new → regular, regular → vip)
  - Automated follow-up sequences
  - A/B test variant creation
```

---

## 5. Policy Engine Implementation

```
Current: Policy enforcement is MANUAL
  - Agents have config fields in AgentConfig.config (jsonb)
  - But no central PolicyEngine validates actions against rules
  - Violations can happen if service code doesn't check

Proposed: PolicyEngine Service
  class PolicyEngine {
    validate(agentName: string, action: string, params: any): PolicyResult
      → checks AgentConfig.config for limits
      → returns {allowed: boolean, reason?: string, requiresApproval?: boolean}
  }
  
  Each agent service calls PolicyEngine.validate() before executing:
    const result = policyEngine.validate('repricing', 'price_change', {delta: 8%})
    if (!result.allowed) { log_decision(SKIPPED); return; }
    if (result.requiresApproval) { create_pending_decision(); return; }
    // proceed with action
```

---

## 6. AuditLog Integration

```
Every autonomous action MUST log to audit_logs:
  AuditLog {
    userId: 'agent:{agentName}',
    action: 'price_change | content_publish | lead_status_update | ...',
    entityType: 'product | content | lead | customer | ...',
    entityId: affected record ID,
    oldData: {before state},
    newData: {after state},
    ip: 'internal',
    userAgent: 'Agent/{agentName} v3'
  }

Current: AuditLog table exists but MOST agents don't create entries
Needed:  Systematic audit logging as policy requirement
```
