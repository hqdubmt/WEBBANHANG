# CUSTOMER_SUCCESS_ENGINE_V2.md

## VERSION
V2 — Nâng cấp từ V1. Thêm Customer Health Score algorithm, RFM-based segmentation engine, predictive churn model, loyalty point system, automated lifecycle campaigns, và advocacy pipeline.

---

## MISSION

Xây dựng Customer Success Engine V2.

Mục tiêu là tối đa hóa Customer Lifetime Value (LTV) và biến khách hàng thành đại sứ thương hiệu.

Không chỉ giữ khách hàng — phải chủ động phát triển họ qua từng giai đoạn journey.

---

## PRIMARY OBJECTIVE

Biến:

New Customer (first order)
↓
Satisfied Customer (CSAT ≥ 4, post-onboarding)
↓
Repeat Customer (≥ 2 orders, RFM active)
↓
Loyal Customer (loyalty tier Silver+)
↓
VIP Customer (top 10% LTV)
↓
Advocate Customer (NPS ≥ 9, referrals)

thành hành trình tự động với AI-driven interventions tại mỗi stage.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `CrmAgentService` tại `modules/agents/crm/`
2. `ChatboxService` V4 tại `modules/chatbox/`
3. `SupportAgentService` tại `modules/support/`
4. `AiMemoryService` tại `modules/ai-memory/`
5. `EventsGateway` tại `modules/gateway/`
6. `OrdersService` tại `modules/orders/`
7. `Customer` entity tại `database/entities/customer.entity.ts`
8. `CustomerSegment` entity tại `database/entities/customer-segment.entity.ts`
9. `RevenueSnapshot` entity tại `database/entities/revenue-snapshot.entity.ts`
10. `PerformanceScorecard` entity tại `database/entities/performance-scorecard.entity.ts`
11. `AiDecision` entity tại `database/entities/ai-decision.entity.ts`
12. PostgreSQL qua TypeORM
13. Redis cho real-time health scores và segment cache

---

## STRICT RULES

KHÔNG thay đổi `Customer` entity schema hiện tại (chỉ thêm).

KHÔNG refactor `CrmAgentService`.

KHÔNG thay đổi `OrdersService` API.

KHÔNG phá workflow hiện tại.

Chỉ mở rộng tương thích ngược.

---

## MODULE CẦN TẠO

```
modules/customer-success/
├── customer-success.module.ts
├── customer-success.controller.ts
├── customer-success.service.ts              # Core orchestration
├── health/
│   ├── customer-health.service.ts          # Health score calculation
│   └── health-alert.service.ts             # At-risk detection
├── segmentation/
│   ├── rfm.service.ts                       # RFM scoring
│   └── customer-segmentation.service.ts    # Multi-dimensional segment
├── onboarding/
│   ├── onboarding.service.ts               # Post-purchase onboarding
├── engagement/
│   ├── engagement-engine.service.ts        # Tự động gửi content
├── retention/
│   ├── churn-predictor.service.ts          # ML-based churn prediction
│   └── churn-prevention.service.ts         # Retention campaigns
├── loyalty/
│   ├── loyalty.service.ts                  # Points + rewards
│   ├── loyalty-tier.service.ts             # Tier management
│   └── milestone.service.ts               # Milestones + badges
├── upsell/
│   ├── upsell-engine.service.ts            # Personalized upsell
│   └── cross-sell-engine.service.ts        # Cross-sell recommendations
├── feedback/
│   ├── feedback.service.ts                 # NPS + CSAT collection
│   └── review.service.ts                  # Product reviews
├── advocacy/
│   ├── advocacy.service.ts                 # Referral + testimonial
└── dto/
    ├── customer-health.dto.ts
    └── loyalty-action.dto.ts
```

---

## REST API ENDPOINTS

