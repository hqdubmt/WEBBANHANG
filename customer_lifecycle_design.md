# Customer Lifecycle Design — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Tổng Quan: 7-Stage Customer Lifecycle

```
STRANGER → VISITOR → LEAD → PROSPECT → CUSTOMER → REPEAT → ADVOCATE
   [0]        [1]      [2]     [3]        [4]        [5]      [6]
```

Hệ thống hiện tại map với lifecycle này như sau:
- **Lead entity** có status: `new | contacted | qualified | converted | lost`
- **Customer entity** có tier: `new | regular | vip`
- Các stage 0 (Stranger) và 6 (Advocate) chưa có entity/tracking riêng

---

## 2. Chi Tiết Từng Stage

### Stage 0: STRANGER
**Định nghĩa:** Người chưa có bất kỳ tương tác nào với thương hiệu.

| Attribute | Value |
|-----------|-------|
| Entity | Không có (anonymous) |
| Identifier | anonymous session, ad impression |
| Duration | N/A |
| Volume ước tính | Cao nhất trong funnel |

**Trigger vào stage này:** Mặc định — chưa có dữ liệu
**Trigger thoát:** Click ad, nhắn tin, truy cập website

**Actions của hệ thống:**
- Chạy AI targeting agent trên Facebook/TikTok
- Không có action nào vì chưa có tracking

**Current state:** THIẾU — không có anonymous tracking

---

### Stage 1: VISITOR
**Định nghĩa:** Đã có tương tác đầu tiên (xem ad, vào website, nhắn tin lần đầu) nhưng chưa cung cấp thông tin.

| Attribute | Value |
|-----------|-------|
| Entity | Chưa có (session-based) |
| Identifier | Cookie, Telegram user_id chưa lưu, Facebook PSID |
| Duration | 0-24h |

**Trigger vào stage này:**
- Click vào Facebook/TikTok ad
- Vào website lần đầu
- Nhắn tin lần đầu vào Telegram bot

**Trigger thoát:**
- Cung cấp phone/email → LEAD
- Rời đi không tương tác → quay lại STRANGER

**Actions của hệ thống:**
- Gửi welcome message qua Telegram/Facebook Messenger
- Track UTM source → `acquisitionSource` trên Lead entity
- Trigger AI Greeting Agent

**Current state:** THIẾU — không có Visitor entity, bot ghi nhận từ lần nhắn tin đầu

---

### Stage 2: LEAD
**Định nghĩa:** Đã có thông tin liên lạc cơ bản (phone hoặc platform ID).

| Attribute | Value |
|-----------|-------|
| Entity | `Lead` entity |
| Status | `new` |
| Fields có | name, phone, email, platform, note, assignedTo, estimatedValue |
| Duration | 0-7 ngày |

**Trigger vào stage này:**
- Nhắn tin kèm số điện thoại
- Điền form trên website
- Import từ ads manager

**Trigger thoát → PROSPECT:**
- Status chuyển sang `contacted` sau khi AI/salesperson liên hệ
- Có biểu hiện quan tâm (hỏi giá, hỏi sản phẩm cụ thể)

**Trigger thoát → LOST:**
- Không phản hồi sau N ngày (configurable)
- Tự hủy kết bạn/block

**Actions của hệ thống:**
```
1. Auto-assign Lead cho salesperson (nếu có team)
2. Trigger follow-up sequence (24h, 48h, 72h)
3. AI Chat Agent gửi product catalog phù hợp
4. Knowledge Brain tra cứu FAQs liên quan
```

**Current state:** CO — Lead entity đầy đủ, status `new` mapping đúng

---

### Stage 3: PROSPECT
**Định nghĩa:** Lead đã được qualify — có nhu cầu thực sự, có khả năng mua.

| Attribute | Value |
|-----------|-------|
| Entity | `Lead` entity với status `qualified` |
| Status | `contacted` → `qualified` |
| Key signal | Hỏi giá, hỏi thời gian giao hàng, xem nhiều sản phẩm |

**Trigger vào stage này:**
- Lead.status → `qualified`
- AI detect purchase intent từ chat history

**Trigger thoát → CUSTOMER:**
- Đặt đơn hàng đầu tiên → Lead.status = `converted`
- Customer entity được tạo

**Actions của hệ thống:**
```
1. Gửi personalized offer dựa trên sản phẩm đã xem
2. Trigger urgency message (flash sale, limited stock)
3. AI Closing Agent cố gắng chốt đơn
4. Tạo draft Order nếu cần
```

