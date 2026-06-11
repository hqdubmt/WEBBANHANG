# Customer Profile Model — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Current Customer Entity

### Fields hiện có trong `Customer` entity:

```typescript
// Customer Entity — Current State
@Entity('customers')
export class Customer {
  // Identity
  id: string               // UUID primary key
  name: string             // Tên khách hàng
  phone: string            // SĐT (master identifier)
  email: string            // Email (optional)

  // Platform IDs
  telegramId: string       // Telegram user ID
  facebookId: string       // Facebook PSID
  zaloId: string           // Zalo user ID
  // MISSING: tiktokId

  // Segmentation
  tier: enum               // new | regular | vip

  // Notes
  note: string             // Ghi chú thủ công

  // Metrics
  totalOrders: number      // Tổng số đơn hàng
  totalSpent: number       // Tổng tiền đã chi
  ltv: number              // Lifetime Value (dự báo)

  // Attribution
  acquisitionSource: string // UTM / platform nguồn

  // Risk
  churnRisk: number        // 0-1 churn probability

  // Relationships (implied)
  // orders: Order[]
  // leads: Lead[]
}
```

**Đánh giá:** 15 fields cốt lõi, đủ để vận hành cơ bản. Thiếu nhiều signals quan trọng cho AI personalization.

---

## 2. Missing Fields — Phân Tích Gap

### 2.1 Behavioral Fields (THIẾU)

| Field | Type | Mô tả | Priority |
|-------|------|--------|----------|
| `lastPurchaseDate` | Date | Ngày mua hàng gần nhất | P0 |
| `firstPurchaseDate` | Date | Ngày mua hàng đầu tiên | P0 |
| `avgOrderValue` | number | AOV trung bình | P0 |
| `purchaseFrequency` | number | Số ngày trung bình giữa 2 đơn | P1 |
| `preferredCategories` | string[] | Danh mục hay mua | P1 |
| `preferredPaymentMethod` | string | Thanh toán ưa thích | P1 |
| `lastContactDate` | Date | Lần liên lạc gần nhất | P1 |
| `contactCount` | number | Số lần đã liên hệ | P2 |
| `avgResponseTime` | number | Thời gian phản hồi trung bình (phút) | P2 |

### 2.2 Engagement Fields (THIẾU)

| Field | Type | Mô tả | Priority |
|-------|------|--------|----------|
| `engagementScore` | number | Score tổng hợp engagement 0-100 | P0 |
| `healthScore` | number | Customer health score 0-100 | P0 |
| `openRate` | number | Tỷ lệ mở tin nhắn | P1 |
| `clickRate` | number | Tỷ lệ click trong messages | P1 |
| `lastEngagementDate` | Date | Lần tương tác gần nhất (mọi channel) | P1 |
| `totalMessagesSent` | number | Tổng tin nhắn đã gửi cho KH | P2 |
| `totalMessagesReceived` | number | Tổng tin nhắn KH đã gửi | P2 |

### 2.3 Profile Enrichment Fields (THIẾU)

| Field | Type | Mô tả | Priority |
|-------|------|--------|----------|
| `birthDate` | Date | Ngày sinh (personalization) | P1 |
| `gender` | enum | male/female/other | P2 |
| `location` | string | Tỉnh/thành phố | P1 |
| `address` | string | Địa chỉ giao hàng mặc định | P1 |
| `segment` | string | Segment label (RFM, behavioral) | P1 |
| `tags` | string[] | Custom tags | P2 |
| `persona` | string | AI-assigned persona type | P2 |

### 2.4 Financial Fields (THIẾU)

| Field | Type | Mô tả | Priority |
|-------|------|--------|----------|
| `totalRefunds` | number | Tổng tiền hoàn trả | P1 |
| `totalRefundCount` | number | Số lần hoàn hàng | P1 |
| `netRevenue` | number | totalSpent - totalRefunds | P0 |
| `predictedLtv` | number | LTV dự báo 12 tháng tới | P1 |
| `clv` | number | Customer Lifetime Value hiện tại | P0 |

### 2.5 Platform-Specific Fields (THIẾU)

| Field | Type | Mô tả | Priority |
|-------|------|--------|----------|
| `tiktokId` | string | TikTok user ID | P0 |
| `instagramId` | string | Instagram user ID | P2 |
| `referralCode` | string | Mã giới thiệu của KH | P1 |
| `referredBy` | string | Ai giới thiệu KH này | P1 |
| `referralCount` | number | Số người KH đã giới thiệu | P1 |

---

## 3. Proposed Extended Customer Profile

