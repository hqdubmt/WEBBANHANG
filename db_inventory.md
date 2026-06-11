# DB INVENTORY — AI COMMERCE PLATFORM

**Database:** PostgreSQL  
**ORM:** TypeORM 0.3.19  
**Total Tables:** 40  
**Synchronize:** ON (non-production), OFF (production)  
**Migrations:** None — schema managed via synchronize  

---

## TABLES

### 1. users
| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | gen_random_uuid() | PK |
| email | varchar | NO | — | UNIQUE |
| passwordHash | varchar | NO | — | — |
| name | varchar | NO | — | — |
| avatar | varchar | YES | null | — |
| role | enum(ADMIN,MANAGER,STAFF,VIEWER) | NO | VIEWER | — |
| status | enum(ACTIVE,INACTIVE,SUSPENDED) | NO | ACTIVE | — |
| refreshToken | varchar | YES | null | — |
| lastLoginAt | timestamptz | YES | null | — |
| permissions | jsonb | YES | null | — |
| createdAt | timestamp | NO | NOW() | — |
| updatedAt | timestamp | NO | NOW() | — |

FK: none | Indexes: email(UNIQUE)

---

### 2. tenants
| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | gen_random_uuid() | PK |
| slug | varchar | NO | — | UNIQUE |
| name | varchar | NO | — | — |
| contactEmail | varchar | YES | null | — |
| contactPhone | varchar | YES | null | — |
| plan | enum(STARTER,PROFESSIONAL,ENTERPRISE) | NO | STARTER | — |
| status | enum(ACTIVE,SUSPENDED,CHURNED,TRIAL) | NO | TRIAL | — |
| monthlyRevenue | decimal(12,2) | NO | 0 | — |
| slaTarget | decimal(5,2) | NO | 99.9 | — |
| uptimePercent | decimal(5,2) | NO | 100 | — |
| apiCallsToday | int | NO | 0 | — |
| apiQuotaDaily | int | NO | 10000 | — |
| settings | jsonb | YES | null | — |
| lastLoginAt | timestamp | YES | null | — |
| createdAt | timestamp | NO | NOW() | — |
| updatedAt | timestamp | NO | NOW() | — |

FK: none | Indexes: slug(UNIQUE)

---

### 3. categories
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| name | varchar | NO | — |
| slug | varchar | YES | null |
| description | text | YES | null |
| image | varchar | YES | null |
| parentId | varchar | YES | null |
| sortOrder | int | NO | 0 |
| isActive | boolean | NO | true |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: parentId → categories.id (self-referential)  
Indexes: none explicit

---

### 4. products
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| name | varchar | NO | — |
| category | varchar | YES | null |
| description | text | YES | null |
| price | decimal(15,2) | NO | 0 |
| image | varchar | YES | null |
| stock | int | NO | 0 |
| source | enum(SHOPEE,LAZADA,TIKTOK,MANUAL) | NO | MANUAL |
| sourceId | varchar | YES | null |
| affiliateLink | varchar | YES | null |
| commission | decimal(5,2) | NO | 0 |
| trendScore | decimal(5,2) | NO | 0 |
| status | enum(ACTIVE,INACTIVE,PENDING) | NO | PENDING |
| meta | jsonb | YES | null |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: none formal (category is plain varchar, no FK to categories)  
Indexes: none explicit

---

### 5. customers
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| name | varchar | NO | — |
| phone | varchar | YES | null |
| email | varchar | YES | null |
| telegramId | varchar | YES | null |
| facebookId | varchar | YES | null |
| zaloId | varchar | YES | null |
| tier | enum(NEW,REGULAR,VIP) | NO | NEW |
| note | text | YES | null |
| totalOrders | int | NO | 0 |
| totalSpent | decimal(15,2) | NO | 0 |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: none | Indexes: none explicit

---

### 6. orders
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| orderCode | varchar | NO | — |
| customerId | varchar | NO | — |
| subtotal | decimal(15,2) | NO | 0 |
| discount | decimal(15,2) | NO | 0 |
| total | decimal(15,2) | NO | 0 |
| status | enum(PENDING,CONFIRMED,SHIPPING,DELIVERED,CANCELLED) | NO | PENDING |
| source | enum(FACEBOOK,TELEGRAM,WEBSITE,ZALO,MANUAL) | NO | WEBSITE |
| note | text | YES | null |
| shippingAddress | text | YES | null |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: customerId → customers.id  
Indexes: orderCode(UNIQUE)

