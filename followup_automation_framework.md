# Follow-up Automation Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Tổng quan

Follow-up automation là chuỗi touchpoints có lịch trình kích hoạt tự động sau các events (mua hàng, trở thành lead, không mua sau liên hệ). Hiện tại, hệ thống có `Lead.followUpAt` field nhưng chưa có scheduler tự động gửi.

---

## 2. Follow-up Timeline

### Chuỗi Post-Purchase (sau khi order = DELIVERED)

```
Day 0: Order Delivered
  │
  ├── [Ngay lập tức] Order confirmation + tracking link
  │
  ├── Day +1: "Sản phẩm đã đến tay bạn chưa?"
  │           Channel: Telegram/Zalo/Facebook (preferred)
  │           Goal: Delivery confirmation + satisfaction check
  │
  ├── Day +3: "Bạn có hài lòng không?"
  │           Action: Review request + NPS survey (1–5 sao)
  │           Bonus: Discount code 5% cho đơn tiếp theo
  │
  ├── Day +7: Educational content về sản phẩm đã mua
  │           "Mẹo sử dụng [tên sản phẩm] hiệu quả nhất"
  │           Goal: Engagement + retention
  │
  ├── Day +14: Cross-sell recommendation
  │            "Khách hàng mua [A] thường cũng thích [B]"
  │            Source: product embeddings + order history
  │
  ├── Day +30: Loyalty check-in
  │            If no second order: "Mua lần 2 — freeship"
  │            If second order placed: Skip
  │
  ├── Day +60: Win-back nếu chưa mua lại
  │            Offer: 10% discount + freeship
  │            Message: "Chúng tôi nhớ bạn!"
  │
  └── Day +90: Last-chance campaign
               If still no purchase: Move to LOST segment
               Offer: 20% discount — "Ưu đãi đặc biệt chỉ dành cho bạn"
```

### Chuỗi Lead Nurture (Lead.status = NEW/CONTACTED)

```
Day 0: Lead created (message received)
  │
  ├── [< 5 phút] Auto-response từ Bot
  │              "Xin chào! Tôi có thể giúp gì cho bạn?"
  │              Source: KnowledgeBrain RAG
  │
  ├── Day +1: Follow-up nếu chưa reply
  │           "Bạn có muốn xem thêm thông tin về [intent]?"
  │
  ├── Day +3: Soft offer
  │           "Hôm nay có khuyến mãi 10% — đặt hàng ngay"
  │
  ├── Day +7: Social proof
  │           "200 khách hàng đã mua [sản phẩm] tuần này"
  │
  └── Day +14: Final nurture
               If no conversion: Mark LOST, enter passive newsletter
```

---

## 3. Trigger Conditions

| Trigger | Event | Condition | Priority |
|---------|-------|-----------|----------|
| Order Delivered | `order.status → delivered` | auto | HIGH |
| Lead Created | `lead.status = new` | auto | HIGH |
| Lead Stale | `lead.updatedAt < NOW()-24h AND status=new` | scheduled | MEDIUM |
| churnRisk > 70 | `customer.churnRisk > 70` | scheduled daily | HIGH |
| Birthday | `customer.birthday = TODAY` | scheduled daily | LOW |
| No order > 30d | `lastOrder < NOW()-30d` | scheduled weekly | MEDIUM |

---

## 4. Message Templates Per Stage

### D+1 Delivery Check (Telegram)
```
Xin chào {{name}}! 👋
Đơn hàng {{orderCode}} của bạn đã được giao ngày {{deliveredDate}}.
Bạn đã nhận được hàng chưa? Phản hồi "Có" hoặc "Chưa" để chúng tôi hỗ trợ nhé!
```

### D+3 Review Request
```
Chào {{name}}!
Hy vọng bạn đang hài lòng với {{productName}} 😊
Bạn cho chúng tôi {{stars}}/5 sao nhé?
Và đây là mã giảm giá 5% cho lần mua tiếp: {{couponCode}}
```

### Win-back D+60
```
Chào {{name}}, chúng tôi nhớ bạn!
Đã {{days}} ngày kể từ lần mua cuối của bạn.
Hôm nay chúng tôi có ưu đãi đặc biệt: Giảm 10% + freeship.
Mã: {{winbackCode}} — hết hạn sau 7 ngày.
[Mua ngay] {{link}}
```

---

## 5. Channel Priority Logic

```
Per customer:
  if telegramId EXISTS → use Telegram (highest open rate ~85%)
  elif facebookId EXISTS → use Facebook Messenger
  elif zaloId EXISTS → use Zalo
  elif email EXISTS → use Email Agent
  else → manual flag
```

---

## 6. Current Status — MISSING: Follow-up Scheduler

```
MISSING COMPONENTS:
─────────────────────────────────────────────────────────────
1. No cron scheduler for follow-up sequences
   - Lead.followUpAt EXISTS but nothing reads it
   - No service polls for leads WHERE followUpAt <= NOW()

2. No message queue / outbox pattern
   - Telegram Agent sends on-demand, not scheduled
   - No retry mechanism for failed sends

3. No follow-up state tracking
   - No table tracks "which step of sequence is customer on"
   - Risk: send D+7 message to customer who already bought again

PROPOSED SOLUTION:
─────────────────────────────────────────────────────────────
New entity: FollowUpSequence {
  customerId/leadId
  sequenceType: post_purchase|lead_nurture|win_back
  currentStep: number
  nextRunAt: timestamptz
  status: active|paused|completed
}

Cron: every 30 minutes
  SELECT * FROM follow_up_sequences
  WHERE nextRunAt <= NOW() AND status='active'
  → dispatch to appropriate agent
```

---

## 7. Lead.followUpAt — Current Use

```typescript
// lead.entity.ts
@Column({ type: 'timestamptz', nullable: true })
followUpAt: Date;
```

- Set bởi Sales Agent sau khi contact lead
- Hiện chỉ dùng để hiển thị trong dashboard
- Chưa có service đọc và trigger action tự động
