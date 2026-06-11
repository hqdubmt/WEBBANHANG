# Segmentation Framework — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Current Segmentation State

Hệ thống hiện có 1 dimension duy nhất: **Tier** trong Customer entity.

```
Customer.tier = 'new' | 'regular' | 'vip'
```

Đây là segmentation đơn giản nhất, chỉ dựa trên số lượng đơn hàng. Chưa có behavioral segmentation hay RFM model.

---

## 2. Proposed Multi-Dimensional Segmentation

### Dimension 1: Tier (CÓ SẴN)

| Tier | Định nghĩa | Estimated % |
|------|-----------|-------------|
| `new` | 0-1 đơn hàng | 40% |
| `regular` | 2-5 đơn hàng | 45% |
| `vip` | 6+ đơn hàng hoặc totalSpent > threshold | 15% |

### Dimension 2: RFM Score (CẦN XÂY)

**R (Recency):** Ngày mua hàng gần nhất
**F (Frequency):** Tần suất mua hàng
**M (Monetary):** Tổng giá trị đã chi

```
RFM Scoring (1-5 mỗi dimension):

R Score:
  5: mua trong 7 ngày qua
  4: mua trong 30 ngày qua
  3: mua trong 60 ngày qua
  2: mua trong 90 ngày qua
  1: mua > 90 ngày trước

F Score:
  5: ≥ 8 đơn hàng
  4: 5-7 đơn hàng
  3: 3-4 đơn hàng
  2: 2 đơn hàng
  1: 1 đơn hàng

M Score:
  5: totalSpent ≥ 5,000,000 VND
  4: totalSpent 2,000,000-4,999,999 VND
  3: totalSpent 1,000,000-1,999,999 VND
  2: totalSpent 500,000-999,999 VND
  1: totalSpent < 500,000 VND
```

### Dimension 3: Behavioral Segment (CẦN XÂY)

Dựa trên RFM combined score:

```
RFM Combined → Segment Label
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
R=5, F=5, M=5        → CHAMPION
R=4-5, F=3-5, M=3-5  → LOYAL
R=3-5, F=1-3, M=1-3  → POTENTIAL_LOYALIST
R=4-5, F=0-1, M=0-1  → NEW_CUSTOMER
R=3-4, F=3-5, M=2-5  → PROMISING
R=2-3, F=2-3, M=2-3  → NEED_ATTENTION
R=2-3, F=0-2, M=0-2  → ABOUT_TO_SLEEP
R=1-2, F=3-4, M=3-5  → CANNOT_LOSE_THEM
R=1-2, F=2-5, M=2-5  → AT_RISK
R=1-2, F=0-2, M=0-2  → HIBERNATING
R=1, F=1, M=1         → LOST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 3. Segment Definitions & Actions

### CHAMPION (R5, F5, M5)
**Profile:** Mua gần đây, mua thường xuyên, chi nhiều tiền.

| Attribute | Value |
|-----------|-------|
| Tỷ lệ ước tính | 3-5% customer base |
| Revenue contribution | ~30% total revenue |
| Churn risk | Thấp |

**Actions:**
```
1. Reward programs — exclusive deals
2. Early access to new products
3. Invite to referral/affiliate program
4. Personal thank you message từ AI Agent
5. NPS survey để capture testimonials
6. Upsell premium/bundle products
```

---

### LOYAL (R4-5, F3-5, M3-5)
**Profile:** Mua thường xuyên, chi khá. Chưa ở mức top nhưng rất giá trị.

**Actions:**
```
1. Loyalty program enrollment
2. Birthday/anniversary campaigns
3. Cross-sell related product categories
4. Tier upgrade notification (push toward VIP)
5. Exclusive member pricing
```

---

### POTENTIAL_LOYALIST (R3-5, F1-3, M1-3)
**Profile:** Khách hàng tương đối mới, có tiềm năng trở thành loyal.

**Actions:**
```
1. Onboarding sequence (3-email/message series)
2. Product education content
3. Second purchase incentive (10% off next order)
4. Personalized recommendations từ AI
5. Community invite (Telegram group VIP)
```

---

### NEW_CUSTOMER (R4-5, F0-1, M0-1)
**Profile:** Mới mua lần đầu, chưa biết sẽ quay lại không.

**Actions:**
```
1. Welcome sequence (Day 1, Day 3, Day 7)
2. Delivery satisfaction check
3. Review request sau khi nhận hàng
4. "Customers like you also bought..." recommendation
5. Discount cho đơn hàng thứ 2
```

---

### AT_RISK (R1-2, F2-5, M2-5)
**Profile:** Từng là khách hàng tốt, nhưng gần đây không mua.

**Actions:**
```
1. Win-back campaign: "Chúng tôi nhớ bạn!"
2. Special offer: giảm 15-20%
3. Survey: "Tại sao bạn chưa mua lại?"
4. Personalized product recommendations mới
5. AI Agent proactively nhắn tin
```

---

### CANNOT_LOSE_THEM (R1-2, F3-4, M3-5)
**Profile:** Có giá trị cao nhưng đang có nguy cơ churn. URGENT.

**Actions:**
```
1. IMMEDIATE: AI Agent gọi/nhắn tin cá nhân
2. VIP re-engagement offer (25-30% discount)
3. Dedicated account manager nếu có
4. Root cause analysis: tại sao họ dừng mua?
5. Custom retention package
```

---

### LOST (R1, F1, M1)
**Profile:** Đã không mua từ rất lâu, low engagement.

**Actions:**
```
1. Last chance re-activation campaign
2. Minimal cost touchpoint (email/tin nhắn)
3. Sau 3 lần không phản hồi → archive/suppress
4. Chuyển sang lookalike audience cho ads
```

---

### HIBERNATING (R1-2, F0-2, M0-2)
**Profile:** Ít mua, ít tương tác, gần như không còn active.

**Actions:**
```
1. Re-engagement sequence đơn giản
2. Free shipping offer
3. New arrival notification
```

---

## 4. Segment Assignment Logic

```typescript
// Pseudo-code cho Segmentation Engine

