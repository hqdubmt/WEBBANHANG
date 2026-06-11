
# AI_CHATBOX_V4.md

## VERSION
V4 — Nâng cấp từ V3. Thêm WebSocket real-time, multi-agent orchestration, session persistence, và structured tool calling.

---

## MISSION

Xây dựng AI Chatbox V4.

AI Chatbox là điểm tiếp xúc chính giữa khách hàng và AI Social Commerce OS.

Mục tiêu:

* Tự động trả lời khách hàng real-time qua WebSocket
* Tự động tư vấn sản phẩm dựa trên RAG + AI Memory
* Tự động thu lead và cập nhật CRM
* Tự động hỗ trợ bán hàng với tool calling
* Tự động tạo và xác nhận đơn hàng
* Tự động chăm sóc khách hàng sau mua

---

## PRIMARY OBJECTIVE

Biến:

Visitor
↓
Conversation (WebSocket session)
↓
Lead (CRM record)
↓
Customer (Order completed)
↓
Repeat Customer (LTV tăng)

thành một quy trình tự động không cần con người.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `SalesAgentService` tại `modules/agents/sales/`
2. `CrmAgentService` tại `modules/agents/crm/`
3. `KnowledgeBrainService` tại `modules/knowledge-brain/`
4. `RagService` tại `modules/rag/`
5. `AiMemoryService` tại `modules/ai-memory/`
6. `EventsGateway` tại `modules/gateway/`
7. `LeadsService` tại `modules/leads/`
8. `CustomersService` tại `modules/customers/`
9. `OrdersService` tại `modules/orders/`
10. PostgreSQL qua TypeORM
11. Redis qua Cache Manager

---

## STRICT RULES

KHÔNG thay đổi API hiện có.

KHÔNG phá workflow hiện tại.

KHÔNG refactor SalesAgentService.

KHÔNG thay đổi schema hiện tại.

Chỉ mở rộng tương thích ngược (additive only).

---

## MODULE CẦN TẠO

```
modules/chatbox/
├── chatbox.module.ts
├── chatbox.controller.ts          # REST: session management
├── chatbox.gateway.ts             # WebSocket: real-time chat
├── chatbox.service.ts             # Core chat orchestration
├── chatbox-session.service.ts     # Session lifecycle
├── chatbox-intent.service.ts      # Intent detection
├── chatbox-response.service.ts    # Response generation
├── chatbox-action.service.ts      # Action execution (order, lead)
├── chatbox-analytics.service.ts   # Chat metrics
├── dto/
│   ├── send-message.dto.ts
│   ├── chat-session.dto.ts
│   └── chat-response.dto.ts
└── interfaces/
    ├── chat-message.interface.ts
    └── chat-intent.interface.ts
```

---

## WEBSOCKET EVENTS

### Client → Server

```
chatbox:join        { sessionId, customerId?, channelType }
chatbox:message     { sessionId, content, attachments? }
chatbox:typing      { sessionId }
chatbox:leave       { sessionId }
```

### Server → Client

```
chatbox:response    { messageId, content, confidence, actions? }
chatbox:typing      { agentType: 'ai' | 'human' }
chatbox:action      { type, payload }    # order_created, lead_captured
chatbox:handoff     { reason, agentId }
chatbox:session     { sessionId, status }
```

---

## REST API ENDPOINTS

```
POST   /api/chatbox/sessions              # Tạo session mới
GET    /api/chatbox/sessions/:id          # Lấy session info
PATCH  /api/chatbox/sessions/:id          # Cập nhật session
DELETE /api/chatbox/sessions/:id          # Đóng session

POST   /api/chatbox/sessions/:id/messages # Gửi tin nhắn (REST fallback)
GET    /api/chatbox/sessions/:id/messages # Lấy lịch sử

GET    /api/chatbox/analytics             # Chat analytics
GET    /api/chatbox/dashboard             # Dashboard metrics
```

---

## CHATBOX CHANNELS

### Website Chat
- Embed widget JavaScript
- REST + WebSocket

### Facebook Messenger
- Webhook từ `modules/agents/telegram/` pattern
- Webhook URL: `/api/webhooks/messenger`

### Telegram
- Tận dụng `TelegramAgentService` hiện có
- Bot command: `/start`, `/help`, `/order`

### Zalo
- Webhook URL: `/api/webhooks/zalo`
- Zalo OA API integration

### Mobile App Chat
- WebSocket native
- Push notification qua `NotificationsService`

### Embedded Widget
- `<script src="/chatbox-widget.js"></script>`
- Configurable: theme, position, greeting

---

