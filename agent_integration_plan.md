# AGENT INTEGRATION PLAN (RAG) — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## TRẠNG THÁI TÍCH HỢP

| Agent | RAG Tích hợp | Cách tích hợp | Status |
|-------|-------------|--------------|--------|
| Sales Agent | ✅ | KnowledgeBrainService.ask() | Hoạt động |
| Knowledge Agent | ✅ | RagService trực tiếp | Hoạt động |
| CRM Agent | ⚠️ | Chưa rõ | Cần kiểm tra |
| Content Agent | ❌ | Không có RAG context | Cần implement |
| Trend Agent | ❌ | Không push về KB | Cần implement |
| SEO Agent | ❌ | Không có RAG | Cần implement |
| Executive AI (AI Board) | ✅ | KB service aggregations | Hoạt động |
| Business OS | ✅ | KB service aggregations | Hoạt động |
| Competitor Monitor | ❌ | Không push alerts về KB | Cần implement |
| Video Agent | ❌ | Không có RAG | Cần implement |
| Repricing Agent | ❌ | Không có RAG | Cần implement |

---

## PRIORITY 1: SALES AGENT (Đã có, cần tối ưu)

**Hiện tại:**
```typescript
// sales-agent.service.ts
const context = await knowledgeBrainService.ask(message, [PRODUCT, CUSTOMER]);
const response = await aiService.generate(prompt + context, systemPrompt);
```

**Cần cải thiện:**
1. Cache customer history (Redis)
2. Pre-load product catalog (batch embed)
3. Add score_threshold để loại bỏ irrelevant context
4. Streaming response

---

## PRIORITY 2: CRM AGENT

**Kế hoạch:**
```typescript
// crm-agent.service.ts (cần thêm)

async analyzeCustomer(customerId: string) {
  // 1. Lấy customer data từ PostgreSQL
  const customer = await customerRepo.findOne(customerId);
  
  // 2. Search customer history trong Qdrant
  const customerContext = await ragService.search(
    RagCollection.CUSTOMERS, 
    `customer ${customer.name} ${customer.id}`, 
    5
  );
  
  // 3. Search purchase patterns
  const orderContext = await ragService.search(
    RagCollection.ORDERS,
    `orders customer ${customerId}`,
    3
  );
  
  // 4. Generate CRM recommendations
  const analysis = await aiService.generate(
    buildCrmPrompt(customer, customerContext, orderContext),
    'Bạn là CRM Agent chuyên chăm sóc khách hàng...'
  );
  
  return { customerId, analysis, recommendations: parseRecommendations(analysis) };
}
```

---

## PRIORITY 3: CONTENT AGENT

**Kế hoạch:**
```typescript
// content-agent.service.ts (cần thêm RAG)

async generateContent(productId: string, contentType: string) {
  // 1. Lấy product knowledge
  const productContext = await ragService.search(
    RagCollection.PRODUCTS,
    `product ${productId}`,
    3
  );
  
  // 2. Lấy market trends
  const marketContext = await ragService.search(
    RagCollection.MARKET,
    'trending products market demand',
    3
  );
  
  // 3. Generate content với context thực
  const content = await aiService.generate(
    buildContentPrompt(contentType, productContext, marketContext),
    'Bạn là Content Agent tạo nội dung bán hàng...'
  );
  
  return { productId, contentType, content };
}
```

---

## PRIORITY 4: TREND AGENT → KB PUSH

**Kế hoạch sau khi Trend Agent chạy:**
```typescript
// trend-agent.service.ts (cần thêm)

async afterTrendAnalysis(trends: TrendResult[]) {
  for (const trend of trends) {
    await knowledgeBrainService.ingestKnowledge({
      domain: KnowledgeDomain.MARKET,
      title: `Trend: ${trend.keyword}`,
      content: `${trend.keyword}: search volume ${trend.volume}, 
                growth ${trend.growth}%, 
                related products: ${trend.relatedProducts.join(', ')}`,
      tier: KnowledgeTier.SHORT_TERM,
      businessValue: trend.businessScore,
      tags: ['trend', trend.category]
    });
  }
}
```

---

## PRIORITY 5: COMPETITOR MONITOR → KB PUSH

```typescript
// competitor-monitor.service.ts (cần thêm)

async afterMonitoringRun(alerts: PriceAlert[]) {
  for (const alert of alerts) {
    await knowledgeBrainService.ingestKnowledge({
      domain: KnowledgeDomain.MARKET,
      title: `Price Alert: ${alert.productName}`,
      content: `Đối thủ ${alert.platform} đang bán ${alert.productName} 
                với giá ${alert.competitorPrice}đ (mình: ${alert.ourPrice}đ, 
                chênh lệch: ${alert.priceDiffPercent}%)`,
      tier: KnowledgeTier.SHORT_TERM,
      businessValue: Math.abs(alert.priceDiffPercent) > 20 ? 85 : 60,
      tags: ['price-alert', alert.platform, alert.productName]
    });
  }
}
```

---

## IMPLEMENTATION TIMELINE

| Priority | Agent | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Sales Agent optimization | 1 ngày | HIGH |
| 2 | CRM Agent RAG | 2 ngày | HIGH |
| 3 | Content Agent RAG | 2 ngày | HIGH |
| 4 | Trend Agent → KB push | 1 ngày | MEDIUM |
| 5 | Competitor Monitor → KB push | 1 ngày | MEDIUM |
| 6 | SEO Agent RAG | 2 ngày | MEDIUM |
| 7 | Video Agent RAG | 1 ngày | LOW |
