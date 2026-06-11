
# AFFILIATE_AUTOMATION_V2.md

## VERSION
V2 — Nâng cấp từ V1. Thêm real-time conversion tracking, multi-touch attribution engine, automated commission pipeline, fraud ML scoring, gamification system, và affiliate performance analytics.

---

## MISSION

Xây dựng Affiliate Automation Engine V2.

Tự động hóa toàn bộ vòng đời affiliate — từ tuyển dụng, tracking, tính hoa hồng, đến thanh toán và phát triển mạng lưới.

Biến affiliate thành kênh phân phối tự vận hành, tăng trưởng theo cấp số nhân.

---

## PRIMARY OBJECTIVE

Biến:

Visitor (referral link)
↓
Lead (tracked, attributed)
↓
Order (commission eligible)
↓
Commission (calculated, approved)
↓
Payout (automated)
↓
Affiliate Growth (tier upgrade, more traffic)

thành flywheel tự động: affiliate thành công → recruit thêm affiliate.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `Affiliate` entity tại `database/entities/affiliate.entity.ts`
2. `AffiliateClick` entity tại `database/entities/affiliate-click.entity.ts`
3. `AffiliateConversion` entity tại `database/entities/affiliate-conversion.entity.ts`
4. `AffiliatePartner` entity tại `database/entities/affiliate-partner.entity.ts`
5. `Commission` entity tại `database/entities/commission.entity.ts`
6. `OrderAutomationEngine` V2 tại `modules/order-automation/`
7. `CrmAgentService` tại `modules/agents/crm/`
8. `SalesAgentService` tại `modules/agents/sales/`
9. `EventsGateway` tại `modules/gateway/`
10. `AuditLog` entity tại `database/entities/audit-log.entity.ts`
11. `AiDecision` entity tại `database/entities/ai-decision.entity.ts`
12. PostgreSQL qua TypeORM với transactions
13. Redis cho click tracking, rate limiting, fraud detection

---

## STRICT RULES

KHÔNG thay đổi `Affiliate`, `Commission`, `AffiliateClick` schema hiện tại (chỉ thêm).

KHÔNG refactor Affiliate Module hiện có.

KHÔNG thay đổi `OrderAutomationEngine` API.

KHÔNG phá workflow hiện tại.

Chỉ mở rộng tương thích ngược.

Mọi commission mutation phải trong PostgreSQL transaction với audit log.

---

## MODULE CẦN TẠO/MỞ RỘNG

```
modules/affiliate-automation/
├── affiliate-automation.module.ts
├── affiliate-automation.controller.ts
├── affiliate-automation.service.ts        # Core orchestration
├── tracking/
│   ├── click-tracker.service.ts          # Real-time click tracking
│   ├── conversion-tracker.service.ts     # Order → commission trigger
│   └── pixel.service.ts                  # Tracking pixel/postback
├── attribution/
│   ├── attribution-engine.service.ts     # Multi-touch attribution
│   └── attribution-model.service.ts     # Model selection logic
├── commission/
│   ├── commission-calculator.service.ts  # Tính hoa hồng
│   ├── commission-approver.service.ts    # Approval workflow
│   └── commission-wallet.service.ts     # Wallet management
├── payout/
│   ├── payout-engine.service.ts          # Automated payout
│   └── payout-reconciler.service.ts     # Khớp số
├── fraud/
│   ├── fraud-scorer.service.ts           # ML fraud scoring
│   └── fraud-rules.service.ts            # Rule-based detection
├── gamification/
│   ├── gamification.service.ts           # Leaderboard + achievements
│   └── milestone-tracker.service.ts
├── recruitment/
│   ├── affiliate-recruiter.service.ts    # Auto-recruit
│   └── onboarding-flow.service.ts       # Affiliate onboarding
├── performance/
│   ├── performance-analyzer.service.ts   # AI performance insights
│   └── retention.service.ts             # Keep affiliates active
└── dto/
    ├── affiliate-application.dto.ts
    ├── create-commission.dto.ts
    └── payout-request.dto.ts
```

---

## REST API ENDPOINTS

