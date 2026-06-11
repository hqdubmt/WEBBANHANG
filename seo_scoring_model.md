# SEO Scoring Model — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Article Quality Score (Pre-publish)

```
Article Quality Score = w1×Content + w2×Technical + w3×Structure

w1 = 0.40  (Content quality)
w2 = 0.30  (Technical SEO)
w3 = 0.30  (Structure/UX)

Content Score (0–100):
  keyword in H1                              → +25
  keyword density 1–3%                       → +20
  word count ≥ 1,000                         → +20
  cluster keywords mentioned naturally       → +15
  no AI-generated artifacts/repetition       → +20

Technical Score (0–100):
  meta description 150–155 chars + keyword   → +40
  slug ≤ 5 words, contains keyword           → +30
  internal links ≥ 3                         → +30

Structure Score (0–100):
  has H2 sections ≥ 3                        → +30
  has FAQ section                            → +25
  has CTA at end                             → +25
  has intro and conclusion                   → +20

Threshold:
  ≥ 80 → auto-approve for publishing
  60–79 → human review
  < 60  → regenerate
```

---

## 2. SEO Performance Score (SPS) — Post-publish

```
SPS = w1×Ranking + w2×Traffic + w3×Engagement + w4×Conversion

w1 = 0.30  (Ranking — Google position)
w2 = 0.30  (Traffic — organic visits)
w3 = 0.20  (Engagement — time on page, bounce)
w4 = 0.20  (Conversion — leads/orders)

Ranking Score (0–100):
  Position 1      → 100
  Position 2–3    → 85
  Position 4–5    → 70
  Position 6–10   → 50
  Position 11–20  → 25
  Position > 20   → 5
  Not indexed     → 0

Traffic Score (0–100):
  monthly_organic_visits / target_visits × 100
  target_visits per article = 200/month (conservative)

Engagement Score (0–100):
  avg_time_on_page ≥ 3 min → 100
  2–3 min → 70
  1–2 min → 40
  < 1 min → 10 (indicates content mismatch)

Conversion Score (0–100):
  leads_from_article / visits × 1000 / target_rate × 100
  target_rate = 5 leads per 1,000 visits
```

---

## 3. SPS Thresholds and Actions

```
SPS ≥ 75 → PERFORMING  → Build more cluster articles to reinforce
SPS 50–74 → POTENTIAL  → Add internal links, refresh content, build backlinks  
SPS 25–49 → STRUGGLING → Full content refresh, UX optimization
SPS < 25  → FAILING    → Investigate: indexation? Competition? Wrong keyword?
```

---

## 4. Metrics Tracking (Currently Missing)

```
MISSING METRICS TRACKING:

Required for SPS computation:
  1. Google Search Console API integration
     → Position, Impressions, Clicks per article
     
  2. Google Analytics (or privacy-first alternative)
     → Sessions, Time on page, Bounce rate per URL
     
  3. Lead attribution
     → leads WHERE meta.referrer LIKE '%/blog/%'

Current data we DO have:
  - SeoArticle.keyword (tracked)
  - SeoArticle.publishedAt (tracked)
  - SeoArticle.wordCount (tracked)
  - SeoArticle.status (DRAFT/PUBLISHED/ARCHIVED)
  
Data we DON'T have (not yet integrated):
  - Position data (Google API not integrated)
  - Traffic data (no analytics)
  - Article-attributed conversions
```

---

## 5. Article Performance Summary Table

```
SEO ARTICLE PERFORMANCE (Sample — when tracking implemented)
────────────────────────────────────────────────────────────────────────
Keyword                Position   Traffic/mo  Leads/mo  Revenue    SPS
────────────────────────────────────────────────────────────────────────
"kem duong da ban dem"     4         850         12      2,400K     82
"serum vitamin c review"   7         420          6      1,100K     67
"cach dung kem duong"     12         180          2        400K     48
"mua kem chinh hang"      19          45          1        200K     29
"my pham tot nhat"        35           8          0          0K      8
────────────────────────────────────────────────────────────────────────
```

---

## 6. SEO Agent Output Quality Gate

```
Current: generateDailyArticles() creates articles and saves as DRAFT
Missing: Quality gate before saving

To implement:
  1. After LLM generation → compute Article Quality Score
  2. If score < 60 → retry with improved prompt (max 2x)
  3. If score < 60 after retries → save with flag 'needs_human_review'
  4. If score ≥ 80 → mark 'ready_to_publish'
  5. Auto-publish: if score ≥ 80 AND keyword tier = 'long_tail'
```
