# Retention Strategy — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Tổng Quan

Retention là sống còn trong commerce. Chi phí giữ 1 khách hàng cũ = 1/5 chi phí tìm khách mới.

**Current state của hệ thống:**
- CO: Customer entity với tier, totalOrders, churnRisk
- CO: AI Chat Agent gửi tin nhắn qua Telegram
- THIẾU: Automated follow-up sequences
- THIẾU: Retention campaign engine
- THIẾU: Reactivation automation

---

## 2. Follow-Up Sequences

### 2.1 New Customer Onboarding (Days 0-30)

**Trigger:** Customer entity được tạo (Lead.status → converted)

```
DAY 0: Order confirmation
├── Channel: Telegram/Zalo (theo Lead.platform)
├── Message: "Cảm ơn [Tên]! Đơn hàng #[ID] đã được xác nhận."
├── Content: Order summary + estimated delivery
└── Action: None required

DAY 1 (sau delivery): Delivery confirmation + Review request
├── Message: "Bạn đã nhận được hàng chưa? Cho chúng tôi biết cảm nhận nhé!"
├── CTA: [Đã nhận] [Báo sự cố]
└── If [Đã nhận]: Trigger review request

DAY 3: Product education / usage tips
├── Message: "Bạn có biết [sản phẩm X] còn có thể dùng để...?"
├── Content: Tips & tricks liên quan đến sản phẩm đã mua
└── CTA: Link to related products / FAQ

DAY 7: Personalized recommendation
├── Message: "Khách hàng mua [SP đã mua] cũng thường mua..."
├── Content: 2-3 cross-sell recommendations (AI-generated)
└── CTA: Xem sản phẩm → tạo Order

DAY 14: Soft loyalty push
├── Message: "Mua thêm 1 lần nữa để lên hạng REGULAR!"
├── Content: Tier benefits explanation
└── Offer: Free shipping trên đơn tiếp theo

DAY 30: 1-month check-in
├── Message: "Đã 1 tháng từ lần đầu gặp bạn! Có gì mới cho bạn..."
└── Content: New arrivals + special comeback offer
```

**Current state:** Không có automation, tất cả thủ công.

---

### 2.2 Regular Customer Nurture (Ongoing)

**Trigger:** Customer.tier = 'regular', mỗi 14 ngày

```
CYCLE A (14 days): Product highlights
├── 2-3 new/popular products
├── Personalized dựa trên preferredCategories
└── No hard sell — educational tone

CYCLE B (14 days): Exclusive offer
├── "Dành riêng cho khách REGULAR của chúng tôi"
├── 10% discount code (có expiry 7 ngày)
└── Track redemption rate

CYCLE C (14 days): Social proof
├── Customer reviews + photos
├── "Khách hàng khác đang nói gì..."
└── CTA: Xem thêm / Mua ngay

CYCLE D (14 days): Value-add content
├── Tips liên quan đến niche
├── Behind-the-scenes content
└── Build emotional connection
```

---

### 2.3 VIP Customer Premium Experience

**Trigger:** Customer.tier = 'vip'

```
MONTHLY: VIP Preview
├── Early access to new arrivals (48h trước)
├── "Chỉ dành cho VIP — xem trước sản phẩm mới"
└── Personal note từ "founder" (AI-generated)

QUARTERLY: VIP Review + Surprise
├── "Nhìn lại hành trình của bạn với chúng tôi..."
├── Summary: totalOrders, totalSpent, items bought
└── Surprise gift / extra discount

ON BIRTHDAY: Birthday Campaign
├── "Happy Birthday [Tên]! Một món quà nhỏ từ chúng tôi"
└── Birthday discount code (15%) valid 7 days
```

---

## 3. Retention Campaigns

### 3.1 Win-Back Campaign (AT_RISK Segment)

**Trigger:** lastPurchaseDate > 60 days AND tier = regular/vip

```
STEP 1 (Day 60): Soft re-engagement
├── Message: "Lâu rồi không gặp [Tên]! Có gì mới cho bạn..."
├── Tone: Friendly, no pressure
├── Content: 2-3 new products relevant to past purchases
└── CTA: Xem ngay (no discount yet)

STEP 2 (Day 67 — nếu không mua): Offer introduction
├── Message: "Chúng tôi có một offer đặc biệt dành cho bạn"
├── Offer: 10% off next order
└── Discount code: expires in 7 days

STEP 3 (Day 74 — nếu vẫn không mua): Urgent offer
├── Message: "Offer của bạn sắp hết hạn (3 ngày nữa)!"
├── Reinforce: "Đây là lần cuối chúng tôi nhắc nhé"
└── Discount code: last 3 days reminder

STEP 4 (Day 77 — no conversion): Survey
├── Message: "Có điều gì khiến bạn chưa muốn mua không?"
├── Quick survey: [Giá cao] [Không có sản phẩm cần] [Bận] [Khác]
└── Follow up dựa trên response
```