```
# Affiliate Registration
POST   /api/affiliates/apply                 # Đăng ký affiliate
GET    /api/affiliates/:id                   # Profile
PATCH  /api/affiliates/:id                   # Update profile
POST   /api/affiliates/:id/activate          # Activate sau approval
POST   /api/affiliates/:id/suspend           # Suspend

# Links & Tracking
GET    /api/affiliates/:id/links             # Referral links
POST   /api/affiliates/:id/links             # Tạo custom link
GET    /api/affiliates/:id/tracking-stats    # Click/conversion stats

# Commission
GET    /api/affiliates/:id/commissions       # Commission history
GET    /api/affiliates/:id/wallet            # Wallet balance
POST   /api/affiliates/:id/payout           # Yêu cầu payout

# Performance
GET    /api/affiliates/:id/performance       # Performance dashboard
GET    /api/affiliates/:id/leaderboard       # Position in leaderboard

# Tracking (public — no auth required)
GET    /api/track/:affiliateCode             # Redirect + track click
POST   /api/track/conversion                 # Server-side conversion (S2S postback)

# Admin
GET    /api/affiliates                       # List all affiliates
PATCH  /api/affiliates/:id/approve          # Approve application
GET    /api/affiliates/commissions/pending   # Pending approvals
POST   /api/affiliates/commissions/:id/approve  # Approve commission
POST   /api/affiliates/commissions/:id/reject   # Reject commission
GET    /api/affiliates/fraud-queue          # Fraud review queue
GET    /api/affiliates/analytics            # Analytics
GET    /api/affiliates/dashboard            # Dashboard
GET    /api/affiliates/payouts              # Payout history
POST   /api/affiliates/payouts/batch        # Batch payout
```

---

## WEBSOCKET EVENTS

### Server → Client (Affiliate Dashboard)

```
affiliate:click_received    { affiliateId, timestamp, source }
affiliate:conversion        { affiliateId, orderId, commission, amount }
affiliate:commission_paid   { affiliateId, commissionId, amount }
affiliate:tier_upgraded     { affiliateId, oldTier, newTier }
affiliate:milestone         { affiliateId, milestone, reward }
affiliate:fraud_detected    { affiliateId, type, action }
affiliate:payout_processed  { affiliateId, amount, method, status }
```

---

## AFFILIATE LIFECYCLE

```typescript
enum AffiliateStatus {
  APPLICANT  = 'applicant',    # Đã đăng ký, chờ review
  PENDING    = 'pending',      # Đang được xem xét
  ACTIVE     = 'active',       # Đang hoạt động
  SUSPENDED  = 'suspended',    # Bị tạm dừng (fraud nghi ngờ)
  BANNED     = 'banned',       # Bị cấm vĩnh viễn
  DORMANT    = 'dormant',      # Không hoạt động > 60 ngày
  PARTNER    = 'partner',      # Strategic partner tier
}
```

---

## AFFILIATE REGISTRATION

### Registration Sources

```typescript
enum RegistrationSource {
  WEBSITE_FORM     = 'website_form',
  LANDING_PAGE     = 'landing_page',
  REFERRAL_INVITE  = 'referral_invite',   # Existing affiliate invited
  MANUAL_INVITE    = 'manual_invite',     # Admin invited
  PARTNER_PROGRAM  = 'partner_program',
  API_INTEGRATION  = 'api_integration',
}
```

### Auto-Approval Criteria

Auto-approve nếu:
- Email verified
- Phone verified
- Social profile verified (Facebook/TikTok followers > 1000)
- No fraud signals

Else → manual review queue.

---

## AFFILIATE ONBOARDING FLOW

```typescript
const ONBOARDING_SEQUENCE = [
  { step: 1, action: 'send_welcome_email', delay: 0 },
  { step: 2, action: 'generate_referral_links', delay: 0 },
  { step: 3, action: 'send_affiliate_guide', delay: '5min' },
  { step: 4, action: 'send_training_materials', delay: '1day' },
  { step: 5, action: 'send_commission_structure', delay: '1day' },
  { step: 6, action: 'setup_tracking_overview', delay: '2days' },
  { step: 7, action: 'send_first_campaign_brief', delay: '3days' },
  { step: 8, action: 'send_check_in', delay: '7days' },
];
```

