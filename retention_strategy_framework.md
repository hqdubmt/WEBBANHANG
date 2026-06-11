# Retention Strategy Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Retention Tactics Per Customer Tier

### NEW Tier (tier = 'new', totalSpent < 500K)

**Goal:** Convert first-time buyer thành repeat buyer.

| Tactic | Timing | Channel | Expected Lift |
|--------|--------|---------|---------------|
| Welcome offer: freeship đơn 2 | D+3 post first order | Telegram/FB | +25% repeat |
| Product education email | D+7 | Email | +10% engagement |
| Loyalty preview: "Bạn còn X VND để lên REGULAR" | D+14 | Any | +15% AOV next |
| D+30 check-in offer | D+30 no order | Telegram | +20% win-back |

### REGULAR Tier (tier = 'regular', 500K – 5M)

**Goal:** Tăng frequency và AOV, hướng đến VIP.

| Tactic | Timing | Channel | Expected Lift |
|--------|--------|---------|---------------|
| Milestone reward: Order #5 = gift | Khi đủ điều kiện | Multi-channel | +30% loyalty |
| VIP upgrade preview | khi spent ≥ 3M | Dashboard + message | +20% AOV |
| Bundle deal suggestions | Weekly | Content Agent | +15% basket size |
| Referral program invite | After order #3 | Email + Telegram | +12% new acq |
| Flash sale early access | Before campaigns | Telegram | +25% CTR |

### VIP Tier (tier = 'vip', totalSpent ≥ 5M)

**Goal:** Maximize LTV và advocacy.

| Tactic | Timing | Channel | Expected Lift |
|--------|--------|---------|---------------|
| Personal AI shopper (Sales Agent priority) | Always-on | Telegram DM | +40% retention |
| Exclusive product launches (48h early) | New product | Multi-channel | +35% engagement |
| Birthday gift campaign | Birthday ± 3 days | Telegram + Email | +60% satisfaction |
| VIP-only discount: 20% on all | Monthly | Coupon system | +45% repeat |
| Free shipping always | Auto-applied | Order system | +30% cart conversion |
| Annual loyalty gift | 12-month anniversary | Physical + digital | +50% LTV |

---

## 2. Churn Detection Signals

### Early Warning Signals (churnRisk 30–60)

| Signal | Nguồn dữ liệu | Weight |
|--------|--------------|--------|
| Khoảng cách giữa 2 đơn tăng > 50% | `orders.createdAt` | HIGH |
| Open rate email giảm | `email_campaigns` | MEDIUM |
| Không reply tin nhắn bot 2 lần liên tiếp | Telegram/FB agent logs | MEDIUM |
| AOV giảm > 30% vs trung bình | `order.total` | HIGH |
| Browse không mua (website session data) | TBD | MEDIUM |

### Critical Signals (churnRisk > 70)

| Signal | Action ngay lập tức |
|--------|---------------------|
| Last order > 60 ngày (Regular) | Trigger win-back campaign |
| Last order > 30 ngày (VIP) | Personal Telegram message |
| 3 orders cancelled liên tiếp | Escalate to human review |
| NPS score ≤ 2 | Immediate customer service response |
| Unsubscribe từ email | Switch to Telegram channel |

---

## 3. Win-back Campaigns

### Campaign A: "Chúng tôi nhớ bạn" (60-day inactive)

```
Trigger: customer.lastOrder < NOW()-60d AND churnRisk > 60

Sequence:
  Day 1: "Lâu rồi không gặp!" + 10% discount code
  Day 4: Social proof: "Sản phẩm bạn từng quan tâm — 500 người đã mua"
  Day 8: Last push: "Ưu đãi hết hạn sau 2 ngày"
  Day 10: If no purchase: Add to passive newsletter only
```

### Campaign B: "VIP Comeback" (VIP churn)

```
Trigger: tier='vip' AND lastOrder < NOW()-30d

Sequence:
  Day 1: Personal message từ "CEO AI" — tone cá nhân hóa
  Day 3: Exclusive offer: 20% + freeship + priority support
  Day 7: Phone call flag (nếu có phone + tier=vip)
  Day 14: Survey: "Chúng tôi có thể cải thiện gì?"
```

### Campaign C: "Lost Customer Recovery" (90-day inactive)

```
Trigger: churnRisk > 90

Sequence:
  Week 1: "Ưu đãi cuối cùng" — 20% + freeship
  Week 3: "Bạn còn nhớ chúng tôi không?"
  Week 6: Remove from active campaigns → monthly newsletter only
  Month 6: Annual re-engagement blast
```

---

## 4. Retention KPIs

| KPI | Công thức | Target |
|-----|-----------|--------|
| Customer Retention Rate (monthly) | (End - New) / Start × 100 | > 75% |
| Churn Rate | Churned / Total × 100 | < 5%/month |
| Win-back Rate | Reactivated / Lost × 100 | > 15% |
| Repeat Purchase Rate | Customers with ≥2 orders / Total | > 40% |
| LTV Growth MoM | (LTV_now - LTV_prev) / LTV_prev | > 5% |

---

## 5. Coupon Entity Integration

```typescript
// coupon.entity.ts (existing)
Coupon {
  code: string
  discount: decimal
  minOrderValue: decimal
  usageLimit: number
  usedCount: number
  expiresAt: Date
}
```

Win-back coupons được tạo tự động bởi CRM Agent với:
- `code = "WB-{customerId[:8]}-{date}"`
- `usageLimit = 1` (cá nhân hóa)
- `expiresAt = NOW() + 7d`

---

## 6. Implementation Gaps

| Component | Status |
|-----------|--------|
| tier-based tactic config | PARTIAL — tier exists, actions manual |
| Churn detection query | PARTIAL — churnRisk computed, no alert system |
| Win-back campaign scheduler | MISSING |
| VIP personal message automation | MISSING |
| Coupon auto-generation per customer | MISSING |
| Campaign entity tracking | DONE — campaigns table exists |
