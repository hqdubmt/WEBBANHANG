# Customer Profile Framework — 360° View — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Customer Profile Fields (từ Customer Entity)

### Core Identity
| Field | Type | Mô tả |
|-------|------|-------|
| `id` | UUID | Primary key — duy nhất toàn hệ thống |
| `name` | string | Tên khách hàng |
| `phone` | string (indexed) | SĐT — key identifier |
| `email` | string (indexed) | Email — optional |

### Multi-Channel Identity
| Field | Type | Platform |
|-------|------|----------|
| `telegramId` | string | Telegram Bot integration |
| `facebookId` | string | Facebook Messenger |
| `zaloId` | string | Zalo OA |

> Một customer có thể có nhiều channel IDs — cross-channel dedup dựa trên phone/email.

### Customer Classification
| Field | Type | Values |
|-------|------|--------|
| `tier` | enum (indexed) | `new` / `regular` / `vip` |
| `acquisitionSource` | string | `facebook` / `tiktok` / `google` / `referral` / `direct` |
| `churnRisk` | decimal(5,2) | 0.00 – 100.00 (0 = rất gắn kết, 100 = sắp rời bỏ) |

### Financial Metrics
| Field | Type | Công thức |
|-------|------|-----------|
| `totalOrders` | integer | COUNT(orders WHERE status=delivered) |
| `totalSpent` | decimal(15,2) | SUM(order.total WHERE status=delivered) |
| `ltv` | decimal(15,2) | Projected lifetime value = avgOrder × avgFrequency × lifespan |

### Contextual
| Field | Type | Mô tả |
|-------|------|-------|
| `address` | string | Địa chỉ giao hàng mặc định |
| `birthday` | string | Dùng cho birthday campaigns |
| `note` | text | Agent notes |

---

## 2. Customer 360° View — Data Sources

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER 360° VIEW                                    │
│                    customer.id = :customerId                             │
├──────────────────────┬──────────────────────┬────────────────────────── ┤
│   ORDER HISTORY       │   LEAD HISTORY        │   CONVERSATIONS           │
│   orders table        │   leads table         │   Qdrant vector store     │
│   ─────────────────   │   ─────────────────   │   ──────────────────────  │
│   totalOrders: N      │   platform: FB/TG/ZL  │   collection:             │
│   totalSpent: X VND   │   firstContact: date  │   customer_profiles       │
│   avgOrderValue       │   conversionDays      │   semantic search over    │
│   lastOrderDate       │   intent: buy/ask     │   chat history            │
│   favoriteProducts    │   leadScore: 0-100    │   support tickets         │
│   repeatRate          │   status history      │                           │
├──────────────────────┼──────────────────────┼───────────────────────────┤
│   CAMPAIGNS RECEIVED  │   KNOWLEDGE RECORDS   │   AGENT INTERACTIONS      │
│   campaigns table     │   knowledge table     │   agent_logs table        │
│   ─────────────────   │   ─────────────────   │   ──────────────────────  │
│   emailsSent          │   domain: CUSTOMER    │   crm_agent runs          │
│   messagesReceived    │   type: customer      │   sales_agent touches     │
│   couponsUsed         │   sourceId: custId    │   telegram_agent msgs     │
│   campaignResponse    │   content: insights   │   decisions logged        │
└──────────────────────┴──────────────────────┴───────────────────────────┘
```

---

## 3. API — Customer Profile

```
GET /api/agents/crm/customer/:id
```

**Response structure:**
```json
{
  "customer": {
    "id": "uuid",
    "name": "Nguyễn Văn A",
    "phone": "0901234567",
    "tier": "regular",
    "totalOrders": 5,
    "totalSpent": 2500000,
    "ltv": 8000000,
    "churnRisk": 23.5,
    "acquisitionSource": "facebook",
    "channels": ["facebook", "telegram"]
  },
  "recentOrders": [...],
  "leadHistory": [...],
  "segmentMembership": ["active", "repeat_buyer"],
  "recommendations": {
    "nextAction": "send_loyalty_offer",
    "urgency": "medium",
    "suggestedProduct": "..."
  }
}
```

---

## 4. Profile Enrichment Pipeline

```
New Customer Created
      │
      ▼
[Step 1: Source Attribution]
  acquisitionSource = lead.platform nếu converted từ lead
  acquisitionSource = order.source nếu direct order
      │
      ▼
[Step 2: Channel Linking]
  Match phone/email với leads table
  Link telegramId/facebookId/zaloId từ platform messages
      │
      ▼
[Step 3: Initial Scoring]
  churnRisk = 0 (new customer)
  tier = 'new'
      │
      ▼
[Step 4: Knowledge Indexing]
  Create Knowledge record (domain=CUSTOMER, type=customer)
  Embed via Qdrant → searchable by semantic queries
      │
      ▼
[Step 5: Ongoing Updates]
  On each delivered order:
    - totalOrders++
    - totalSpent += order.total
    - ltv = recalculate
    - tier = re-evaluate
    - churnRisk = recalculate
```

---

## 5. LTV Calculation Model

```
LTV = AOV × Purchase_Frequency × Customer_Lifespan

Trong đó:
  AOV (Average Order Value) = totalSpent / totalOrders
  Purchase_Frequency        = totalOrders / months_since_first_order
  Customer_Lifespan         = 24 months (default industry assumption)

Ví dụ:
  totalSpent = 3,000,000 VND
  totalOrders = 6
  First order: 6 months ago

  AOV = 500,000
  Freq = 1 order/month
  LTV = 500,000 × 1 × 24 = 12,000,000 VND
```

---

## 6. Missing Data Strategy

| Gap | Impact | Solution |
|-----|--------|----------|
| Không có conversation history lưu trong DB | Không thể trace đầy đủ | Lưu tóm tắt conversation vào Knowledge table (domain=CUSTOMER) |
| Birthday field là string, không validate | Không trigger birthday campaign | Normalize sang DATE format |
| Không có last_active_at field | Không biết activity recency | Add computed từ MAX(orders.createdAt, leads.updatedAt) |
| facebookId/zaloId chưa auto-populated | Profile incomplete | Platform agents cần update field này khi nhận message |
