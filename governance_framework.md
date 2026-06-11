# Governance Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Human Oversight Requirements

```
OVERSIGHT TIERS:

Tier 1 — NO oversight (fully autonomous):
  - Content generation (text creation)
  - Lead scoring and categorization
  - churnRisk computation
  - Knowledge indexing
  - Report generation (reading/analyzing)
  - Price monitoring (no changes)
  - Demand forecasting (read-only)

Tier 2 — Notification only (act then notify):
  - Content publishing (scheduled window)
  - Lead status updates (new → contacted)
  - Customer tier upgrades (new → regular)
  - Minor price adjustments (≤ ±5%)
  - Follow-up messages to leads

Tier 3 — Post-approval audit (escalation if anomaly):
  - Bulk email campaigns (> 100 recipients)
  - Customer tier DOWNGRADES
  - Coupon generation (>10% discount)
  - Product deactivation
  - Supplier order triggers

Tier 4 — Pre-approval required:
  - Price changes > 10%
  - Campaigns > 1,000 customers
  - New platform API configuration
  - Discount > 20%
  - VIP customer interventions
  - Agent configuration changes

Tier 5 — Human decision only (AI provides data):
  - Business pivots / new market entry
  - Hiring / vendor contracts
  - Order refunds after delivery
  - Legal / compliance matters
  - System architecture changes
```

---

## 2. Audit Logs

```typescript
// audit-log.entity.ts (existing)
AuditLog {
  userId: string        // 'agent:{name}' for AI actions, user.id for humans
  action: string        // standardized action codes
  entityType: string    // 'product' | 'customer' | 'order' | 'content' | ...
  entityId: string
  oldData: jsonb        // state before change
  newData: jsonb        // state after change
  ip: string
  userAgent: string     // 'Agent/crm v3' or browser UA
  createdAt: Date
}
```

### Audit Action Codes
```
content.created        content.published      content.deleted
customer.tier_changed  customer.churnRisk_updated
order.status_changed   order.cancelled        order.refunded
product.price_changed  product.deactivated
lead.status_changed    lead.assigned
campaign.launched      campaign.paused
agent.config_changed   agent.forced_run
coupon.created         coupon.bulk_sent
```

### Audit Query Examples
```sql
-- All AI agent actions today
SELECT * FROM audit_logs 
WHERE user_id LIKE 'agent:%' AND DATE(created_at) = CURRENT_DATE;

-- Price changes by AI
SELECT entity_id, old_data->>'price' as old, new_data->>'price' as new, created_at
FROM audit_logs 
WHERE action = 'product.price_changed' AND user_id LIKE 'agent:%';

-- Customer tier changes
SELECT * FROM audit_logs 
WHERE action = 'customer.tier_changed' ORDER BY created_at DESC LIMIT 100;
```

---

## 3. Approval Rules Per Action Type

```
Decision Entity flow for approval-requiring actions:

  Agent wants to: Execute HIGH-RISK action
        │
        ▼
  PolicyEngine.validate(action, params)
        │
        ├── Tier 1–2: allowed = true, requiresApproval = false
        │   → Execute immediately + log to audit_log
        │
        ├── Tier 3: allowed = true, notifyAfter = true
        │   → Execute + create AuditLog + notify owner
        │
        ├── Tier 4: allowed = false, requiresApproval = true
        │   → Create AiDecision {outcome: PENDING}
        │   → Notify owner via Telegram/Dashboard
        │   → WAIT for approval
        │   → On approval: execute + update AiDecision.outcome = SUCCESS
        │   → On rejection: AiDecision.outcome = SKIPPED
        │
        └── Tier 5: allowed = false, humanOnly = true
            → Log to AiDecision with note "requires human decision"
            → Do nothing autonomous
```

---

## 4. Data Governance

```
Data Classification:
  PUBLIC:      Product catalog, published content, SEO articles
  INTERNAL:    Order data, revenue figures, agent configs
  CONFIDENTIAL:Customer PII (name, phone, email, address)
  RESTRICTED:  Payment data, API credentials, passwords

PII Handling Rules:
  - customer.phone: index exists, masked in logs
  - customer.email: masked in logs
  - Telegram/FB IDs: never logged in error messages
  - No customer PII in Knowledge entity content
  - No customer PII in LLM prompts (use customer.id instead)

Data Retention:
  AgentLog:  90 days (operational)
  AuditLog:  2 years (compliance)
  Orders:    7 years (legal/tax)
  Leads:     1 year (sales ops)
  Knowledge: Until manually archived (expires_at field)
```

---

## 5. Compliance Checklist

```
E-commerce Compliance (Vietnam):
  ✓ Product pricing in VND
  ✓ Order receipts generated
  □ Tax invoice generation (missing)
  □ Consumer protection compliance check

AI/Automation Transparency:
  ✓ AiDecision logged for all agent actions
  ✓ Agent clearly identified in audit logs
  □ Customer notification if AI-generated messages (missing)

Data Privacy (PDPA-like):
  ✓ Customer data stored in own PostgreSQL (not third-party)
  □ Data deletion request handling (missing)
  □ Consent management (missing)

Platform Terms of Service:
  □ TikTok automation: review TikTok TOS compliance
  □ Facebook automation: Meta Graph API rate limits respected?
  □ Zalo OA: within official API usage
```

---

## 6. Governance Gaps

| Area | Status | Risk |
|------|--------|------|
| PolicyEngine service | MISSING | HIGH — agents may violate rules |
| Human approval workflow | MISSING | HIGH — no oversight gate |
| Consistent audit logging | PARTIAL | MEDIUM — incomplete trail |
| PII masking in logs | MISSING | HIGH — compliance risk |
| Data retention policies | DESIGNED, not enforced | MEDIUM |
| Customer consent management | MISSING | HIGH |