---

### 7. order_items
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| orderId | varchar | NO | — |
| productId | varchar | NO | — |
| productName | varchar | YES | null |
| productImage | varchar | YES | null |
| affiliateLink | varchar | YES | null |
| price | decimal(15,2) | NO | — |
| quantity | int | NO | 1 |
| total | decimal(15,2) | NO | — |
| commission | decimal(5,2) | NO | 0 |

FK: orderId → orders.id (cascade delete)  
Indexes: none explicit  
Note: no createdAt/updatedAt columns

---

### 8. payments
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| paymentCode | varchar | NO | — |
| orderId | varchar | NO | — |
| amount | decimal(15,2) | NO | — |
| method | enum(COD,BANK_TRANSFER,MOMO,ZALOPAY,VNPAY,CREDIT_CARD) | NO | COD |
| status | enum(PENDING,PAID,FAILED,REFUNDED,PARTIAL) | NO | PENDING |
| transactionId | varchar | YES | null |
| gateway | varchar | YES | null |
| paidAt | timestamptz | YES | null |
| gatewayResponse | jsonb | YES | null |
| note | text | YES | null |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: orderId → orders.id  
Indexes: paymentCode(UNIQUE)

---

### 9. inventory
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| productId | varchar | NO | — |
| txType | enum(IMPORT,EXPORT,ADJUST,RETURN) | NO | — |
| quantity | int | NO | 0 |
| stockBefore | int | NO | 0 |
| stockAfter | int | NO | 0 |
| reference | varchar | YES | null |
| supplierId | varchar | YES | null |
| unitCost | decimal(15,2) | YES | null |
| note | text | YES | null |
| createdBy | varchar | YES | null |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: productId → products.id  
Indexes: none explicit

---

### 10. suppliers
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | PK |
| name | varchar | NO | — |
| contactName | varchar | YES | null |
| phone | varchar | YES | null |
| email | varchar | YES | null |
| address | varchar | YES | null |
| taxCode | varchar | YES | null |
| website | varchar | YES | null |
| status | enum(ACTIVE,INACTIVE,PENDING) | NO | ACTIVE |
| rating | decimal(5,2) | NO | 0 |
| note | text | YES | null |
| meta | jsonb | YES | null |
| createdAt | timestamp | NO | NOW() |
| updatedAt | timestamp | NO | NOW() |

FK: none | Indexes: none

---

### 11. supplier_products
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| supplierId | varchar | NO |
| supplierName | varchar | YES |
| name | varchar | NO |
| sku | varchar | YES |
| barcode | varchar | YES |
| description | text | YES |
| importPrice | decimal(15,2) | NO |
| suggestedRetailPrice | decimal(15,2) | NO |
| unit | varchar | YES |
| minOrderQty | int | NO |
| stock | int | NO |
| category | varchar | YES |
| imageUrl | varchar | YES |
| status | enum(ACTIVE,INACTIVE,OUT_OF_STOCK) | NO |
| leadTimeDays | int | YES |
| rating | decimal(5,2) | NO |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: supplierId → suppliers.id (NOT formal — plain varchar)  
Indexes: none

---

### 12. brands
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | varchar | NO |
| slug | varchar | YES |
| logo | varchar | YES |
| website | varchar | YES |
| description | text | YES |
| country | varchar | YES |
| isActive | boolean | NO |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: none | Indexes: none

---

### 13. affiliates
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| productId | varchar | NO |
| productName | varchar | NO |
| platform | enum(SHOPEE,LAZADA,TIKTOK,CUSTOM) | NO |
| affiliateLink | varchar | NO |
| shortLink | varchar | YES |
| commissionRate | decimal(5,2) | NO |
| price | decimal(15,2) | NO |
| clicks | int | NO |
| conversions | int | NO |
| totalEarned | decimal(15,2) | NO |
| status | enum(ACTIVE,INACTIVE,EXPIRED) | NO |
| expiresAt | timestamptz | YES |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: none formal | Indexes: none

---

