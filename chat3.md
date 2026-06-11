
# SUPPORT_AGENT_V2.md

## VERSION
V2 — Nâng cấp từ V1. Thêm ticket lifecycle engine, AI auto-resolution, knowledge gap detection, SLA với escalation tree, CSAT automation, và proactive support.

---

## MISSION

Xây dựng Support Agent V2.

Tự động xử lý ≥ 80% yêu cầu hỗ trợ mà không cần con người.

Giảm average resolution time từ giờ xuống phút.

Tăng CSAT từ passive support sang proactive experience.

---

## PRIMARY OBJECTIVE

Biến:

Customer Issue
↓
AI Diagnosis (intent + context)
↓
Knowledge Search (RAG + structured data)
↓
AI Resolution (tool calling)
↓
Customer Confirmation
↓
CSAT Collection
↓
Knowledge Update (học từ case mới)

thành pipeline tự động với escalation chỉ khi thực sự cần.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `ChatboxService` V4 tại `modules/chatbox/`
2. `OmnichannelService` V2 tại `modules/omnichannel/`
3. `CrmAgentService` tại `modules/agents/crm/`
4. `KnowledgeBrainService` tại `modules/knowledge-brain/`
5. `AiMemoryService` tại `modules/ai-memory/`
6. `EventsGateway` tại `modules/gateway/`
7. `OrdersService` tại `modules/orders/`
8. `PaymentsService` tại `modules/payments/`
9. `InventoryService` tại `modules/inventory/`
10. `AgentLog` entity tại `database/entities/agent-log.entity.ts`
11. PostgreSQL qua TypeORM
12. Redis cho ticket queue và SLA timers

---

## STRICT RULES

KHÔNG thay đổi `Order` hoặc `Payment` entity schema.

KHÔNG refactor `CrmAgentService`.

KHÔNG thay đổi `KnowledgeBrainService` API.

KHÔNG phá workflow hiện tại.

Chỉ mở rộng tương thích ngược.

---

## MODULE CẦN TẠO

```
modules/support/
├── support.module.ts
├── support.controller.ts
├── support.service.ts                    # Core orchestration
├── ticket/
│   ├── ticket.service.ts                # Ticket lifecycle
│   ├── ticket-classifier.service.ts     # AI categorization
│   └── ticket-resolver.service.ts       # AI auto-resolution
├── knowledge/
│   ├── support-knowledge.service.ts     # Tìm kiếm knowledge cho support
│   └── knowledge-gap.service.ts         # Phát hiện khoảng trống knowledge
├── sla/
│   ├── sla-engine.service.ts            # SLA timer và breach
│   └── escalation-tree.service.ts       # Auto-escalation logic
├── csat/
│   ├── csat.service.ts                  # CSAT collection và analysis
├── proactive/
│   ├── proactive-support.service.ts     # Trigger support trước khi khách hỏi
├── dto/
│   ├── create-ticket.dto.ts
│   ├── update-ticket.dto.ts
│   └── ticket-filter.dto.ts
└── interfaces/
    ├── ticket.interface.ts
    └── resolution.interface.ts
```

---

## REST API ENDPOINTS

```
POST   /api/support/tickets                      # Tạo ticket
GET    /api/support/tickets                      # List tickets
GET    /api/support/tickets/:id                  # Ticket detail
PATCH  /api/support/tickets/:id                  # Update ticket
POST   /api/support/tickets/:id/assign           # Assign to agent
POST   /api/support/tickets/:id/escalate         # Escalate
POST   /api/support/tickets/:id/resolve          # Resolve (AI or human)
POST   /api/support/tickets/:id/close            # Close ticket
POST   /api/support/tickets/:id/reopen           # Reopen

POST   /api/support/tickets/:id/messages         # Add message to ticket
GET    /api/support/tickets/:id/messages         # Ticket messages

POST   /api/support/csat/:ticketId               # Submit CSAT
GET    /api/support/csat/analytics               # CSAT analytics

GET    /api/support/analytics                    # Support metrics
GET    /api/support/dashboard                    # Dashboard
GET    /api/support/knowledge-gaps               # Gaps report

POST   /api/support/faq                          # Search FAQ
```

