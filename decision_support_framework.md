# Decision Support Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Decision Modes

### Mode 1: Advisory
```
AI presents analysis + options, human decides.
Used for: Strategic pivots, large budget allocations, new market entry
Human approval: REQUIRED
AI role: Research + Recommendation + Risk assessment
```

### Mode 2: Assisted
```
AI executes with human confirmation.
Used for: Campaign launches, pricing changes > 20%, new agent configs
Human approval: REQUIRED per action
AI role: Prepare + execute after approval
```

### Mode 3: Autonomous
```
AI decides and acts independently within policy bounds.
Used for: Content generation, lead scoring, churnRisk updates, daily reports
Human approval: NOT REQUIRED (post-action logging)
Autonomy policy: defined per agent in AgentConfig
```

---

## 2. AiDecision Entity

```typescript
// apps/api/src/database/entities/ai-decision.entity.ts
AiDecision {
  agentName: AgentName      // which agent made decision
  decisionType: string      // "price_change", "content_publish", etc.
  description: text
  input: jsonb              // data used to make decision
  decision: jsonb           // what was decided
  confidence: decimal(5,2)  // 0–100
  outcome: PENDING → SUCCESS | FAILURE | SKIPPED
  outcomeData: jsonb        // actual results after execution
  relatedEntityType: string // 'product', 'customer', 'content', etc.
  relatedEntityId: string
  agentLogId: string        // linked AgentLog run
}
```

---

## 3. Decision Templates

### Template: SCALE
```
Trigger: Revenue growing > 20% MoM consistently × 3 months
Context needed:
  - Current revenue trend (3-month)
  - Capacity constraints
  - Profit margins at current scale
  - Capital requirements

Decision options:
  A. Scale content production (×2 content agent runs/day)
  B. Scale lead generation (increase ad budget, add channels)
  C. Scale fulfillment (add suppliers, expand inventory)
  D. Scale all simultaneously (high risk, high reward)

AI recommendation format:
  Option: [A/B/C/D]
  Confidence: [%]
  Expected revenue impact: [+X%]
  Risk: [LOW/MEDIUM/HIGH]
  Required approval: [Advisory/Assisted]
```

### Template: OPTIMIZE
```
Trigger: Revenue plateau (< 5% growth × 2 months) OR margin compression
Context needed:
  - Product margin breakdown
  - Channel performance comparison
  - Customer acquisition cost by channel
  - Agent cost analysis

Decision options:
  A. Pause lowest-performing products
  B. Reallocate budget to highest-ROI channel
  C. Improve conversion rates (A/B tests)
  D. Reduce AI costs (optimize prompts, cache responses)

Confidence + Impact + Risk matrix:
  Option  Confidence  Revenue Impact  Risk  Action Mode
  A       85%         +5% margin      LOW   Autonomous
  B       70%         +8% revenue     MED   Assisted
  C       60%         +12% rev long   MED   Advisory
  D       90%         +2% margin      LOW   Autonomous
```

### Template: PAUSE
```
Trigger: Revenue dropping > 15% MoM OR agent failure cascade
Context: What specifically is failing, root cause analysis
Decision: Pause specific agent/campaign/product line
Requires: Advisory mode (significant revenue impact)
```

### Template: STOP
```
Trigger: Revenue dropping > 30% OR existential system issues
Decision: Emergency halt of specific operations
Requires: Human decision (AI provides data only)
```

---

## 4. Confidence Scoring

```
Decision confidence is computed based on:
  - Data quality: how complete is the input data?
  - Historical precedent: has this decision type worked before?
  - Market stability: is market volatile or stable?
  - Model certainty: LLM confidence in its analysis

Confidence → Action mapping:
  ≥ 85%: Autonomous execution (if policy allows)
  70–84%: Assisted (propose + wait for approval)
  50–69%: Advisory (present options, don't recommend specific)
  < 50%: Flag for human — insufficient data
```

---

## 5. Decision Memory (LLM Learns from Outcomes)

```typescript
// decision-memory.entity.ts
DecisionMemory {
  area: DecisionArea  // e.g., PRICING, CONTENT, LEAD_GEN
  decision: text      // what was decided
  context: jsonb      // situation at time of decision
  outcome: DecisionOutcome  // SUCCESS | FAILURE | PARTIAL
  learnings: text     // what the AI learned from this
  shouldRepeat: boolean
}
```

**Usage:** Before making similar decisions, agents query DecisionMemory to avoid repeating past failures and replicate past successes.

---

## 6. Current Status

```
AiDecision entity:    DONE — table exists, AgentName indexed
DecisionMemory entity: DONE — table exists
Decision modes:        PARTIAL — Autonomous mode mostly (all agents auto-run)
Approval workflow:     MISSING — no human approval gate implementation
Confidence tracking:   PARTIAL — confidence field exists in AiDecision
Outcome tracking:      PARTIAL — outcome field exists but not always updated
Decision-to-learning:  MISSING — not automatically fed to LessonLearned
```
