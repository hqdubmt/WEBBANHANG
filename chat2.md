
# LEAD_CAPTURE_ENGINE_V2.md

## VERSION
V2 — Nâng cấp từ V1. Thêm behavioral tracking, real-time scoring pipeline, AI-powered enrichment, multi-source attribution, và event-driven lead routing.

---

## MISSION

Xây dựng Lead Capture Engine V2.

Tự động phát hiện, thu thập, làm giàu, chấm điểm và định tuyến khách hàng tiềm năng từ mọi điểm tiếp xúc.

Không dùng form truyền thống — thu thập thông qua conversation, behavior, và social signals.

---

## PRIMARY OBJECTIVE

Biến:

Visitor (anonymous)
↓
Interaction (tracked behavior)
↓
Lead (identified contact)
↓
Qualified Lead (scored & enriched)
↓
Sales Ready (assigned to Sales Agent)
↓
Customer (converted)

thành pipeline tự động với zero manual intervention.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `ChatboxService` V4 tại `modules/chatbox/`
2. `OmnichannelService` V2 tại `modules/omnichannel/`
3. `CrmAgentService` tại `modules/agents/crm/`
4. `SalesAgentService` tại `modules/agents/sales/`
5. `AiMemoryService` tại `modules/ai-memory/`
6. `EventsGateway` tại `modules/gateway/`
7. `LeadsService` tại `modules/leads/`
8. `CustomersService` tại `modules/customers/`
9. `Lead` entity tại `database/entities/lead.entity.ts`
10. `CustomerSegment` entity tại `database/entities/customer-segment.entity.ts`
11. PostgreSQL qua TypeORM
12. Redis cho real-time scoring cache

---

## STRICT RULES

KHÔNG thay đổi `Lead` entity schema hiện tại (chỉ thêm fields mới).

KHÔNG thay đổi API `LeadsService` hiện tại.

KHÔNG refactor CrmAgentService.

KHÔNG phá workflow hiện tại.

Chỉ mở rộng tương thích ngược.

---

## MODULE CẦN TẠO

```
modules/lead-capture/
├── lead-capture.module.ts
├── lead-capture.controller.ts
├── lead-capture.service.ts              # Core orchestration
├── lead-detection.service.ts           # Phát hiện lead intent
├── lead-enrichment.service.ts          # Làm giàu dữ liệu
├── lead-scoring.service.ts             # Chấm điểm real-time
├── lead-routing.service.ts             # Định tuyến đến agent
├── lead-nurturing.service.ts           # Follow-up sequences
├── lead-attribution.service.ts         # Source attribution
├── behavioral-tracker.service.ts       # Track user behavior
├── dto/
│   ├── create-lead.dto.ts
│   ├── update-lead-score.dto.ts
│   └── lead-filter.dto.ts
└── interfaces/
    ├── lead-signal.interface.ts
    └── scoring-factors.interface.ts
```

---

## REST API ENDPOINTS

```
POST   /api/leads/track                  # Track behavior event
POST   /api/leads/capture                # Manual lead capture
GET    /api/leads                        # List leads (filtered)
GET    /api/leads/:id                    # Lead detail với score breakdown
PATCH  /api/leads/:id                    # Update lead
POST   /api/leads/:id/qualify            # Mark as qualified
POST   /api/leads/:id/assign             # Assign to sales agent
POST   /api/leads/:id/convert            # Convert to customer

GET    /api/leads/analytics              # Lead analytics
GET    /api/leads/dashboard              # Lead dashboard
GET    /api/leads/attribution            # Attribution report

POST   /api/leads/nurture/:id/enroll    # Enroll in nurture sequence
POST   /api/leads/nurture/:id/unenroll  # Unenroll from sequence
```

---

## WEBSOCKET EVENTS

### Server → Client