---

## AFFILIATE PROFILE SCHEMA

Thêm vào `Affiliate` entity (backwards compatible):

```typescript
{
  // Social profiles
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  websiteUrl?: string;

  // Traffic info
  primaryAudience?: string;        # 'fashion', 'tech', 'food'
  estimatedMonthlyReach?: number;
  trafficSources?: string[];       # ['social', 'blog', 'email']

  // Performance
  totalClicks: number;
  totalLeads: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  currentTier: AffiliateTier;
  performanceScore: number;        # 0-100

  // Wallet
  pendingCommission: number;
  approvedCommission: number;
  totalPaid: number;

  // Fraud
  fraudScore: number;              # 0.0 - 1.0
  fraudFlags: string[];
  isFraudReview: boolean;

  // Gamification
  badges: string[];
  achievementPoints: number;
  leaderboardRank?: number;
}
```

---

## TRACKING ENGINE

### Click Tracking

```typescript
// ClickTrackerService
// GET /api/track/:affiliateCode?utm_*=...
async trackClick(affiliateCode: string, request: Request): Promise<void> {
  // 1. Validate affiliate is active
  // 2. Extract: IP, userAgent, referrer, UTM params
  // 3. Fraud pre-check (rate limit, known bad IPs)
  // 4. Redis: increment click counter INCR affiliate:clicks:{affiliateId}:{date}
  // 5. Store to AffiliateClick entity (async, non-blocking)
  // 6. Set cookie: aff={affiliateCode} expire=30days
  // 7. Redirect to destination URL
}
```

Redis click counter: `affiliate:clicks:{affiliateId}:{YYYY-MM-DD}` TTL 90 days.

### Conversion Tracking

Trigger: `OrderAutomationEngine` emits `orders:payment_received` event.

```typescript
// ConversionTrackerService (listens to OrderAutomationEngine events)
@OnEvent('orders.payment_received')
async handleOrderPaid(event: OrderPaidEvent): Promise<void> {
  // 1. Check order for affiliate cookie/code
  const affiliateCode = event.order.metadata?.affiliateCode;
  if (!affiliateCode) return;

  // 2. Attribute to affiliate
  const attribution = await attributionEngine.attribute(event.order);

  // 3. Validate eligibility (not self-referral, not duplicate)
  const isEligible = await fraudScorer.isEligible(attribution);

  // 4. Calculate commission
  const commission = await commissionCalculator.calculate(attribution);

  // 5. Create conversion record
  await conversionRepo.save({ ...attribution, commission });

  // 6. Update affiliate wallet (pending)
  await walletService.addPending(attribution.affiliateId, commission.amount);

  // 7. Notify affiliate real-time
  await eventGateway.emit('affiliate:conversion', { ...commission });
}
```

---

## ATTRIBUTION ENGINE

### Attribution Models

```typescript
enum AttributionModel {
  FIRST_TOUCH  = 'first_touch',    # 100% credit to first click
  LAST_TOUCH   = 'last_touch',     # 100% credit to last click (default)
  LINEAR       = 'linear',         # Equal credit all touchpoints
  TIME_DECAY   = 'time_decay',     # More credit to recent touchpoints
  POSITION     = 'position',       # 40% first, 40% last, 20% middle
  CUSTOM       = 'custom',         # Configurable weights
}
```

### Cookie Window

```
Click cookie: 30 days (configurable per campaign)
View-through: 7 days
Last-click wins within window
```

### Multi-Touch Example

```
D+0: Affiliate A clicks → cookie set (A)
D+5: Affiliate B clicks → cookie overwritten (B, last-touch wins)
D+10: Customer buys → B gets full commission (last-touch)
      But A gets view-through credit if configured (linear model)
```

---

## COMMISSION ENGINE

### Commission Structures