```
GET    /api/customers/:id/health             # Customer health score
GET    /api/customers/:id/journey            # Full customer journey
GET    /api/customers/:id/loyalty            # Loyalty info
GET    /api/customers/:id/recommendations    # Personalized products
POST   /api/customers/:id/loyalty/redeem     # Redeem points

GET    /api/customer-success/segments        # Segment breakdown
GET    /api/customer-success/churn-risk      # At-risk customers
GET    /api/customer-success/analytics       # Success metrics
GET    /api/customer-success/dashboard       # Dashboard

POST   /api/customer-success/campaigns/:id/trigger   # Trigger campaign
POST   /api/customer-success/loyalty/points/award    # Award points (manual)

GET    /api/customer-success/nps/results     # NPS results
GET    /api/customer-success/insights        # Executive insights
```

---

## WEBSOCKET EVENTS

### Server → Client

```
cs:health_changed      { customerId, oldScore, newScore, alert? }
cs:churn_risk_detected { customerId, riskLevel, recommendedAction }
cs:stage_changed       { customerId, oldStage, newStage }
cs:loyalty_updated     { customerId, points, tier, change }
cs:milestone_achieved  { customerId, milestone, reward }
cs:nps_submitted       { customerId, score, category }
```

---

## CUSTOMER SUCCESS FLOW

```
Order Completed
↓
OnboardingService.start(customerId)           # Day 0
↓
[D+1] EngagementEngine.sendProductGuide()
[D+3] FeedbackService.requestCsat()           # Post-purchase CSAT
[D+7] UpsellEngine.sendRecommendations()
[D+30] RetentionEngine.checkActivity()
  ├── Active → EngagementEngine.sendRewards()
  └── Declining → ChurnPredictor.assess()
       ├── Low risk → continue nurture
       └── High risk → ChurnPrevention.trigger()
```

---

## CUSTOMER JOURNEY STAGES

```typescript
enum CustomerStage {
  NEW         = 'new',          # 0 orders, just registered
  FIRST_BUYER = 'first_buyer',  # 1 order < 30 days
  ACTIVE      = 'active',       # 2+ orders in last 90 days
  REPEAT      = 'repeat',       # 3+ orders, regular
  LOYAL       = 'loyal',        # Loyalty Silver+
  VIP         = 'vip',          # Top 10% LTV
  AT_RISK     = 'at_risk',      # Active → no order 60-90 days
  DORMANT     = 'dormant',      # No order 90-180 days
  CHURNED     = 'churned',      # No order > 180 days
  ADVOCATE    = 'advocate',     # NPS ≥ 9, active referrer
}
```

---

## CUSTOMER HEALTH SCORE ALGORITHM

```typescript
interface HealthScore {
  total: number;                  # 0-100
  breakdown: {
    recency: number;              # Max 25 pts
    frequency: number;            # Max 25 pts
    monetary: number;             # Max 20 pts
    engagement: number;           # Max 15 pts
    satisfaction: number;         # Max 10 pts
    retentionProbability: number; # Max 5 pts
  };
  trend: 'improving' | 'stable' | 'declining';
  alertLevel: 'healthy' | 'warning' | 'critical';
}

// Recency (25 pts)
// - < 30 days: 25
// - 30-60 days: 15
// - 60-90 days: 5
// - > 90 days: 0

// Frequency (25 pts)
// - 1 order: 5
// - 2-3 orders: 12
// - 4-7 orders: 20
// - 8+ orders: 25

// Monetary (20 pts)
// Based on percentile vs all customers
// Top 10%: 20, Top 25%: 15, Top 50%: 10, Bottom 50%: 5

// Engagement (15 pts)
// - Chat activity, email opens, product views, support satisfaction

// Satisfaction (10 pts)
// - Based on CSAT + NPS history

// Retention Probability (5 pts)
// - ML model output: 0.8+ → 5pts, 0.5-0.8 → 3pts, < 0.5 → 0pts
```

Recalculate: mỗi 24 giờ (cron) + immediate sau order/CSAT event.

---

## RFM SEGMENTATION

