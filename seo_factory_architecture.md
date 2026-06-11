# SEO Factory Architecture — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. SEO Factory Flow

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  DEMAND  │─▶│ KEYWORDS │─▶│ CONTENT  │─▶│ RANKING  │─▶│ TRAFFIC  │─▶│ REVENUE  │
│          │  │          │  │          │  │          │  │          │  │          │
│ Customer │  │ Research │  │ SEO      │  │ Google   │  │ Organic  │  │ Orders   │
│ searches │  │ Volume/  │  │ Articles │  │ Position │  │ Visitors │  │ Leads    │
│ Trends   │  │ Difficulty│  │ Guides   │  │ 1–10     │  │ Free     │  │ LTV      │
│ Products │  │ Intent   │  │ FAQs     │  │ SERP     │  │ traffic  │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 2. SEO Agent (Agent 09)

**Path:** `apps/api/src/modules/agents/seo/`

| Method | Endpoint | File | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/agents/seo/run` | `seo-agent.controller.ts` | Generate N SEO articles (count param) |
| `GET`  | `/api/agents/seo/drafts` | `seo-agent.controller.ts` | List all draft SEO articles |

**Service:** `SeoAgentService.generateDailyArticles(count?: number)`

---

## 3. SeoArticle Entity

```typescript
// apps/api/src/database/entities/seo-article.entity.ts
enum ArticleStatus { DRAFT | PUBLISHED | ARCHIVED }

SeoArticle {
  id: uuid
  keyword: string              // Target keyword (primary)
  title: string                // SEO title (H1)
  slug: string                 // URL slug (generated)
  content: text                // Full article HTML/markdown
  metaDescription: string      // 155 chars max
  clusterKeywords: string[]    // Related/secondary keywords
  internalLinks: string[]      // Internal links to include
  productId: string            // Related product (optional)
  status: ArticleStatus        // DRAFT → PUBLISHED → ARCHIVED
  wordCount: number            // Computed on save
  publishedAt: Date
}
```

---

## 4. Publisher Agent Integration

```
SEO Article Lifecycle:
  1. SEO Agent generates article → SeoArticle {status: DRAFT}
  2. Human review (optional) OR auto-approve if quality score ≥ 80
  3. Publisher Agent pushes to Next.js website
     → API call to Next.js CMS or file-based publishing
     → Update SeoArticle.status = PUBLISHED
     → SeoArticle.publishedAt = NOW()
  4. Article serves as:
     - Organic traffic source (Google)
     - Internal linking hub to product pages
     - Lead capture page (contact forms)
```

---

## 5. Next.js Integration

```
apps/web/ (Next.js — apps/web/next.config.ts)

Server-Side Rendering (SSR):
  - SEO articles rendered via getServerSideProps()
  - Schema.org markup for Article type
  - Open Graph meta tags

API Routes:
  - /api/articles/[slug] → fetch article by slug from PostgreSQL
  - Dynamic routes: /blog/[slug] → SEO article pages

Sitemaps:
  - /sitemap.xml → auto-generated from published articles + products
  - Submit to Google Search Console
```

---

## 6. Architecture Components

```
SEO FACTORY COMPONENTS
────────────────────────────────────────────────────────────────────
Layer                Component              Status
────────────────────────────────────────────────────────────────────
Demand Detection     Trend Agent (01)        DONE
                     Customer FAQs (KB)      DONE
                     Competitor Monitor(18)  DONE

Keyword Management   Manual input (currently) PARTIAL
                     Keyword Research API    MISSING
                     Keyword scoring model   MISSING (designed)

Content Generation   SEO Agent (09)          DONE
                     RAG-enhanced writing    DONE
                     Internal link builder   PARTIAL

Technical SEO        Next.js SSR             DONE
                     Sitemap generation      MISSING
                     Schema markup           MISSING

Publishing           Publisher Agent         PARTIAL
                     Auto-publish to Web     PARTIAL

Performance Tracking Google Search Console   MISSING
                     Rank tracking           MISSING
                     Traffic analytics       MISSING
────────────────────────────────────────────────────────────────────
```

---

## 7. Content Categories

| Category | Volume Target | Conversion | Priority |
|----------|-------------|------------|---------|
| Product buying guides | 4/month | HIGH — transactional | P1 |
| "Cách dùng" tutorials | 8/month | MEDIUM — retention | P1 |
| Category comparisons | 4/month | HIGH — commercial | P1 |
| FAQ articles | 8/month | MEDIUM — awareness | P2 |
| Industry news | 4/month | LOW — brand | P3 |