```typescript
interface CommissionStructure {
  type: 'fixed' | 'percentage' | 'tiered' | 'hybrid';
  baseRate: number;              # % of order value
  tierBonuses?: TierBonus[];     # Extra % based on affiliate tier
  productOverrides?: ProductCommission[];  # Custom rate per product
  minimumOrderValue?: number;    # Minimum để earn commission
  cookieWindow: number;          # Days
  holdPeriod: number;            # Days before approving (return window)
}

// Tiered commission example:
const TIERED_RATES = {
  bronze:   0.05,  # 5%
  silver:   0.07,  # 7%
  gold:     0.09,  # 9%
  platinum: 0.11,  # 11%
  diamond:  0.13,  # 13%
};
```

### Commission Calculation

```typescript
// CommissionCalculatorService.calculate()
async calculate(conversion: Conversion): Promise<CommissionResult> {
  const affiliate = await affiliateRepo.findById(conversion.affiliateId);
  const order = await ordersService.findById(conversion.orderId);

  // Base rate from tier
  const baseRate = TIERED_RATES[affiliate.currentTier];

  // Product overrides
  const productRates = await getProductCommissionRates(order.items);

  // Calculate per item
  const itemCommissions = order.items.map(item => {
    const rate = productRates[item.productId] ?? baseRate;
    return item.price * item.quantity * rate;
  });

  const totalCommission = sum(itemCommissions);

  // Bonus commission (campaign/milestone)
  const bonus = await calculateBonus(affiliate.id, totalCommission);

  return {
    baseAmount: totalCommission,
    bonusAmount: bonus,
    totalAmount: totalCommission + bonus,
    rate: baseRate,
    status: 'pending',
    holdUntil: addDays(new Date(), commissionStructure.holdPeriod),
  };
}
```

---

## COMMISSION APPROVAL WORKFLOW

```
Commission created (pending)
↓
Hold period: 7 days (return window)
↓
[Auto-check] Order not cancelled/refunded?
  ├── YES → Commission approved (auto)
  └── Refunded → Commission rejected / pro-rated
↓
[Fraud check] Score < 0.3?
  ├── PASS → Approve to wallet
  └── FAIL → Flag for manual review
↓
Commission → APPROVED → affiliate.wallet.approved += amount
```

Manual review threshold: amount > 5,000,000 VND OR fraud score > 0.5.

---

## COMMISSION WALLET

```typescript
interface AffiliateWallet {
  affiliateId: string;
  pendingBalance: number;      # Not yet approved
  approvedBalance: number;     # Ready for payout
  paidBalance: number;         # Already paid out
  currency: 'VND';
  minimumPayout: number;       # Default: 200,000 VND
  transactions: WalletTransaction[];
}
```

---

## PAYOUT ENGINE

### Payout Methods

```typescript
enum PayoutMethod {
  BANK_TRANSFER  = 'bank_transfer',    # VN bank (Napas)
  MOMO           = 'momo',
  ZALOPAY        = 'zalopay',
  VNPAY          = 'vnpay',
  MANUAL         = 'manual',           # Cash / office pickup
}
```

### Payout Schedule

```typescript
// Automatic batch payout:
// - Weekly (Friday): all affiliates with approved balance ≥ minimum
// - Immediate on request: for Diamond tier affiliates

// PayoutEngineService.processBatch()
@Cron('0 9 * * 5')  // Every Friday 9AM
async weeklyPayout(): Promise<void> {
  const eligible = await affiliateRepo.findEligibleForPayout();
  for (const affiliate of eligible) {
    await this.processPayout(affiliate);
  }
}
```

---

## AFFILIATE TIERS

```typescript
enum AffiliateTier {
  BRONZE   = 'bronze',    # 0 - 499 orders total
  SILVER   = 'silver',    # 500 - 1,999 orders
  GOLD     = 'gold',      # 2,000 - 9,999 orders
  PLATINUM = 'platinum',  # 10,000 - 49,999 orders
  DIAMOND  = 'diamond',   # 50,000+ orders
}

// Tier upgrade trigger: monthly order count review
// PerformanceAnalyzerService.evaluateTiers() — cron monthly
```

---

## PERFORMANCE SCORING