## CHATBOX FLOW

```
Visitor sends message
↓
ChatboxGateway.handleMessage()
↓
ChatboxSessionService.getOrCreate(sessionId)
↓
ChatboxIntentService.detect(message)          # Claude API call
↓
RAG: KnowledgeBrainService.search(query)      # Qdrant lookup
↓
AiMemoryService.getContext(customerId)        # Customer history
↓
ChatboxResponseService.generate(context)      # Claude API call
↓
ChatboxActionService.execute(actions)         # Side effects
↓
CrmAgentService.updateLead(leadData)          # CRM sync
↓
AiMemoryService.update(sessionData)           # Memory update
↓
EventsGateway.emit('chatbox:response', resp)  # Real-time send
```

---

## INTENT DETECTION

Model: Claude claude-haiku-4-5-20251001 (nhanh, rẻ cho phân loại)

```typescript
enum ChatIntent {
  PRODUCT_INQUIRY    = 'product_inquiry',
  PRICE_INQUIRY      = 'price_inquiry',
  INVENTORY_CHECK    = 'inventory_check',
  ORDER_STATUS       = 'order_status',
  SHIPPING_INQUIRY   = 'shipping_inquiry',
  SUPPORT_REQUEST    = 'support_request',
  COMPLAINT          = 'complaint',
  PURCHASE_INTENT    = 'purchase_intent',
  LEAD_CAPTURE       = 'lead_capture',
  GENERAL_FAQ        = 'general_faq',
  HUMAN_REQUEST      = 'human_request',
  GREETING           = 'greeting',
  FAREWELL           = 'farewell',
}
```

Output: `{ intent: ChatIntent, confidence: number, entities: Record<string, any> }`

---

## KNOWLEDGE RETRIEVAL

Thứ tự tra cứu:

1. `ProductsService.findByQuery(entities.product)`
2. `OrdersService.findByCustomer(customerId)` — nếu order_status
3. `KnowledgeBrainService.search(message)` — RAG Qdrant
4. `CouponsService.getActive()` — nếu price_inquiry
5. `LeadsService.getProfile(sessionId)` — context khách

---

## RESPONSE GENERATION

Model: Claude claude-sonnet-4-6 (chính xác, có reasoning)

System prompt phải bao gồm:
- Brand voice và persona
- Product catalog context (từ RAG)
- Customer history (từ AI Memory)
- Current promotions
- Strict: KHÔNG hallucinate thông tin sản phẩm

Response format:
```typescript
interface ChatResponse {
  content: string;
  confidence: number;           // 0.0 - 1.0
  intent: ChatIntent;
  actions: ChatAction[];        // side effects to execute
  suggestedProducts?: Product[];
  followUpQuestions?: string[];
  requiresHandoff: boolean;
}
```

---

## ACTION EXECUTION

```typescript
enum ChatActionType {
  CAPTURE_LEAD     = 'capture_lead',
  CREATE_ORDER     = 'create_order',
  UPDATE_CART      = 'update_cart',
  SCHEDULE_CALLBACK = 'schedule_callback',
  SEND_CATALOG     = 'send_catalog',
  APPLY_COUPON     = 'apply_coupon',
  ESCALATE_HUMAN   = 'escalate_human',
  SEND_INVOICE     = 'send_invoice',
}
```

Mỗi action được xử lý bởi `ChatboxActionService.execute()` với rollback nếu thất bại.

---

## CUSTOMER MEMORY

`AiMemoryService` lưu theo `customerId`:

```typescript
interface CustomerMemory {
  conversationHistory: Message[];     // last 50 messages
  interests: string[];                // product categories
  viewedProducts: string[];           // product IDs
  purchasedProducts: string[];
  preferences: Record<string, any>;   // language, shipping, payment
  behaviorPatterns: BehaviorPattern[];
  leadScore: number;
  lastActiveAt: Date;
}
```

Dùng Redis với TTL 30 ngày.

---

## SESSION MANAGEMENT

```typescript
interface ChatSession {
  id: string;               // UUID
  channelType: ChannelType;
  customerId?: string;      // null nếu là anonymous
  guestId: string;          // fingerprint for anonymous
  status: 'active' | 'waiting' | 'escalated' | 'closed';
  assignedTo?: string;      // agentId nếu escalated
  createdAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, any>;
}
```

Session timeout: 30 phút không hoạt động → tự đóng.

---

## SALES ASSISTANCE

Tích hợp `SalesAgentService`:

```typescript
// Gợi ý sản phẩm dựa trên conversation context
await salesAgent.recommendProducts({ customerId, intent, entities });

// Upsell khi khách đang xem/hỏi sản phẩm
await salesAgent.generateUpsell({ productId, customerId });

// Cross-sell sau khi thêm vào giỏ
await salesAgent.generateCrossSell({ cartItems, customerId });

// Bundle suggestion
await salesAgent.suggestBundle({ productIds });
```

---

## LEAD CAPTURE

Thu thập qua conversational flow (không dùng form):

```
AI: "Để tôi gửi thông tin chi tiết, bạn có thể cho tôi biết số điện thoại?"
Customer: "0987654321"
→ ChatboxActionService.execute({ type: 'capture_lead', phone: '0987654321' })
→ LeadsService.createOrUpdate(leadData)
→ CrmAgentService.syncLead(leadId)
```

Fields thu thập: name, phone, email, telegram, facebook, productInterest.

---

## LEAD SCORING (real-time)

Cập nhật `lead.score` sau mỗi tin nhắn:

```
+10: Hỏi giá cụ thể
+15: Hỏi tồn kho
+20: Yêu cầu báo giá
+25: Muốn mua ngay
+5:  Mỗi tin nhắn tương tác
+30: Cung cấp thông tin liên hệ
```

Khi score ≥ 70 → trigger `SalesAgentService.assignHotLead()`.

---

## ORDER CREATION

```typescript
// Chatbox có thể tạo đơn trực tiếp qua conversation
await chatboxAction.createOrder({
  customerId,
  items: [{ productId, quantity, variantId? }],
  shippingAddress,
  paymentMethod,
  couponCode?,
  source: 'chatbox',
  channelType,
});
```

Sau khi tạo: gửi order confirmation qua chat + email/Telegram.

---

## HUMAN HANDOFF

Ngưỡng confidence: < 0.6 → suggest handoff, < 0.4 → force handoff.

```typescript
interface HandoffPayload {
  sessionId: string;
  reason: HandoffReason;
  priority: 'P1' | 'P2' | 'P3';
  context: ChatSession;
  conversationSummary: string;   // AI tóm tắt cho agent người thật
}

enum HandoffReason {
  LOW_CONFIDENCE    = 'low_confidence',
  CUSTOMER_REQUEST  = 'customer_request',
  VIP_CUSTOMER      = 'vip_customer',
  COMPLAINT         = 'complaint',
  REFUND_REQUEST    = 'refund_request',
  LEGAL_ISSUE       = 'legal_issue',
}
```

Emit: `EventsGateway.emit('inbox:escalation', handoffPayload)`.

---

## CONFIDENCE SYSTEM

```typescript
interface ConfidenceResult {
  score: number;           // 0.0 - 1.0
  sources: string[];       // knowledge sources used
  reasoning: string;       // why this confidence level
  fallback: FallbackStrategy;
}

enum FallbackStrategy {
  RETRY_WITH_MORE_CONTEXT = 'retry',
  HUMAN_HANDOFF           = 'handoff',
  PROVIDE_PARTIAL_ANSWER  = 'partial',
  ASK_CLARIFICATION       = 'clarify',
}
```

---

## MULTI-LANGUAGE SUPPORT

Detect ngôn ngữ từ tin nhắn đầu tiên:
- `vi` Vietnamese (default)
- `en` English
- Auto-detect với confidence threshold

System prompt và response theo ngôn ngữ khách.

---

## PERSONALIZATION ENGINE

Dựa trên `CustomerMemory`:

```typescript
const personalizationContext = {
  customerName: memory.name,
  preferredProducts: memory.viewedProducts.slice(-5),
  purchaseHistory: memory.purchasedProducts,
  segment: customer.segment,          // từ customer entity
  journeyStage: lead.status,          // từ lead entity
  loyaltyLevel: customer.loyaltyLevel,
};
```

Inject vào system prompt của mỗi response.

---

## CRM INTEGRATION

Sau mỗi conversation event:

```typescript
// Sync với CrmAgentService
await crmAgent.updateCustomer({
  customerId,
  conversationId: sessionId,
  intent,
  actions: executedActions,
  leadScore: updatedScore,
  stage: newStage,
});
```

CRM fields được cập nhật: `lastContactAt`, `conversationCount`, `leadScore`, `stage`, `tags`.

---

## ANALYTICS

Metrics được emit qua `EventsGateway` và lưu PostgreSQL:

```typescript
interface ChatAnalytics {
  sessionId: string;
  channelType: ChannelType;
  messageCount: number;
  resolutionStatus: 'resolved' | 'escalated' | 'abandoned';
  intentDetected: ChatIntent[];
  responseTimeMs: number[];        // mỗi turn
  avgConfidence: number;
  leadCaptured: boolean;
  orderCreated: boolean;
  orderValue?: number;
  handoffTriggered: boolean;
  customerSatisfaction?: number;   // 1-5 nếu có feedback
}
```

---

## CHAT QUALITY MODEL

KPIs chính:

| Metric                | Target    |
|-----------------------|-----------|
| Intent Accuracy       | ≥ 90%     |
| Avg Confidence        | ≥ 0.75    |
| First Response Time   | ≤ 2s      |
| Resolution Rate       | ≥ 70%     |
| Lead Capture Rate     | ≥ 30%     |
| Order Conversion      | ≥ 10%     |
| CSAT                  | ≥ 4.2/5   |

---

## SECURITY

- JWT authentication cho registered customers
- Rate limiting: 30 messages/minute/session
- Content filtering: block profanity, PII leakage
- Audit log mỗi message qua `AuditLogService`
- Input sanitization trước khi gửi vào LLM
- HTTPS + WSS only

---

## CHATBOX DASHBOARD

API: `GET /api/chatbox/dashboard`

```typescript
interface ChatboxDashboard {
  activeConversations: number;
  openConversations: number;
  escalatedConversations: number;
  aiHandledRate: number;           // %
  avgResponseTimeMs: number;
  leadsCapuredToday: number;
  ordersGeneratedToday: number;
  revenueInfluencedToday: number;
  customerSatisfactionAvg: number;
  topIntents: { intent: string; count: number }[];
  channelBreakdown: { channel: string; count: number }[];
}
```

---

## AGENT INTEGRATION MAP

| Agent              | Module path                     | Phương thức sử dụng             |
|--------------------|---------------------------------|---------------------------------|
| SalesAgent         | `agents/sales/`                 | recommendProducts, upsell       |
| CrmAgent           | `agents/crm/`                   | updateLead, syncCustomer        |
| KnowledgeAgent     | `knowledge-brain/`              | search, getContext              |
| RagService         | `rag/`                          | query, embed                    |
| AiMemoryService    | `ai-memory/`                    | get, update, clear              |
| TelegramAgent      | `agents/telegram/`              | sendMessage (Telegram channel)  |
| EventsGateway      | `gateway/`                      | emit real-time events           |

---

## EXECUTIVE INSIGHTS

```
GET /api/chatbox/insights
```

Trả lời:
- Khách hỏi gì nhiều nhất? (top intents)
- Sản phẩm nào được hỏi nhiều nhất? (entity extraction)
- Chatbox tạo bao nhiêu lead? (lead_capture actions)
- Chatbox tạo bao nhiêu đơn hàng? (order_created actions)
- Chatbox ảnh hưởng bao nhiêu doanh thu? (order value sum)
- Kênh nào hiệu quả nhất? (channel breakdown)

---

## OUTPUT FILES

1. `chatbox.module.ts` — NestJS module với đầy đủ imports
2. `chatbox.gateway.ts` — WebSocket gateway (extends `EventsGateway`)
3. `chatbox.service.ts` — Core orchestration
4. `chatbox-session.service.ts` — Session management
5. `chatbox-intent.service.ts` — Intent detection với Claude
6. `chatbox-response.service.ts` — Response generation với Claude
7. `chatbox-action.service.ts` — Tool execution
8. `chatbox-analytics.service.ts` — Metrics tracking
9. `chatbox.controller.ts` — REST endpoints

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - WebSocket gateway
  - Session management
  - Intent detection
  - Basic response generation

P2 (Week 2):
  - RAG integration
  - AI Memory
  - Lead capture
  - CRM sync

P3 (Week 3):
  - Order creation via chat
  - Human handoff
  - Multi-channel adapters
  - Analytics dashboard
```

---

## SUCCESS CRITERIA

AI Chatbox V4 phải:

* Trả lời trong ≤ 2 giây (p95)
* Đạt intent accuracy ≥ 90%
* Thu lead qua conversation không dùng form
* Tạo đơn hàng trực tiếp từ chat
* Tích hợp CRM, AI Memory, RAG không có duplicate logic
* Hỗ trợ ≥ 5 kênh (Website, Messenger, Telegram, Zalo, Mobile)
* Không break bất kỳ API hoặc schema nào hiện có
* Chạy production với WebSocket load balancing qua Redis adapter

---

## NORTH STAR METRIC

Conversations Resolved Without Human
×
Leads Captured Per Conversation
×
Orders Generated Via Chat
×
Revenue Influenced Per Month

---

# END OF FILE