### 14. affiliate_partners
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | varchar | NO |
| email | varchar | NO |
| phone | varchar | YES |
| referralCode | varchar | NO |
| website | varchar | YES |
| socialFacebook | varchar | YES |
| socialTiktok | varchar | YES |
| socialTelegram | varchar | YES |
| status | enum(PENDING,ACTIVE,SUSPENDED,REJECTED) | NO |
| tier | enum(BRONZE,SILVER,GOLD,PLATINUM) | NO |
| commissionRate | decimal(5,2) | NO |
| totalClicks | int | NO |
| totalConversions | int | NO |
| totalEarned | decimal(15,2) | NO |
| pendingPayout | decimal(15,2) | NO |
| paidOut | decimal(15,2) | NO |
| bankName | varchar | YES |
| bankAccount | varchar | YES |
| bankOwner | varchar | YES |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

Indexes: email(UNIQUE), referralCode(UNIQUE)

---

### 15. affiliate_clicks
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| partnerId | varchar | NO |
| referralCode | varchar | NO |
| productId | varchar | YES |
| productName | varchar | YES |
| ipAddress | varchar | YES |
| userAgent | varchar | YES |
| referer | varchar | YES |
| utmSource | varchar | YES |
| utmMedium | varchar | YES |
| utmCampaign | varchar | YES |
| converted | boolean | NO |
| createdAt | timestamp | NO |

FK: none formal | Indexes: none  
Note: no updatedAt

---

### 16. affiliate_conversions
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| partnerId | varchar | NO |
| referralCode | varchar | NO |
| clickId | varchar | YES |
| orderId | varchar | YES |
| productId | varchar | YES |
| productName | varchar | YES |
| orderValue | decimal(15,2) | NO |
| commissionRate | decimal(5,2) | NO |
| commissionAmount | decimal(15,2) | NO |
| status | enum(PENDING,APPROVED,PAID,REJECTED) | NO |
| note | text | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: none formal

---

### 17. commissions
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| affiliateId | varchar | NO |
| orderId | varchar | YES |
| platform | varchar | NO |
| transactionId | varchar | YES |
| orderAmount | decimal(15,2) | NO |
| commissionRate | decimal(5,2) | NO |
| commissionAmount | decimal(15,2) | NO |
| status | enum(PENDING,CONFIRMED,PAID,CANCELLED) | NO |
| confirmedAt | timestamptz | YES |
| paidAt | timestamptz | YES |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: none formal

---

### 18. dropship_products
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | varchar | NO |
| supplierId | varchar | YES |
| supplierName | varchar | YES |
| sku | varchar | YES |
| description | text | YES |
| costPrice | decimal(15,2) | NO |
| suggestedPrice | decimal(15,2) | NO |
| profitMargin | decimal(5,2) | NO |
| imageUrl | varchar | YES |
| category | varchar | YES |
| status | enum(ACTIVE,INACTIVE,OUT_OF_STOCK) | NO |
| stock | int | NO |
| soldCount | int | NO |
| sourceUrl | varchar | YES |
| sourcePlatform | varchar | YES |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: none formal

---

### 19. dropship_orders
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| orderCode | varchar | NO |
| dropshipProductId | varchar | NO |
| productName | varchar | NO |
| supplierId | varchar | YES |
| supplierName | varchar | YES |
| customerName | varchar | NO |
| customerPhone | varchar | YES |
| customerAddress | varchar | YES |
| quantity | int | NO |
| costPrice | decimal(15,2) | NO |
| salePrice | decimal(15,2) | NO |
| profit | decimal(15,2) | NO |
| status | enum(...7 values) | NO |
| trackingCode | varchar | YES |
| note | text | YES |
| meta | jsonb | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

FK: none formal

---

### 20. email_campaigns
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| subject | varchar | NO |
| body | text | NO |
| type | enum(WELCOME,UPSELL,CROSS_SELL,REMARKETING) | NO |
| status | enum(DRAFT,SCHEDULED,SENT,FAILED) | NO |
| recipientEmails | simple-array | YES |
| segmentId | varchar | YES |
| sentCount | int | NO |
| openCount | int | NO |
| clickCount | int | NO |
| meta | jsonb | YES |
| scheduledAt | timestamp | YES |
| sentAt | timestamp | YES |
| createdAt | timestamp | NO |
| updatedAt | timestamp | NO |

