# Agent Orchestration Plan — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Agent Inventory (21 Agents)

Hệ thống có 21 AI agents được organize thành các nhóm chức năng:

### 1.1 Revenue & Sales Agents

| # | Agent Name | Mô tả | Status |
|---|-----------|--------|--------|
| 1 | **Master Agent** | Điều phối tổng thể, KPI tracking | CO — POST /run, GET /kpi |
| 2 | **Sales Agent** | Chốt đơn, xử lý objections | CO (estimate) |
| 3 | **Lead Qualification Agent** | Score và qualify leads | CO (estimate) |
| 4 | **Closing Agent** | Final push to convert prospect | CO (estimate) |
| 5 | **Upsell Agent** | Suggest upsell/cross-sell | CO (estimate) |

### 1.2 Customer Experience Agents

| # | Agent Name | Mô tả | Status |
|---|-----------|--------|--------|
| 6 | **AI Chat Agent** | Handle customer conversations | CO |
| 7 | **Customer Support Agent** | Handle complaints, issues | CO (estimate) |
| 8 | **FAQ Agent** | Answer common questions via Knowledge Brain | CO |
| 9 | **Onboarding Agent** | Guide new customers | CO (estimate) |
| 10 | **Retention Agent** | Re-engage at-risk customers | CO (estimate) |

### 1.3 Intelligence & Analytics Agents

| # | Agent Name | Mô tả | Status |
|---|-----------|--------|--------|
| 11 | **Analytics Agent** | Generate analytics insights | CO (estimate) |
| 12 | **Market Intelligence Agent** | Monitor market trends | CO (estimate) |
| 13 | **Competitor Intelligence Agent** | Track competitor activity | CO (estimate) |
| 14 | **Product Intelligence Agent** | Analyze product performance | CO (estimate) |
| 15 | **Revenue Forecast Agent** | Predict revenue trends | CO (estimate) |

### 1.4 Operations Agents

| # | Agent Name | Mô tả | Status |
|---|-----------|--------|--------|
| 16 | **Order Processing Agent** | Manage order workflow | CO (estimate) |
| 17 | **Inventory Agent** | Track stock levels | CO (estimate) |
| 18 | **Fulfillment Agent** | Coordinate delivery | CO (estimate) |
| 19 | **Content Agent** | Generate product descriptions, ads | CO (estimate) |
| 20 | **Campaign Agent** | Plan and execute marketing campaigns | CO (estimate) |

### 1.5 System Agents

| # | Agent Name | Mô tả | Status |
|---|-----------|--------|--------|
| 21 | **Self-Improvement Agent** | Learn from outcomes, optimize other agents | CO — self-improvement.service.ts |

---

## 2. Master Agent Architecture

### 2.1 Master Agent Role

```
Master Agent = Central Orchestrator + KPI Monitor + Decision Router

Responsibilities:
├── Monitor all agent activities
├── Route tasks to appropriate specialized agents
├── Aggregate KPIs từ all agents
├── Detect anomalies và escalate
├── Self-improvement feedback loop
└── Human escalation when needed
```

### 2.2 Master Agent API (CÓ SẴN)

```bash
# Run Master Agent
POST /api/agents/master/run
Body: {
  "task": "generate_daily_report" | "check_kpis" | "optimize_conversion",
  "context": { ... }
}

# Get KPIs
GET /api/agents/master/kpi
Response: {
  "timestamp": "2026-06-11T10:00:00Z",
  "revenue": { "today": 12500000, "mtd": 287000000, "target": 450000000 },
  "leads": { "new": 15, "qualified": 8, "converted": 3 },
  "customers": { "active": 1247, "atRisk": 12, "newToday": 3 },
  "agentPerformance": { ... }
}
```

---

## 3. Orchestration Workflow

### 3.1 Customer Journey Orchestration

```
TRIGGER: New lead arrives
    │
    ▼
[Lead Qualification Agent]
├── Analyze platform, message content, behavior signals
├── Assign lead score (0-100)
├── Set status: new → contacted
└── Route to next agent
    │
    ├── High score (>70) → [Closing Agent]
    │                       ├── Send personalized offer
    │                       ├── Monitor response
    │                       └── If positive → create Order
    │
    └── Medium score (40-70) → [AI Chat Agent]
                               ├── Educational conversation
                               ├── FAQ resolution
                               ├── Product showcase
                               └── When ready → [Closing Agent]
```

### 3.2 Order Processing Orchestration

```
TRIGGER: Order created
    │
    ▼
[Order Processing Agent]
├── Validate order details
├── Check inventory
├── Confirm with customer
└── Route to fulfillment
    │
    ▼
[Fulfillment Agent]
├── Assign shipping carrier
├── Generate tracking number
├── Notify customer
└── Monitor delivery
    │
    ▼
[Customer Experience Agent]
├── Post-delivery follow-up
├── Review request
└── Upsell recommendation → [Upsell Agent]
```

### 3.3 Revenue Intelligence Orchestration (Daily)

