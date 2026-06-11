# Customer Journey Readiness Score — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Scoring Methodology

Đánh giá mức độ sẵn sàng của hệ thống để vận hành Customer Journey Engine đầy đủ.

**Thang điểm:** 0-100 per criteria
**Trọng số:** Tùy theo tầm quan trọng với business
**Verdict:**
- 80-100: Production Ready
- 60-79: Beta Ready (có thể launch với giám sát)
- 40-59: Development (cần thêm 4-8 tuần)
- 20-39: Early Stage (cần 2-4 tháng)
- 0-19: Foundation Missing (cần rebuild)

---

## 2. Scorecard Chi Tiết

### Tiêu chí 1: Customer Data Model
**Trọng số: 20%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| Core identity fields (phone, name, email) | 90/100 | Đầy đủ |
| Platform IDs (tele, fb, zalo) | 80/100 | Thiếu tiktokId |
| Behavioral metrics (orders, spent, ltv) | 70/100 | Có nhưng không auto-compute |
| Engagement metrics (openRate, clickRate) | 5/100 | Gần như không có |
| Profile enrichment (location, birthdate) | 15/100 | Hầu như thiếu |
| Segmentation fields (segment, tags, persona) | 10/100 | Chưa có |
| **Average** | **45/100** | |

**Weighted score: 45 × 0.20 = 9.0**

---

### Tiêu chí 2: Lifecycle Stage Tracking
**Trọng số: 15%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| Lead entity với status tracking | 85/100 | Tốt, có đủ status |
| Customer entity với tier | 75/100 | Có nhưng không auto-upgrade |
| Stage transition automation | 15/100 | Hầu như thủ công |
| Stranger/Visitor tracking | 0/100 | Không có |
| Advocate stage | 0/100 | Không có |
| Stage analytics & reporting | 5/100 | Không có funnel view |
| **Average** | **30/100** | |

**Weighted score: 30 × 0.15 = 4.5**

---

### Tiêu chí 3: Multi-Channel Touchpoint Coverage
**Trọng số: 15%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| Telegram integration | 85/100 | Mạnh nhất — AI bot, notifications |
| Facebook integration | 40/100 | Có facebookId, thiếu webhook/pixel |
| Zalo integration | 45/100 | Có zaloId, thiếu OA automation |
| TikTok integration | 10/100 | Chỉ có platform label, thiếu tiktokId |
| Website tracking | 35/100 | Next.js có nhưng thiếu event tracking |
| Email channel | 5/100 | Có email field, thiếu email service |
| Cross-channel identity resolution | 20/100 | Phone-based nhưng không tự động |
| **Average** | **34/100** | |

**Weighted score: 34 × 0.15 = 5.1**

---

### Tiêu chí 4: Customer Segmentation Engine
**Trọng số: 10%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| Basic tier segmentation | 70/100 | new/regular/vip có |
| RFM scoring model | 0/100 | Không có |
| Behavioral segments (11 segments) | 0/100 | Không có |
| Auto-assignment logic | 0/100 | Không có cron/trigger |
| Segment-based campaign triggers | 0/100 | Không có |
| Segment analytics dashboard | 0/100 | Không có |
| **Average** | **12/100** | |

**Weighted score: 12 × 0.10 = 1.2**

---

### Tiêu chí 5: Health Score & Churn Prediction
**Trọng số: 10%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| churnRisk field tồn tại | 40/100 | Field có nhưng không có logic |
| Health score model | 0/100 | Không có |
| Recency signal | 5/100 | Không có lastPurchaseDate auto-compute |
| Frequency signal | 10/100 | totalOrders có nhưng không dùng cho health |
| Monetary signal | 10/100 | totalSpent có nhưng không dùng cho health |
| Engagement signal | 0/100 | Không có engagement tracking |
| Automated health score updates | 0/100 | Không có |
| Alert system khi score drop | 0/100 | Không có |
| **Average** | **8/100** | |

**Weighted score: 8 × 0.10 = 0.8**

---

### Tiêu chí 6: Journey Analytics & Drop-off Detection
**Trọng số: 15%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| GET /api/analytics/customers | 60/100 | Có endpoint nhưng basic |
| Funnel conversion tracking | 5/100 | Không có /analytics/funnel |
| Drop-off detection | 5/100 | Không có automated detection |
| Cohort analysis | 0/100 | Không có |
| Journey timeline per customer | 5/100 | Không có event log |
| Real-time dashboard | 10/100 | Partial dashboard tồn tại |
| Conversion rate reporting | 5/100 | Không có breakdown |
| **Average** | **13/100** | |

**Weighted score: 13 × 0.15 = 1.95**

---

### Tiêu chí 7: Retention & Follow-up Automation
**Trọng số: 15%**