```typescript
// Customer Entity — Target State V3
@Entity('customers')
export class CustomerV3 {
  // === IDENTITY (hiện có) ===
  id: string
  name: string
  phone: string
  email: string
  telegramId: string
  facebookId: string
  zaloId: string
  tiktokId: string          // THÊM MỚI
  note: string
  acquisitionSource: string

  // === SEGMENTATION ===
  tier: 'new' | 'regular' | 'vip'
  segment: string            // THÊM: 'champion' | 'loyal' | 'at-risk' | 'lost' | ...
  tags: string[]             // THÊM: custom labels
  persona: string            // THÊM: AI-assigned persona

  // === BEHAVIORAL METRICS (hiện có) ===
  totalOrders: number
  totalSpent: number
  ltv: number

  // === BEHAVIORAL METRICS (THÊM MỚI) ===
  firstPurchaseDate: Date
  lastPurchaseDate: Date
  avgOrderValue: number
  purchaseFrequency: number   // ngày giữa 2 đơn
  preferredCategories: string[]
  preferredPaymentMethod: string
  netRevenue: number
  clv: number
  predictedLtv: number
  totalRefunds: number
  totalRefundCount: number

  // === ENGAGEMENT METRICS (THÊM MỚI) ===
  engagementScore: number    // 0-100
  healthScore: number        // 0-100
  churnRisk: number          // hiện có, 0-1
  lastContactDate: Date
  lastEngagementDate: Date
  openRate: number
  clickRate: number

  // === PROFILE DATA (THÊM MỚI) ===
  birthDate: Date
  gender: string
  location: string
  address: string

  // === REFERRAL (THÊM MỚI) ===
  referralCode: string
  referredBy: string
  referralCount: number

  // === TIMESTAMPS ===
  createdAt: Date
  updatedAt: Date
}
```

---

## 4. Profile Enrichment Plan

### Phase 1: Auto-computed fields (từ Order data — không cần input mới)

```
Trigger: sau mỗi Order.status = 'delivered'

Compute:
  totalOrders = COUNT(orders WHERE customerId = X)
  totalSpent = SUM(orders.total WHERE customerId = X)
  lastPurchaseDate = MAX(orders.createdAt WHERE customerId = X)
  firstPurchaseDate = MIN(orders.createdAt WHERE customerId = X)
  avgOrderValue = totalSpent / totalOrders
  purchaseFrequency = AVG(days between consecutive orders)
  netRevenue = totalSpent - totalRefunds
  clv = netRevenue (actual, không dự báo)
```

### Phase 2: AI-computed fields (từ chat history + behavior)

```
Trigger: hàng ngày, batch job

Compute via AI Agent:
  engagementScore = weighted(openRate, clickRate, purchaseFreq, lastEngagement)
  healthScore = algorithm (xem customer_health_score.md)
  churnRisk = ML model prediction
  preferredCategories = top categories từ order history
  persona = AI classification từ chat history
  segment = RFM-based segmentation
  predictedLtv = regression model * 12 months
```

### Phase 3: Manual/collected fields

```
Collection points:
  birthDate → Birthday campaign opt-in form
  gender → AI inference từ tên hoặc profile picture
  location → từ shipping address trong Order
  address → từ Order.shippingAddress (last used)
```

### Phase 4: Platform enrichment

```
Facebook Graph API → avatar, name verification
Telegram API → username, language_code
Zalo API → profile picture, location
TikTok API → tiktokId linking
```

---

## 5. Data Quality Assessment

| Field Group | Completeness | Accuracy | Freshness |
|-------------|-------------|----------|-----------|
| Identity (phone/name) | 85% | 90% | Static |
| Platform IDs | 60% (tiktok missing) | 95% | Static |
| Behavioral metrics | 70% (computed) | 95% | Real-time |
| Engagement metrics | 20% | N/A | Thiếu tracking |
| Profile data | 30% | 70% | Stale |
| Financial metrics | 65% | 90% | Per-order update |

**Overall data quality score: 57/100**

---

## 6. Privacy & Compliance Considerations

| Data Type | PDPA Requirement | Current Status |
|-----------|-----------------|----------------|
| Phone number | Consent required | THIẾU consent tracking |
| Email | Consent required | THIẾU consent tracking |
| Chat history | Opt-in required | THIẾU opt-in mechanism |
| Location | Consent required | THIẾU |
| Purchase history | Legitimate interest | CO |
| Behavioral tracking | Consent required | THIẾU |

**Gap:** Cần thêm `consentGiven: boolean`, `consentDate: Date`, `consentVersion: string` vào Customer entity để đảm bảo PDPA compliance.

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