```typescript
interface AffiliatePerformanceScore {
  total: number;             # 0-100
  breakdown: {
    trafficQuality: number;  # Bounce rate, session time (max 20)
    leadQuality: number;     # Lead-to-order rate (max 20)
    conversionRate: number;  # Clicks → orders (max 25)
    revenueGenerated: number; # vs tier average (max 20)
    customerRetention: number; # Referred customers retention (max 10)
    fraudRate: number;       # Inverse — 0 fraud = 5pts (max 5)
  };
  trend: 'improving' | 'stable' | 'declining';
}
```

---

## FRAUD DETECTION ENGINE

### Rule-Based Rules

```typescript
const FRAUD_RULES = [
  // Click fraud
  { name: 'self_referral', check: () => affiliate.customerId === order.customerId },
  { name: 'click_flooding', check: () => clicksPerHour > 500 },  // Bot clicks
  { name: 'ip_concentration', check: () => sameIpClickRate > 0.8 }, // > 80% same IP
  { name: 'click_to_conversion_ms', check: () => elapsed < 3000 }, // < 3 seconds

  // Order fraud
  { name: 'duplicate_order_short', check: () => sameCustomer5Min },
  { name: 'fake_address', check: () => fraudAddressScore > 0.7 },
  { name: 'test_card_pattern', check: () => isTestCardNumber(payment) },
  { name: 'coupon_stacking', check: () => couponsUsed > 2 },
];
```

### ML Fraud Scoring (Claude-assisted)

```typescript
// FraudScorerService.score()
async score(conversion: Conversion): Promise<FraudScore> {
  const features = await extractFeatures(conversion);

  // Rules-based pre-check (fast, blocking)
  const ruleViolations = FRAUD_RULES.filter(r => r.check(features));
  if (ruleViolations.some(r => r.blocking)) {
    return { score: 1.0, action: 'reject', reasons: ruleViolations };
  }

  // AI scoring for borderline cases (0.2-0.7 rule score)
  const aiScore = await aiDecisionService.evaluate('affiliate_fraud', features);

  return {
    score: Math.max(ruleScore, aiScore),
    action: score > 0.7 ? 'review' : 'approve',
    reasons: [...ruleViolations, ...aiReasons],
  };
}
```

Log fraud decisions to `AiDecision` entity.

---

## GAMIFICATION SYSTEM

### Leaderboard

```typescript
// Weekly/Monthly leaderboard
// Metrics: total revenue, total orders, conversion rate

GET /api/affiliates/leaderboard?period=weekly&metric=revenue

// Redis sorted set: leaderboard:{period}:{metric}
// ZADD leaderboard:weekly:revenue {affiliateId} {score}
```

### Achievements & Badges

```typescript
const ACHIEVEMENTS = [
  { id: 'first_conversion', name: 'First Sale', points: 100 },
  { id: 'order_100', name: '100 Orders', points: 500 },
  { id: 'order_1000', name: '1,000 Orders', points: 2000 },
  { id: 'revenue_10m', name: '10M Revenue', points: 1000 },
  { id: 'zero_fraud', name: 'Clean Record (6mo)', points: 300 },
  { id: 'top_10_monthly', name: 'Top 10 Monthly', points: 500 },
  { id: 'recruiter_5', name: 'Recruited 5 Affiliates', points: 750 },
];
```

### Milestone Rewards

```typescript
// Affiliate điền form → auto check milestones
// Khi milestone achieved:
await gamification.awardMilestone(affiliateId, milestone);
await crmAgent.updateAffiliateRecord(affiliateId, { milestone, reward });
await eventGateway.emit('affiliate:milestone', { affiliateId, milestone, reward });
```

---

## AFFILIATE RECRUITMENT

```typescript
// AffiliateRecruiterService
// Tự động identify potential affiliates từ:
// 1. Customers với NPS ≥ 9 (advocates) → invite to affiliate program
// 2. Customers với referral history → invite to formalize
// 3. Influencer detection từ social profiles
// 4. Partner outreach từ KOL database

// When affiliate recruits another affiliate (sub-affiliate):
// Override sub-affiliate commission: +1% bonus to recruiter (configurable)
```

