# DATA FLOW REPORT — AI COMMERCE PLATFORM

---

## FLOW 1: Traffic → Lead → Customer → Order → Revenue

```
STEP 1: TRAFFIC ARRIVES
  Platform: Facebook / Telegram / Zalo / TikTok / Website
       │
       ▼
STEP 2: LEAD CAPTURE
  [leads]
  - platform = source channel
  - platformUserId = channel-specific ID
  - content = message/inquiry text
  - score = AI-calculated intent score (0–5)
  - intent = product/service interest
  - status = NEW
       │
       ▼ (AI CRM agent scores & routes)
STEP 3: LEAD QUALIFICATION
  [leads].status → CONTACTED → QUALIFIED
  [ai_memories] records chat history (CHAT_HISTORY type)
       │
       ▼ (lead closes sale)
STEP 4: LEAD → CUSTOMER CONVERSION
  [leads].status → CONVERTED
  [leads].customerId = new/existing customers.id
  [customers] record created:
    - tier = NEW
    - totalOrders = 0
    - totalSpent = 0
       │
       ▼
STEP 5: ORDER CREATION
  [orders]
  - orderCode = unique code
  - customerId FK
  - source = channel (FACEBOOK/TELEGRAM/ZALO/WEBSITE/MANUAL)
  - status = PENDING
  [order_items]
  - orderId FK
  - productId (snapshot, no FK)
  - productName, price (point-in-time snapshot)
  - commission (for affiliate tracking)
       │
       ▼
STEP 6: PAYMENT
  [payments]
  - paymentCode = unique
  - orderId FK
  - method = COD/BANK_TRANSFER/MOMO/ZALOPAY/VNPAY/CREDIT_CARD
  - status = PENDING → PAID
       │
       ▼
STEP 7: FULFILMENT
  [orders].status → CONFIRMED → SHIPPING → DELIVERED
       │
       ▼
STEP 8: REVENUE RECORDED
  [customers].totalOrders += 1
  [customers].totalSpent += order.total
  [customers].tier upgraded if thresholds met
  [performance_scorecards].revenueScore updated (via AI agent)
```

---

## FLOW 2: Product → Content → Publish → Lead → Sale

```
STEP 1: PRODUCT DISCOVERY
  [products] created:
    - source = SHOPEE/LAZADA/TIKTOK (scraped) or MANUAL
    - trendScore assigned by Trend agent
    - status = PENDING → ACTIVE
       │
       ▼
STEP 2: AFFILIATE LINK GENERATION
  [affiliates] created:
    - productId (soft ref)
    - platform + affiliateLink
    - commissionRate
  [products].affiliateLink = shortlink
       │
       ▼
STEP 3: CONTENT GENERATION (AI Content Agent)
  [contents] created:
    - productId (soft ref)
    - title, body, hashtags (AI-generated)
    - imageUrl
    - platform = FACEBOOK/TELEGRAM/TIKTOK/WEBSITE
    - status = DRAFT
       │
       ▼
STEP 4: VIDEO PRODUCTION (AI Video Agent)
  [video_jobs] created:
    - productId (soft ref)
    - script → voiceUrl → videoUrl (pipeline)
    - status: PENDING → GENERATING_SCRIPT → GENERATING_VOICE
             → RENDERING → UPLOADING → PUBLISHED
       │
       ▼
STEP 5: SEO ARTICLE (AI SEO Agent)
  [seo_articles] created:
    - keyword, title, slug
    - clusterKeywords, internalLinks
    - productId (soft ref)
    - status = DRAFT → PUBLISHED
       │
       ▼
STEP 6: CONTENT PUBLISHING (AI Publisher Agent)
  [contents].status → SCHEDULED → PUBLISHED
  [contents].platformPostId = external post ID
       │
       ▼
STEP 7: TRAFFIC GENERATED → LEAD (see Flow 1)
  [affiliate_clicks] recorded per click:
    - partnerId, referralCode, ipAddress, utm fields
    - converted = false initially
       │
       ▼
STEP 8: CONVERSION TRACKED
  [affiliate_clicks].converted = true
  [affiliate_conversions] created:
    - clickId → orderId → commissionAmount
    - status = PENDING
  [affiliate_partners].totalClicks/totalConversions updated
  [commissions] created for platform affiliate earnings
```