| Sub-criteria | Score | Lý do |
|-------------|-------|-------|
| New customer onboarding sequence | 5/100 | Không có automation |
| Regular nurture campaigns | 5/100 | Không có |
| At-risk win-back campaigns | 10/100 | churnRisk field nhưng không dùng |
| VIP premium experience | 20/100 | Tier có nhưng không có premium flows |
| Event-based reactivation triggers | 0/100 | Không có |
| Retention campaign analytics | 0/100 | Không có |
| AI-powered personalization | 25/100 | AI Chat Agent có nhưng không proactive |
| **Average** | **9/100** | |

**Weighted score: 9 × 0.15 = 1.35**

---

## 3. Tổng Điểm

```
┌─────────────────────────────────────────────────────────┐
│         CUSTOMER JOURNEY READINESS SCORECARD            │
├────────────────────────────────┬───────────┬────────────┤
│ Tiêu chí                       │ Score     │ Weighted   │
├────────────────────────────────┼───────────┼────────────┤
│ 1. Customer Data Model (20%)   │ 45/100    │ 9.0        │
│ 2. Lifecycle Tracking (15%)    │ 30/100    │ 4.5        │
│ 3. Touchpoint Coverage (15%)   │ 34/100    │ 5.1        │
│ 4. Segmentation Engine (10%)   │ 12/100    │ 1.2        │
│ 5. Health Score & Churn (10%)  │  8/100    │ 0.8        │
│ 6. Journey Analytics (15%)     │ 13/100    │ 1.95       │
│ 7. Retention Automation (15%)  │  9/100    │ 1.35       │
├────────────────────────────────┼───────────┼────────────┤
│ TOTAL SCORE                    │           │ 23.9/100   │
└────────────────────────────────┴───────────┴────────────┘
```

**TỔNG ĐIỂM: 24/100**

---

## 4. Điểm Mạnh

1. **Telegram Integration** — Mạnh nhất trong các channels. AI Chat Agent đang hoạt động, có telegramId tracking, có notification system.

2. **Core Customer Entity** — Đủ fields cơ bản để vận hành: phone, name, platform IDs (trừ TikTok), totalOrders, totalSpent, tier.

3. **Lead Management** — Lead entity tốt với đủ status transitions (new → contacted → qualified → converted → lost). Platform tracking có.

4. **AI Foundation** — 21 AI agents là nền tảng mạnh để build intelligent journey automation. Knowledge Brain và Ollama LLM tại chỗ.

5. **Analytics Endpoint tồn tại** — `/api/analytics/customers` cho thấy analytics layer đang được xây dựng.

---

## 5. Điểm Yếu Nghiêm Trọng

1. **Không có automation** — Mọi follow-up hiện tại là thủ công. Không có sequence engine, không có trigger-based messaging.

2. **Thiếu engagement tracking** — Không biết khách hàng có đọc tin nhắn không, click không. Blind spot lớn nhất.

3. **TikTok integration gần như zero** — Kênh đang có growth cao nhất tại VN nhưng chỉ có platform label.

4. **Không có email service** — Email field có nhưng không gửi được gì. Mất 1 channel retention quan trọng.

5. **Health Score & Churn Prediction không hoạt động** — churnRisk field có nhưng là static, không được tính toán.

6. **Segmentation không có** — Chỉ 3 tiers đơn giản. Không có RFM, không có behavioral segments. Không thể target chính xác.

---

## 6. Verdict

```
┌─────────────────────────────────────────────────────┐
│  VERDICT: EARLY STAGE (24/100)                      │
│                                                     │
│  Hệ thống có nền tảng data tốt nhưng thiếu         │
│  automation layer hoàn toàn. Customer Journey       │
│  Engine chưa thể chạy autonomous.                  │
│                                                     │
│  Estimated time to Production Ready: 3-4 months    │
│  with dedicated development.                        │
│                                                     │
│  Priority: Build automation engine trước,          │
│  sau đó advanced analytics, sau đó ML/AI layer.    │
└─────────────────────────────────────────────────────┘
```

---

## 7. Quick Wins (Impact/Effort = Best)

| Quick Win | Effort | Score Impact |
|-----------|--------|-------------|
| Thêm `tiktokId` vào Customer entity | 1 hour | +2 pts |
| Auto-compute `lastPurchaseDate` từ Orders | 4 hours | +3 pts |
| Auto-upgrade tier sau Order delivered | 8 hours | +4 pts |
| Auto-create Customer từ Lead.converted | 4 hours | +3 pts |
| Basic win-back: message after 60 days no purchase | 1 day | +5 pts |
| New customer Day 1/3/7 Telegram sequence | 2 days | +6 pts |

**Tổng quick wins: +23 điểm → Score từ 24 → 47** (Development ready)

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
