# EMBEDDING STRATEGY — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## HIỆN TRẠNG EMBEDDING

### Primary: Ollama nomic-embed-text (Local)
```typescript
POST http://ollama:11434/api/embeddings
{
  "model": "nomic-embed-text",
  "prompt": "<text>"
}
// Response: { "embedding": [float32 x N] }
// Pad/truncate to 1536 dimensions
```
- ✅ Free, private, no API cost
- ⚠️ Native dimensions thấp hơn 1536 → padding ảnh hưởng quality
- ⚠️ Speed phụ thuộc hardware

### Fallback: OpenAI text-embedding-3-small
```typescript
POST https://api.openai.com/v1/embeddings
{
  "model": "text-embedding-3-small",
  "input": "<text>"
}
// Response: { "data": [{ "embedding": [float32 x 1536] }] }
```
- ✅ Native 1536 dimensions, chất lượng cao
- ❌ Paid API, data leaves server
- ✅ Faster (~100ms)

---

## VẤN ĐỀ EMBEDDING HIỆN TẠI

### 1. Mixed Embedding Models (CRITICAL)
```
Nếu OPENAI_API_KEY có → embed với OpenAI
Sau đó xóa OPENAI_API_KEY → embed với Ollama
→ Vectors trong Qdrant bị INCOMPATIBLE
→ Search kết quả sai hoàn toàn
```
**Fix:** Lưu embedding model được dùng vào `knowledge.meta.embeddingModel`
Re-index khi đổi model.

### 2. Vector Size Mismatch (HIGH)
```
nomic-embed-text native: ~768 dimensions
Qdrant collection: 1536 dimensions
→ Padding với 0s → artificial zeros ảnh hưởng Cosine similarity
```
**Fix:** Tạo collection với size đúng với model đang dùng.

### 3. No Embedding Cache (MEDIUM)
```
Cùng một text được embed nhiều lần
→ Lãng phí compute
→ Tăng latency
```
**Fix:** Redis cache với key = hash(text + model)

---

## RECOMMENDED EMBEDDING STRATEGY

### Strategy A: Chọn 1 model, dùng nhất quán
```
Production với privacy: nomic-embed-text (768d) → Qdrant 768d
Production với quality: OpenAI ada-002 (1536d) → Qdrant 1536d
```

### Strategy B: Multiple models per collection
```
products collection: OpenAI (quality important)
operational collection: Ollama (privacy important)
```
⚠️ Phức tạp, không khuyến nghị.

---

## EMBEDDING MODELS COMPARISON

| Model | Dims | Speed | Quality | Cost | Privacy |
|-------|------|-------|---------|------|---------|
| nomic-embed-text | 768 | Medium | Good | Free | ✅ Local |
| OpenAI text-embedding-3-small | 1536 | Fast | Very Good | Paid | ❌ Cloud |
| OpenAI text-embedding-3-large | 3072 | Medium | Excellent | Paid | ❌ Cloud |
| mxbai-embed-large (Ollama) | 1024 | Medium | Very Good | Free | ✅ Local |

**Recommendation:** `mxbai-embed-large` — free, local, 1024d chất lượng cao.

---

## EMBEDDING CACHE PLAN (Redis)

```typescript
// Trong RagService.embed():
async embed(text: string): Promise<number[]> {
  const cacheKey = `embedding:${hash(text + model)}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const vector = await this.ollamaEmbed(text); // or openAiEmbed
  
  await redis.setex(cacheKey, 3600, JSON.stringify(vector)); // 1h TTL
  
  return vector;
}
```
**Lợi ích:** 
- Repeated queries → instant (Redis ~1ms vs Ollama ~300ms)
- Giảm load lên Ollama

---

## DOMAIN-SPECIFIC EMBEDDINGS

Mỗi domain nên có embedding context:

| Domain | Prefix |
|--------|--------|
| PRODUCT | `[PRODUCT CATALOG]` |
| CUSTOMER | `[CUSTOMER PROFILE]` |
| BUSINESS | `[BUSINESS INTELLIGENCE]` |
| MARKET | `[MARKET INTELLIGENCE]` |
| OPERATIONAL | `[SYSTEM OPERATIONS]` |

Prefix giúp model hiểu context tốt hơn.

---

## PRODUCTION METRICS

Cần monitor:
- Average embedding latency per model
- Cache hit rate
- Failed embeddings count
- Vector dimension consistency per collection