```typescript
interface RfmScore {
  recency: 1 | 2 | 3 | 4 | 5;    # 5 = most recent
  frequency: 1 | 2 | 3 | 4 | 5;  # 5 = most frequent
  monetary: 1 | 2 | 3 | 4 | 5;   # 5 = highest value
}

// RFM Segments map:
const RFM_SEGMENTS = {
  '555': 'Champions',             # Best customers
  '554': 'Loyal Customers',
  '544': 'Potential Loyalists',
  '511': 'New Customers',
  '155': 'At Risk',               # Was best, now declining
  '111': 'Lost Customers',
  // ... thêm mappings
};
```

Cron: Recalculate toàn bộ customers mỗi 7 ngày.

---

## CHURN PREDICTION MODEL

Dùng Claude để phân tích pattern:

```typescript
interface ChurnPrediction {
  probability: number;             # 0.0 - 1.0
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  churnReasons: string[];          # Extracted by AI
  daysUntilChurn: number;          # Estimated
  recommendedAction: string;       # AI recommendation
}

// Input features:
// - daysSinceLastOrder
// - orderFrequencyTrend (increasing/decreasing)
// - avgOrderValueTrend
// - supportTicketCount (recent)
// - csatTrend
// - emailOpenRate
// - chatEngagement
// - competitorMentions (from chat history)
```

Trigger alert khi `probability > 0.6`.

---

## CHURN PREVENTION

Khi phát hiện churn risk:

```typescript
const PREVENTION_PLAYBOOKS = {
  high_value_at_risk: {
    immediate: [
      'assign_success_manager',      # Gán Success Manager
      'send_personalized_vip_offer', # Offer đặc biệt
      'schedule_check_in_call',      # Gọi điện check-in
    ],
    within_24h: ['send_win_back_email'],
  },
  regular_at_risk: {
    immediate: ['send_win_back_offer'],   # Discount personalzied
    within_3days: ['send_product_update', 'chatbox_proactive_reach'],
  },
  dormant: {
    immediate: ['send_we_miss_you_email'],
    within_7days: ['send_best_offers'],
  },
};
```

---

## ONBOARDING ENGINE

Sau order đầu tiên:

```typescript
const ONBOARDING_SEQUENCE = [
  { day: 0, action: 'send_welcome_message', channel: 'chatbox' },
  { day: 1, action: 'send_product_guide', channel: 'email' },
  { day: 2, action: 'send_usage_tips', channel: 'chatbox' },
  { day: 3, action: 'request_csat', channel: 'chatbox' },
  { day: 7, action: 'send_related_products', channel: 'email' },
  { day: 14, action: 'send_loyalty_intro', channel: 'chatbox' },
  { day: 30, action: 'send_review_request', channel: 'email' },
];
```

---

## ENGAGEMENT ENGINE

Content được personalize dựa trên `AiMemoryService`:

```typescript
// EngagementEngineService.generateContent()
async generateContent(customerId: string): Promise<EngagementContent> {
  const memory = await aiMemory.get(customerId);
  const customer = await customersService.findById(customerId);

  // Dùng Claude để tạo content personalized
  const content = await claude.generate({
    systemPrompt: `Bạn là customer success specialist. Tạo tin nhắn personalized.`,
    context: { memory, customer, recentOrders, recommendations },
    task: 'generate_engagement_message',
  });

  return content;
}
```

Types: Tips, Product education, Updates, New arrival alerts, Exclusive member offers.

---

## UPSELL ENGINE

```typescript
// UpsellEngineService.recommend()
// Sử dụng SalesAgentService hiện có
async recommend(customerId: string): Promise<UpsellRecommendation[]> {
  const customer = await customersService.findById(customerId);
  const purchaseHistory = customer.orders;

  // 1. Tier-based upsell
  const higherTierProducts = await salesAgent.getTierUpgrades(purchaseHistory);

  // 2. Bundle suggestions
  const bundles = await salesAgent.suggestBundles(purchaseHistory);

  // 3. Accessory recommendations
  const accessories = await salesAgent.getAccessories(purchaseHistory);

  // 4. Premium alternatives
  const premiums = await salesAgent.getPremiumAlternatives(purchaseHistory);

  return rankByPurchaseProbability([...higherTierProducts, ...bundles, ...accessories, ...premiums]);
}
```

