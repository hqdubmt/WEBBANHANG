# KNOWLEDGE SCHEMA — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## DATABASE SCHEMA

### Bảng: `knowledge`

| Column | Type | Nullable | Default | Mô tả |
|--------|------|---------|---------|-------|
| id | uuid | NO | gen_uuid | Primary key |
| type | enum | NO | — | KnowledgeType |
| title | varchar | NO | — | Tiêu đề knowledge |
| content | text | NO | — | Nội dung đầy đủ |
| sourceId | varchar | YES | — | FK đến entity nguồn |
| sourceType | varchar | YES | — | Loại entity nguồn |
| status | enum | NO | pending | active/inactive/pending |
| isIndexed | boolean | NO | false | Đã index vào Qdrant chưa |
| vectorId | varchar | YES | — | Qdrant point ID |
| collection | varchar | YES | — | Qdrant collection name |
| usageCount | int | NO | 0 | Số lần được truy vấn |
| indexedAt | timestamptz | YES | — | Thời điểm index |
| domain | enum | YES | — | KnowledgeDomain |
| tier | enum | NO | medium_term | KnowledgeTier |
| accuracy | int | NO | 100 | Độ chính xác 0-100 |
| completeness | int | NO | 100 | Độ đầy đủ 0-100 |
| freshness | int | NO | 100 | Độ tươi mới 0-100 |
| businessValue | int | NO | 50 | Giá trị kinh doanh 0-100 |
| relationIds | jsonb | YES | — | IDs của knowledge liên quan |
| expiresAt | timestamptz | YES | — | Hết hạn (tự động inactive) |
| tags | jsonb | YES | — | Tags phân loại |
| meta | jsonb | YES | — | Metadata bổ sung |
| createdAt | timestamptz | NO | now() | Thời điểm tạo |
| updatedAt | timestamptz | NO | now() | Thời điểm cập nhật |

---

## ENUMS

### KnowledgeType
```typescript
enum KnowledgeType {
  PRODUCT = 'product',
  FAQ = 'faq',
  POLICY = 'policy',
  TRAINING = 'training',
  MARKETING = 'marketing',
  AFFILIATE = 'affiliate',
  CUSTOMER = 'customer',
}
```

### KnowledgeDomain
```typescript
enum KnowledgeDomain {
  PRODUCT = 'product',
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  MARKET = 'market',
  OPERATIONAL = 'operational',
}
```

### KnowledgeTier
```typescript
enum KnowledgeTier {
  SHORT_TERM = 'short_term',   // Redis-like, expires fast
  MEDIUM_TERM = 'medium_term', // Weeks to months
  LONG_TERM = 'long_term',     // Permanent knowledge
}
```

### KnowledgeStatus
```typescript
enum KnowledgeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}
```

---

## QDRANT SCHEMA

### Point Structure
```json
{
  "id": <numeric hash of UUID>,
  "vector": [float32 x 1536],
  "payload": {
    "title": "string",
    "domain": "product|customer|business|market|operational",
    "tier": "short_term|medium_term|long_term",
    "tags": ["tag1", "tag2"],
    "_text": "Full text for reference"
  }
}
```

### Collection Config
```json
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  }
}
```

---

## QUALITY METRICS SCHEMA

Mỗi knowledge item được đánh giá 4 chiều:

| Metric | Scale | Ý nghĩa |
|--------|-------|---------|
| accuracy | 0-100 | Dữ liệu có đúng không? |
| completeness | 0-100 | Thông tin có đầy đủ không? |
| freshness | 0-100 | Dữ liệu có mới không? |
| businessValue | 0-100 | Có ích cho quyết định kinh doanh không? |

**Composite Score:**
```
knowledge_score = (accuracy * 0.3) + (completeness * 0.2) + 
                  (freshness * 0.3) + (businessValue * 0.2)
```

---

## THIẾU TRONG SCHEMA HIỆN TẠI

| Thiếu | Đề xuất |
|-------|---------|
| confidence_score | Mức độ tin cậy của answer từ RAG |
| source_url | URL nguồn nếu từ web |
| author | Ai tạo knowledge này |
| review_status | Đã review chưa |
| version | Version của knowledge item |
| parent_id | Hierarchical knowledge |
| embedding_model | Model nào tạo embedding |
