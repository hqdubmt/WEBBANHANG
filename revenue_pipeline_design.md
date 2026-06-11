# Revenue Pipeline Design — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. End-to-End Revenue Pipeline Overview

```
MARKET → ATTRACT → CAPTURE → QUALIFY → CLOSE → FULFILL → RETAIN → GROW
  [0]      [1]       [2]       [3]       [4]      [5]       [6]     [7]
```

---

## 2. Pipeline Stage Detail

### Stage 0: MARKET (External)
**Mô tả:** Nơi khách hàng tiềm năng đang ở.

| Channel | Status | API Support |
|---------|--------|-------------|
| Facebook Ads | Ngoài hệ thống | THIẾU integration |
| TikTok Ads | Ngoài hệ thống | THIẾU integration |
| Zalo Ads | Ngoài hệ thống | THIẾU integration |
| SEO/Website | Next.js có | Basic |
| Referrals | THIẾU | THIẾU |

**API Endpoints hiện có:** Không có ad spend API

---

### Stage 1: ATTRACT (Traffic)
**Mô tả:** Kéo traffic từ market về channels của mình.

**Mechanisms:**
- Content marketing (Telegram channel, Facebook page)
- Paid ads
- Referral program (THIẾU)
- SEO (website THIẾU optimization)

**API Endpoints hiện có:**
```
THIẾU — không có traffic tracking endpoints
```

**Gaps:**
- Không có UTM tracking tự động
- Không có traffic analytics
- Không có content scheduling

---

### Stage 2: CAPTURE (Lead Acquisition)
**Mô tả:** Convert visitor thành Lead với thông tin liên lạc.

**API Endpoints hiện có:**
```
POST /api/leads                     ← Tạo lead mới
GET  /api/leads                     ← Danh sách leads
GET  /api/leads/:id                 ← Chi tiết lead
PATCH /api/leads/:id                ← Update lead
DELETE /api/leads/:id               ← Xóa lead
```

**Current state:** CO — Lead API đầy đủ CRUD

**Gaps:**
- Thiếu bulk import API (import từ ads manager)
- Thiếu duplicate detection
- Thiếu lead source attribution accuracy

---

### Stage 3: QUALIFY (Lead Scoring)
**Mô tả:** Phân loại leads nào có khả năng mua.

**API Endpoints hiện có:**
```
PATCH /api/leads/:id               ← Manual status update (contacted/qualified)
GET /api/leads?status=new          ← Filter by status
```

**AI Agent support:**
```
POST /api/agents/qualify           ← AI qualification (cần confirm tên endpoint)
```

**Current state:** CO PHẦN — Manual qualification, AI scoring chưa rõ

**Gaps:**
- Thiếu automated AI lead scoring
- Thiếu lead priority ranking
- Thiếu qualification criteria configuration

---

### Stage 4: CLOSE (Conversion)
**Mô tả:** Convert qualified lead thành paying customer.

**API Endpoints hiện có:**
```
POST /api/orders                    ← Tạo order mới
GET  /api/orders                    ← Danh sách orders
GET  /api/orders/:id                ← Chi tiết order
PATCH /api/orders/:id               ← Update order
GET  /api/orders/revenue            ← Revenue từ orders ← CO

POST /api/leads/:id/convert         ← Convert lead to customer (cần confirm)
```

**Current state:** CO — Order creation API hoạt động

**Gaps:**
- Thiếu online payment gateway (VNPay/Momo/ZaloPay)
- Thiếu cart/checkout flow trên website
- Thiếu automated closing sequence
- Thiếu offer/discount code engine

---

### Stage 5: FULFILL (Order Processing)
**Mô tả:** Xử lý đơn hàng, giao hàng, collect payment.

**API Endpoints hiện có:**
```
PATCH /api/orders/:id               ← Update order status
GET  /api/orders/:id                ← Check order status
```

**Fulfillment status flow:**
```
pending → confirmed → processing → shipped → delivered → completed
                                          ↘ cancelled
                                          ↘ returned
```

**Current state:** CO PHẦN — Status tracking có, thiếu integration

**Gaps:**
- Thiếu shipping carrier API (GHN/GHTK/ViettelPost)
- Thiếu automatic status update từ carrier
- Thiếu payment confirmation webhook
- Thiếu invoice generation
- Thiếu COD reconciliation

---

### Stage 6: RETAIN (Customer Retention)
**Mô tả:** Giữ khách hàng quay lại mua lần 2, 3, ...