```
leads:new_lead            { lead }                 # Khi lead mới được tạo
leads:score_updated       { leadId, score, delta } # Khi score thay đổi
leads:qualified           { leadId, score }        # Khi vượt threshold
leads:assigned            { leadId, agentId }      # Khi assign cho sales
leads:converted           { leadId, customerId }   # Khi chuyển thành customer
leads:alert               { leadId, type, message }# Hot lead alert
```

---

## LEAD SOURCES

### Website
```
/api/leads/track với event:
  - page_view: { url, duration, scrollDepth }
  - product_view: { productId, duration }
  - add_to_cart: { productId, quantity }
  - checkout_initiated: { cartValue }
  - chatbox_opened: { pageUrl }
```

### Facebook
- Webhook từ `OmnichannelService.FacebookAdapter`
- Comment trên post → detect intent → capture lead
- Lead Form submit → direct capture

### Telegram
- `TelegramAgentService` sends lead events
- Bot conversation → `ChatboxService` → lead capture

### Zalo OA
- OA webhook → `ZaloAdapter` → detect lead

### Email
- Inbound email → parse contact info
- Newsletter signup → form submission

### Future Sources
- TikTok comment tracking (stub)
- Instagram DM (stub)

---

## LEAD CAPTURE FLOW

```
Visitor interaction (any touchpoint)
↓
BehavioralTracker.track(event)            # Lưu raw events
↓
LeadDetectionService.analyze(events)      # Intent analysis với Claude
↓
Signal detected?
  ├── YES → LeadCaptureService.capture()
  └── NO  → Continue tracking

LeadCaptureService.capture()
↓
IdentityResolutionService.resolve()       # Từ OmnichannelService
↓
Lead exists? → Update | New → Create
↓
LeadEnrichmentService.enrich(lead)        # Thêm segment, source, interest
↓
LeadScoringService.score(lead)           # Tính điểm real-time
↓
LeadAttributionService.attribute(lead)   # Ghi nhận source
↓
LeadsService.createOrUpdate(leadData)    # Lưu vào DB
↓
CrmAgentService.syncLead(leadId)        # CRM sync
↓
LeadRoutingService.route(lead)          # Định tuyến
↓
AiMemoryService.update(leadId, context) # Memory update
↓
EventsGateway.emit('leads:new_lead', lead)
```

---

## LEAD DETECTION SIGNALS

```typescript
interface LeadSignal {
  type: SignalType;
  strength: 'weak' | 'medium' | 'strong' | 'critical';
  source: string;
  data: Record<string, any>;
  detectedAt: Date;
}

enum SignalType {
  // Conversational signals (từ ChatboxService)
  ASKED_PRICE        = 'asked_price',
  ASKED_STOCK        = 'asked_stock',
  REQUESTED_QUOTE    = 'requested_quote',
  WANTS_TO_BUY       = 'wants_to_buy',
  ASKED_SHIPPING     = 'asked_shipping',

  // Behavioral signals (từ BehavioralTracker)
  PRODUCT_VIEW_3X    = 'product_view_3x',    # Xem sản phẩm ≥ 3 lần
  CHECKOUT_ABANDONED = 'checkout_abandoned',
  CART_ADDED         = 'cart_added',
  COMPARISON_PAGE    = 'comparison_page',
  RETURN_VISITOR     = 'return_visitor',      # Quay lại ≥ 2 lần

  // Contact signals
  PROVIDED_PHONE     = 'provided_phone',
  PROVIDED_EMAIL     = 'provided_email',
  REQUESTED_CALLBACK = 'requested_callback',

  // Campaign signals
  AD_CLICK           = 'ad_click',
  EMAIL_OPENED       = 'email_opened',
  PROMO_CLICKED      = 'promo_clicked',
}
```

---

## LEAD INFORMATION SCHEMA

Thêm vào `Lead` entity (backwards compatible):

