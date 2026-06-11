# RAG INTEGRATION PLAN — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## TRẠNG THÁI HIỆN TẠI

RAG System đã được implement và tích hợp vào Knowledge Brain. Đây là kế hoạch mở rộng và tối ưu.

### Đã có (Implemented)
- ✅ RagService với Qdrant client
- ✅ 9 Qdrant collections (products, customers, faq, orders, affiliate, marketing, business, market, operational)
- ✅ Embedding via Ollama `/api/embeddings`
- ✅ Cosine similarity search
- ✅ Knowledge Brain tích hợp RAG cho `ask()`
- ✅ Knowledge Agent có `sync()`, `add()`, `search()`
- ✅ Auto-init collections khi app khởi động

### Chưa có (To Implement)
- ❌ Reranking
- ❌ Hybrid search (vector + keyword)
- ❌ Source citations trong responses
- ❌ Confidence calibration
- ❌ Streaming responses
- ❌ Caching of embeddings
- ❌ Multi-collection search
- ❌ Scheduled re-indexing

---

## RETRIEVAL FLOW HIỆN TẠI

```typescript
// rag.service.ts: retrieveContext()

async retrieveContext(question: string, collections: RagCollection[]) {
  1. Embed question → vector
  2. Search mỗi collection (top 5)
  3. Merge results
  4. Deduplicate
  5. Format thành context string
  6. Return context
}

// Sau đó Knowledge Brain:
7. Gọi aiService.generate(prompt + context, systemPrompt)
8. Return answer
```

---

## RETRIEVAL FLOW ĐỀ XUẤT (Nâng cấp)

```
Question
    │
    ▼
Intent Classification
(product? customer? business? market?)
    │
    ▼
Multi-Collection Search
(parallel Qdrant calls)
    │
    ▼
Result Merging + Deduplication
    │
    ▼
Reranking
(by relevance score × business_value × freshness)
    │
    ▼
Top-K Selection (k=5)
    │
    ▼
Context Assembly
    │
    ▼
Prompt Construction
│
├── System: "Bạn là Knowledge Brain..."
├── Context: [retrieved chunks]
├── Business Rules: [policies]
└── Question: "..."
    │
    ▼
Ollama LLM
    │
    ▼
Answer + Source References
```

---

## AGENT INTEGRATION PLAN

### Sales Agent ← RAG
```typescript
// Khi Sales Agent tư vấn khách hàng:
1. Nhận câu hỏi từ khách
2. Gọi ragService.search(PRODUCTS, question, 5)
3. Gọi ragService.search(CUSTOMERS, customerId, 3)
4. Assemble context
5. Generate personalized response
```
**Status:** Hiện tại Sales Agent dùng KnowledgeBrainService.ask() — ✅ tích hợp gián tiếp

### CRM Agent ← RAG
```typescript
// Khi CRM Agent phân tích khách hàng:
1. Lấy customer history từ PostgreSQL
2. Search CUSTOMERS collection
3. Search BUSINESS collection (patterns)
4. Generate CRM recommendations
```
**Status:** ⚠️ Cần implement

### Content Agent ← RAG
```typescript
// Khi Content Agent tạo nội dung:
1. Search PRODUCTS collection (product info)
2. Search MARKET collection (trends)
3. Use as context cho content generation
```
**Status:** ⚠️ Cần implement

### Executive AI ← RAG
```typescript
// Khi Executive AI trả lời câu hỏi chiến lược:
1. Search ALL collections
2. Business intelligence aggregation
3. Generate strategic insight
```
**Status:** ✅ Thông qua KnowledgeBrainService.ask() và getExecutiveQuestions()

---

## PERFORMANCE TARGETS

| Metric | Target | Hiện tại |
|--------|--------|---------|
| Embedding latency | < 500ms | Phụ thuộc Ollama |
| Qdrant search latency | < 100ms | < 100ms ✅ |
| Context assembly | < 200ms | ~100ms ✅ |
| LLM generation | < 5s | 2-20s ⚠️ |
| Full RAG response | < 6s | 3-25s ⚠️ |

---

## SECURITY TRONG RAG

| Yêu cầu | Trạng thái |
|---------|-----------|
| Tenant isolation trong Qdrant | ❌ Chưa có |
| Không lộ sensitive data qua RAG | ⚠️ Cần review |
| Log mọi RAG query | ❌ Chưa có |
| Rate limit RAG queries | ❌ Chưa có |