---

### 21. campaigns
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | varchar | NO |
| type | enum(EMAIL,TELEGRAM,FACEBOOK,TIKTOK,SMS,PUSH) | NO |
| status | enum(DRAFT,SCHEDULED,RUNNING,COMPLETED,PAUSED,CANCELLED) | NO |
| subject | text | YES |
| content | text | YES |
| segment | varchar | YES |
| targetCount / sentCount / openCount / clickCount / conversionCount | int | NO |
| scheduledAt / startedAt / completedAt | timestamptz | YES |
| createdBy | varchar | YES |
| meta | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 22. contents
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| productId | varchar | NO |
| title / body | varchar/text | NO |
| hashtags | simple-array | YES |
| imageUrl | varchar | YES |
| platform | enum(FACEBOOK,TELEGRAM,WEBSITE,TIKTOK) | NO |
| status | enum(DRAFT,SCHEDULED,PUBLISHED,FAILED) | NO |
| platformPostId | varchar | YES |
| scheduledAt / publishedAt | timestamptz | YES |
| createdAt / updatedAt | timestamp | NO |

FK: none formal

---

### 23. seo_articles
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| keyword / title / slug | varchar | NO |
| content | text | NO |
| metaDescription | varchar | YES |
| clusterKeywords / internalLinks | simple-array | YES |
| productId | varchar | YES |
| status | enum(DRAFT,PUBLISHED,ARCHIVED) | NO |
| wordCount | int | NO |
| publishedAt | timestamp | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 24. price_alerts
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| productId | varchar | NO |
| ourPrice | decimal(15,2) | NO |
| competitorPrice | decimal(15,2) | YES |
| competitorPlatform | varchar | YES |
| priceDiffPercent | decimal(5,2) | YES |
| suggestedAction | enum(INCREASE,DECREASE,COMBO,FLASH_SALE) | NO |
| reason | text | YES |
| isActedOn | boolean | NO |
| marketData | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

Indexes: @Index(['productId'])

---

### 25. leads
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| platform | enum(FACEBOOK,TELEGRAM,ZALO,TIKTOK,WEBSITE) | NO |
| platformUserId | varchar | YES |
| name | varchar | YES |
| content | text | NO |
| score | decimal(5,2) | NO |
| intent | varchar | YES |
| status | enum(NEW,CONTACTED,QUALIFIED,CONVERTED,LOST) | NO |
| customerId | varchar | YES |
| meta | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 26. mobile_sessions
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| userId / deviceId | varchar | YES |
| platform | enum(IOS,ANDROID) | YES |
| appVersion / osVersion | varchar | YES |
| durationSeconds / screenViews | int | NO |
| crashed | boolean | NO |
| events | jsonb | YES |
| endedAt | timestamp | YES |
| createdAt | timestamp | NO |

---

### 27. white_label_clients
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| companyName | varchar | NO |
| domain | varchar | NO |
| logoUrl / primaryColor / contactEmail | varchar | YES |
| status | enum(ONBOARDING,ACTIVE,INACTIVE,CHURNED) | NO |
| monthlyFee / totalRevenue | decimal(12,2) | NO |
| customizationBacklog | int | NO |
| onboardingStartedAt / onboardingCompletedAt / lastActiveAt | timestamp | YES |
| customizations | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

Indexes: domain(UNIQUE)

---

### 28. marketplace_vendors
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | varchar | NO |
| email | varchar | NO |
| phone | varchar | YES |
| status | enum(PENDING,ACTIVE,SUSPENDED,BANNED) | NO |
| totalGmv / totalFees | decimal(12,2) | NO |
| productCount / orderCount | int | NO |
| disputeRate / feePercent | decimal(5,2) | NO |
| rating | decimal(3,1) | NO |
| lastSaleAt / onboardedAt | timestamp | YES |
| bankInfo | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

Indexes: email(UNIQUE)

---

### 29. marketplace_disputes
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| vendorId / orderId / customerId | varchar | YES |
| type | enum(PRODUCT_QUALITY,NOT_RECEIVED,...) | NO |
| status | enum(OPEN,INVESTIGATING,RESOLVED,CLOSED) | NO |
| description | text | YES |
| claimAmount / refundAmount | decimal(12,2) | NO |
| resolvedAt | timestamp | YES |
| resolution | text | YES |
| createdAt / updatedAt | timestamp | NO |