Trigger timing:
- Post-purchase D+7
- Mỗi khi customer chat về sản phẩm đã mua
- Loyalty tier upgrade event

---

## LOYALTY ENGINE

### Loyalty Tiers

```typescript
enum LoyaltyTier {
  BRONZE   = 'bronze',    # 0 - 999 points
  SILVER   = 'silver',    # 1,000 - 4,999 points
  GOLD     = 'gold',      # 5,000 - 19,999 points
  PLATINUM = 'platinum',  # 20,000 - 99,999 points
  DIAMOND  = 'diamond',   # 100,000+ points
}

// Point earning rules:
const EARNING_RULES = {
  order_completed: { rate: 0.01 },         # 1% of order value in points
  review_submitted: { fixed: 100 },
  referral_converted: { fixed: 500 },
  birthday: { fixed: 200 },
  milestone_achieved: { fixed: 300 },
  survey_completed: { fixed: 50 },
};

// Point redemption:
// 100 points = 1,000 VND discount (configurable)
```

### Tier Benefits

| Tier     | Discount | Free Ship | Priority | Exclusive |
|----------|----------|-----------|----------|-----------|
| Bronze   | 0%       | No        | No       | No        |
| Silver   | 2%       | Yes (>300K) | No     | No        |
| Gold     | 5%       | Yes (>200K) | Support | Yes       |
| Platinum | 8%       | Always    | P2       | Yes       |
| Diamond  | 10%      | Always    | P1       | VIP only  |

---

## MILESTONE SYSTEM

```typescript
interface Milestone {
  id: string;
  name: string;
  condition: MilestoneCondition;
  reward: MilestoneReward;
  badgeUrl: string;
  isRepeatable: boolean;
}

// Examples:
const MILESTONES = [
  { id: 'first_order', name: 'Đơn hàng đầu tiên', reward: { points: 100 } },
  { id: 'order_5', name: '5 đơn hàng', reward: { points: 300, tier_bonus: true } },
  { id: 'order_10', name: '10 đơn hàng', reward: { points: 500, discount_code: '10%' } },
  { id: 'vip_1m', name: 'Chi tiêu 1 triệu', reward: { points: 200, badge: 'vip_spender' } },
  { id: 'referral_1', name: 'Giới thiệu đầu tiên', reward: { points: 500 } },
  { id: 'birthday', name: 'Sinh nhật', reward: { points: 200, discount_code: 'BIRTHDAY' } },
];
```

---

## CUSTOMER FEEDBACK ENGINE

### NPS Collection

```typescript
// Gửi NPS sau:
// - 60 ngày từ first order
// - Sau mỗi 90 ngày với active customers
const NPS_CATEGORIES = {
  9-10: 'Promoter',     # Advocate candidate
  7-8:  'Passive',      # Neutral
  0-6:  'Detractor',    # Churn risk
};

// Detractors → immediate follow-up + support ticket
// Promoters → advocacy pipeline trigger
```

### Review Engine

```typescript
// Request review D+3 sau DELIVERED
// Channel: Email + Chatbox
// Review platforms: Website, Shopee, Facebook
// Incentive: 100 points for verified review
```

---

## CUSTOMER ADVOCACY ENGINE

Promoters (NPS 9-10) → advocacy pipeline:

```typescript
const ADVOCACY_STEPS = [
  { step: 1, action: 'send_thank_you_message', day: 0 },
  { step: 2, action: 'invite_referral_program', day: 1 },
  { step: 3, action: 'request_testimonial', day: 7 },
  { step: 4, action: 'invite_case_study', day: 30 },   # For B2B
  { step: 5, action: 'community_invitation', day: 14 },
];
```

Referral program: `LeadCaptureEngine` tracks referral attribution.

---

## CUSTOMER SEGMENTATION (Multi-dimensional)

