# Keyword Research Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Keyword Types

| Type | Intent | Example | Conversion Rate |
|------|--------|---------|----------------|
| **Informational** | Learn/Research | "cách chọn kem dưỡng da" | Low (awareness) |
| **Commercial** | Compare/Evaluate | "kem dưỡng da tốt nhất 2026" | Medium |
| **Transactional** | Buy Now | "mua kem dưỡng da XYZ giá rẻ" | HIGH |
| **Navigational** | Find Brand | "kem XYZ chính hãng" | Very High |
| **Local** | Near Me | "mua mỹ phẩm Hà Nội" | High |

**Targeting priority for e-commerce:** Transactional > Commercial > Navigational > Local > Informational

---

## 2. Keyword Scoring Model

```
Keyword Score = w1×Volume + w2×Difficulty_Inverse + w3×Intent + w4×RevenuePotential

Trong đó:
  w1 = 0.25  (Volume — how many searches)
  w2 = 0.25  (Difficulty_Inverse = 100 - KD → easier = higher score)
  w3 = 0.25  (Intent — transactional > commercial > informational)
  w4 = 0.25  (Revenue Potential — related product margin × volume)

Normalize to 0–100:
  VolumeScore:    volume / 10,000 × 100 (cap at 100)
  DiffScore:      (100 - keywordDifficulty)
  IntentScore:    transactional=100, commercial=70, informational=30
  RevenueScore:   productMargin × (volume/1000) capped at 100

Target keywords: Score ≥ 60
```

---

## 3. Keyword Categories for AI Social Commerce

### Category 1: Product Keywords (Transactional)
```
Pattern: [product name] + [buy/giá/chính hãng/freeship]
Examples:
  - "mua {productName} giá rẻ"
  - "{productName} chính hãng freeship"
  - "đặt hàng {productName} online"
  
Volume: Low-Medium (100–5,000/month)
Difficulty: Low (competitor awareness low for niche products)
Conversion: HIGH
```

### Category 2: Category Keywords (Commercial)
```
Pattern: [category] + [best/top/review/so sánh]
Examples:
  - "kem dưỡng da tốt nhất cho da dầu"
  - "top 10 {category} đáng mua 2026"
  - "so sánh {product A} vs {product B}"
  
Volume: Medium (1,000–20,000/month)
Difficulty: Medium
Conversion: Medium
```

### Category 3: Question Keywords (Informational)
```
Pattern: [how/why/what] + [problem/product related]
Examples:
  - "tại sao da dầu cần kem dưỡng ẩm"
  - "cách sử dụng {product} đúng cách"
  - "{product} dùng được bao lâu"
  
Volume: Medium-High
Difficulty: Low-Medium
Conversion: Low (but great for Knowledge Brain + FAQs)
```

---

## 4. Keyword Discovery Sources (Current System)

| Source | Agent | Data Available |
|--------|-------|----------------|
| Competitor URLs | Competitor Monitor (Agent 18) | Article topics, ranking keywords |
| Market trends | Trend Agent (Agent 01) | Trending topics per platform |
| Customer questions | Knowledge Brain (FAQs) | Real customer questions |
| Product names | Products table | All product/category names |
| TikTok searches | Trend Agent | Social search volume proxy |

**Current gap:** Không có keyword volume/difficulty data từ tools như Ahrefs/SEMrush/Google Keyword Planner.

---

## 5. Keyword Research API — MISSING

```
CURRENT: Thiếu keyword management API

What's needed:
  GET /api/seo/keywords              → list all researched keywords
  POST /api/seo/keywords             → add new keyword to research
  GET /api/seo/keywords/:id/articles → articles targeting this keyword
  GET /api/seo/keywords/opportunities → keywords with no article yet

Proposed Entity: SeoKeyword {
  keyword: string
  type: informational|commercial|transactional
  monthlyVolume: number      // từ external tool
  difficulty: number         // 0–100
  intentScore: number        // 0–100
  revenueScore: number       // 0–100
  totalScore: number         // computed
  articleId: string          // linked article if exists
  position: number           // current Google position (if tracked)
  status: 'researched'|'assigned'|'published'
}
```

---

## 6. Keyword-to-Content Mapping

```
Keyword Cluster Strategy:
  1 Pillar Keyword → 1 Main Article (1,500–2,500 words)
      ↓
  3–5 Cluster Keywords → 3–5 Supporting Articles (800–1,500 words)
      ↓
  All articles internally link to:
    - Pillar article
    - Relevant product pages
    - Each other (topical cluster)

Example:
  Pillar: "kem dưỡng da ban đêm"
    ↓
  Clusters:
    - "kem dưỡng da ban đêm cho da dầu"
    - "cách thoa kem dưỡng da ban đêm"  
    - "kem dưỡng da ban đêm nào tốt nhất"
    - "kem dưỡng ban đêm vs ngày"
```
