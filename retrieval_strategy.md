# RETRIEVAL STRATEGY — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## RETRIEVAL FLOW HIỆN TẠI

```typescript
// RagService.retrieveContext(query, collections)

Step 1: Embed query → vector
Step 2: for each collection:
         search(col, query, limit=3)
Step 3: Merge all results
Step 4: Sort by score DESC
Step 5: Take top 5
Step 6: Join text với separator
Step 7: Return context string
```

**Điểm yếu:**
- Sequential collection searches (not parallel)
- Không có score_threshold → kết quả không liên quan vẫn được dùng
- Không có reranking
- Không có source citations trong context
- Không cache embedding

---

## RETRIEVAL STRATEGY ĐỀ XUẤT

### Stage 1: Query Understanding
```typescript
// Classify intent to select relevant collections
const intent = classifyQuery(query);
// intent → { collections: ['products', 'customers'], boost: ['products'] }
```

### Stage 2: Parallel Multi-Collection Search
```typescript
// Thay vì sequential:
const results = await Promise.all(
  collections.map(col => search(col, query, limit=5))
);
const merged = results.flat();
```

### Stage 3: Score Filtering
```typescript
// Loại bỏ kết quả không liên quan
const relevant = merged.filter(r => r.score > 0.65);
```

### Stage 4: Reranking
```typescript
// Rerank theo combined score:
const reranked = relevant.map(r => ({
  ...r,
  finalScore: r.score * 0.6 +          // Semantic similarity
              r.payload.freshness * 0.3 + // Knowledge freshness
              r.payload.businessValue * 0.1 // Business importance
})).sort((a,b) => b.finalScore - a.finalScore);
```

### Stage 5: Deduplication
```typescript
const unique = deduplicateByContent(reranked.slice(0, 10));
```

### Stage 6: Context Assembly with Sources
```typescript
const context = unique.slice(0, 5).map((r, i) => 
  `[${i+1}] ${r.payload._text}\n(Nguồn: ${r.payload.domain}, Freshness: ${r.payload.freshness}%)`
).join('\n\n---\n\n');
```

---

## COLLECTION SELECTION STRATEGY

Không phải lúc nào cũng search ALL collections.

| Query intent | Collections |
|-------------|------------|
| "Sản phẩm X có không?" | products |
| "Giá X bao nhiêu?" | products |
| "Khách hàng Y đã mua gì?" | customers, orders |
| "Chính sách đổi trả?" | faq |
| "Doanh thu tháng này?" | business |
| "Đối thủ đang bán giá bao nhiêu?" | market |
| "Agent nào đang lỗi?" | operational |
| General question | products, customers, business |

---

## QUERY EXPANSION (Đề xuất)

```typescript
// Mở rộng query để tìm kiếm tốt hơn
async expandQuery(query: string): Promise<string[]> {
  // Vietnamese synonyms + related terms
  const expansion = await aiService.generate(
    `Liệt kê 3-5 từ khóa liên quan đến: "${query}"`,
    'Chỉ liệt kê từ khóa, không giải thích.'
  );
  return [query, ...parseKeywords(expansion)];
}
```

---

## CONTEXT QUALITY SCORING

Đánh giá context trước khi dùng:
```typescript
function assessContextQuality(context: string, query: string): number {
  if (!context) return 0;
  
  const queryWords = query.toLowerCase().split(' ');
  const contextWords = context.toLowerCase().split(' ');
  
  const overlap = queryWords.filter(w => contextWords.includes(w)).length;
  const coverage = overlap / queryWords.length;
  
  return coverage; // 0-1
}

// Nếu coverage < 0.3 → context có thể không liên quan → tăng uncertainty
```

---

## PERFORMANCE TARGETS

| Metric | Target | Cải thiện |
|--------|--------|---------|
| Single collection search | < 100ms | ✅ OK |
| Multi-collection (sequential) | < 1s | ⚠️ Cần parallel |
| Multi-collection (parallel) | < 200ms | Với Promise.all |
| Full RAG with LLM | < 6s | — |
| With caching | < 2s | Với Redis cache |

---

## FALLBACK STRATEGY

```
Query
  │
  ├─ Qdrant available + context found → Full RAG answer
  │
  ├─ Qdrant available + no context → "Chưa có đủ dữ liệu"
  │
  ├─ Qdrant unavailable → Direct LLM (no context)
  │
  └─ LLM unavailable → Return "Hệ thống AI đang bảo trì"
```

Hiện tại: ✅ Bước 1 và 2 đã implement. Bước 3, 4 cần thêm.