FK: none formal

---

### 30. video_jobs
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| productId | varchar | NO |
| script | text | YES |
| voiceUrl / videoUrl | varchar | YES |
| platform | enum(TIKTOK,FACEBOOK_REELS,YOUTUBE_SHORTS) | NO |
| status | enum(PENDING,...,FAILED — 7 values) | NO |
| errorMessage | varchar | YES |
| durationMs | int | NO |
| meta | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 31. agent_configs
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| agentName | varchar | NO |
| displayName / description | varchar/text | YES |
| isEnabled | boolean | NO |
| cronExpression | varchar | YES |
| priority / maxRetries / timeoutMs | int | NO |
| config | jsonb | YES |
| lastRunAt | timestamptz | YES |
| lastRunStatus | varchar | YES |
| totalRuns / totalTokensUsed | int | NO |
| totalCost | decimal(15,6) | NO |
| createdAt / updatedAt | timestamp | NO |

Indexes: agentName(UNIQUE)

---

### 32. agent_logs
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| agent | enum(25 agent names) | NO |
| status | enum(SUCCESS,FAILED,RUNNING) | NO |
| input / output | jsonb | YES |
| errorMessage | varchar | YES |
| tokensUsed | int | NO |
| cost | decimal(10,6) | NO |
| durationMs | int | NO |
| createdAt | timestamp | NO |

Note: no updatedAt, append-only log table

---

### 33. workflows
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| name | varchar | NO |
| description | text | YES |
| trigger | enum(CRON,EVENT,MANUAL,WEBHOOK) | NO |
| cronExpression / eventName | varchar | YES |
| status | enum(ACTIVE,INACTIVE,RUNNING,ERROR) | NO |
| steps / config | jsonb | YES |
| runCount / successCount / failCount | int | NO |
| lastRunAt / nextRunAt | timestamptz | YES |
| createdBy | varchar | YES |
| meta | jsonb | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 34. experiments
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| title | varchar | NO |
| hypothesis | text | NO |
| experimentPlan | text | YES |
| measurements | jsonb | YES |
| evaluation / decisionReason | text | YES |
| decision | enum(PENDING,ADOPT,DISCARD,ITERATE) | NO |
| status | enum(HYPOTHESIS,RUNNING,MEASURING,EVALUATING,DECIDED) | NO |
| scope | varchar | YES |
| successScore | int | NO |
| startDate / endDate | date | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 35. learning_cycles
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| title | varchar | NO |
| scope | enum(AI_BOARD,KNOWLEDGE_BRAIN,...8 values) | NO |
| currentPhase | enum(OBSERVE,MEASURE,ANALYZE,LEARN,IMPROVE,EXECUTE,VALIDATE) | NO |
| status | enum(ACTIVE,COMPLETED,PAUSED) | NO |
| observations/measurements/analysis/lessons/improvementPlan/executionResults/validationResults | jsonb | YES |
| iterationCount | int | NO |
| triggeredBy | varchar | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 36. knowledge
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| type | enum(PRODUCT,FAQ,POLICY,TRAINING,MARKETING,AFFILIATE,CUSTOMER) | NO |
| title | varchar | NO |
| content | text | NO |
| sourceId / sourceType / vectorId / collection | varchar | YES |
| status | enum(ACTIVE,INACTIVE,PENDING) | NO |
| isIndexed | boolean | NO |
| usageCount | int | NO |
| indexedAt | timestamptz | YES |
| domain | enum(PRODUCT,CUSTOMER,BUSINESS,MARKET,OPERATIONAL) | YES |
| tier | enum(SHORT_TERM,MEDIUM_TERM,LONG_TERM) | NO |
| accuracy / completeness / freshness | int | NO |
| businessValue | int | NO |
| relationIds / tags / meta | jsonb | YES |
| expiresAt | timestamptz | YES |
| createdAt / updatedAt | timestamp | NO |

---