---

## WEBSOCKET EVENTS

### Server → Client

```
support:ticket_created     { ticket }
support:ticket_updated     { ticketId, changes }
support:message_added      { ticketId, message }
support:escalated          { ticketId, reason, priority }
support:resolved           { ticketId, resolution, satisfactionScore? }
support:sla_warning        { ticketId, slaType, remainingMinutes }
support:sla_breach         { ticketId, slaType }
support:csat_received      { ticketId, score, feedback }
```

---

## SUPPORT CHANNELS

Inherit từ `OmnichannelService`: Website, Facebook, Telegram, Zalo, Email.

Support Agent hoạt động qua `ChatboxService.processIntent(SUPPORT_REQUEST)`.

---

## TICKET ENTITY

```typescript
interface Ticket {
  id: string;                      # UUID
  ticketNumber: string;            # TKT-2024-001234 (human-readable)
  conversationId: string;          # Link tới OmnichannelConversation
  customerId: string;
  orderId?: string;                # Nếu liên quan đến đơn hàng

  // Classification
  type: TicketType;
  category: TicketCategory;
  priority: Priority;
  tags: string[];

  // Status
  status: TicketStatus;
  aiHandled: boolean;
  aiConfidence?: number;

  // Assignment
  assignedToId?: string;
  assignedAt?: Date;
  escalatedTo?: string;
  escalatedAt?: Date;

  // Resolution
  resolution?: string;
  resolutionType: 'ai_auto' | 'human' | 'combined';
  resolvedAt?: Date;

  // SLA
  sla: SlaTracking;

  // CSAT
  csatScore?: number;              # 1-5
  csatFeedback?: string;
  csatSubmittedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

enum TicketStatus {
  OPEN        = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING     = 'waiting',         # Chờ customer reply
  ESCALATED   = 'escalated',
  RESOLVED    = 'resolved',
  CLOSED      = 'closed',
}
```

---

## SUPPORT TYPES & CATEGORIES

```typescript
enum TicketType {
  QUESTION    = 'question',
  PROBLEM     = 'problem',
  REQUEST     = 'request',
  COMPLAINT   = 'complaint',
  FEEDBACK    = 'feedback',
}

enum TicketCategory {
  PRODUCT_QUESTION    = 'product_question',
  ORDER_STATUS        = 'order_status',
  PAYMENT_ISSUE       = 'payment_issue',
  SHIPPING_ISSUE      = 'shipping_issue',
  REFUND_REQUEST      = 'refund_request',
  RETURN_REQUEST      = 'return_request',
  WARRANTY_CLAIM      = 'warranty_claim',
  ACCOUNT_ISSUE       = 'account_issue',
  TECHNICAL_ISSUE     = 'technical_issue',
  COMPLAINT_PRODUCT   = 'complaint_product',
  COMPLAINT_SERVICE   = 'complaint_service',
  GENERAL_FAQ         = 'general_faq',
}
```

---

## SUPPORT FLOW

```
Customer gửi support request
↓
ChatboxService phát hiện intent = SUPPORT_REQUEST
↓
TicketClassifier.classify(message, context)
  → type, category, priority
↓
SupportKnowledge.search(category, message)
  ├── Check structured data: Orders, Payments, Shipping
  └── Check RAG: KnowledgeBrainService.search()
↓
TicketResolver.attemptAutoResolve(ticket, knowledge)
  ├── confidence ≥ 0.85 → AI auto-resolve → close ticket
  ├── 0.65 ≤ confidence < 0.85 → AI answers + flag for review
  └── confidence < 0.65 → Create ticket + queue for human
↓
Customer confirmation: "Vấn đề đã được giải quyết chưa?"
  ├── YES → Close ticket → CSAT collection
  └── NO  → Escalate + create ticket
↓
CrmAgentService.updateSupportHistory(customerId, ticket)
↓
KnowledgeGapService.record(unresolved_query)  # Học từ thất bại
```

