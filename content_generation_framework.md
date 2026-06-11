# Content Generation Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Generation Pipeline Per Content Type

### Pipeline Tổng quát

```
[Product ID] + [Platform] + [Content Type]
        │
        ▼
[1. Context Gathering]
  - RAG search: product knowledge (Qdrant collection: 'products')
  - RAG search: customer FAQs (collection: 'customer_profiles')
  - Trend data from Knowledge{domain:MARKET}
  - Promotion data from Campaigns table
        │
        ▼
[2. Prompt Assembly]
  System prompt + Context chunks + Template + Constraints
        │
        ▼
[3. LLM Generation] (Ollama local / API fallback)
  Model: llama3.2 (local) or claude-sonnet (API)
  Temperature: 0.8 for creative, 0.3 for factual
        │
        ▼
[4. Post-processing]
  - Hashtag extraction / generation
  - Emoji insertion (for Facebook/Telegram)
  - Word count validation
  - Forbidden word filter
        │
        ▼
[5. Storage]
  INSERT INTO contents {productId, title, body, hashtags, platform, status:'draft'}
```

---

## 2. RAG Context Injection

```typescript
// Content Agent Service — context building
async buildContext(productId: string, platform: string) {
  const [productDocs, faqDocs, trendDocs] = await Promise.all([
    this.ragService.search(
      `product details ${productId}`,
      RagCollection.PRODUCTS,
      { topK: 3 }
    ),
    this.ragService.search(
      `customer questions about product`,
      RagCollection.FAQS,
      { topK: 2 }
    ),
    this.knowledgeRepo.find({
      where: { domain: KnowledgeDomain.MARKET, status: KnowledgeStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: 2,
    }),
  ]);

  return {
    productContext: productDocs.map(d => d.content).join('\n'),
    faqContext: faqDocs.map(d => d.content).join('\n'),
    trendContext: trendDocs.map(d => d.content).join('\n'),
  };
}
```

---

## 3. Prompt Templates Per Content Type

### Facebook Post Prompt
```
SYSTEM:
Bạn là content writer chuyên viết Facebook posts bán hàng cho thị trường Việt Nam.
Viết ngắn gọn, gần gũi, dùng ngôn ngữ tự nhiên của người Việt.
Luôn có CTA rõ ràng ở cuối.

USER:
Sản phẩm: {productName}
Giá: {price} VND
Thông tin sản phẩm: {productContext}
Câu hỏi thường gặp: {faqContext}
Xu hướng hiện tại: {trendContext}
Ưu đãi đang có: {promotionContext}

Viết 1 Facebook post:
- Hook câu đầu tiên phải gây chú ý
- Nêu vấn đề/nhu cầu của khách
- Giới thiệu sản phẩm như là giải pháp
- 1–2 social proof
- CTA cụ thể (nhắn tin, gọi điện, hoặc link)
- Kết thúc với 5–8 hashtags phù hợp xu hướng

Format output JSON: {title, body, hashtags[]}
```

### TikTok Script Prompt
```
SYSTEM:
Bạn viết script TikTok/Reels ngắn (30–60 giây) cho thị trường Việt Nam.
Hook phải trong 3 giây đầu tiên. Năng động, gần gũi thế hệ Gen Z/Millennial.

USER:
Sản phẩm: {productName}
Lợi ích chính: {productContext}
Xu hướng: {trendContext}

Viết script gồm:
[HOOK 0-3s]: ...câu/hành động gây tò mò
[VẤN ĐỀ 3-8s]: ...mô tả pain point
[GIẢI PHÁP 8-25s]: ...giới thiệu sản phẩm + demo tưởng tượng
[BẰNG CHỨNG 25-40s]: ...số liệu/review
[CTA 40-45s]: ...kêu gọi rõ ràng

Format output JSON: {hook, problem, solution, proof, cta, totalSeconds}
```

### SEO Article Prompt
```
SYSTEM:
Bạn là SEO content writer chuyên viết bài cho website thương mại điện tử Việt Nam.
Viết tự nhiên, tối ưu cho từ khóa mục tiêu, có cấu trúc rõ ràng.

USER:
Từ khóa mục tiêu: {keyword}
Từ khóa phụ: {clusterKeywords}
Thông tin sản phẩm: {productContext}
Đối thủ: {competitorContext}

Viết bài 1000-1500 chữ:
- H1: Tiêu đề chứa từ khóa chính
- Intro 150 chữ có từ khóa tự nhiên
- 3–4 H2 sections với từ khóa phụ
- FAQ section 3 câu hỏi
- Conclusion + CTA
- Meta description 155 ký tự

Format output JSON: {title, slug, content, metaDescription, wordCount}
```

---

## 4. LLM Configuration

```typescript
// apps/api/src/modules/ai/ai.service.ts
// Được tất cả agents sử dụng

AiService {
  generate(prompt: string, options?: {
    temperature?: number,    // default: 0.7
    maxTokens?: number,      // default: 2000
    model?: string,          // default: from env OLLAMA_MODEL
  }): Promise<string>
}
```

```env
# .env
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434
AI_FALLBACK_ENABLED=true   # fallback to API if Ollama fails
```

---

## 5. Content Constraints

| Constraint | Facebook | Telegram | TikTok Script | SEO Article |
|-----------|----------|----------|---------------|-------------|
| Min length | 100 chars | 50 chars | 200 chars | 800 words |
| Max length | 63,206 chars | 4,096 chars | 500 chars | 3,000 words |
| Hashtags | 5–10 | 3–5 | 3–7 | N/A |
| Emojis | Recommended | Optional | N/A | No |
| Links | 1 max | 1–3 ok | N/A (spoken) | Internal links required |
