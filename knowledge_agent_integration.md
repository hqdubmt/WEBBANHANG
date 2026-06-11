# KNOWLEDGE AGENT INTEGRATION — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## KNOWLEDGE BRAIN PHỤC VỤ CÁC AGENTS

### 1. SALES AGENT

**Cần từ Knowledge Brain:**
- Thông tin sản phẩm (giá, mô tả, stock, affiliate link)
- Lịch sử mua hàng của khách
- Thông tin khuyến mãi
- Chính sách đổi trả, vận chuyển

**Cách tích hợp hiện tại:**
```typescript
// agents/sales/sales-agent.service.ts
→ Gọi KnowledgeBrainService.ask(question, [PRODUCT, CUSTOMER])
→ Sử dụng context để generate response
```

**Điểm mạnh:** ✅ Tích hợp qua Knowledge Brain
**Điểm yếu:** ⚠️ Không cache product knowledge, mỗi chat đều query DB + Qdrant

---

### 2. CRM AGENT

**Cần từ Knowledge Brain:**
- Customer profile đầy đủ
- Purchase history
- Conversation history
- Engagement score
- Churn signals

**Cách tích hợp đề xuất:**
```typescript
// agents/crm/crm-agent.service.ts
→ getCustomerIntelligence() cho aggregate data
→ ragService.search(CUSTOMERS, customerId) cho history
→ Generate CRM action recommendations
```

**Điểm mạnh:** ✅ Customer intelligence domain đã có
**Điểm yếu:** ⚠️ Chưa tích hợp CRM Agent với KB sâu

---

### 3. CONTENT AGENT

**Cần từ Knowledge Brain:**
- Product knowledge (features, benefits)
- Market trends (từ MARKET domain)
- Campaign performance history
- Customer insights (target audience)

**Cách tích hợp đề xuất:**
```typescript
// agents/content/content-agent.service.ts
→ getProductIntelligence() cho top products
→ getMarketIntelligence() cho trends
→ ragService.search(MARKETING) cho content history
→ Use as context cho content generation
```

**Điểm mạnh:** ✅ Dữ liệu có trong KB
**Điểm yếu:** ❌ Content Agent chưa tích hợp KB

---

### 4. TREND AGENT

**Cần từ Knowledge Brain:**
- Market knowledge (existing trends)
- Product performance data
- Customer demand signals

**Cách tích hợp đề xuất:**
```typescript
// Sau khi Trend Agent phát hiện trend mới:
→ ingestKnowledge({ domain: MARKET, title: trend.name, content: trend.desc })
→ Lưu lên Qdrant cho các agents khác dùng
```

**Điểm mạnh:** ✅ Knowledge Brain sẵn sàng nhận MARKET data
**Điểm yếu:** ❌ Trend Agent chưa push data về KB

---

### 5. EXECUTIVE AI

**Cần từ Knowledge Brain:**
- Tất cả 5 domains
- Executive questions (8 câu chiến lược)
- Knowledge graph
- Business intelligence aggregation

**Cách tích hợp hiện tại:**
```typescript
// ai-board.controller.ts
→ Gọi các intelligence endpoints
→ AI Board: CEO/CFO/COO/CTO/CMO/CRO/CSO perspectives
```

**Điểm mạnh:** ✅ Tích hợp tốt nhất trong hệ thống
**Điểm yếu:** ⚠️ ai-board endpoints không có caching

---

### 6. REVENUE AUTOPILOT

**Cần từ Knowledge Brain:**
- Business intelligence (revenue, growth)
- Product intelligence (top performers)
- Customer intelligence (LTV, churn)
- Market intelligence (opportunities)

**Cách tích hợp đề xuất:**
```typescript
→ getBusinessIntelligence() cho revenue status
→ getExecutiveQuestions() cho strategic insights
→ Identify opportunities và risks
→ Generate action recommendations
```

**Điểm mạnh:** ✅ Dữ liệu có trong Business OS
**Điểm yếu:** ❌ Chưa có automated Revenue Autopilot loop

---

## KNOWLEDGE AGENT API

### Sync (Full re-index)
```
POST /api/agents/knowledge/sync
→ Lấy tất cả knowledge từ PostgreSQL
→ Re-embed và upsert lên Qdrant
→ Dùng khi Qdrant bị reset hoặc model thay đổi
```

### Add (Single item)
```
POST /api/agents/knowledge/add
{
  type: "product" | "faq" | "policy" | ...,
  title: string,
  content: string,
  sourceId?: string,
  tags?: string[]
}
→ Create + embed + upsert ngay lập tức
```

### Search (RAG query)
```
GET /api/agents/knowledge/search?q=<query>&type=<type>
→ Embed query
→ Qdrant search
→ Return top results với score
```

---

## INTEGRATION ROADMAP

| Priority | Integration | Effort |
|----------|-----------|--------|
| 1 | CRM Agent ← Customer KB | Medium |
| 2 | Content Agent ← Product+Market KB | Medium |
| 3 | Trend Agent → Market KB push | Low |
| 4 | Affiliate Agent ← Affiliate KB | Low |
| 5 | SEO Agent ← Market KB | Medium |
| 6 | Scheduled KB refresh | Medium |