---

## INTENT DETECTION (SUPPORT-SPECIFIC)

```typescript
enum SupportIntent {
  CHECK_ORDER_STATUS   = 'check_order_status',
  CHECK_PAYMENT        = 'check_payment',
  CHECK_SHIPMENT       = 'check_shipment',
  REQUEST_REFUND       = 'request_refund',
  REQUEST_RETURN       = 'request_return',
  WARRANTY_CLAIM       = 'warranty_claim',
  REPORT_DAMAGE        = 'report_damage',
  BILLING_ISSUE        = 'billing_issue',
  ACCOUNT_LOCKED       = 'account_locked',
  PRODUCT_DEFECT       = 'product_defect',
  MISSING_ITEM         = 'missing_item',
  WRONG_ITEM           = 'wrong_item',
  LATE_DELIVERY        = 'late_delivery',
  COMPLAINT_STAFF      = 'complaint_staff',
  URGENT_HELP          = 'urgent_help',
}
```

Model: Claude claude-haiku-4-5-20251001 (latency ≤ 300ms).

---

## KNOWLEDGE RETRIEVAL CHAIN

```typescript
// SupportKnowledgeService.search()
async search(ticket: Ticket): Promise<KnowledgeResult[]> {
  const results = [];

  // 1. Structured data lookup (ưu tiên cao nhất)
  if (ticket.category === 'order_status' && ticket.orderId) {
    results.push(await ordersService.getStatus(ticket.orderId));
  }
  if (ticket.category === 'payment_issue') {
    results.push(await paymentsService.getStatus(ticket.orderId));
  }
  if (ticket.category === 'shipping_issue') {
    results.push(await ordersService.getShipmentStatus(ticket.orderId));
  }

  // 2. Customer history
  results.push(await aiMemory.getCustomerContext(ticket.customerId));

  // 3. RAG lookup
  const ragResults = await knowledgeBrain.search(ticket.description, {
    namespace: 'support',
    limit: 5,
    minScore: 0.7,
  });
  results.push(...ragResults);

  return results;
}
```

---

## RAG SUPPORT FLOW

```
Customer question
↓
Embed với text-embedding-3-small (OpenAI) hoặc Jina
↓
Qdrant search (namespace: 'support_articles', 'faq', 'policies')
↓
Top 5 relevant chunks
↓
Claude claude-sonnet-4-6 synthesis với customer context
↓
Answer + confidence score
```

---

## CUSTOMER CONTEXT

Trong mỗi support resolution:

```typescript
interface SupportContext {
  customer: {
    name: string;
    segment: CustomerSegment;
    loyaltyLevel: string;
    totalOrders: number;
    totalSpent: number;
  };
  recentOrders: Order[];           # last 3 orders
  activeShipments: Shipment[];
  pendingPayments: Payment[];
  previousTickets: Ticket[];       # last 5 tickets
  csatHistory: number[];           # previous scores
}
```

---

## AUTOMATED ACTIONS

Support Agent có thể thực thi trực tiếp (không cần human approval):

```typescript
enum AutoResolutionAction {
  // Thông tin (luôn OK)
  PROVIDE_ORDER_STATUS      = 'provide_order_status',
  PROVIDE_TRACKING_NUMBER   = 'provide_tracking_number',
  PROVIDE_PAYMENT_STATUS    = 'provide_payment_status',
  PROVIDE_FAQ_ANSWER        = 'provide_faq_answer',
  PROVIDE_POLICY_INFO       = 'provide_policy_info',

  // Nhẹ (OK với điều kiện)
  RESEND_ORDER_CONFIRMATION  = 'resend_order_confirmation',
  UPDATE_SHIPPING_ADDRESS    = 'update_shipping_address',  # Only if not shipped yet
  APPLY_COUPON_TO_ORDER      = 'apply_coupon',             # If available

  // Cần approval (flag cho human review)
  INITIATE_REFUND           = 'initiate_refund',           # Cần supervisor
  PROCESS_RETURN            = 'process_return',
  ESCALATE_TO_MANAGER       = 'escalate_to_manager',
  ISSUE_STORE_CREDIT        = 'issue_store_credit',
}
```

