# API PERFORMANCE REPORT — AI Social Commerce OS V3

**Ngày phân tích:** 2026-06-11  
**Phạm vi:** Heavy Endpoints, Database Intensive APIs, N+1 Risks, Cache Opportunities

---

## 1. HEAVY ENDPOINTS

Các endpoint có khả năng chậm nhất:

### CRITICAL — Có thể > 5s

| Endpoint | Lý do chậm | Ước tính |
|----------|-----------|---------|
| POST /api/knowledge-brain/ask | Embedding + Qdrant search + Ollama LLM | 3–30s |
| POST /api/ai/chat | Gọi Ollama LLM | 2–20s |
| POST /api/agents/sales/chat | Ollama + RAG + conversation history | 3–15s |
| POST /api/agents/*/run | LLM processing + multi-step logic | 5–60s |
| POST /api/knowledge-brain/ingest | Embedding toàn bộ data + Qdrant upsert | 10–120s |
| GET /api/business-os/intelligence | Aggregate nhiều services + LLM | 3–10s |
| GET /api/ai-board/meeting | 7 AI roles x LLM calls | 10–60s |
| GET /api/self-improvement/analyze | Deep analysis + LLM | 3–15s |

### HIGH — Có thể > 1s

| Endpoint | Lý do chậm | Ước tính |
|----------|-----------|---------|
| GET /api/analytics/dashboard | Aggregate nhiều bảng | 0.5–2s |
| GET /api/analytics/revenue | Revenue calculation across orders | 0.3–1s |
| GET /api/business-os/dashboard | Multiple aggregations | 0.5–2s |
| GET /api/orders/revenue | Sum/group by nhiều records | 0.3–1s |
| GET /api/agents/knowledge/search | Qdrant vector search | 0.1–0.5s |
| GET /api/marketplace/trending | External API calls | 0.5–3s |

---

## 2. DATABASE INTENSIVE APIs

### Endpoints gọi DB nhiều lần

| Endpoint | DB Queries | Vấn đề |
|----------|-----------|--------|
| GET /api/analytics/dashboard | 5–10 queries | SELECT COUNT, SUM per entity |
| GET /api/customers/:id | 3–5 queries | Customer + orders + leads |
| GET /api/orders | 2–3 queries | Orders + count |
| GET /api/affiliate-portal/partners/stats | 4–6 queries | Partners + clicks + conversions |
| GET /api/business-os/kpi | 8–12 queries | KPI từ nhiều bảng |
| GET /api/self-improvement/scorecard | 5–8 queries | Metrics từ nhiều modules |

---

## 3. N+1 QUERY RISKS

### Rủi ro cao nhất

**GET /api/orders** — List orders
```
Query 1: SELECT orders WHERE tenant=X LIMIT 20
For each order (20x):
  Query 2: SELECT customer WHERE id=?
  Query 3: SELECT order_items WHERE orderId=?
```
→ 1 + 20 + 20 = **41 queries** cho 20 orders

**GET /api/affiliate-portal/partners**
```
Query 1: SELECT partners LIMIT N
For each partner (Nx):
  Query 2: SELECT clicks WHERE partnerId=?
  Query 3: SELECT conversions WHERE partnerId=?
```
→ **3N + 1 queries** cho N partners

**GET /api/products** với category/inventory
```
Query 1: SELECT products LIMIT 20
For each product (20x):
  Query 2: SELECT category WHERE id=?
  Query 3: SELECT inventory WHERE productId=?
```
→ **41+ queries** cho 20 products

### Nguyên nhân
- TypeORM relations không dùng `eager: false` + explicit joins
- Thiếu `queryBuilder.leftJoinAndSelect()` hoặc `relations: ['customer']`

---

## 4. AI/LLM PERFORMANCE RISKS

### Bottlenecks đặc thù AI

| Vấn đề | Endpoints ảnh hưởng |
|--------|-------------------|
| Ollama sequential processing | POST /api/ai/chat, agents/sales/chat |
| No LLM response caching | Tất cả LLM endpoints |
| No timeout trên LLM calls | Có thể hang indefinitely |
| No queue cho agent runs | POST /api/agents/*/run |
| Multiple LLM calls per request | /api/ai-board/meeting (7 calls) |
| No streaming response | POST /api/ai/chat |

### ai-board/meeting — Worst Case
```
GET /api/ai-board/meeting
→ CEO analysis (LLM call 1)
→ CFO analysis (LLM call 2)
→ COO analysis (LLM call 3)
→ CTO analysis (LLM call 4)
→ CMO analysis (LLM call 5)
→ CRO analysis (LLM call 6)
→ CSO analysis (LLM call 7)
Total: 7 sequential LLM calls = 30–120 seconds
```

---

## 5. CACHE OPPORTUNITIES

