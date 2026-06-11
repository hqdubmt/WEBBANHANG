# SEO Factory Readiness Score — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## Score Breakdown — 8 Tiêu chí

| # | Tiêu chí | Trọng số | Điểm (0–10) | Thực trạng |
|---|----------|---------|------------|------------|
| 1 | **SeoArticle Entity** | 15% | **9/10** | Entity đầy đủ: keyword/title/slug/content/metaDescription/clusterKeywords/internalLinks/wordCount/publishedAt. ArticleStatus enum. SlugUtil có sẵn. |
| 2 | **SEO Agent (Article Generation)** | 20% | **7/10** | SEO Agent `/api/agents/seo/run` tạo articles qua Ollama LLM. RAG context from Knowledge Brain. getDraftArticles() hoạt động. Thiếu: quality gate, keyword prioritization. |
| 3 | **Content Structure & Types** | 10% | **6/10** | SeoArticle hỗ trợ tất cả content types. internalLinks và clusterKeywords fields exist. Thiếu: structured generation per content type (pillar vs cluster). |
| 4 | **Technical SEO** | 15% | **5/10** | Next.js SSR = major advantage. nginx HTTPS. URL slugs clean. THIẾU: sitemap.xml, robots.txt, schema markup, canonical tags. |
| 5 | **Keyword Research** | 10% | **3/10** | Không có keyword research tool integration. Không có SeoKeyword entity. SEO Agent dùng product names làm keywords (basic). Volume/difficulty data không có. |
| 6 | **Topical Authority Planning** | 10% | **3/10** | Không có topic cluster mapping. Không có pillar vs cluster content strategy automation. clusterKeywords field exists nhưng không được dùng chiến lược. |
| 7 | **Performance Tracking** | 10% | **1/10** | Không có Google Search Console API integration. Không biết ranking positions. Không biết organic traffic. Không có performance feedback loop. |
| 8 | **Publishing Automation** | 10% | **5/10** | Publisher Agent tồn tại. Manual trigger qua API. Thiếu: scheduling, auto-publish khi quality ≥ 80, Next.js page generation trigger. |

---

## Tổng Điểm

```
Tổng = 0.15×9 + 0.20×7 + 0.10×6 + 0.15×5 + 0.10×3 + 0.10×3 + 0.10×1 + 0.10×5
     = 1.35 + 1.40 + 0.60 + 0.75 + 0.30 + 0.30 + 0.10 + 0.50
     = 5.30 / 10
```

**TỔNG ĐIỂM: 5.3 / 10 — 53%**

---

## Radar Chart

```
SeoArticle Entity       ██████████████████   9.0
SEO Agent               ██████████████       7.0
Content Structure       ████████████         6.0
Publishing Auto         ██████████           5.0
Technical SEO           ██████████           5.0
Keyword Research        ██████               3.0  ← GAP
Topical Authority       ██████               3.0  ← GAP
Performance Tracking    ██                   1.0  ← CRITICAL GAP
```

---

## Verdict

**LEVEL: FUNCTIONAL (53%) — Can Generate Content, Cannot Optimize or Measure**

### Điểm mạnh
- Data model (SeoArticle) production-ready
- LLM-powered article generation via Ollama
- RAG context injection từ Knowledge Brain
- Next.js SSR = Google-friendly foundation

### Điểm yếu nghiêm trọng
1. **Performance Tracking = 1/10:** Không biết website đang rank position mấy cho bất kỳ keyword nào. Không có feedback loop giữa performance và content strategy.
2. **Keyword Research = 3/10:** Đang "viết content vào tối" — không biết demand, difficulty, hay opportunity. Cần keyword data (volume + difficulty).
3. **Topical Authority = 3/10:** Viết articles không có strategy = Google không thấy topical authority = ranking khó.

### Hành động tiếp theo
1. `[P1]` Google Search Console API integration → biết position của từng article
2. `[P1]` SeoKeyword entity + keyword management API → data-driven content planning
3. `[P2]` Topic cluster mapping → pillar/cluster strategy automation
4. `[P2]` sitemap.xml auto-generation từ published articles
5. `[P3]` Schema markup injection (Article + Product + FAQ)
