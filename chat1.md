
# OMNICHANNEL_INBOX_V2.md

## VERSION
V2 — Nâng cấp từ V1. Thêm message gateway abstraction, channel adapters, unified routing engine, real-time notification, và SLA engine tích hợp.

---

## MISSION

Xây dựng Omnichannel Inbox V2.

Tập trung toàn bộ hội thoại khách hàng từ mọi kênh vào một hub duy nhất.

Cho phép AI (ChatboxV4) và con người cùng xử lý đồng thời.

Tạo Customer Communication Hub thống nhất — một timeline, một hồ sơ, một hành trình.

---

## PRIMARY OBJECTIVE

Biến:

Facebook + Telegram + Zalo + Website Chat + Email + Future Channels
↓
Message Gateway (normalize & route)
↓
One Inbox (unified storage)
↓
One Customer Profile (identity resolution)
↓
One Customer Journey (cross-channel timeline)

thành luồng dữ liệu real-time không mất message.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `ChatboxService` V4 tại `modules/chatbox/`
2. `CrmAgentService` tại `modules/agents/crm/`
3. `SalesAgentService` tại `modules/agents/sales/`
4. `AiMemoryService` tại `modules/ai-memory/`
5. `EventsGateway` tại `modules/gateway/`
6. `TelegramAgentService` tại `modules/agents/telegram/`
7. `CustomersService` tại `modules/customers/`
8. `LeadsService` tại `modules/leads/`
9. `NotificationsService` — new entity `notification.entity.ts` hiện có
10. PostgreSQL qua TypeORM
11. Redis cho queue và pub/sub

---

## STRICT RULES

KHÔNG thay đổi API ChatboxV4 hiện tại.

KHÔNG refactor CrmAgentService.

KHÔNG thay đổi schema customer/lead hiện tại.

KHÔNG phá workflow hiện tại.

Chỉ mở rộng tương thích ngược.

---

## MODULE CẦN TẠO

```
modules/omnichannel/
├── omnichannel.module.ts
├── omnichannel.controller.ts          # REST: inbox management
├── omnichannel.gateway.ts             # WebSocket: real-time inbox
├── omnichannel.service.ts             # Core inbox orchestration
├── message-gateway/
│   ├── message-gateway.service.ts     # Normalize tất cả channels
│   ├── adapters/
│   │   ├── facebook.adapter.ts        # Facebook Messenger webhook
│   │   ├── telegram.adapter.ts        # Telegram Bot webhook
│   │   ├── zalo.adapter.ts            # Zalo OA webhook
│   │   ├── email.adapter.ts           # Email inbound
│   │   ├── website.adapter.ts         # Website chat WebSocket
│   │   └── channel.adapter.interface.ts
├── identity/
│   ├── identity-resolution.service.ts # Ghép customer across channels
├── routing/
│   ├── conversation-router.service.ts # AI vs Human routing
│   ├── agent-assignment.service.ts    # Assign to human agent
├── sla/
│   ├── sla.service.ts                 # SLA tracking và alerts
├── analytics/
│   ├── inbox-analytics.service.ts
└── dto/
    ├── conversation.dto.ts
    ├── message.dto.ts
    └── inbox-filter.dto.ts
```

---

## WEBHOOK ENDPOINTS

```
POST /api/webhooks/messenger          # Facebook Messenger
GET  /api/webhooks/messenger          # Facebook verification
POST /api/webhooks/telegram           # Telegram Bot
POST /api/webhooks/zalo               # Zalo OA
POST /api/webhooks/email              # Email inbound (SendGrid/Mailgun)
```

---

## REST API ENDPOINTS

```
GET    /api/inbox/conversations                 # List conversations (filtered)
GET    /api/inbox/conversations/:id             # Conversation detail
PATCH  /api/inbox/conversations/:id             # Update (assign, tag, close)
DELETE /api/inbox/conversations/:id             # Archive

GET    /api/inbox/conversations/:id/messages    # Message timeline
POST   /api/inbox/conversations/:id/messages    # Human agent sends message
POST   /api/inbox/conversations/:id/notes       # Internal note

GET    /api/inbox/customers/:customerId/timeline # Full cross-channel timeline

POST   /api/inbox/conversations/:id/assign      # Assign to agent
POST   /api/inbox/conversations/:id/escalate    # Manual escalate
POST   /api/inbox/conversations/:id/close       # Close conversation
POST   /api/inbox/conversations/:id/reopen      # Reopen

GET    /api/inbox/analytics                     # Inbox metrics
GET    /api/inbox/dashboard                     # Dashboard
GET    /api/inbox/sla/breaches                  # SLA breach list
```