---

## FLOW 3: Inventory Management

```
STEP 1: SUPPLIER ONBOARDING
  [suppliers] created → [supplier_products] catalogued
       │
       ▼
STEP 2: STOCK IMPORT
  [inventory] tx: txType = IMPORT
    - stockBefore + quantity = stockAfter
    - supplierId (soft ref)
    - unitCost recorded
  [products].stock = updated (via application)
       │
       ▼
STEP 3: SALE → STOCK EXPORT
  [order_items] quantity confirmed
  [inventory] tx: txType = EXPORT
    - stockBefore - quantity = stockAfter
  [products].stock decremented
       │
       ▼
STEP 4: PRICE INTELLIGENCE
  AI Price Agent scans market:
  [price_alerts] created:
    - productId (indexed)
    - ourPrice vs competitorPrice
    - suggestedAction = INCREASE/DECREASE/COMBO/FLASH_SALE
    - isActedOn = false initially
```

---

## FLOW 4: Dropship Order Flow

```
  (Parallel track, ISOLATED from main commerce flow)

  [dropship_products] (sourced from suppliers)
       │
       ▼
  [dropship_orders] created on sale
    - customerName/Phone/Address DENORMALIZED (not linked to customers)
    - dropshipProductId (soft ref)
    - costPrice → salePrice → profit
    - status: PENDING → CONFIRMED → PROCESSING → SHIPPED
             → DELIVERED / CANCELLED / REFUNDED

  ⚠️ No link to [orders], [customers], or [payments]
  ⚠️ Revenue from dropship NOT captured in performance_scorecards
```

---

## FLOW 5: Affiliate Partner Program

```
  [affiliate_partners] onboards (status: PENDING → ACTIVE)
       │
       ▼
  Partner shares referralCode / affiliateLink
       │
       ▼
  User clicks link:
  [affiliate_clicks] recorded (ipAddress, utm, converted=false)
       │
       ▼
  User purchases:
  [affiliate_clicks].converted = true
  [affiliate_conversions] created (orderId soft ref)
  [affiliate_partners].totalConversions += 1
  [affiliate_partners].totalEarned += commissionAmount
  [affiliate_partners].pendingPayout += commissionAmount
       │
       ▼
  Payout approved:
  [affiliate_conversions].status → APPROVED → PAID
  [affiliate_partners].pendingPayout → paidOut
```

---

## FLOW 6: Campaign → Customer Reach

```
  [campaigns] created (type: EMAIL/TELEGRAM/FACEBOOK/TIKTOK/SMS/PUSH)
    - segment = customer segment (varchar — no FK)
    - status = DRAFT → SCHEDULED → RUNNING → COMPLETED

  [email_campaigns] (DUPLICATE parallel entity for email only)
    - recipientEmails (denormalized array — not linked to customers)
    - status = DRAFT → SENT

  ⚠️ No formal link from campaigns to customers table
  ⚠️ campaign.segment is plain varchar — no customer_segments table
  ⚠️ email_campaigns.recipientEmails = raw email array (no customer FK)
```

---

## FLOW 7: AI Knowledge Brain Loop