### 37. decision_memory
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| decision | varchar | NO |
| reason | text | NO |
| area | enum(STRATEGY,MARKETING,SALES,...8 values) | NO |
| expectedOutcome / actualOutcome / lessonLearned | text | NO/YES/YES |
| outcome | enum(PENDING,SUCCESS,FAILURE,PARTIAL) | NO |
| madeBy | varchar | YES |
| revenueImpact / profitImpact / roiActual | decimal(5,2) | YES |
| riskLevel | int | NO |
| isReviewed | boolean | NO |
| createdAt / updatedAt | timestamp | NO |

---

### 38. lessons_learned
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| type | enum(SUCCESS,FAILURE,UNEXPECTED) | NO |
| domain | enum(REVENUE,MARKETING,...6 values) | NO |
| status | enum(ACTIVE,APPLIED,SUPERSEDED) | NO |
| whatHappened / whyItHappened / whatWeLearned / whatToChange | text | NO |
| symptom / rootCause / impact / priority | varchar | YES |
| confidenceScore | int | NO |
| isProven | boolean | NO |
| timesApplied / timesSucceeded | int | NO |
| tags | simple-array | YES |
| createdAt | timestamp | NO |

Note: no updatedAt

---

### 39. ai_memories
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| customerId | varchar | YES |
| sessionId | varchar | YES |
| type | enum(CHAT_HISTORY,CUSTOMER_BEHAVIOR,PURCHASE_HISTORY,VIEWED_PRODUCTS) | NO |
| data | jsonb | NO |
| summary | text | YES |
| tags | simple-array | YES |
| createdAt / updatedAt | timestamp | NO |

Indexes: @Index(['customerId', 'type'])

---

### 40. performance_scorecards
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | NO |
| period | enum(DAILY,WEEKLY,MONTHLY) | NO |
| periodDate | date | NO |
| revenueScore/profitScore/marketingScore/operationsScore/technologyScore/customerScore/growthScore/overallScore | int | NO |
| dailyAnswers / weeklyRetrospective / monthlyEvolution / rawMetrics | jsonb | YES |
| createdAt | timestamp | NO |

---

## INDEXES SUMMARY

| Table | Column(s) | Type |
|-------|-----------|------|
| users | email | UNIQUE |
| tenants | slug | UNIQUE |
| orders | orderCode | UNIQUE |
| payments | paymentCode | UNIQUE |
| affiliate_partners | email | UNIQUE |
| affiliate_partners | referralCode | UNIQUE |
| white_label_clients | domain | UNIQUE |
| marketplace_vendors | email | UNIQUE |
| agent_configs | agentName | UNIQUE |
| price_alerts | productId | INDEX |
| ai_memories | (customerId, type) | COMPOSITE INDEX |

**Missing indexes (no explicit @Index):** products.status, products.source, orders.customerId, orders.status, order_items.orderId, order_items.productId, inventory.productId, leads.status, leads.platform, contents.productId, contents.status, agent_logs.agent, agent_logs.createdAt, knowledge.type, knowledge.domain

---

## FORMAL FOREIGN KEY RELATIONSHIPS

| Table | Column | References |
|-------|--------|------------|
| categories | parentId | categories.id |
| orders | customerId | customers.id |
| order_items | orderId | orders.id (cascade) |
| payments | orderId | orders.id |
| inventory | productId | products.id |

**Informal references (varchar, no FK constraint):**
- products.category → categories (no FK)
- supplier_products.supplierId → suppliers (no FK)
- affiliates.productId → products (no FK)
- affiliate_clicks.partnerId → affiliate_partners (no FK)
- affiliate_conversions.partnerId → affiliate_partners (no FK)
- affiliate_conversions.orderId → orders (no FK)
- commissions.affiliateId → affiliates (no FK)
- contents.productId → products (no FK)
- seo_articles.productId → products (no FK)
- video_jobs.productId → products (no FK)
- leads.customerId → customers (no FK)
- marketplace_disputes.vendorId → marketplace_vendors (no FK)
- marketplace_disputes.orderId → orders (no FK)

---

## VIEWS, FUNCTIONS, TRIGGERS

**Views:** None defined  
**Database Functions:** None defined  
**Triggers:** None defined  

All business logic is in the application layer (NestJS services).

---

## SEED DATA

No seed files found. Database populated via application logic only.