---

## WEBSOCKET EVENTS

### Server → Client (Inbox Dashboard)

```
inbox:new_conversation    { conversation }
inbox:new_message         { conversationId, message }
inbox:status_changed      { conversationId, status, changedBy }
inbox:assigned            { conversationId, agentId }
inbox:escalation          { conversationId, reason, priority }
inbox:sla_breach          { conversationId, slaType, breachedAt }
inbox:typing              { conversationId, source: 'customer' | 'ai' | 'agent' }
```

### Client → Server (Human Agent)

```
inbox:join                { agentId }
inbox:reply               { conversationId, content, attachments? }
inbox:note                { conversationId, content }
inbox:assign              { conversationId, agentId }
inbox:close               { conversationId }
inbox:typing              { conversationId }
```

---

## CHANNELS

### Facebook Messenger
- Webhook verify token: `FB_VERIFY_TOKEN`
- Page access token: `FB_PAGE_ACCESS_TOKEN`
- Adapter: `FacebookAdapter` → normalize → `MessageGatewayService`
- Gửi reply: Facebook Graph API `v18.0/me/messages`

### Telegram
- Tận dụng `TelegramAgentService` hiện có
- Webhook: `POST /api/webhooks/telegram`
- Adapter: `TelegramAdapter` wrap existing service

### Zalo OA
- Webhook: `POST /api/webhooks/zalo`
- Zalo OA API: access token từ env `ZALO_OA_TOKEN`
- Adapter: `ZaloAdapter`

### Website Chat
- Đã có qua `ChatboxGateway` (WebSocket)
- `WebsiteAdapter` chỉ bridge sang Inbox service

### Email
- Inbound parsing qua SendGrid Inbound Parse
- Adapter: `EmailAdapter`
- Reply via SMTP/SendGrid API

### Future Channels
- Instagram Direct: `InstagramAdapter` (stub)
- WhatsApp Business: `WhatsAppAdapter` (stub)
- TikTok Shop: `TikTokAdapter` (stub)

---

## OMNICHANNEL FLOW

```
Customer sends message (any channel)
↓
ChannelAdapter.normalize(rawMessage) → UnifiedMessage
↓
MessageGatewayService.receive(unifiedMessage)
↓
IdentityResolutionService.resolveCustomer(message) → customerId
↓
ConversationRouterService.route(message, customerId)
  ├── Active conversation? → append to thread
  └── New customer? → create conversation
↓
ChatboxService.process(message, context)     # AI handling
↓
ConversationRouterService.shouldEscalate?
  ├── YES → AgentAssignmentService.assign()
  └── NO  → AI replies via ChannelAdapter.send()
↓
OmnichannelService.storeMessage(message, response)
↓
CrmAgentService.updateConversation(conversationId)
↓
AiMemoryService.update(customerId, message)
↓
EventsGateway.emit('inbox:new_message', payload)   # Real-time dashboard
↓
SlaService.track(conversationId)
```

---

## UNIFIED MESSAGE FORMAT

```typescript
interface UnifiedMessage {
  id: string;                      // UUID generated on receive
  externalId: string;              // ID từ channel gốc
  channelType: ChannelType;
  direction: 'inbound' | 'outbound';
  customerId?: string;
  customerExternalId: string;      // e.g., FB sender ID
  content: string;
  contentType: 'text' | 'image' | 'audio' | 'video' | 'file' | 'sticker';
  attachments?: Attachment[];
  metadata: Record<string, any>;   // channel-specific data
  receivedAt: Date;
  processedAt?: Date;
}
```

---

## UNIFIED CUSTOMER PROFILE

Một customer có thể có nhiều channel identities:

```typescript
interface CustomerIdentity {
  customerId: string;              // internal UUID
  channels: {
    facebook?: string;             // PSID
    telegram?: string;             // chat_id
    zalo?: string;                 // follower_id
    email?: string;
    phone?: string;
    websiteSessionId?: string;
  };
  primaryChannel: ChannelType;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## CUSTOMER IDENTITY RESOLUTION

Ghép customer theo priority:

```
1. Internal Customer ID (từ auth session)
2. Email match → `CustomersService.findByEmail()`
3. Phone match → `CustomersService.findByPhone()`
4. Telegram ID → `customer.telegramId`
5. Facebook PSID → `customer.facebookId`
6. Tạo Lead mới nếu không khớp → `LeadsService.create()`
```

Confidence score: ghép email (0.99), phone (0.95), social ID (0.85).

---

## CONVERSATION THREADING

Một conversation có:

```typescript
interface Conversation {
  id: string;
  customerId: string;
  channelType: ChannelType;
  status: ConversationStatus;
  assignedToAi: boolean;
  assignedToAgentId?: string;
  priority: Priority;
  tags: string[];
  messages: Message[];             // full timeline
  notes: InternalNote[];
  orders: string[];               // orderIds liên quan
  activities: Activity[];
  sla: SlaTracking;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

enum ConversationStatus {
  OPEN       = 'open',
  WAITING    = 'waiting',          # waiting for customer reply
  ESCALATED  = 'escalated',
  RESOLVED   = 'resolved',
  CLOSED     = 'closed',
}
```

---

## INBOX VIEWS

| View            | Filter                                    |
|-----------------|-------------------------------------------|
| All             | all conversations                         |
| Unassigned      | assignedToAgentId IS NULL, NOT ai_only    |
| Mine            | assignedToAgentId = currentAgentId        |
| AI Handling     | assignedToAi = true                       |
| Escalated       | status = 'escalated'                      |
| Waiting         | status = 'waiting'                        |
| Closed          | status = 'closed'                         |
| By Channel      | channelType = X                           |
| By Priority     | priority = P1/P2/P3                       |
| By Segment      | customer.segment = X                      |

---

## AI FIRST MODEL

```
Tin nhắn mới vào
↓
ChatboxService.process()
  → confidence ≥ 0.8: AI trả lời tự động
  → 0.6 ≤ confidence < 0.8: AI trả lời + flag for review
  → confidence < 0.6: Đưa vào Unassigned queue

Sau khi AI trả lời:
  → Log vào conversation timeline
  → Update SLA tracking
  → Notify dashboard real-time
```

---

## HUMAN HANDOFF

```typescript
interface EscalationPayload {
  conversationId: string;
  reason: HandoffReason;
  priority: 'P1' | 'P2' | 'P3';
  aiSummary: string;            // AI tóm tắt conversation cho agent
  suggestedResponse?: string;   // AI gợi ý câu trả lời
  customerProfile: CustomerProfile;
  recentOrders: Order[];
}
```

Notification: `EventsGateway.emit('inbox:escalation', payload)` → push tới human agents online.

---

## AGENT ASSIGNMENT

Thuật toán round-robin với weights:

```
Priority 1: Agent đang available, có skill phù hợp
Priority 2: Agent với load thấp nhất
Priority 3: Agent theo department
Priority 4: Random từ available pool
```

```typescript
interface AgentProfile {
  agentId: string;
  skills: string[];          // ['sales', 'support', 'vip']
  languages: string[];
  maxConcurrentChats: number;
  currentLoad: number;
  status: 'online' | 'busy' | 'away' | 'offline';
}
```

---

## PRIORITY MODEL

| Priority | Condition                           | First Response SLA |
|----------|-------------------------------------|--------------------|
| P1       | VIP customer, complaint, refund     | 5 minutes          |
| P2       | Hot lead, order issue               | 15 minutes         |
| P3       | Normal inquiry                      | 1 hour             |
| P4       | Low engagement                      | 4 hours            |

---

## SLA MANAGEMENT

`SlaService` theo dõi:

```typescript
interface SlaTracking {
  conversationId: string;
  firstResponseTarget: Date;
  firstResponseActual?: Date;
  resolutionTarget: Date;
  resolutionActual?: Date;
  breached: boolean;
  breachType?: 'first_response' | 'resolution';
}
```

Khi SLA sắp breach (15 phút trước):
→ `EventsGateway.emit('inbox:sla_breach', alert)`
→ Auto-escalate to higher priority

---

## ORDER CONTEXT IN CONVERSATION

Khi agent/AI xem conversation, hiển thị tự động:

```
GET /api/customers/:id/context

Response:
{
  recentOrders: Order[],       // 5 đơn gần nhất
  openTickets: Ticket[],
  activePayments: Payment[],
  currentShipments: Shipment[],
  loyaltyLevel: string,
  totalSpent: number,
  lastPurchaseAt: Date,
}
```

---

## AI MEMORY IN INBOX

Hiển thị trong conversation sidebar:

```
📌 Customer Insights (from AI Memory)
- Đã xem: [Áo thun, Quần jeans, Giày Nike]
- Thích: Hàng thương hiệu, sale > 20%
- Cách giao tiếp: Thân thiện, emoji
- Lần trước hỏi: Shipping đến Hà Nội
```

---

## INTERNAL NOTES

```typescript
interface InternalNote {
  id: string;
  conversationId: string;
  authorId: string;
  authorType: 'human' | 'ai' | 'system';
  content: string;
  mentions: string[];            // @agentId
  createdAt: Date;
  visibility: 'team' | 'management' | 'all';
}
```

---

## COLLABORATION

Tính năng:
- `@mention` agent trong note → push notification
- `Transfer` conversation sang agent khác (giữ nguyên history)
- `Follow` conversation để nhận updates
- `Comment` trên note
- `Co-browse` indicator khi nhiều agent xem cùng lúc

---

## ATTACHMENT MANAGEMENT

```typescript
interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'voice';
  url: string;               // S3/CDN URL
  filename: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}