```
CRON: Daily at 7:00 AM
    │
    ▼
[Analytics Agent]
├── Compute daily revenue metrics
├── Compare vs targets
├── Identify trends
└── Feed to Master Agent
    │
    ▼
[Master Agent]
├── Aggregate all metrics
├── Generate daily briefing
├── Identify urgent actions
└── Dispatch to relevant agents
    │
    ├── Churn detected → [Retention Agent]
    ├── Low conversion → [Sales Agent] review
    ├── New opportunity → [Campaign Agent]
    └── Report to admin → Dashboard + Telegram notification
```

### 3.4 Self-Improvement Loop

```
CRON: Weekly
    │
    ▼
[Self-Improvement Agent]
├── Analyze: Which messages converted best?
├── Analyze: Which agents performed well/poorly?
├── Analyze: What time/day gets best response?
├── Analyze: Which products sell via which channels?
├── Generate: Improvement recommendations
└── Apply: Update Knowledge Brain + agent parameters
```

---

## 4. Agent Communication Protocol

```typescript
// Inter-agent communication structure

interface AgentMessage {
  from: AgentName;
  to: AgentName | 'master' | 'broadcast';
  type: 'task' | 'result' | 'alert' | 'escalation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  payload: {
    taskId: string;
    context: Record<string, any>;
    data: any;
  };
  timestamp: Date;
}

// Example: Qualification Agent notifying Master
{
  from: 'lead-qualification-agent',
  to: 'master',
  type: 'result',
  priority: 'medium',
  payload: {
    taskId: 'qualify-lead-12345',
    context: { leadId: 'lead-uuid', platform: 'telegram' },
    data: {
      score: 85,
      recommendation: 'HIGH_VALUE_PROSPECT',
      routeTo: 'closing-agent'
    }
  }
}
```

---

## 5. Agent Performance Metrics

| Agent | Primary KPI | Secondary KPI | Current Tracking |
|-------|-------------|---------------|-----------------|
| Master Agent | Overall BRS | Agent uptime | CO — /api/agents/master/kpi |
| Sales Agent | Conversion rate | Time-to-close | THIẾU per-agent tracking |
| Lead Qualification | Qualification accuracy | False positive rate | THIẾU |
| AI Chat Agent | Response rate | Resolution rate | THIẾU |
| Retention Agent | Win-back rate | Churn prevention rate | THIẾU |
| Self-Improvement | Score improvement | Iterations per week | THIẾU per-agent metric |

---

## 6. Agent Orchestration API Design

```bash
# Run specific agent
POST /api/agents/:agentName/run
Body: { "task": "...", "context": { ... } }

# Get agent status
GET /api/agents/:agentName/status

# Get agent performance metrics
GET /api/agents/:agentName/metrics?period=7d

# Orchestrate multiple agents in sequence
POST /api/agents/orchestrate
Body: {
  "workflow": "customer-journey",
  "trigger": { "type": "new-lead", "leadId": "..." }
}

# Master control
POST /api/agents/master/run   ← CO
GET /api/agents/master/kpi    ← CO
```

---

## 7. Gap Analysis: Current vs Target Orchestration

```
CURRENT STATE:
├── Master Agent: CO — basic run + KPI endpoints
├── Self-Improvement: CO — service exists
├── AI Chat Agent: CO — handles Telegram conversations
├── Knowledge Brain: CO — FAQ resolution
└── Other 17 agents: CO (likely) but orchestration is MANUAL or MISSING

TARGET STATE:
├── All 21 agents running autonomously
├── Event-driven triggering (not manual)
├── Real-time inter-agent communication
├── Performance metrics per agent
├── A/B testing between agent strategies
├── Automatic fallback when agent fails
└── Human escalation when confidence < threshold
```

---

## 8. Implementation Roadmap

| Phase | Tasks | Timeline |
|-------|-------|----------|
| Phase 1 | Map all 21 agents to actual NestJS controllers | Week 1 |
| Phase 2 | Build event-driven triggers (Lead → Qualify Agent auto) | Week 2-3 |
| Phase 3 | Implement inter-agent message bus (Redis pub/sub) | Week 3-4 |
| Phase 4 | Add per-agent performance tracking | Week 4-5 |
| Phase 5 | Build orchestration workflow engine | Week 5-7 |
| Phase 6 | Self-Improvement Agent fully connected | Week 7-8 |

---

## 9. Agent Dependency Map

```
Master Agent
├── Analytics Agent (feeds KPIs)
├── Self-Improvement Agent (feeds improvements)
│
├── Sales Cluster:
│   ├── Lead Qualification Agent
│   ├── AI Chat Agent
│   └── Closing Agent → Upsell Agent
│
├── Operations Cluster:
│   ├── Order Processing Agent
│   ├── Fulfillment Agent
│   └── Inventory Agent
│
├── Intelligence Cluster:
│   ├── Market Intelligence Agent
│   ├── Competitor Intelligence Agent
│   └── Revenue Forecast Agent
│
└── CX Cluster:
    ├── Customer Support Agent
    ├── FAQ Agent (→ Knowledge Brain)
    ├── Retention Agent
    └── Onboarding Agent
```

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