```typescript
// Fields mới cần thêm vào lead.entity.ts
{
  // Contact info
  name: string;
  phone: string;
  email: string;
  telegramId?: string;
  facebookId?: string;

  // Enrichment
  location?: string;
  company?: string;
  jobTitle?: string;

  // Behavioral data
  visitedPages: string[];
  viewedProducts: string[];        # productIds
  chatHistory: string[];           # sessionIds
  trafficSource?: string;          # utm_source
  campaignId?: string;             # utm_campaign

  // Scoring
  score: number;                   # 0-100
  scoreBreakdown: ScoreBreakdown;
  classification: LeadClass;       # cold/warm/hot/sales_ready/vip

  // Attribution
  firstTouchSource: string;
  lastTouchSource: string;
  touchPoints: TouchPoint[];

  // Routing
  assignedAgentId?: string;
  assignedAt?: Date;
  routingStatus: RoutingStatus;
}
```

---

## BEHAVIORAL TRACKING

`BehavioralTracker` lưu vào Redis (hot) + PostgreSQL (cold):

```typescript
interface BehaviorEvent {
  sessionId: string;
  visitorId: string;          # fingerprint
  customerId?: string;
  eventType: string;
  eventData: Record<string, any>;
  url?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}
```

Redis key: `behavior:{sessionId}` với TTL 7 ngày.

---

## LEAD VALIDATION

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalized: {
    phone?: string;        # E.164 format: +84987654321
    email?: string;        # lowercase, trim
  };
  isDuplicate: boolean;
  existingLeadId?: string;
}
```

Validators:
- Phone: regex `/^(\+84|0)[0-9]{9}$/`
- Email: RFC 5322 format
- Spam detection: disposable email providers blacklist
- Duplicate: check by phone OR email OR telegram_id

---

## LEAD ENRICHMENT

```typescript
// LeadEnrichmentService.enrich()
async enrich(lead: Lead): Promise<EnrichedLead> {
  // 1. Segment khách từ CustomerSegmentService
  const segment = await segmentService.classify(lead);

  // 2. Interest categories từ viewed products
  const interests = await productService.extractCategories(lead.viewedProducts);

  // 3. Traffic source từ UTM params
  const attribution = leadAttributionService.parse(lead.metadata);

  // 4. Preferred products từ behavior
  const preferred = await behaviorTracker.getTopProducts(lead.visitorId);

  return { ...lead, segment, interests, attribution, preferredProducts: preferred };
}
```

---

## LEAD SCORING MODEL V2

### Scoring Factors (tổng 100 điểm)

```typescript
interface ScoringFactors {
  // Engagement (30 điểm)
  messageCount: number;         // +1 per message, max 10
  sessionCount: number;         // +5 per session, max 15
  pageViews: number;            // +1 per page, max 5

  // Intent (40 điểm)
  askedPrice: boolean;          // +10
  askedStock: boolean;          // +15
  requestedQuote: boolean;      // +20
  wantsToBuy: boolean;          // +25 (override, max this category)
  addedToCart: boolean;         // +20
  abandonedCheckout: boolean;   // +25

  // Contact (30 điểm)
  providedPhone: boolean;       // +15
  providedEmail: boolean;       // +10
  providedTelegram: boolean;    // +5
  requestedCallback: boolean;   // +20 (override)

