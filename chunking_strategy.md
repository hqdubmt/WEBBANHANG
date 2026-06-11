# CHUNKING STRATEGY — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## HIỆN TRẠNG

Hiện tại hệ thống **KHÔNG có chunking** — toàn bộ content của một knowledge item được embed thành 1 vector duy nhất.

```typescript
// Hiện tại:
text = `[DOMAIN] ${title}\n${content}`
vector = embed(text)  // Toàn bộ text → 1 vector
upsert(collection, id, text, payload)
```

**Vấn đề:**
- Content dài → mất thông tin (embedding truncation)
- Vector 1 bị "dilute" bởi nhiều thông tin
- Không thể retrieve từng phần nhỏ cụ thể
- Qdrant best practice: chunk thành 200-500 tokens

---

## CHUNKING STRATEGY ĐỀ XUẤT

### Strategy 1: Small Chunks (100-200 tokens)

**Dùng cho:** Product attributes, FAQ đơn, price data

```typescript
// Ví dụ: Product
chunks = [
  "iPhone 15 Pro: Giá 29,990,000đ. Màu Titan Black.",
  "iPhone 15 Pro: Chip A17 Pro, camera 48MP.",
  "iPhone 15 Pro: RAM 8GB, Storage 256GB/512GB/1TB.",
]
```

**Qdrant IDs:** `{product_id}_chunk_0`, `{product_id}_chunk_1`, ...

---

### Strategy 2: Medium Chunks (300-500 tokens)

**Dùng cho:** FAQ pairs, policy sections, customer insights

```typescript
// Ví dụ: FAQ
chunk = `
Q: Chính sách đổi trả như thế nào?
A: Đổi trả trong 30 ngày kể từ ngày mua.
   Điều kiện: sản phẩm còn nguyên tem, nguyên hộp.
   Liên hệ: support@shop.vn
`
```

---

### Strategy 3: Large Chunks (500-1000 tokens)

**Dùng cho:** Business reports, trend analysis, strategic documents

```typescript
// Ví dụ: Monthly business report
chunk = `
Business Report Tháng 6/2026:
Revenue: 450,000,000đ (+15% vs tháng trước)
Top products: iPhone 15 Pro (120 units), AirPods Pro...
Conversion rate: 23% (cải thiện từ 18%)
...
`
```

---

## METADATA PER CHUNK

Mỗi chunk phải có payload:
```json
{
  "source_id": "knowledge_item_id",
  "source_type": "product | faq | report | ...",
  "chunk_index": 0,
  "total_chunks": 3,
  "domain": "product | customer | ...",
  "title": "iPhone 15 Pro",
  "created_at": "2026-06-11",
  "freshness": 100,
  "business_value": 90,
  "tags": ["iphone", "bestseller"],
  "_text": "full chunk text"
}
```

---

## CONTENT TYPES & STRATEGY

| Content Type | Strategy | Chunk Size | Overlap |
|-------------|---------|-----------|---------|
| Product description | Small | 150 tokens | 20 tokens |
| Product specs | Small | 100 tokens | 0 |
| FAQ pair | Medium | 300 tokens | 0 |
| Policy document | Medium | 400 tokens | 50 tokens |
| Business report | Large | 600 tokens | 100 tokens |
| Customer profile | Medium | 250 tokens | 0 |
| Market trend | Medium | 350 tokens | 50 tokens |
| Agent output | Variable | 400 tokens | 50 tokens |

---

## IMPLEMENTATION PLAN

```typescript
// chunker.service.ts (cần tạo)

class ChunkerService {
  chunkText(text: string, strategy: 'small' | 'medium' | 'large'): string[] {
    const sizes = { small: 200, medium: 400, large: 700 };
    const overlaps = { small: 20, medium: 50, large: 100 };
    
    const size = sizes[strategy];
    const overlap = overlaps[strategy];
    
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += size - overlap) {
      chunks.push(words.slice(i, i + size).join(' '));
    }
    
    return chunks;
  }
}
```

---

## PRODUCTION CONSIDERATIONS

| Vấn đề | Giải pháp |
|--------|---------|
| Chunk IDs conflict | Dùng `{sourceId}_{chunkIndex}` |
| Delete khi update | Xóa tất cả chunks của sourceId trước |
| Search returns chunk | Join back với source để context đầy đủ |
| Token counting | Dùng tiktoken hoặc estimate by words |