### 3.2 CANNOT_LOSE_THEM Campaign (High-value at risk)

**Trigger:** churnRisk > 0.6 AND totalSpent > 2,000,000 VND

```
IMMEDIATE: Personal outreach
├── Assigned to human salesperson (nếu có) HOẶC AI Agent cá nhân hóa cao
├── Message: Rất personal, nhắc lại lịch sử mua hàng
└── Offer: 20-25% discount + free shipping

IF no response in 48h: Escalate
├── Try different channel (Telegram → Zalo hoặc ngược lại)
├── Offer: Tăng lên 30% discount
└── Add: Free gift / bonus item

IF no response in 72h: Final attempt
├── "Chúng tôi sẽ dành offer này cho đến [date]"
└── If still no response → Move to Lost segment
```

### 3.3 Reactivation Triggers (HIBERNATING Segment)

**Trigger:** lastPurchaseDate > 90 days AND churnRisk > 0.5

| Trigger Event | Message Theme | Offer |
|--------------|---------------|-------|
| New product in preferred category | "Mới về: thứ bạn hay mua" | 5% off |
| Price drop on past-viewed product | "Giảm giá sản phẩm bạn đã xem" | Notify |
| Flash sale event | "Sale lớn — không thể bỏ qua" | Sale price |
| Seasonal event | "Tết/8/3/Black Friday offer" | 15% off |
| "We miss you" campaign | "6 tháng rồi..." | 20% off |

---

## 4. Reactivation Triggers (Event-Based)

```typescript
// Reactivation trigger engine (cần xây)

interface ReactivationTrigger {
  type: 'new_product' | 'price_drop' | 'flash_sale' | 'seasonal' | 'miss_you';
  conditions: {
    minDaysSinceLastPurchase: number;
    maxChurnRisk: number;
    minTotalSpent?: number;
    segment?: string;
  };
  message: string;
  discount?: number;         // percentage
  expiryDays?: number;
  channel: 'telegram' | 'zalo' | 'email' | 'auto';  // auto = use preferred
}

// Triggers chạy khi:
// 1. Có sản phẩm mới trong category KH thường mua
// 2. Price drop > 10% trên sản phẩm từng được xem/mua
// 3. Flash sale event được tạo
// 4. Seasonal calendar events
// 5. Time-based (60d, 90d, 180d milestones)
```

---

## 5. Anti-Churn Playbook

### 5.1 Early Warning System

```
Warning Level 1 (churnRisk 0.3-0.5):
  → Tăng frequency nurture messages
  → Add value touchpoints
  → No discount yet (maintain margin)

Warning Level 2 (churnRisk 0.5-0.7):
  → Trigger win-back sequence
  → 10-15% discount
  → Survey to understand issues

Warning Level 3 (churnRisk 0.7+):
  → Personal outreach (human or high-personalization AI)
  → 20-30% discount
  → Root cause investigation
```

### 5.2 Post-Issue Recovery

Sau bất kỳ vấn đề nào (complaint, late delivery, wrong item):

```
HOUR 0: Issue acknowledgment
├── Auto-response: "Chúng tôi đã nhận được phản ánh..."
└── SLA: giải quyết trong X giờ

HOUR 4-24: Resolution
├── Confirm solution (refund/replacement/discount)
└── Sincere apology message

DAY 7: Follow-up check
├── "Vấn đề đã được giải quyết hoàn toàn chưa?"
└── If satisfied → Recovery discount for next order
```

---

## 6. Retention Metrics

| Metric | Formula | Target | Current |
|--------|---------|--------|---------|
| M1 Retention | Customers buying in M1 / acquired in M0 | 40% | THIẾU tracking |
| 90-day Retention | Customers active at 90d / acquired | 25% | THIẾU |
| Win-back Rate | Reactivated / Attempted | 15%+ | THIẾU |
| Churn Rate (Monthly) | Churned this month / Active last month | < 5% | THIẾU |
| Save Rate | Saved from churn / At-risk identified | 30%+ | THIẾU |
| Avg Repeat Interval | Mean days between purchases | < 45 days | THIẾU |

---

## 7. Retention Campaign Calendar (Monthly Template)

```
Week 1: New customer onboarding reviews + followup
Week 2: Regular customer nurture (CYCLE A or B)
Week 3: At-risk win-back campaign
Week 4: VIP preview + upcoming sale teaser
```

---

## 8. Implementation Roadmap

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | New customer Day 1/3/7 sequence | Medium | Very High |
| P0 | AT_RISK win-back automation | Medium | Very High |
| P1 | Regular customer 14-day nurture | Medium | High |
| P1 | Event-based reactivation triggers | High | High |
| P2 | VIP premium experience | Medium | Medium |
| P2 | CANNOT_LOSE_THEM personal outreach | Medium | High |
| P3 | Post-issue recovery sequence | Low | High |
| P3 | Birthday campaigns | Low | Medium |

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