```

Upload tới S3, served via CDN. Max file size: 50MB.

---

## SEARCH ENGINE

Full-text search qua PostgreSQL `tsvector`:

```
GET /api/inbox/search?q=...&filters[channel]=facebook&filters[status]=open

Tìm theo:
- Message content
- Customer name, email, phone
- Order ID
- Product name
- Tags
- Agent name
```

---

## TAGGING SYSTEM

Auto-tags dựa trên intent:

| Intent            | Auto-tag       |
|-------------------|----------------|
| purchase_intent   | hot-lead       |
| complaint         | complaint      |
| refund_request    | refund         |
| order_status      | order          |
| vip customer      | vip            |

Manual tags: Sales team thêm custom tags.

---

## AUTOMATION RULES

```typescript
interface AutomationRule {
  trigger: {
    event: 'new_message' | 'conversation_opened' | 'no_reply' | 'keyword';
    condition: Record<string, any>;
  };
  actions: Array<{
    type: 'assign' | 'tag' | 'prioritize' | 'send_message' | 'escalate' | 'close';
    params: Record<string, any>;
  }>;
  isActive: boolean;
}
```

Examples:
- Keyword "hoàn tiền" → tag 'refund' + P1 + escalate
- No reply 24h → auto-close + send follow-up
- New VIP customer → assign to senior agent

---

## ANALYTICS

```typescript
interface InboxAnalytics {
  period: DateRange;
  totalConversations: number;
  byChannel: { channel: string; count: number; revenue: number }[];
  aiHandledRate: number;          // %
  humanHandledRate: number;
  avgFirstResponseTime: number;   // seconds
  avgResolutionTime: number;      // seconds
  escalationRate: number;
  slaBreachRate: number;
  leadsCapured: number;
  ordersGenerated: number;
  revenueInfluenced: number;
  customerSatisfaction: number;
}
```

---

## SECURITY

- JWT middleware trên tất cả inbox API
- Role-based: `agent`, `supervisor`, `admin`
- Agent chỉ thấy conversations được assign hoặc team của mình
- Audit log mỗi action (assign, reply, close, escalate)
- Customer data masking cho non-authorized roles

---

## DASHBOARD

```typescript
interface InboxDashboard {
  realtime: {
    activeConversations: number;
    waitingConversations: number;
    aiHandling: number;
    humanHandling: number;
    escalated: number;
    onlineAgents: number;
  };
  today: {
    resolved: number;
    leadsCapured: number;
    ordersGenerated: number;
    revenueInfluenced: number;
    avgResponseTime: number;
    slaBreaches: number;
  };
  byChannel: ChannelStat[];
}
```

---

## EXECUTIVE INSIGHTS

```
GET /api/inbox/insights
```

- Kênh nào tạo nhiều khách nhất?
- Kênh nào tạo nhiều doanh thu nhất?
- Kênh nào có response time chậm nhất?
- AI xử lý bao nhiêu % hội thoại?
- Giờ nào trong ngày có nhiều message nhất?

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - MessageGateway + channel adapters (Telegram đã có, Facebook, Website)
  - Identity resolution
  - Conversation threading
  - Real-time WebSocket dashboard

P2 (Week 2):
  - Human handoff flow
  - Agent assignment
  - SLA tracking
  - Internal notes + collaboration

P3 (Week 3):
  - Automation rules engine
  - Full-text search
  - Analytics
  - Zalo + Email adapters
```

---

## SUCCESS CRITERIA

Omnichannel Inbox V2 phải:

* Nhận message từ ≥ 4 kênh (Website, Telegram, Facebook, Zalo)
* Ghép customer identity across channels với accuracy ≥ 95%
* Real-time dashboard với WebSocket ≤ 500ms latency
* SLA tracking với auto-escalation
* Human handoff với AI summary trong ≤ 1 giây
* Zero message loss (queue-backed processing)
* Không phá bất kỳ API hoặc schema nào hiện có

---

## NORTH STAR METRIC

Conversations Unified (1 customer = 1 profile)
×
Channel Coverage (số kênh active)
×
AI Automation Rate (% AI handled)
×
Revenue Influenced Via Inbox

---

# END OF FILE