---

## AFFILIATE RETENTION

```typescript
// PerformanceAnalyzerService.detectDormantAffiliates()
@Cron('0 9 * * 1')  // Every Monday
async checkAffiliateHealth(): Promise<void> {
  const dormant = await affiliateRepo.findDormant({ daysSinceLastConversion: 30 });
  for (const affiliate of dormant) {
    await retentionService.trigger(affiliate.id, 'dormant_affiliate');
    // → Send re-engagement email + bonus campaign
    // → Assign success manager for Diamond/Platinum
  }
}
```

---

## AFFILIATE CRM

Lưu vào CRM qua `CrmAgentService`:

```typescript
await crmAgent.updateAffiliateRecord({
  affiliateId,
  performanceScore,
  tier: currentTier,
  totalRevenue,
  conversionRate,
  fraudScore,
  lastActiveAt: new Date(),
  notes: aiGeneratedInsights,
});
```

---

## AI MEMORY INTEGRATION

Namespace `affiliate:{affiliateId}`:

```typescript
{
  performanceTrend: PerformancePoint[],    # Monthly snapshots
  audienceProfile: {
    demographics: string,
    interests: string[],
    geography: string[],
    platform: string[],
  },
  communicationPreferences: {
    preferredChannel: string,
    bestContactTime: string,
    language: string,
  },
  trainingProgress: string[],              # Completed training modules
  campaignHistory: CampaignPerformance[],
}
```

---

## ANALYTICS

```typescript
interface AffiliateAnalytics {
  period: DateRange;
  activeAffiliates: number;
  totalClicks: number;
  totalLeads: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  avgConversionRate: number;
  topAffiliates: AffiliateMetrics[];
  byTrafficSource: SourceMetrics[];
  fraudDetected: FraudMetrics;
  payoutsProcessed: PayoutMetrics;
  roiByAffiliate: RoiMetrics[];
}
```

---

## EXECUTIVE INSIGHTS

```
GET /api/affiliates/insights
```

- Affiliate nào tạo doanh thu cao nhất?
- Nguồn traffic nào có conversion rate tốt nhất?
- Tỷ lệ fraud theo tier và nguồn?
- Chi phí hoa hồng / doanh thu (commission ratio)?
- Affiliate nào có nguy cơ bỏ chương trình?
- Tier distribution có healthy không?
- ROI của affiliate channel vs paid ads?

---

## SECURITY

- Webhook signature cho payout callbacks
- Commission mutation: SERIALIZABLE transaction + audit log
- Refund → auto commission reversal trong transaction
- Fraud review queue với dual approval (amount > 5M VND)
- Rate limiting: 1000 clicks/IP/hour, 10 payout requests/day/affiliate
- PII masking trong analytics exports
- Financial controls: payout limit per day per affiliate (configurable)

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - Click tracking (Redis counter + DB async)
  - Conversion tracking (listen to OrderAutomation events)
  - Basic commission calculation (percentage model)
  - Last-touch attribution

P2 (Week 2):
  - Commission approval workflow
  - Wallet management
  - Fraud detection (rule-based)
  - Payout engine (bank transfer)

P3 (Week 3):
  - Multi-touch attribution
  - Gamification (leaderboard + badges)
  - AI fraud scoring
  - Affiliate recruitment automation
  - Analytics dashboard
```

---

## SUCCESS CRITERIA

Affiliate Automation Engine V2 phải:

* Click tracking latency ≤ 50ms (p99) — không làm chậm redirect
* Zero duplicate commission (idempotency trên orderId + affiliateId)
* Fraud detection block rate ≥ 90% for known patterns
* Commission calculation accuracy 100%
* Payout processing time ≤ 24 giờ sau approval
* Self-referral detection rate 100%
* Affiliate onboarding automated từ đăng ký đến first link
* Không phá bất kỳ API hoặc schema nào hiện có

---

## NORTH STAR METRIC

Affiliate Revenue Generated Per Month
÷
Total Commission Paid (ROI metric)
×
Active Affiliate Count
×
(1 - Fraud Rate)

---

# END OF FILE