---

## PRIORITY MODEL

| Priority | Triggers                                         | First Response | Resolution |
|----------|--------------------------------------------------|----------------|------------|
| P1       | Complaint + VIP, legal issue, fraud, missing item | 5 min          | 2 hours    |
| P2       | Refund request, payment failed, VIP customer     | 15 min         | 4 hours    |
| P3       | Order status, shipping question                   | 1 hour         | 24 hours   |
| P4       | FAQ, general question                             | 4 hours        | 72 hours   |

---

## SLA ENGINE

```typescript
// SlaEngineService
interface SlaConfig {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  escalationMinutes: number;      # Escalate if no response
}

// Redis sorted set: sla:{ticketId} với score = deadline timestamp
// Cron job mỗi 1 phút check breaches

// Khi sắp breach (15 phút trước):
await eventGateway.emit('support:sla_warning', { ticketId, remainingMinutes: 15 });

// Khi breach:
await escalationTree.triggerEscalation(ticketId, 'sla_breach');
await eventGateway.emit('support:sla_breach', { ticketId });
```

---

## ESCALATION TREE

```typescript
interface EscalationTree {
  ticketType: TicketType;
  triggers: EscalationTrigger[];
  levels: EscalationLevel[];
}

interface EscalationLevel {
  level: number;
  assignTo: 'support_agent' | 'senior_agent' | 'supervisor' | 'manager';
  notifyChannels: ('slack' | 'email' | 'telegram')[];
  autoActions: string[];
}
```

Escalation triggers:
- SLA breach
- Customer anger keywords detected
- AI confidence < 0.4
- Customer requests human
- Refund > threshold
- Legal/fraud keywords

---

## HUMAN ESCALATION

```typescript
interface EscalationPayload {
  ticketId: string;
  reason: EscalationReason;
  priority: Priority;
  aiAttempts: number;               # Số lần AI đã thử
  aiSummary: string;                # AI tóm tắt vấn đề
  suggestedResolution?: string;     # AI đề xuất (nếu có)
  customerSentiment: 'positive' | 'neutral' | 'frustrated' | 'angry';
  context: SupportContext;
}
```

---

## PROACTIVE SUPPORT

`ProactiveSupportService` phát hiện vấn đề trước khi khách hỏi:

```typescript
// Trigger proactive support khi:
// 1. Đơn hàng chậm giao > SLA threshold
const lateOrders = await ordersService.findLateDeliveries();
for (const order of lateOrders) {
  await proactiveSupport.notify(order.customerId, 'late_delivery', order);
}

// 2. Payment failed
const failedPayments = await paymentsService.findFailed();

// 3. Return window sắp hết
const expiringSoon = await ordersService.findExpiringReturns();

// 4. Product recall hoặc quality issue
```

---

## CSAT ENGINE

Tự động gửi sau khi resolve:

```typescript
// CsatService.request()
// Gửi sau 30 phút khi ticket resolved
// Channel = channel của conversation gốc
const csatMessage = `
Xin chào {name}! Vấn đề của bạn đã được giải quyết.
Hãy đánh giá trải nghiệm hỗ trợ: ⭐⭐⭐⭐⭐ (1-5)
`;

// Khi nhận CSAT:
await crmAgent.updateCustomerSatisfaction(customerId, score);
await aiMemory.update(customerId, { lastCsat: score });

// CSAT < 3 → trigger immediate follow-up
if (score < 3) {
  await proactiveSupport.followUp(customerId, ticketId);
}
```

---

## SUPPORT QUALITY MODEL

```typescript
interface SupportQualityMetrics {
  accuracy: number;              # Correct answers / total
  resolutionQuality: number;     # Customer confirmed resolved %
  responseSpeed: number;         # Avg first response time
  customerSatisfaction: number;  # Avg CSAT
  knowledgeCoverage: number;     # Answered by AI / total questions
  escalationRate: number;        # Escalated / total tickets
  automationRate: number;        # AI resolved / total tickets
  reopenRate: number;            # Reopened / resolved tickets
}
```

