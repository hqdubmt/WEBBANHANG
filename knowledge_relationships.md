# KNOWLEDGE RELATIONSHIPS — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## SƠ ĐỒ QUAN HỆ TRI THỨC

```
                    ┌─────────┐
                    │ MARKET  │
                    │Knowledge│
                    └────┬────┘
                         │ định hình nhu cầu
                         ▼
┌──────────┐        ┌─────────┐        ┌──────────────┐
│ CUSTOMER │        │ PRODUCT │        │  OPERATIONAL │
│Knowledge │        │Knowledge│        │  Knowledge   │
└────┬─────┘        └────┬────┘        └──────┬───────┘
     │                   │                    │
     │ creates            │ in                 │ monitors
     ▼                   ▼                    ▼
┌─────────┐        ┌─────────┐        ┌──────────────┐
│  ORDERS │────────│ORDER    │        │ AGENT HEALTH │
│         │        │ITEMS    │        │              │
└────┬────┘        └─────────┘        └──────────────┘
     │
     │ generates
     ▼
┌──────────────┐
│   BUSINESS   │
│  Knowledge   │
│ (Revenue,    │
│  Growth,     │
│  Conversion) │
└──────────────┘
```

---

## KNOWLEDGE GRAPH NODES (Runtime)

| Node | Count Source | Domain |
|------|-------------|--------|
| customers | customerRepo.count() | CUSTOMER |
| orders | orderRepo.count() | BUSINESS |
| products | productRepo.count() | PRODUCT |
| revenue | SUM(orders.total) | BUSINESS |
| leads | leadRepo.count() | CUSTOMER |
| market | priceAlerts.count() | MARKET |

---

## KNOWLEDGE GRAPH EDGES (Runtime)

| From | To | Label | Logic |
|------|----|-------|-------|
| customers | orders | tạo ra | 1 customer → N orders |
| orders | products | chứa | Orders → OrderItems → Products |
| orders | revenue | sinh ra | SUM(order.total) |
| leads | customers | chuyển đổi | lead.status = CONVERTED |
| market | products | định hình nhu cầu | price alerts per product |

---

## CROSS-DOMAIN RELATIONSHIPS

### Product ↔ Customer
```
Products that customer X buys
    → Customer preference profile
    → Personalized recommendations
    → Upsell opportunities
```

### Customer ↔ Business
```
High-value customers
    → Revenue concentration risk
    → Retention priority
    → LTV calculation
```

### Market ↔ Products
```
Competitor prices (price_alerts)
    → Repricing recommendations
    → Product prioritization
    → Competitive positioning
```

### Operational ↔ All
```
Agent failures
    → Content not generated
    → Leads not captured
    → Revenue at risk
```

---

## KNOWLEDGE RELATIONS TABLE

Lưu trong `knowledge.relationIds: string[]` — array of knowledge IDs liên quan:

**Ví dụ:**
```json
{
  "id": "product-abc-123",
  "title": "iPhone 15 Pro",
  "domain": "product",
  "relationIds": [
    "customer-segment-premium-123",  // Khách hàng mua iPhone
    "market-competitor-456",          // Giá đối thủ cho iPhone
    "campaign-iphone-789"             // Chiến dịch marketing iPhone
  ]
}
```

---

## AGENT KNOWLEDGE DEPENDENCIES

| Agent | Knowledge Domains cần | Relationship |
|-------|----------------------|-------------|
| Sales Agent | PRODUCT, CUSTOMER | Tư vấn đúng sản phẩm, lịch sử khách |
| CRM Agent | CUSTOMER, BUSINESS | Chăm sóc khách hàng có thông tin |
| Content Agent | PRODUCT, MARKET | Tạo nội dung đúng trend |
| Executive AI | ALL 5 domains | Insight toàn diện |
| Revenue Autopilot | BUSINESS, MARKET | Tối ưu doanh thu |

---

## KNOWLEDGE FRESHNESS DECAY MODEL (Đề xuất)

```
freshness = 100 * exp(-k * days_since_update)

Product knowledge:   k = 0.01  (decay ~50% sau 70 ngày)
Customer knowledge:  k = 0.02  (decay ~50% sau 35 ngày)
Market knowledge:    k = 0.05  (decay ~50% sau 14 ngày)
Business knowledge:  k = 0.03  (decay ~50% sau 23 ngày)
Operational:         k = 0.1   (decay ~50% sau 7 ngày)
```