function assignSegment(customer: Customer): string {
  const r = computeRScore(customer.lastPurchaseDate);
  const f = computeFScore(customer.totalOrders);
  const m = computeMScore(customer.totalSpent);

  const rfm = { r, f, m };

  if (r >= 4 && f >= 4 && m >= 4) return 'CHAMPION';
  if (r >= 4 && f >= 3 && m >= 3) return 'LOYAL';
  if (r >= 3 && f <= 3 && m <= 3) return 'POTENTIAL_LOYALIST';
  if (r >= 4 && f <= 1)           return 'NEW_CUSTOMER';
  if (r <= 2 && f >= 2 && m >= 3) return 'CANNOT_LOSE_THEM';
  if (r <= 2 && f >= 2)           return 'AT_RISK';
  if (r <= 2 && f <= 1)           return 'HIBERNATING';
  if (r == 1 && f == 1 && m == 1) return 'LOST';

  return 'NEED_ATTENTION'; // default
}
```

**Trigger chạy segmentation:**
- Sau mỗi order delivered/cancelled
- Daily batch job (3:00 AM)
- Manual trigger từ admin dashboard

---

## 5. Segment → Action Mapping (Automated)

```
SEGMENT          CHANNEL      FREQUENCY    MESSAGE TYPE
─────────────────────────────────────────────────────────
CHAMPION         Telegram     Monthly      VIP exclusive offer
LOYAL            Telegram     2x/month     Loyalty reward
POTENTIAL        Telegram     Weekly       Educational + offer
NEW_CUSTOMER     Telegram     Day 1,3,7    Onboarding series
AT_RISK          Telegram     Immediately  Win-back offer
CANNOT_LOSE      Telegram     Immediately  Personal outreach
LOST             Email        Monthly      Last chance
HIBERNATING      Email        2x/month     Re-activation
─────────────────────────────────────────────────────────
```

---

## 6. Tier vs. Segment Matrix

| | NEW tier | REGULAR tier | VIP tier |
|---|----------|-------------|---------|
| CHAMPION | Impossible | Rare | Likely |
| LOYAL | Impossible | Common | Common |
| POTENTIAL | Common | Common | Rare |
| NEW_CUSTOMER | Common | Impossible | Impossible |
| AT_RISK | Rare | Common | Possible |
| CANNOT_LOSE | Impossible | Rare | Common |
| LOST | Possible | Rare | Rare |

---

## 7. Current State vs. Target

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Tier segmentation | CO (3 tiers) | 3 tiers | Done |
| RFM scoring | THIẾU | 5-point RFM | Xây mới |
| Behavioral segments | THIẾU | 11 segments | Xây mới |
| Auto-assignment | THIẾU | Daily cron | Xây mới |
| Segment-triggered campaigns | THIẾU | Automated | Xây mới |
| Segment analytics | THIẾU | Dashboard | Xây mới |

**Overall segmentation readiness: 15/100** — cần xây từ đầu.

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
