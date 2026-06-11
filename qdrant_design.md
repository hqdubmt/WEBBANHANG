# QDRANT DESIGN — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## CURRENT COLLECTIONS

| Collection | Trạng thái | Vector Size | Distance | Dữ liệu |
|-----------|-----------|------------|---------|---------|
| products | ✅ Created | 1536 | Cosine | Products từ PostgreSQL |
| customers | ✅ Created | 1536 | Cosine | Customer profiles |
| faq | ✅ Created | 1536 | Cosine | FAQ pairs |
| orders | ✅ Created | 1536 | Cosine | Order patterns |
| affiliate | ✅ Created | 1536 | Cosine | Affiliate knowledge |
| marketing | ✅ Created | 1536 | Cosine | Marketing content |
| business | ✅ Created | 1536 | Cosine | Business insights |
| market | ✅ Created | 1536 | Cosine | Market trends |
| operational | ✅ Created | 1536 | Cosine | Agent performance |

---

## COLLECTION CONFIGURATION

```json
// Mỗi collection được tạo với config:
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  }
}
```

---

## POINT STRUCTURE

```json
{
  "id": 123456789,          // toNumericId(uuid) — hash của UUID
  "vector": [0.1, -0.2, ... x1536],
  "payload": {
    "title": "iPhone 15 Pro",
    "domain": "product",
    "tier": "medium_term",
    "tags": ["iphone", "flagship"],
    "_text": "Sản phẩm: iPhone 15 Pro. Danh mục: Điện thoại..."
  }
}
```

**Vấn đề với ID:**
```typescript
private toNumericId(uuid: string): number {
  const hex = uuid.replace(/-/g, '').slice(0, 15);
  return parseInt(hex, 16) % Number.MAX_SAFE_INTEGER;
}
```
- ⚠️ UUID → numeric hash có thể **collision** (2 UUIDs khác nhau → cùng numeric ID)
- ⚠️ Mất thông tin UUID gốc trong Qdrant
- **Fix:** Dùng Qdrant UUID points (Qdrant hỗ trợ UUID IDs natively)

---

## SEARCH PARAMETERS

```typescript
// Hiện tại:
POST /collections/{col}/points/search
{
  "vector": [...],
  "limit": 3,       // top-3 per collection
  "with_payload": true
}
```

**Thiếu:**
- `score_threshold: 0.7` — Loại bỏ results có score thấp
- `filter` — Lọc theo domain, tier, freshness
- `with_vector: false` — Không cần trả về vector

---

## FILTER DESIGN (Đề xuất)

```typescript
// Thêm filtering vào search:
const filter = {
  must: [
    { key: "domain", match: { value: "product" } }
  ],
  should: [
    { key: "tags", match: { any: ["bestseller", "hot"] } }
  ]
};

await axios.post(`/collections/products/points/search`, {
  vector,
  limit: 5,
  filter,
  score_threshold: 0.65,
  with_payload: true
});
```

---

## COLLECTION DESIGN RECOMMENDATIONS

### Thêm collection mới:

| Collection | Dữ liệu | Priority |
|-----------|---------|---------|
| content_pieces | Nội dung Facebook/TikTok/SEO | HIGH |
| campaigns | Campaign results, learnings | HIGH |
| agent_decisions | AI decision history | MEDIUM |
| supplier_knowledge | Supplier product catalog | LOW |

### Payload indexes:
```json
// Thêm indexes cho filter performance:
POST /collections/products/index
{
  "field_name": "domain",
  "field_schema": "keyword"
}

POST /collections/products/index
{
  "field_name": "freshness",
  "field_schema": "integer"
}
```

---

## QDRANT SCALING

| Scale | Config |
|-------|-------|
| < 1M vectors | Single node (hiện tại) |
| 1M–10M vectors | Single node + quantization |
| 10M+ vectors | Qdrant cluster |

**Hiện tại:** Single node — đủ cho giai đoạn đầu.

**Qdrant Quantization** (khi cần):
```json
{
  "quantization_config": {
    "scalar": {
      "type": "int8",
      "quantile": 0.99,
      "always_ram": true
    }
  }
}
```
→ Giảm 4x memory, tốc độ nhanh hơn, quality giảm nhẹ.

---

## MONITORING QDRANT

```bash
# Health check:
GET http://qdrant:6333/healthz

# Collection info:
GET http://qdrant:6333/collections/products

# Points count:
GET http://qdrant:6333/collections/products/points/count
```

Cần thêm vào `/api/health/qdrant` endpoint.
