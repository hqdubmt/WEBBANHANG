# Topical Authority Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. What is Topical Authority

Topical Authority là việc Google nhận ra một website là nguồn tham khảo đáng tin cậy và đầy đủ về một chủ đề. Để đạt được điều này, cần phủ hoàn toàn một topic cluster bằng nhiều bài viết liên kết chặt chẽ với nhau.

**Goal:** Rank tốt không chỉ cho 1 keyword mà cho toàn bộ topic cluster.

---

## 2. Topic Cluster Structure

```
TOPIC CLUSTER EXAMPLE: "Mỹ Phẩm Dưỡng Da"
────────────────────────────────────────────────────────────

           ┌──────────────────────────────────┐
           │    PILLAR PAGE                   │
           │  "Hướng Dẫn Dưỡng Da Toàn Diện" │
           │  /blog/huong-dan-duong-da         │
           │  2,500 words                     │
           └──────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼──────┐  ┌─────▼──────┐  ┌────▼───────┐
    │ Cluster 1  │  │ Cluster 2  │  │ Cluster 3  │
    │"Kem dưỡng  │  │"Serum cho  │  │"Toner tốt  │
    │ da ban đêm"│  │ da dầu"    │  │ nhất"      │
    │1,500 words │  │1,200 words │  │1,000 words │
    └─────┬──────┘  └─────┬──────┘  └────┬───────┘
          │               │               │
    ┌─────▼──────┐  ┌─────▼──────┐  ┌────▼───────┐
    │ Sub-cluster│  │ Sub-cluster│  │ Sub-cluster│
    │ "Kem đêm   │  │ "Serum Vit │  │ "Toner cho │
    │  cho da dầu│  │  C review" │  │  da nhạy   │
    │  review"   │  │            │  │  cảm"      │
    └────────────┘  └────────────┘  └────────────┘
```

---

## 3. Content Pillar Strategy

### Pillar Types

| Pillar Type | Format | Word Count | Examples |
|-------------|--------|-----------|---------|
| Ultimate Guide | Long-form guide | 3,000–5,000 | "Hướng dẫn dưỡng da hoàn chỉnh" |
| Category Hub | Overview + links | 2,000–3,000 | "Tất cả về kem dưỡng da" |
| Comparison Hub | Side-by-side | 2,500–4,000 | "So sánh 20 loại serum" |

### Pillar Content Requirements
```
Each pillar page MUST:
  1. Target 1 high-volume head keyword (1,000+/month)
  2. Cover all subtopics at surface level
  3. Link to ALL cluster articles (hub-and-spoke model)
  4. Receive backlinks from cluster articles
  5. Include FAQ section targeting "People Also Ask"
  6. Word count: > 2,500 words
```

---

## 4. Topic Clusters per Product Category

```
For each product category in system:

Category: categories table
  ↓
Pillar: 1 pillar article per category
  ↓
Clusters: 5–10 cluster articles per pillar
  ↓
Sub-clusters: 2–5 articles per cluster article (long-term)

Target cluster coverage:
  Year 1: Pillar + 5 clusters per category
  Year 2: +5 sub-clusters per cluster
```

---

## 5. Internal Link Graph Design

```
LINK FLOW DIRECTION:
  
  Product Pages ←─── Cluster Articles ←─── Pillar Pages
       ↑                    ↑                    ↑
       │               (horizontal          (horizontal
       │                linking)             linking)
  FAQ Articles ──────▶ Cluster Articles
  
Link juice flow:
  Homepage → Pillar (high authority)
  Pillar → Clusters (distribute juice)
  Clusters → Product pages (conversion)
  
Anchor text variety:
  40% → exact match keyword
  30% → partial match ("kem dưỡng tốt" for "kem dưỡng da tốt nhất")
  20% → branded ("xem tại shop")
  10% → generic ("đọc thêm", "tìm hiểu")
```

---

## 6. SeoArticle.internalLinks Field

```typescript
// Current entity:
@Column('simple-array', { nullable: true })
internalLinks: string[];

// Usage:
// SEO Agent populates with related article slugs:
internalLinks = [
  "/blog/huong-dan-duong-da",      // pillar link
  "/products/kem-duong-da-xyz",    // product page
  "/blog/serum-cho-da-dau"         // horizontal cluster link
]

// Content injected with actual anchor tags:
// "Xem thêm: <a href='/blog/huong-dan-duong-da'>Hướng dẫn dưỡng da</a>"
```

---

## 7. Topical Authority Building Plan

```
PHASE 1 (Month 1–3): Foundation
  - Choose top 3 product categories
  - Write 1 pillar per category (3 pillars total)
  - Write 5 cluster articles per pillar (15 articles)
  - Total: 18 articles
  - Expected: Basic topical coverage established

PHASE 2 (Month 4–6): Expansion
  - Add 3 more categories
  - 5 clusters per new category (15 more)
  - Deepen existing clusters with sub-clusters (10 more)
  - Total cumulative: ~43 articles
  - Expected: Google starts recognizing authority

PHASE 3 (Month 7–12): Dominance
  - Cover all product categories
  - Sub-cluster depth for top categories
  - Total target: 100+ articles
  - Expected: Multiple first-page rankings per category
```

---

## 8. Implementation in SEO Agent

```
SEO Agent priority logic (to implement):
  1. If category has no pillar → generate pillar first
  2. If pillar exists but < 3 clusters → generate cluster
  3. If clusters exist → generate sub-clusters
  4. Never generate duplicate topics
     (check: SELECT * FROM seo_articles WHERE keyword LIKE '%similar%')
```
