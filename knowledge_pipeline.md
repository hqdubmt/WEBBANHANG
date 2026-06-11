# KNOWLEDGE PIPELINE — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## PIPELINE TỔNG QUAN

```
DATA SOURCES
    │
    ▼
┌──────────────────────┐
│     EXTRACT          │  PostgreSQL entities, Agent outputs
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│    NORMALIZE         │  Chuẩn hóa thành KnowledgeItem
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│      ENRICH          │  Gán domain, tier, accuracy, businessValue
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│    EMBEDDING         │  Ollama → 1536-dim vector
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  QDRANT INDEXING     │  Upsert vào collection tương ứng
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│ KNOWLEDGE RETRIEVAL  │  Sẵn sàng phục vụ RAG
└──────────────────────┘
```

---

## INGESTION TRIGGERS

### Manual Ingest
```
POST /api/knowledge-brain/ingest
{
  domain: "product" | "customer" | "business" | "market" | "operational",
  title: string,
  content: string,
  tier?: "short_term" | "medium_term" | "long_term",
  accuracy?: 0-100,
  completeness?: 0-100,
  businessValue?: 0-100,
  tags?: string[]
}
```

### Agent-triggered Ingest (Knowledge Agent)
```
POST /api/agents/knowledge/add
{
  type: KnowledgeType,
  title: string,
  content: string,
  sourceId?: string,
  tags?: string[]
}
```

### Sync from existing entities
```
POST /api/agents/knowledge/sync
→ Lấy products, customers, orders từ PostgreSQL
→ Tạo knowledge items
→ Upsert lên Qdrant
```

---

## INGESTION FLOW (Code)

```typescript
// knowledge-brain.service.ts: ingestKnowledge()

1. Tạo Knowledge entity với metadata
2. Save vào PostgreSQL (status=ACTIVE, isIndexed=false)
3. Map domain → Qdrant collection
4. Gọi ragService.upsert(collection, id, text, payload)
   ├── Embed text qua aiService.embed()  ← Ollama /api/embeddings
   └── Upsert vào Qdrant với vector + payload
5. Update knowledge.isIndexed = true, indexedAt = now
6. Return saved Knowledge entity
```

---

## EMBEDDING PROCESS

```
Text Input
    │
    ▼
AiService.embed(text)
    │
    ▼
POST http://ollama:11434/api/embeddings
{
  model: process.env.OLLAMA_MODEL || "llama3.2",
  prompt: text
}
    │
    ▼
Response: { embedding: number[] } (1536 dimensions)
    │
    ▼
Qdrant upsert: { id: numericId, vector: embedding, payload: metadata }
```

---

## QDRANT COLLECTIONS

| Collection | Domain | Dữ liệu |
|-----------|--------|---------|
| products | PRODUCT | Product descriptions, features, pricing |
| customers | CUSTOMER | Customer profiles, behaviors |
| faq | — | FAQs, policies |
| orders | — | Order patterns |
| affiliate | — | Affiliate knowledge |
| marketing | — | Marketing content |
| business | BUSINESS | Revenue insights, strategies |
| market | MARKET | Trends, competitor data |
| operational | OPERATIONAL | Agent logs, system events |

---

## PIPELINE HEALTH METRICS

Từ `GET /api/knowledge-brain/stats`:

```json
{
  "total": <total knowledge items>,
  "indexed": <items in Qdrant>,
  "coverage": "85%",
  "byDomain": [
    { "domain": "product", "count": N },
    { "domain": "customer", "count": N },
    ...
  ],
  "byTier": {
    "short_term": N,
    "medium_term": N,
    "long_term": N
  },
  "quality": {
    "accuracy": 0-100,
    "completeness": 0-100,
    "freshness": 0-100,
    "businessValue": 0-100
  }
}
```

---

## PIPELINE GAPS

| Gap | Ảnh hưởng |
|----|-----------|
| Không có scheduled ingestion | Knowledge cũ đi theo thời gian |
| Không có freshness decay | Dữ liệu 1 năm trước vẫn freshness=100 |
| Không có deduplication | Có thể ingest trùng |
| Không có versioning | Không biết knowledge thay đổi khi nào |
| Không có bulk ingest | Ingest từng item, chậm cho lúc đầu |
| Embedding model fixed 1536 | Nếu đổi model phải re-index toàn bộ |

---

## PIPELINE CẢI TIẾN ĐỀ XUẤT

1. **Scheduled Sync** — Cron job hàng ngày chạy `agents/knowledge/sync`
2. **Freshness Decay** — Job hàng tuần giảm freshness của knowledge cũ
3. **Batch Ingest** — API `/api/knowledge-brain/ingest/batch`
4. **Change Detection** — Chỉ re-index khi entity thực sự thay đổi
5. **Deduplication** — Check duplicate trước khi upsert