### Endpoints nên cache

| Endpoint | TTL đề xuất | Cache Key | Lý do |
|----------|------------|-----------|-------|
| GET /api/products | 5 phút | tenant:products:query | Dữ liệu ít thay đổi |
| GET /api/categories | 30 phút | tenant:categories | Rất ít thay đổi |
| GET /api/categories/tree | 30 phút | tenant:categories:tree | Rất ít thay đổi |
| GET /api/brands | 30 phút | tenant:brands | Rất ít thay đổi |
| GET /api/analytics/dashboard | 5 phút | tenant:analytics:dashboard | Không cần realtime |
| GET /api/analytics/revenue | 5 phút | tenant:analytics:revenue | Daily aggregation |
| GET /api/business-os/kpi | 2 phút | tenant:kpi | Near-realtime OK |
| GET /api/knowledge-brain/product-intelligence | 10 phút | tenant:kb:product | Ít thay đổi |
| GET /api/marketplace/trending | 15 phút | marketplace:trending | External data |
| GET /api/inventory/value | 5 phút | tenant:inventory:value | Không cần realtime |

### LLM Response Caching

| Endpoint | Strategy |
|----------|---------|
| POST /api/ai/chat | Cache by (question hash, model) — 1 giờ |
| GET /api/knowledge-brain/executive-questions | Cache 30 phút |
| GET /api/ai-board/* | Cache 15 phút (stale-while-revalidate) |
| GET /api/business-os/intelligence | Cache 5 phút |

**Công cụ đề xuất:** Redis (đã có trong stack) với `@nestjs/cache-manager`

---

## 6. PAGINATION PERFORMANCE

### Endpoints thiếu pagination

| Endpoint | Rủi ro |
|----------|--------|
| GET /api/suppliers | Full table scan nếu nhiều NCC |
| GET /api/brands | Full table scan |
| GET /api/categories | Full table scan |
| GET /api/campaigns | Full table scan |
| GET /api/workflows | Full table scan |

### Cursor-based Pagination
- Hiện tại dùng OFFSET pagination
- Với bảng lớn (orders > 100K), nên dùng cursor-based
- `GET /api/orders?after=cursor&limit=20`

---

## 7. CONCURRENCY RISKS

| Vấn đề | Endpoint | Rủi ro |
|--------|----------|--------|
| Inventory race condition | POST /api/inventory/adjust | 2 requests điều chỉnh cùng lúc → sai số |
| Order creation race | POST /api/orders | Tạo 2 orders trùng nhau |
| Payment double-confirm | POST /api/payments/:id/confirm | Xác nhận 2 lần |
| Agent concurrent run | POST /api/agents/*/run | Nhiều agent cùng chạy → xung đột |

**Giải pháp:** Database transactions + pessimistic locking cho inventory/orders

---

## 8. RESPONSE SIZE RISKS

| Endpoint | Rủi ro |
|----------|--------|
| GET /api/products (no limit) | Trả về toàn bộ products |
| GET /api/orders (no limit) | Trả về toàn bộ orders |
| GET /api/self-improvement/lessons | Có thể rất nhiều lessons |
| POST /api/knowledge-brain/ask | Response LLM rất dài |

**Đề xuất:** Enforce `maxLimit=100` cho tất cả list endpoints

---

## 9. EXTERNAL DEPENDENCY LATENCY

| Dependency | Endpoints | Latency Risk |
|-----------|----------|-------------|
| Ollama LLM | AI, agents/sales, knowledge-brain | 1–30s |
| Qdrant | knowledge-brain/ask, agents/knowledge | 50–500ms |
| MinIO | (nếu có file upload) | 50–200ms |
| External marketplace APIs | /marketplace/* | 200ms–3s |

---

## 10. PERFORMANCE RECOMMENDATIONS

### Ngay lập tức (Quick Wins)
1. Thêm Redis cache cho analytics endpoints
2. Fix N+1 queries với TypeORM eager loading / query builder
3. Thêm pagination cho tất cả list endpoints
4. Thêm timeout cho LLM calls (30s max)

### Trung hạn
1. BullMQ queue cho agent runs (đã có Bull trong package)
2. Streaming response cho POST /api/ai/chat
3. LLM response caching với Redis
4. Database indexes review

### Dài hạn
1. Cursor-based pagination cho bảng lớn
2. Horizontal scaling agents với queues
3. CDN cho static product images
4. Read replicas cho analytics queries

---

## PERFORMANCE SCORE

| Tiêu chí | Điểm |
|----------|------|
| Caching Strategy | 3/20 |
| N+1 Prevention | 4/20 |
| Pagination | 10/20 |
| AI/LLM Optimization | 4/20 |
| Database Queries | 8/20 |
| Concurrency Handling | 6/20 |
| **Tổng** | **35/100** |
