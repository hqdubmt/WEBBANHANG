# KNOWLEDGE INGESTION PLAN — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## HIỆN TRẠNG

### Nguồn data hiện có thể ingest
| Nguồn | Method | Trạng thái |
|-------|--------|-----------|
| Products | indexProduct() | ✅ Có |
| FAQs | indexFaq() | ✅ Có |
| Knowledge entities | ingestKnowledge() | ✅ Có |
| Sync all knowledge | agents/knowledge/sync | ✅ Có |

### Nguồn chưa được ingest tự động
| Nguồn | Lý do | Đề xuất |
|-------|-------|---------|
| Orders patterns | Chưa có ingestion job | Scheduled daily |
| Customer profiles | Chưa có ingestion job | Scheduled daily |
| Campaign results | Chưa có ingestion job | After campaign ends |
| Agent outputs | Agents không push về KB | After each agent run |
| Price alerts | Competitor Monitor chưa push KB | After monitoring run |

---

## PLAN 1: MANUAL INGEST (Hiện có)

```bash
# Ingest một knowledge item
POST /api/knowledge-brain/ingest
{
  "domain": "product",
  "title": "iPhone 15 Pro - Best Seller",
  "content": "Sản phẩm bán chạy nhất tháng...",
  "tier": "medium_term",
  "businessValue": 90,
  "tags": ["iphone", "bestseller"]
}

# Sync từ PostgreSQL lên Qdrant
POST /api/agents/knowledge/sync
```

---

## PLAN 2: SCHEDULED INGESTION (Đề xuất)

### Daily Knowledge Refresh (Cron: 2:00 AM)
```typescript
// knowledge-refresh.job.ts (cần tạo)

async dailyKnowledgeRefresh() {
  // 1. Sync top products
  const products = await productRepo.find({ 
    order: { updatedAt: 'DESC' }, 
    take: 100 
  });
  for (const p of products) {
    await ragService.indexProduct(p);
  }

  // 2. Sync business intelligence
  const bizIntel = await knowledgeBrainService.getBusinessIntelligence();
  await knowledgeBrainService.ingestKnowledge({
    domain: KnowledgeDomain.BUSINESS,
    title: `Business Intelligence ${today}`,
    content: JSON.stringify(bizIntel),
    tier: KnowledgeTier.SHORT_TERM,
    businessValue: 90
  });

  // 3. Decay freshness of old items
  await knowledgeRepo.query(`
    UPDATE knowledge 
    SET freshness = GREATEST(0, freshness - 5)
    WHERE updatedAt < NOW() - INTERVAL '7 days'
    AND status = 'active'
  `);
}
```

### After Agent Run (Event-driven)
```typescript
// Sau khi Trend Agent chạy:
await knowledgeBrainService.ingestKnowledge({
  domain: KnowledgeDomain.MARKET,
  title: `Trend Report ${date}`,
  content: trendAgent.output,
  tier: KnowledgeTier.SHORT_TERM,
  businessValue: 80
});

// Sau khi Competitor Monitor chạy:
await knowledgeBrainService.ingestKnowledge({
  domain: KnowledgeDomain.MARKET,
  title: `Price Alert ${product.name}`,
  content: `Đối thủ đang bán ${product.name} giá ${competitorPrice}...`,
  tier: KnowledgeTier.SHORT_TERM,
  businessValue: 85
});
```

---

## PLAN 3: BULK INGEST (Đề xuất API)

```typescript
// Cần thêm endpoint:
POST /api/knowledge-brain/ingest/batch
{
  "items": [
    { "domain": "product", "title": "...", "content": "..." },
    { "domain": "customer", "title": "...", "content": "..." },
    ...
  ],
  "options": {
    "skipDuplicates": true,
    "overwrite": false
  }
}
```

---

## INGESTION SCHEDULE ĐỀ XUẤT

| Job | Trigger | Dữ liệu |
|-----|---------|---------|
| Product Sync | Daily 2:00 AM | Top 100 products |
| Business Intelligence | Daily 6:00 AM | Revenue, conversion, growth |
| Customer Sync | Daily 3:00 AM | Top 50 customers |
| Trend Refresh | After Trend Agent | Market trends |
| Price Alert Sync | After Competitor Monitor | Price data |
| Freshness Decay | Weekly Sunday | -5 freshness per old item |
| Expired Cleanup | Monthly | Deactivate expired knowledge |

---

## INGESTION QUALITY CHECKLIST

Trước khi ingest, kiểm tra:
- [ ] title không rỗng
- [ ] content dài hơn 50 chars
- [ ] domain hợp lệ
- [ ] Không trùng lặp (check by title + domain)
- [ ] businessValue phù hợp (sản phẩm hot → 90, FAQ thường → 40)
- [ ] tier phù hợp (trend → short_term, FAQ → long_term)