**API Endpoints hiện có:**
```
GET  /api/customers                 ← Danh sách customers
GET  /api/customers/:id             ← Chi tiết customer
PATCH /api/customers/:id            ← Update customer
GET  /api/analytics/customers       ← Customer analytics
```

**Current state:** CO — Customer API đầy đủ, analytics basic

**Gaps:**
- Thiếu retention campaign API
- Thiếu automated follow-up trigger
- Thiếu loyalty points system
- Thiếu reactivation campaign

---

### Stage 7: GROW (Revenue Expansion)
**Mô tả:** Tăng revenue từ existing customers và new channels.

**API Endpoints hiện có:**
```
GET /api/analytics/revenue          ← Revenue analytics ← CO
GET /api/analytics/dashboard        ← Business dashboard ← CO
GET /api/business-os/dashboard      ← BOS dashboard ← CO
GET /api/agents/master/kpi          ← KPI metrics ← CO
```

**Current state:** CO PHẦN — Analytics có, action automation thiếu

**Gaps:**
- Thiếu product recommendation engine
- Thiếu upsell/cross-sell automation
- Thiếu new market expansion tools
- Thiếu competitor pricing intelligence

---

## 3. Pipeline Flow Diagram (Detailed)

```
Facebook/TikTok/Telegram/Website
         │
         ▼ UTM tracking (THIẾU)
    VISITOR SESSION
         │
         ▼ Lead form / Bot message
    POST /api/leads  ────────────── CO
         │
         ▼ AI Chat Agent
    KNOWLEDGE BRAIN query ──────── CO
         │
         ▼ Qualification
    PATCH /api/leads/:id (qualified) ─ Manual (CO), AI-auto (THIẾU)
         │
         ▼ Closing attempt
    POST /api/orders ─────────────── CO
         │
         ▼ Payment
    Payment Gateway ─────────────── THIẾU (COD chỉ)
         │
         ▼ Fulfillment
    Shipping API integration ─────── THIẾU
         │
         ▼ Delivery confirmed
    PATCH /api/orders/:id (delivered) ─ Manual
         │
         ▼ Auto-create Customer
    Customer entity ─────────────── CO (Manual trigger)
         │
         ▼ Retention sequence
    Follow-up automation ─────────── THIẾU
         │
         ▼
    GET /api/analytics/revenue ────── CO
```

---

## 4. Gap Analysis by Stage

| Stage | API Coverage | Automation | Integration | Priority |
|-------|-------------|------------|-------------|----------|
| Market | 0% | 0% | 0% | P2 |
| Attract | 10% | 0% | 10% | P2 |
| Capture | 80% | 30% | 60% | P1 |
| Qualify | 50% | 20% | 40% | P0 |
| Close | 70% | 30% | 20% | P0 |
| Fulfill | 40% | 10% | 5% | P0 |
| Retain | 60% | 5% | 20% | P0 |
| Grow | 50% | 10% | 10% | P1 |

---

## 5. Revenue Pipeline KPIs

```
Pipeline Health Metrics:
─────────────────────────────────────────────────────────

Capture:
  Lead Volume = total leads / period
  Lead Growth Rate = (this month - last month) / last month

Qualify:
  Qualification Rate = qualified / total_leads
  Time-to-Qualify = avg hours from new to qualified

Close:
  Conversion Rate = orders / qualified_leads
  Time-to-Close = avg hours from qualified to first_order
  Average Order Value = total_revenue / total_orders

Fulfill:
  Fulfillment Rate = delivered / orders_placed
  Avg Delivery Time = avg days to deliver
  Return Rate = returns / delivered

Retain:
  Repeat Rate = customers_with_2+_orders / total_customers
  Revenue from Existing = revenue_from_repeat / total_revenue

Grow:
  MoM Revenue Growth = (this_month - last_month) / last_month
  YoY Growth = (this_year - last_year) / last_year
  LTV:CAC Ratio = avg_ltv / avg_acquisition_cost
```

---

## 6. Critical Path to Revenue Automation

```
Week 1-2: Fix data pipeline
├── Auto-update Customer.totalOrders after Order delivered
├── Auto-compute lastPurchaseDate
└── Fix Lead → Customer auto-conversion

Week 3-4: Add payment processing
├── Integrate VNPay or Momo
└── Webhook for payment confirmation

Week 5-6: Add shipping integration
├── Integrate GHN or GHTK API
└── Auto-update order status from carrier

Week 7-8: Add retention automation
├── Post-delivery follow-up sequence
└── At-risk customer win-back

Week 9-10: Add analytics depth
├── /api/analytics/funnel endpoint
└── Revenue forecasting
```

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