```
  Business events occur (orders, leads, campaigns, decisions)
       │
       ▼
  [knowledge] records created:
    - type = PRODUCT/FAQ/POLICY/TRAINING/MARKETING/...
    - tier = SHORT_TERM/MEDIUM_TERM/LONG_TERM
    - isIndexed = false → vector embedding → isIndexed = true
    - vectorId stored (external vector DB reference)
    - quality: accuracy, completeness, freshness, businessValue
       │
       ▼
  [decision_memory] records decisions:
    - area, expectedOutcome, actualOutcome
    - outcome = PENDING → SUCCESS/FAILURE/PARTIAL
    - revenueImpact, profitImpact, roiActual
       │
       ▼
  [lessons_learned] extracted:
    - what happened, why, what learned, what to change
    - confidenceScore, isProven
    - timesApplied/timesSucceeded (learning loop)
       │
       ▼
  [experiments] A/B test hypotheses:
    - status: HYPOTHESIS → RUNNING → MEASURING → DECIDED
    - decision: ADOPT/DISCARD/ITERATE
       │
       ▼
  [learning_cycles] orchestrates phases:
    - OBSERVE → MEASURE → ANALYZE → LEARN → IMPROVE → EXECUTE → VALIDATE
    - scope = AI_BOARD/KNOWLEDGE_BRAIN/AGENTS/CONTENT/SALES/...
    - iterationCount tracks loop depth
       │
       ▼
  Improvements applied to [agent_configs]:
    - config jsonb updated
    - cronExpression adjusted
    - totalCost / totalTokensUsed tracked
```

---

## FLOW 8: AI Agent Execution Loop

```
  [agent_configs] defines 25 agents
  (TREND, AFFILIATE, CONTENT, PUBLISHER, LEAD, SALES, CRM, VIDEO,
   SEO, TREND_PREDICTOR, PRICE, SEGMENTATION, EMAIL, TELEGRAM,
   KNOWLEDGE, MASTER, REVIEW, VIDEO_OPTIMIZER, COMPETITOR_MONITOR,
   DEMAND_FORECASTER, REPRICING, MARKETPLACE_OPTIMIZER,
   MOBILE_ENGAGEMENT, ENTERPRISE_HEALTH, WHITELABEL_ONBOARDING)

  Each agent run:
  [agent_logs] appended:
    - agent (enum), status, input/output (jsonb)
    - tokensUsed, cost, durationMs
    - (append-only, no updatedAt)

  [workflows] orchestrates multi-step sequences:
    - trigger = CRON/EVENT/MANUAL/WEBHOOK
    - steps (jsonb pipeline)
    - runCount, successCount, failCount
```

---

## FLOW 9: Performance Measurement

```
  Periodic AI Board agent runs (DAILY/WEEKLY/MONTHLY):
       │
       ▼
  Reads data from: orders, customers, leads, agent_logs,
                   knowledge, campaigns, affiliates
       │
       ▼
  [performance_scorecards] created:
    - period + periodDate (composite natural key)
    - 8 dimension scores: revenue, profit, marketing,
      operations, technology, customer, growth, overall
    - rawMetrics jsonb (full snapshot)
    - dailyAnswers / weeklyRetrospective / monthlyEvolution

  ⚠️ No formal FK linking scorecards to source data
  ⚠️ Scores computed in-app logic, not DB computed columns
```

---

## CROSS-FLOW DEPENDENCIES MAP

```
                    [products]
                    ┌──────────┐
                    │          │
         [contents] │   [affiliates]   [inventory]
         [video_jobs]│  [price_alerts] [order_items]
         [seo_articles]        │
                    └──────────┘
                         │
              ┌──────────┴──────────┐
          [leads]              [orders]
              │                    │
          [customers]         [payments]
              │                    │
          [ai_memories]    [affiliate_conversions]
                                   │
                           [affiliate_partners]
                                   │
                              [commissions]
```

---

## DATA FLOWS MISSING / BROKEN

| Missing Flow | Impact |
|-------------|--------|
| Dropship orders → main revenue | Dropship P&L invisible to scorecards |
| Campaigns → customers (formal) | Cannot track who received campaigns |
| Leads → campaigns attribution | Cannot link lead source to campaign spend |
| Orders → knowledge brain | AI has no real-time order context |
| Tenants → users | Multi-tenancy not enforced at DB level |
| Brands → products | Brand metadata not linked to product catalog |
| Experiments → agent_configs | A/B test results not auto-applied |
