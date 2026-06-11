# Risk Detection Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Risk Types

| Risk Category | Specific Risk | Severity | Detection Query |
|--------------|---------------|---------|----------------|
| **Revenue Risk** | Revenue drop > 20% MoM | CRITICAL | revenue_snapshots comparison |
| **Revenue Risk** | AOV declining > 15% | HIGH | AVG(order.total) trend |
| **Revenue Risk** | Conversion rate < 5% | HIGH | orders/leads ratio |
| **Lead Risk** | Lead volume drop > 30% in 24h | CRITICAL | leads.createdAt last 24h |
| **Lead Risk** | Lead quality score < 40 avg | HIGH | AVG(lead.score) |
| **Lead Risk** | All platforms lead drop simultaneously | CRITICAL | GROUP BY platform |
| **Agent Risk** | Agent failure rate > 10% | HIGH | agent_logs failure% |
| **Agent Risk** | Agent cost spike > 2× baseline | HIGH | SUM(agent_logs.cost) |
| **Agent Risk** | Master agent not running > 2h | CRITICAL | agent_logs last_run |
| **Customer Risk** | Churn rate > 8%/month | HIGH | churnRisk calculation |
| **Customer Risk** | VIP customer churning | CRITICAL | tier=vip AND churnRisk>80 |
| **Customer Risk** | At-risk customers > 15% of base | HIGH | COUNT(churnRisk>70)/total |
| **Inventory Risk** | Key product out of stock | HIGH | inventory.quantity = 0 |
| **Inventory Risk** | Inventory value below threshold | MEDIUM | inventory analysis |
| **System Risk** | API latency > 2 seconds avg | HIGH | Infrastructure monitoring |
| **System Risk** | Database connection failures | CRITICAL | DB health check |
| **System Risk** | Qdrant collection unavailable | HIGH | RAG service health |

---

## 2. Detection Thresholds

```
REVENUE ALERTS:
  CRITICAL: Daily revenue < 30% of 7-day avg
  HIGH:     Daily revenue < 60% of 7-day avg
  MEDIUM:   Revenue trend negative for 3 consecutive days
  
LEAD ALERTS:
  CRITICAL: 0 new leads in past 6 hours (during business hours)
  HIGH:     New leads < 50% of daily average
  MEDIUM:   Lead score avg drops below 50
  
AGENT ALERTS:
  CRITICAL: Agent failed 3 consecutive runs
  HIGH:     Agent failure rate > 20% in last 24h
  MEDIUM:   Agent avg duration > 2× baseline
  LOW:      Agent cost exceeds daily budget estimate
  
CUSTOMER ALERTS:
  CRITICAL: VIP customer churnRisk > 85
  HIGH:     10+ customers move to HIGH_RISK in 24h
  MEDIUM:   At-risk segment grows > 20% in 7 days
```

---

## 3. Alert System via WebSocket

```typescript
// Gateway module: apps/api/src/modules/gateway/
// WebSocket server running

// Event structure:
interface RiskAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'REVENUE' | 'LEAD' | 'AGENT' | 'CUSTOMER' | 'SYSTEM';
  title: string;
  description: string;
  affectedEntityId?: string;
  suggestedAction: string;
  timestamp: Date;
}

// Emitted as:
gateway.emit('risk_alert', alert);

// Frontend subscribes to:
socket.on('risk_alert', (alert) => showNotification(alert));
```

**Current status:** Gateway module exists. Risk detection queries not yet wired to WebSocket emission.

---

## 4. Risk Detection Queries (to implement)

```sql
-- Revenue drop detection
SELECT 
  DATE_TRUNC('day', created_at) as day,
  SUM(total) as daily_revenue
FROM orders 
WHERE status != 'cancelled' 
  AND created_at > NOW() - INTERVAL '14 days'
GROUP BY day
ORDER BY day DESC;
-- Compare last 3 days vs prev 7-day avg

-- Lead volume drop
SELECT platform, COUNT(*) as leads_today
FROM leads 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY platform;
-- Compare vs 7-day moving average

-- Agent failure rate
SELECT 
  agent, 
  COUNT(*) as total,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) / COUNT(*), 2) as failure_rate
FROM agent_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent
HAVING failure_rate > 10;

-- VIP churn risk
SELECT id, name, churn_risk, total_spent, 
       MAX(o.created_at) as last_order
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id 
  AND o.status = 'delivered'
WHERE c.tier = 'vip' AND c.churn_risk > 80
GROUP BY c.id;
```

---

## 5. Risk Response Automation

```
CRITICAL RISK → Immediate Actions:
  Revenue drop CRITICAL:
    → Trigger AI Board emergency meeting
    → Generate Business OS priority report
    → Notify human (Telegram notification or email)
    
  VIP churn CRITICAL:
    → CRM Agent immediate analysis for that customer
    → Generate personalized win-back message
    → Flag for human review
    
  Agent cascade failure:
    → Master Agent restart sequence
    → Alert with error logs
    → Fallback: reduce automation scope

HIGH RISK → Scheduled Actions (next 30 min):
  → Log to Knowledge{domain:OPERATIONAL}
  → Include in next Business OS report
  → Include in Daily Report flagging
```

---

## 6. AuditLog Entity

```typescript
// audit-log.entity.ts — existing
AuditLog {
  userId: string
  action: string      // what was done
  entityType: string  // 'customer', 'order', 'agent', etc.
  entityId: string
  oldData: jsonb
  newData: jsonb
  ip: string
  userAgent: string
  createdAt: Date
}
```

All autonomous agent actions should create AuditLog entries for compliance and risk tracing.
