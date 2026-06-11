# KNOWLEDGE ARCHITECTURE — AI Social Commerce OS V3

**Ngày:** 2026-06-11  
**Phiên bản:** V1 (Đang hoạt động)

---

## TỔNG QUAN KIẾN TRÚC

Knowledge Brain là lớp tri thức trung tâm (SSOT) của toàn bộ AI Social Commerce OS. Nó tổng hợp dữ liệu từ PostgreSQL, RAG/Qdrant và thông qua Ollama để cung cấp intelligence cho mọi Agent và Executive AI.

```
┌─────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE BRAIN                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ PRODUCT  │  │ CUSTOMER │  │BUSINESS  │  │ MARKET   │   │
│  │Intelligence│ │Intelligence│ │Intelligence│ │Intelligence│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │          │
│  ┌────┴──────────────┴──────────────┴──────────────┴─────┐  │
│  │              Knowledge Aggregation Layer               │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────┴─────────────────────────────┐  │
│  │              Executive Questions Engine                │  │
│  │         (8 câu hỏi chiến lược tự động trả lời)        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↑                    ↑                   ↑
    PostgreSQL              Qdrant              Ollama
    (Structured)            (Vector)            (LLM)
```

---

## STACK CÔNG NGHỆ

| Thành phần | Công nghệ | Mục đích |
|-----------|---------|---------|
| Structured Data | PostgreSQL + TypeORM | Orders, Customers, Products, Leads |
| Vector Storage | Qdrant | Semantic search, embeddings |
| LLM | Ollama (local) | Text generation, understanding |
| Short-term Memory | Redis | Session cache, realtime |
| Service Layer | NestJS + TypeScript | Knowledge Brain Service |

---

## MEMORY TIERS

```
TIER 1 — SHORT TERM (Redis)
  • Duration: < 1 giờ
  • Use: Session data, real-time context
  • Access: Milliseconds

TIER 2 — MEDIUM TERM (PostgreSQL)
  • Duration: Days to weeks
  • Use: Operational knowledge, recent events
  • Access: < 100ms

TIER 3 — LONG TERM (Qdrant)
  • Duration: Permanent
  • Use: Business knowledge, market insights
  • Access: < 500ms (vector search)
```

---

## KNOWLEDGE ENTITY MODEL

```typescript
Knowledge {
  id: uuid
  type: KnowledgeType (product|faq|policy|training|marketing|affiliate|customer)
  title: string
  content: text
  sourceId: string (FK to source entity)
  sourceType: string
  status: active|inactive|pending
  isIndexed: boolean
  vectorId: string (Qdrant point ID)
  collection: string (Qdrant collection)
  domain: product|customer|business|market|operational
  tier: short_term|medium_term|long_term
  accuracy: 0-100
  completeness: 0-100
  freshness: 0-100
  businessValue: 0-100
  relationIds: string[] (linked knowledge IDs)
  expiresAt: Date
  tags: string[]
  meta: jsonb
  createdAt, updatedAt
}
```

---

## KNOWLEDGE GRAPH (Runtime)

```
Customers ←──── Orders ────→ Revenue
    ↑               ↓
    │            Products
    │               ↓
 Leads         Categories
    ↓               ↓
Conversations  Inventory
               ↓
            Suppliers
               ↓
         PriceAlerts
```

---

## API ENDPOINTS

| Endpoint | Chức năng |
|----------|-----------|
| GET /api/knowledge-brain/dashboard | Tổng quan tất cả domains |
| GET /api/knowledge-brain/product-intelligence | Domain sản phẩm |
| GET /api/knowledge-brain/customer-intelligence | Domain khách hàng |
| GET /api/knowledge-brain/business-intelligence | Domain kinh doanh |
| GET /api/knowledge-brain/market-intelligence | Domain thị trường |
| GET /api/knowledge-brain/operational-intelligence | Domain vận hành |
| GET /api/knowledge-brain/executive-questions | 8 câu hỏi chiến lược |
| POST /api/knowledge-brain/ask | RAG-powered Q&A |
| POST /api/knowledge-brain/ingest | Nạp knowledge mới |
| GET /api/knowledge-brain/stats | Thống kê quality |

---

## INTEGRATION POINTS

```
Knowledge Brain
├── Được gọi bởi:
│   ├── Sales Agent (product & customer context)
│   ├── CRM Agent (customer history)
│   ├── Content Agent (market insights)
│   ├── Executive AI (all domains)
│   └── Business OS (dashboard)
│
└── Cung cấp cho:
    ├── RAG context cho LLM
    ├── Executive questions (8 câu tự trả lời)
    ├── Business intelligence aggregations
    └── Knowledge graph visualization
```
