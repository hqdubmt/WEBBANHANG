# SEO Content Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Content Types for SEO

### Type 1: Product Buying Guide
```
Target Keyword: "[category] tốt nhất" / "top [category]"
Intent: Commercial investigation
Length: 1,500–2,500 words
Structure:
  H1: Top 10 [Category] Tốt Nhất Năm 2026 (Review + Đánh Giá)
  Intro: Problem statement + what reader will learn
  H2: Tiêu chí đánh giá [category]
  H2: Top 10 sản phẩm (10×H3 mini-reviews)
  H2: So sánh chi tiết (comparison table)
  H2: Câu hỏi thường gặp (FAQ)
  Conclusion: Recommendation + CTA to buy
```

### Type 2: Tutorial / How-to Article
```
Target Keyword: "cách [action]" / "hướng dẫn [action]"
Intent: Informational (high engagement)
Length: 1,000–1,500 words
Structure:
  H1: Cách [Action] Đúng Cách — Hướng Dẫn Chi Tiết Từ A–Z
  Intro: Why this matters
  H2: Những điều cần chuẩn bị
  H2: Các bước thực hiện (numbered steps)
  H2: Lỗi thường gặp và cách tránh
  H2: Câu hỏi thường gặp
  Conclusion: Product recommendation + CTA
```

### Type 3: Product Page (Landing Page)
```
Target Keyword: "[product name]" + "[product name] giá"
Intent: Transactional
Length: 800–1,200 words
Structure:
  H1: [Product Name] — Mô Tả + Giá Tốt Nhất
  Section: Product overview
  Section: Key benefits (bullets)
  Section: Specifications table
  Section: Customer reviews (social proof)
  Section: FAQ (3–5 questions)
  CTA: "Đặt Hàng Ngay" button
```

### Type 4: FAQ / Question Article
```
Target Keyword: "[question phrase]"
Intent: Informational → Google Featured Snippet target
Length: 500–800 words
Structure:
  H1: [Question phrased as title]
  Answer paragraph (direct answer in first 50 words — featured snippet)
  H2: Giải thích chi tiết
  H2: Câu hỏi liên quan (3 related Q&As)
  Internal links: to buying guides + product pages
```

---

## 2. On-Page SEO Elements

```
For each SeoArticle:
  ✓ Title tag: H1 contains keyword + power word + year
     "Kem Dưỡng Da Tốt Nhất 2026 — Top 10 Review Chi Tiết"
  
  ✓ Meta description: 150–155 chars
     "Xem review 10 kem dưỡng da tốt nhất 2026 được 5,000 khách hàng đánh giá. 
      So sánh giá, thành phần và hiệu quả. Freeship nội địa."
  
  ✓ URL slug: 3–5 words, lowercase, hyphenated
     /blog/kem-duong-da-tot-nhat
  
  ✓ H1: Exactly 1, contains primary keyword
  ✓ H2: 3–5, contain secondary/cluster keywords
  ✓ Image alt text: descriptive, keyword-relevant
  ✓ Internal links: 3–5 per article
  ✓ External links: 1–2 authoritative sources
  ✓ Word count: > 1,000 (stored in SeoArticle.wordCount)
```

---

## 3. Internal Linking Strategy

```
INTERNAL LINK MAP:
  
  Product Pages (highest priority)
    ← Receiving links from: all article types
    ← Anchor text: product name, "xem tại đây", "đặt hàng"
  
  Buying Guide Articles (pillar)
    ← Receiving links from: tutorial articles, FAQ articles
    → Linking to: product pages, comparison articles
  
  Tutorial Articles (cluster)
    ← Receiving from: related tutorials, FAQ articles
    → Linking to: buying guides, product pages
  
  FAQ Articles
    ← Receiving from: sidebar/footer links
    → Linking to: buying guides, tutorial articles

SeoArticle.internalLinks = ["/blog/slug1", "/products/slug2"]
  → These are injected into article content by SEO Agent
```

---

## 4. SEO Content Generation Flow

```
POST /api/agents/seo/run?count=3
    │
    ├── 1. Select target keywords
    │       (Currently: derived from top products by revenue)
    │       (TODO: from SeoKeyword entity with score ≥ 60)
    │
    ├── 2. RAG search for each keyword
    │       - product knowledge (collection: products)
    │       - existing articles (check for duplicates)
    │       - competitor content analysis
    │
    ├── 3. LLM generate article
    │       Prompt: keyword + product context + target structure
    │       Temperature: 0.6 (more factual, less creative)
    │
    ├── 4. Post-process
    │       - Extract word count → SeoArticle.wordCount
    │       - Generate slug via SlugUtil
    │       - Generate meta description (if not in output)
    │       - Validate internal links exist
    │
    └── 5. Save SeoArticle {status: DRAFT}
```

---

## 5. Content Freshness Strategy

```
Article Update Triggers:
  - Product price changes → update price mentions
  - Product discontinued → archive or redirect
  - Year in title → annual refresh (2026 → 2027)
  - Competitor outranks → strengthen with more depth
  - Search ranking drops > 5 positions → content refresh

Update Frequency Targets:
  Buying guides:  Annual refresh (year update + new products)
  Tutorials:      Every 6 months (if product updates)
  FAQ articles:   Evergreen (update only if product changes)
  Product pages:  Real-time (price synced with products table)
```
