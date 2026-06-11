# Technical SEO Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Technical SEO Checklist

```
CURRENT STACK: Next.js (apps/web/) — SSR enabled
               NestJS API (apps/api/) — serves data
               PostgreSQL — content storage

CHECKLIST:
┌──────────────────────────────────────────────────────────────────────┐
│ Category           │ Item                          │ Status           │
├──────────────────────────────────────────────────────────────────────┤
│ Crawlability       │ robots.txt                    │ MISSING          │
│                    │ XML Sitemap                   │ MISSING          │
│                    │ Internal link structure       │ PARTIAL          │
│                    │ No broken links (404)         │ Unknown          │
├──────────────────────────────────────────────────────────────────────┤
│ Indexability       │ Canonical tags                │ MISSING          │
│                    │ noindex/nofollow rules        │ MISSING          │
│                    │ Duplicate content handling    │ PARTIAL (slugs)  │
├──────────────────────────────────────────────────────────────────────┤
│ Core Web Vitals    │ LCP (< 2.5s)                  │ Unknown          │
│                    │ INP (< 200ms)                 │ Unknown          │
│                    │ CLS (< 0.1)                   │ Unknown          │
│                    │ Page speed optimization       │ Partial (Next.js │
│                    │                               │  auto-optimize)  │
├──────────────────────────────────────────────────────────────────────┤
│ Structured Data    │ Article schema                │ MISSING          │
│                    │ Product schema                │ MISSING          │
│                    │ FAQ schema                    │ MISSING          │
│                    │ BreadcrumbList schema         │ MISSING          │
│                    │ Organization schema           │ MISSING          │
├──────────────────────────────────────────────────────────────────────┤
│ Mobile             │ Mobile-first design           │ Assumed (Next.js)│
│                    │ Viewport meta tag             │ Done (Next.js)   │
│                    │ Touch targets ≥ 48px          │ Unknown          │
├──────────────────────────────────────────────────────────────────────┤
│ HTTPS              │ SSL Certificate               │ Done (nginx)     │
│                    │ HSTS header                   │ nginx config     │
├──────────────────────────────────────────────────────────────────────┤
│ URL Structure      │ Clean URLs (no query strings) │ Done (slugs)     │
│                    │ Consistent slugs              │ Done (SlugUtil)  │
│                    │ Breadcrumbs                   │ MISSING          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Web Vitals — Next.js Optimizations

```
LCP (Largest Contentful Paint) — Target: < 2.5s
  Next.js auto-optimizations:
    ✓ next/image → automatic WebP conversion, lazy loading
    ✓ Server-Side Rendering → faster TTFB vs CSR
    
  Manual implementations needed:
    □ Preload hero images
    □ CDN for product images
    □ Font preloading (next/font)

INP (Interaction to Next Paint) — Target: < 200ms
    ✓ Next.js App Router → React Server Components
    □ Reduce JavaScript bundle size
    □ Code splitting per route

CLS (Cumulative Layout Shift) — Target: < 0.1
    ✓ next/image with explicit width/height
    □ Font size reserves
    □ Ad slots with explicit dimensions
```

---

## 3. XML Sitemap Strategy

```
MISSING: apps/web/ has no sitemap.xml

Required Implementation:
  /sitemap.xml → main sitemap index
  /sitemap-articles.xml → all published SEO articles
  /sitemap-products.xml → all active product pages
  /sitemap-categories.xml → category landing pages

Next.js Implementation:
  // apps/web/app/sitemap.ts
  export default async function sitemap() {
    const articles = await fetch('/api/seo/published')
    const products = await fetch('/api/products/active')
    
    return [
      ...articles.map(a => ({
        url: `https://domain.com/blog/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      })),
      ...products.map(p => ({
        url: `https://domain.com/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.9,
      })),
    ]
  }

Update trigger: Auto-regenerate when new article published
Submit to: Google Search Console
```

---

## 4. Schema Markup Templates

### Article Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{article.title}",
  "description": "{article.metaDescription}",
  "keywords": "{article.clusterKeywords.join(',')}",
  "author": {
    "@type": "Organization",
    "name": "AI Social Commerce"
  },
  "datePublished": "{article.publishedAt}",
  "dateModified": "{article.updatedAt}"
}
```

### Product Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{product.name}",
  "description": "{product.description}",
  "offers": {
    "@type": "Offer",
    "price": "{product.price}",
    "priceCurrency": "VND",
    "availability": "https://schema.org/InStock"
  }
}
```

### FAQ Schema (from SeoArticle)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Câu hỏi 1?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Trả lời 1"
      }
    }
  ]
}
```

---

## 5. nginx Configuration (Current)

```nginx
# apps/nginx/nginx.conf — existing
server {
  listen 443 ssl;
  
  # SEO headers needed:
  add_header X-Robots-Tag "index, follow";         # TODO
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains"; # Check if present
  
  # Canonical redirect: www → non-www
  # TODO: Add 301 redirect
  
  # Compression for faster LCP
  gzip on;                                          # CHECK if present
  gzip_types text/html text/css application/javascript;
}
```