**Current state:** CO PHẦN — `qualified` status có nhưng thiếu AI scoring để tự động qualify

---

### Stage 4: CUSTOMER
**Định nghĩa:** Đã thực hiện ít nhất 1 đơn hàng thành công.

| Attribute | Value |
|-----------|-------|
| Entity | `Customer` entity |
| Tier | `new` (đơn hàng đầu) |
| Fields | totalOrders, totalSpent, ltv, churnRisk |

**Trigger vào stage này:**
- Order.status = `delivered` hoặc `paid`
- Lead.status = `converted` → Customer entity tạo tự động

**Actions của hệ thống:**
```
1. Gửi thank you message + review request
2. Suggest related products (cross-sell)
3. Bắt đầu tracking totalOrders, totalSpent
4. Tính LTV dự báo ban đầu
```

**Current state:** CO — Customer entity có đầy đủ field cơ bản, thiếu automation trigger từ Order delivery

---

### Stage 5: REPEAT CUSTOMER
**Định nghĩa:** Đã mua từ 2 lần trở lên, có pattern mua hàng.

| Attribute | Value |
|-----------|-------|
| Entity | `Customer` entity |
| Tier | `regular` (2-5 orders) hoặc `vip` (>5 orders) |
| Key metric | Purchase frequency, AOV, last purchase date |

**Trigger vào stage này:**
- totalOrders >= 2 → tier = `regular`
- totalOrders >= 5 hoặc totalSpent >= threshold → tier = `vip`

**Actions của hệ thống:**
```
1. Upgrade tier notification
2. Loyalty rewards / VIP benefits
3. Early access to new products
4. Personalized reorder reminders
5. Tăng priority trong customer support
```

**Current state:** CO PHẦN — tier field có, nhưng tier upgrade chưa tự động hoàn toàn

---

### Stage 6: ADVOCATE
**Định nghĩa:** Khách hàng giới thiệu người khác, để lại review tốt, chia sẻ sản phẩm.

| Attribute | Value |
|-----------|-------|
| Entity | THIẾU — không có Advocate entity |
| Signals | Referral code usage, review, social share |
| Tier | Subset của VIP |

**Trigger vào stage này:**
- Giới thiệu 1+ khách hàng thành công
- Để lại 5-star review
- Chia sẻ sản phẩm trên mạng xã hội

**Actions của hệ thống:**
```
1. Cấp referral code cá nhân
2. Commission tracking
3. Public recognition (top reviewer badge)
4. Exclusive advocate benefits
```

**Current state:** THIẾU hoàn toàn — cần xây referral system + review system

---

## 3. Stage Transition Matrix

```
                 STRANGER  VISITOR  LEAD   PROSPECT  CUSTOMER  REPEAT  ADVOCATE
STRANGER    →      —         Y       —       —         —        —        —
VISITOR     →      Y(exit)   —       Y       —         —        —        —
LEAD        →      —         —       —       Y         —        —        —
PROSPECT    →      —         —       Y(lost) —         Y        —        —
CUSTOMER    →      —         —       —       —         —        Y        —
REPEAT      →      —         —       —       —         —        —        Y
ADVOCATE    →      —         —       —       —         —        Y(regress)—
```

---

## 4. Current State Summary

| Stage | Entity | Status | Gap |
|-------|--------|--------|-----|
| Stranger | Không có | THIẾU | Cần anonymous tracking |
| Visitor | Không có | THIẾU | Cần session tracking |
| Lead | Lead entity ✓ | CO | Thiếu auto-qualify |
| Prospect | Lead.qualified ✓ | CO PHẦN | Thiếu AI scoring |
| Customer | Customer entity ✓ | CO | Thiếu auto-trigger từ Order |
| Repeat | Customer.tier ✓ | CO PHẦN | Thiếu auto tier upgrade |
| Advocate | Không có | THIẾU | Cần referral + review system |

---

## 5. Implementation Roadmap

### Sprint 1 (Tuần 1-2): Fix existing stages
- Auto-convert Lead → Customer khi Order delivered
- Auto-upgrade tier dựa trên totalOrders/totalSpent
- Trigger follow-up sequence từ Lead.status changes

### Sprint 2 (Tuần 3-4): Add missing pieces
- Visitor tracking qua Telegram/Facebook webhook
- AI qualification score cho Lead → Prospect

### Sprint 3 (Tuần 5-6): Advocate system
- Referral code generation
- Review collection automation
- Advocate entity + tracking

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