  // Behavior Bonus
  returnVisitor: boolean;       // +5
  viewedProduct3x: boolean;     // +8
  viewedHighValueProduct: boolean; // +10 (price > threshold)
}
```

### Score Thresholds

| Score   | Classification | Action                              |
|---------|----------------|-------------------------------------|
| 0-20    | Cold           | Nurture sequence only               |
| 21-40   | Warm           | Email follow-up                     |
| 41-60   | Hot            | Chatbox proactive engagement        |
| 61-80   | Sales Ready    | Assign to Sales Agent               |
| 81-100  | VIP Lead       | Immediate senior agent assignment   |

---

## LEAD CLASSIFICATION

```typescript
enum LeadClassification {
  COLD        = 'cold',
  WARM        = 'warm',
  HOT         = 'hot',
  SALES_READY = 'sales_ready',
  VIP         = 'vip',
}
```

VIP criteria: score ≥ 81 OR `customer.segment = 'vip'` OR order history > threshold.

---

## LEAD ROUTING

```typescript
// LeadRoutingService.route()
async route(lead: Lead): Promise<void> {
  switch (lead.classification) {
    case 'vip':
    case 'sales_ready':
      // Assign to Sales Agent immediately
      await salesAgent.assignLead(lead.id);
      await eventGateway.emit('leads:qualified', { leadId: lead.id, score: lead.score });
      break;

    case 'hot':
      // Trigger proactive chatbox engagement
      await chatboxService.initiateProactiveChat(lead);
      break;

    case 'warm':
      // Enroll in email nurture sequence
      await leadNurturing.enroll(lead.id, 'warm_sequence');
      break;

    case 'cold':
      // Add to passive nurture
      await leadNurturing.enroll(lead.id, 'cold_sequence');
      break;
  }
}
```

---

## SALES READINESS ENGINE

```typescript
interface SalesReadinessResult {
  isReady: boolean;
  readinessScore: number;      # 0-100
  blockers: string[];          # Lý do chưa sẵn sàng
  nextAction: string;          # AI đề xuất bước tiếp theo
  estimatedConversionProbability: number;  # 0.0-1.0
}
```

Dùng Claude claude-haiku-4-5-20251001 để đánh giá dựa trên:
- Conversation history
- Behavior data
- Lead score
- Similar customer patterns

---

## LEAD NURTURING

### Sequences

```typescript
interface NurtureSequence {
  id: string;
  name: string;
  targetClassification: LeadClassification;
  steps: NurtureStep[];
  enrollmentCriteria: Record<string, any>;
}

interface NurtureStep {
  order: number;
  delayHours: number;
  channel: 'email' | 'telegram' | 'chatbox';
  templateId: string;
  condition?: Record<string, any>;  # Điều kiện thực thi bước này
}
```

### Built-in Sequences

1. **warm_sequence**: Email D+1, D+3, D+7 — product info + social proof
2. **cold_sequence**: Email D+3, D+14 — educational content
3. **abandoned_cart**: Telegram/Email D+1h, D+24h — cart reminder + discount
4. **hot_lead_fast**: Chatbox ngay + call-to-action mạnh

---

## AI MEMORY INTEGRATION

`AiMemoryService` namespace `lead:{leadId}`:

```typescript
{
  conversationHistory: Message[],    # last 20 interactions
  interests: string[],               # product categories
  painPoints: string[],              # extracted từ conversation
  objections: string[],              # "đắt quá", "chưa cần"
  preferredPayment: string,
  preferredShipping: string,
  bestContactTime?: string,
  languageStyle: 'formal' | 'casual',
  leadJourney: JourneyEvent[],
}
```

---

## CRM INTEGRATION

Sau mỗi lead event:

```typescript
await crmAgent.createOrUpdateLead({
  leadId,
  contactInfo: { name, phone, email, telegram },
  score,
  classification,
  source,
  activities: newActivities,
  tags: autoTags,
  assignedAgentId,
});
```

CRM auto-tags: `hot-lead`, `abandoned-cart`, `price-inquiry`, `return-visitor`.

---

## DUPLICATE DETECTION

Priority ghép:

```
1. phone (exact match, normalized)    → confidence 0.99
2. email (exact match, lowercase)     → confidence 0.98
3. telegramId                         → confidence 0.97
4. facebookId                         → confidence 0.97
5. name + phone partial               → confidence 0.80
6. name + email                       → confidence 0.75
```

Khi phát hiện duplicate: merge và giữ lead có score cao hơn.

---

## ATTRIBUTION MODEL

```typescript
interface Attribution {
  model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  touchPoints: TouchPoint[];
  creditsDistribution: { source: string; credit: number }[];
}