Kết hợp RFM + Behavior + Value:

```typescript
interface CustomerProfile {
  rfmSegment: string;                    # Champions, Loyal, etc.
  behaviorSegment: string;               # Browser, Buyer, Bargain Hunter
  valueSegment: string;                  # High Value, Mid Value, Low Value
  journeyStage: CustomerStage;
  loyaltyTier: LoyaltyTier;
  churnRisk: number;                     # 0.0 - 1.0
  advocacyScore: number;                 # 0-100
  healthScore: number;                   # 0-100
}
```

---

## CRM INTEGRATION

Sau mỗi customer success event:

```typescript
await crmAgent.updateCustomer({
  customerId,
  journeyStage: newStage,
  healthScore,
  loyaltyTier,
  loyaltyPoints,
  rfmSegment,
  churnRisk,
  ltv: recalculatedLtv,
  lastEngagementAt: new Date(),
});
```

---

## AI MEMORY INTEGRATION

Namespace `success:{customerId}`:

```typescript
{
  preferences: {
    productCategories: string[],
    brands: string[],
    priceRange: { min: number; max: number },
    paymentMethods: string[],
    communicationStyle: string,
    bestContactTime: string,
    language: 'vi' | 'en',
  },
  purchasePatterns: PurchasePattern[],
  interests: string[],
  goals: string[],              # "mua cho con", "tặng bạn gái"
  anniversaries: { type: string; date: string }[],
  contentEngagement: ContentEngagement[],
}
```

---

## ANALYTICS

```typescript
interface CustomerSuccessAnalytics {
  period: DateRange;
  retentionRate: number;             # %
  repeatPurchaseRate: number;        # %
  avgCustomerHealthScore: number;
  avgCsat: number;
  npsScore: number;
  avgLtv: number;
  churnRate: number;
  churnPreventedCount: number;
  loyaltyPointsIssued: number;
  loyaltyPointsRedeemed: number;
  referralsGenerated: number;
  byStage: StageDistribution[];
  topAdvocates: AdvocateMetrics[];
}
```

---

## EXECUTIVE INSIGHTS

```
GET /api/customer-success/insights
```

- Khách hàng nào có giá trị LTV cao nhất?
- Nhóm khách hàng nào có churn risk cao nhất?
- Sản phẩm nào tạo nhiều loyal customer nhất?
- Campaign retention nào hiệu quả nhất?
- NPS trend theo tháng?
- Milestone nào được đạt nhiều nhất?
- Tier upgrade rate theo tháng?

---

## SECURITY

- Customer data access by role: `cs_agent`, `supervisor`, `admin`
- PII fields encrypted at rest
- Loyalty points cannot be manually adjusted without audit trail
- NPS data anonymized for aggregate reporting
- GDPR: opt-out từ engagement campaigns

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - Customer Health Score calculation
  - RFM segmentation (cron job)
  - Stage detection và transitions
  - Churn risk alerting

P2 (Week 2):
  - Loyalty points engine
  - Tier management
  - Onboarding sequence
  - CSAT + NPS collection

P3 (Week 3):
  - Churn prevention playbooks
  - Upsell/cross-sell engine
  - Advocacy pipeline
  - Analytics dashboard
```

---

## SUCCESS CRITERIA

Customer Success Engine V2 phải:

* Churn prediction accuracy ≥ 80% (precision)
* Churn prevention rate ≥ 30% (of at-risk customers saved)
* Retention rate tăng ≥ 15% sau 3 tháng
* LTV tăng ≥ 20% nhờ upsell/loyalty
* Loyalty program enrollment rate ≥ 60%
* NPS collection rate ≥ 40%
* Onboarding completion rate ≥ 85%
* Không phá bất kỳ API hoặc schema nào hiện có

---

## NORTH STAR METRIC

Customer Lifetime Value (Average)
×
Retention Rate (monthly)
×
Repeat Purchase Rate
×
Net Promoter Score (normalized 0-1)

---

# END OF FILE
