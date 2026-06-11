# RAG ARCHITECTURE — AI Social Commerce OS V3

**Ngày:** 2026-06-11  
**Trạng thái:** Đang hoạt động (Production-ready với limitations)

---

## TỔNG QUAN

RAG (Retrieval Augmented Generation) là lớp truy xuất tri thức trung tâm. Thay vì để LLM "đoán", hệ thống tìm kiếm context thực từ Qdrant trước khi generate.

```
          USER QUESTION
               │
               ▼
    ┌──────────────────────┐
    │    EMBEDDING ENGINE  │
    │  (Ollama nomic-embed │
    │   or OpenAI ada-002) │
    └──────────┬───────────┘
               │ vector [1536d]
               ▼
    ┌──────────────────────┐
    │   QDRANT VECTOR DB   │
    │  9 collections       │
    │  Cosine similarity   │
    └──────────┬───────────┘
               │ top-K results
               ▼
    ┌──────────────────────┐
    │  CONTEXT ASSEMBLY    │
    │  Sort by score       │
    │  Deduplicate         │
    │  Format to string    │
    └──────────┬───────────┘
               │ context string
               ▼
    ┌──────────────────────┐
    │   PROMPT BUILDER     │
    │  System + Context +  │
    │  Question            │
    └──────────┬───────────┘
               │ full prompt
               ▼
    ┌──────────────────────┐
    │    OLLAMA LLM        │
    │  (llama3.2 default)  │
    └──────────┬───────────┘
               │
               ▼
           ANSWER
```

---

## STACK CÔNG NGHỆ

| Thành phần | Công nghệ | Config |
|-----------|---------|-------|
| Vector DB | Qdrant | `QDRANT_URL`, `QDRANT_API_KEY` |
| Embedding | Ollama nomic-embed-text | `OLLAMA_URL` |
| Embedding alt | OpenAI text-embedding-3-small | `OPENAI_API_KEY` (optional) |
| LLM | Ollama llama3.2 | `OLLAMA_MODEL` |
| LLM alt | Any OpenAI-compatible | — |
| Vector size | 1536 dimensions | Hardcoded |
| Distance metric | Cosine similarity | Qdrant config |

---

## QDRANT COLLECTIONS

| Collection | Use Case | Dữ liệu |
|-----------|---------|---------|
| products | Product Q&A, recommendations | Product descriptions, prices |
| customers | Customer history, preferences | Customer profiles |
| faq | General questions | FAQ pairs |
| orders | Order patterns | Order summaries |
| affiliate | Affiliate knowledge | Partner info |
| marketing | Content strategy | Marketing materials |
| business | Business insights | Revenue, KPI data |
| market | Market intelligence | Trends, competitor data |
| operational | System knowledge | Agent logs, performance |

---

## EMBEDDING STRATEGY

### Primary: Ollama nomic-embed-text
- **Model:** `nomic-embed-text`
- **Dimensions:** Variable, padded/truncated to 1536
- **Endpoint:** `POST {OLLAMA_URL}/api/embeddings`
- **Cost:** Free (local)
- **Speed:** ~200-500ms per text

### Fallback: OpenAI text-embedding-3-small
- **Model:** `text-embedding-3-small`
- **Dimensions:** 1536 native
- **Endpoint:** `POST https://api.openai.com/v1/embeddings`
- **Cost:** ~$0.02/1M tokens
- **Speed:** ~100-300ms per text

**Logic:** Nếu `OPENAI_API_KEY` có → dùng OpenAI, ngược lại → Ollama

**Vấn đề:** Dùng 2 embedding model khác nhau tạo ra **incompatible vectors**. Một khi đã index với Ollama, không thể query với OpenAI và ngược lại.

---

## RETRIEVAL FLOW (Code)

```typescript
// RagService.retrieveContext(query, collections)

1. for each collection in collections:
   a. embed(query) → vector
   b. POST /collections/{col}/points/search
      { vector, limit: 3, with_payload: true }
   c. Map → SearchResult[]

2. Merge all results
3. Sort by score DESC
4. Take top 5
5. Extract payload._text
6. Join with "\n\n---\n\n"
7. Return context string
```

**Vấn đề:** Collections được search sequential (not parallel). Với 9 collections, có thể có 9 sequential HTTP calls.

---

## INDEXING METHODS

### indexProduct()
```typescript
text = `Sản phẩm: {name}. Danh mục: {category}. Giá: {price}đ. 
        Mô tả: {description}. Link: {affiliateLink}`
upsert(PRODUCTS, product.id, text, payload)
```

### indexFaq()
```typescript
text = `Q: {question}\nA: {answer}`
upsert(FAQ, id, text, { question, answer })
```

### Generic ingestKnowledge()
```typescript
text = `[{DOMAIN.toUpperCase()}] {title}\n{content}`
upsert(collection, id, text, { title, domain, tier, tags })
```

---

## GRACEFUL DEGRADATION

```typescript
// Khi Qdrant unavailable:
this.ready = false

// Mọi call:
if (!this.ready) return [] / return ''

// KnowledgeBrain.ask():
if (!context) return {
  answer: "Knowledge Brain chưa có đủ dữ liệu...",
  confidence: 0
}
```

✅ Hệ thống không crash khi Qdrant down — graceful degradation tốt.

---

## SECURITY

| Thành phần | Trạng thái |
|-----------|-----------|
| QDRANT_API_KEY support | ✅ Có (optional) |
| Tenant isolation | ❌ Thiếu |
| Query rate limiting | ❌ Thiếu |
| Query audit logging | ❌ Thiếu |
| Sensitive data filtering | ❌ Thiếu |