---

## KNOWLEDGE GAP DETECTION

```typescript
// KnowledgeGapService
// Khi AI không tìm được answer (confidence < 0.5):
await knowledgeGap.record({
  query: customer_message,
  category: ticket.category,
  attemptedSources: sources_checked,
  timestamp: new Date(),
});

// Weekly report: gaps → đề xuất thêm knowledge base
GET /api/support/knowledge-gaps
→ Top unresolved queries, suggested articles to create
```

---

## CRM INTEGRATION

Sau mỗi ticket event:

```typescript
await crmAgent.updateSupportHistory(customerId, {
  ticketId,
  type: ticket.type,
  category: ticket.category,
  resolved: true,
  resolutionTime: resolutionMinutes,
  csatScore,
  aiHandled: ticket.aiHandled,
});
```

CRM fields: `supportTicketCount`, `avgCsat`, `lastSupportAt`, `issueCategories`.

---

## AI MEMORY INTEGRATION

Namespace `support:{customerId}`:

```typescript
{
  previousIssues: Issue[],         # last 10 tickets
  resolvedIssues: string[],        # categories resolved OK
  unresolvedPatterns: string[],    # recurring issues
  preferences: {
    communicationStyle: string,
    responseLanguage: string,
  },
  sentiment: 'positive' | 'neutral' | 'frustrated',
  escalationHistory: EscalationEvent[],
}
```

---

## ANALYTICS

```typescript
interface SupportAnalytics {
  period: DateRange;
  ticketsCreated: number;
  ticketsResolved: number;
  resolutionRate: number;          # %
  aiResolutionRate: number;        # %
  escalationRate: number;          # %
  avgFirstResponseTime: number;    # seconds
  avgResolutionTime: number;       # seconds
  csatAvg: number;                 # 1-5
  csatResponseRate: number;        # %
  byCategory: CategoryMetrics[];
  byPriority: PriorityMetrics[];
  knowledgeGaps: GapReport[];
}
```

---

## EXECUTIVE INSIGHTS

```
GET /api/support/insights
```

- Khách hàng gặp vấn đề gì nhiều nhất?
- Loại ticket nào có resolution time dài nhất?
- Nguyên nhân escalation phổ biến nhất?
- CSAT thấp nhất ở category nào?
- AI tự xử lý được bao nhiêu %?
- Knowledge gap nào ảnh hưởng nhiều nhất đến CSAT?

---

## SECURITY

- Agent authentication với JWT
- Role-based: `support_agent`, `supervisor`, `admin`
- Ticket data encryption for PII fields
- Audit log mọi resolution action
- Refund action requires 2FA confirmation
- Rate limit: 100 requests/agent/minute

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - Ticket entity và lifecycle
  - TicketClassifier (intent → category + priority)
  - AI auto-resolution (rule-based + LLM)
  - SLA timer với Redis

P2 (Week 2):
  - Escalation tree
  - RAG integration cho support articles
  - Automated actions (order/payment lookup)
  - Human handoff flow

P3 (Week 3):
  - Proactive support
  - CSAT engine
  - Knowledge gap detection
  - Analytics dashboard
```

---

## SUCCESS CRITERIA

Support Agent V2 phải:

* AI auto-resolve ≥ 75% tickets
* First response time ≤ 30 giây (AI)
* CSAT ≥ 4.3/5
* SLA breach rate ≤ 5%
* Knowledge gap detection với weekly report
* Zero wrong refund actions (approval flow)
* Proactive notifications trước khi khách hỏi
* Không phá bất kỳ API hoặc schema nào hiện có

---

## NORTH STAR METRIC

AI Automation Rate (% tickets resolved without human)
×
CSAT Score Average
×
Average Resolution Time (inverse — faster = better)
×
Proactive Issue Prevention Rate

---

# END OF FILE