interface TouchPoint {
  source: string;           # utm_source
  medium: string;           # utm_medium
  campaign: string;         # utm_campaign
  channel: ChannelType;
  timestamp: Date;
  action: string;           # 'page_view', 'message', 'click'
}
```

Default model: `last_touch`. Configurable per campaign.

---

## REALTIME EVENTS (EventsGateway)

```typescript
// Phát sau mỗi lead state change
EventsGateway.emit('leads:new_lead', { lead, source });
EventsGateway.emit('leads:score_updated', { leadId, oldScore, newScore, delta });
EventsGateway.emit('leads:qualified', { leadId, score, assignedTo });
EventsGateway.emit('leads:assigned', { leadId, agentId });
EventsGateway.emit('leads:converted', { leadId, customerId, orderId });
EventsGateway.emit('leads:nurtured', { leadId, step, channel });
```

---

## DASHBOARD

```typescript
interface LeadDashboard {
  today: {
    newLeads: number;
    qualifiedLeads: number;
    hotLeads: number;
    converted: number;
    conversionRate: number;
  };
  funnel: {
    cold: number;
    warm: number;
    hot: number;
    salesReady: number;
    vip: number;
  };
  bySource: { source: string; count: number; conversionRate: number }[];
  avgLeadScore: number;
  avgTimeToQualify: number;      # seconds
  avgTimeToConvert: number;      # seconds
}
```

---

## ANALYTICS

```typescript
interface LeadAnalytics {
  period: DateRange;
  leadVolume: number;
  leadQuality: number;             # avg score
  qualificationRate: number;       # hot + sales_ready / total
  conversionRate: number;          # converted / qualified
  revenuePerLead: number;
  costPerLead: number;
  bySource: SourcePerformance[];
  byChannel: ChannelPerformance[];
  topNurtureSequences: NurturePerformance[];
}
```

---

## EXECUTIVE INSIGHTS

```
GET /api/leads/insights
```

- Nguồn lead nào tốt nhất? (highest conversion rate)
- Nguồn lead nào tạo doanh thu cao nhất? (revenue attribution)
- Tỷ lệ chuyển đổi theo từng kênh?
- Thời gian trung bình từ lead đến customer?
- Sequence nurture nào hiệu quả nhất?
- Sản phẩm nào tạo nhiều qualified lead nhất?

---

## SECURITY

- Rate limiting: max 100 track events/IP/minute
- Bot detection cho behavioral tracking
- PII masking trong logs
- GDPR-compliant: consent tracking, right to deletion
- Audit log mọi lead data access

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - Lead entity schema extension
  - BehavioralTracker (Redis-backed)
  - LeadDetectionService (intent signals)
  - Basic lead scoring (rule-based)
  - CRM sync

P2 (Week 2):
  - AI-powered enrichment (Claude)
  - Advanced scoring model
  - Lead routing engine
  - Real-time WebSocket events

P3 (Week 3):
  - Nurture sequences
  - Attribution model
  - Analytics dashboard
  - Duplicate detection refinement
```

---

## SUCCESS CRITERIA

Lead Capture Engine V2 phải:

* Tự động phát hiện lead từ conversation với accuracy ≥ 85%
* Chấm điểm real-time trong ≤ 100ms
* Zero false duplicate merges
* Qualify lead trong ≤ 5 phút từ first contact
* Nurture sequence deliver rate ≥ 95%
* Tích hợp CRM, AI Memory, Chatbox không có duplicate logic
* Attribution accurate với multi-touch support
* Không phá bất kỳ API hoặc schema nào hiện có

---

## NORTH STAR METRIC

Qualified Leads Per Day
×
Lead-to-Customer Conversion Rate
×
Revenue Per Qualified Lead
×
Lead Response Time (< 5 minutes = 1.0x multiplier)

---

# END OF FILE
