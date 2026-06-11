# Customer Touchpoint Map — AI Social Commerce OS V3
**Ngày:** 2026-06-11

---

## 1. Tổng Quan Touchpoint Ecosystem

Hệ thống hiện tại có `Lead.platform` field với values: `facebook | telegram | zalo | tiktok | website`

```
         ┌─────────────┐
         │   STRANGER  │
         └──────┬──────┘
                │
    ┌───────────┼───────────┐──────────────┐
    │           │           │              │
┌───▼───┐ ┌────▼────┐ ┌────▼────┐ ┌──────▼──────┐
│Facebook│ │ TikTok  │ │ Zalo    │ │   Website   │
│  Ads   │ │  Ads    │ │  OA     │ │   /store    │
└───┬───┘ └────┬────┘ └────┬────┘ └──────┬──────┘
    │          │           │              │
    └──────────┴─────┬─────┴──────────────┘
                     │
              ┌──────▼──────┐
              │  LEAD/CUST  │
              │  DATABASE   │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
    │Telegram │ │  Email  │ │AI Chat │
    │  Bot    │ │Campaign │ │ Agent  │
    └─────────┘ └─────────┘ └────────┘
```

---

## 2. Mapping Chi Tiết Per Touchpoint

### 2.1 Facebook

| Attribute | Detail |
|-----------|--------|
| Lead.platform value | `facebook` |
| Primary use case | Acquisition (ads), Messenger chat |
| Entity field | `Customer.facebookId` |
| Current status | CO — facebookId field có trong Customer entity |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| Ad click (UTM) | Qua acquisitionSource | Facebook Pixel |
| Messenger message | CO (Lead tạo từ platform=facebook) | Webhook automation |
| Story view | THIẾU | Facebook Graph API |
| Post comment | THIẾU | Comment-to-DM bot |
| Page like | THIẾU | Lookalike audience sync |
| Purchase event | THIẾU | Conversion API |

**Automation hiện có:**
```
Lead tạo → platform = "facebook" → assign facebookId → follow-up via Messenger
```

**Gaps:**
- Không có Facebook Pixel integration
- Không có webhook cho comment automation
- Thiếu Conversions API cho ad optimization

---

### 2.2 TikTok

| Attribute | Detail |
|-----------|--------|
| Lead.platform value | `tiktok` |
| Primary use case | Acquisition (TikTok Shop, ads) |
| Entity field | THIẾU — không có tiktokId trong Customer entity |
| Current status | THIẾU — chỉ có platform label |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| Ad click | Qua acquisitionSource | TikTok Pixel |
| Video view | THIẾU | TikTok API |
| Product tag click | THIẾU | TikTok Shop webhook |
| Purchase | THIẾU | TikTok Events API |
| Comment | THIẾU | Comment DM bot |
| Live stream | THIẾU | Live stream order capture |

**Automation hiện có:** Không có

**Gaps (critical):**
- Thiếu `tiktokId` trong Customer entity
- Không có TikTok Pixel/Events API
- TikTok Shop integration chưa có

---

### 2.3 Zalo

| Attribute | Detail |
|-----------|--------|
| Lead.platform value | `zalo` |
| Primary use case | B2C chat, order confirmation |
| Entity field | `Customer.zaloId` |
| Current status | CO — zaloId field có |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| OA follow | THIẾU | Zalo OA webhook |
| Message received | Thủ công | Zalo API auto-response |
| Order confirm | Thủ công | Zalo Notification Service |
| Payment success | THIẾU | Zalo Pay webhook |

**Automation:**
- Hiện tại: thủ công qua zaloId
- Cần: Zalo OA webhook → auto-assign Lead → auto-response

---

### 2.4 Telegram

| Attribute | Detail |
|-----------|--------|
| Lead.platform value | `telegram` |
| Primary use case | Bot chat, order notification, admin control |
| Entity field | `Customer.telegramId` |
| Current status | CO và đầy đủ nhất trong các channels |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| Bot start | CO (Lead tạo) | UTM tracking |
| Message sent | CO (AI Chat Agent xử lý) | Intent classification |
| Button click (inline keyboard) | CO | Analytics tracking |
| Order placed via bot | CO | Conversion tracking |
| Payment via Telegram Pay | THIẾU | Telegram Payment API |
| Notification delivered | CO | Read receipt tracking |

**Automation pipeline:**
```
Telegram message → Webhook → NestJS API → AI Chat Agent
                                         → Knowledge Brain (FAQ)
                                         → Lead creation (nếu mới)
                                         → Order creation (nếu chốt)
```

**Gaps:**
- Thiếu Telegram Pay integration
- Chưa có read receipt / delivery tracking
- UTM không capture được từ Telegram deep links

---

### 2.5 Website

| Attribute | Detail |
|-----------|--------|
| Lead.platform value | `website` |
| Primary use case | Product catalog, checkout, blog |
| Entity field | Via acquisitionSource |
| Current status | CO — Next.js frontend |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| Page view | THIẾU (no analytics) | Google Analytics / custom |
| Product view | THIẾU | Product view event API |
| Add to cart | THIẾU | Cart event tracking |
| Checkout initiated | Có qua Order API | Funnel tracking |
| Order completed | CO | |
| Form submit (lead) | CO | |
| Live chat open | THIẾU | Chat widget events |
| Search query | THIẾU | Search analytics |

**Automation:**
```
Form submit → POST /api/leads → Lead tạo (platform=website)
Order flow → POST /api/orders → Order tạo
```

---

### 2.6 Email

| Attribute | Detail |
|-----------|--------|
| Lead.platform value | N/A (channel riêng) |
| Primary use case | Follow-up sequences, campaigns, transactional |
| Entity field | `Lead.email`, `Customer.email` |
| Current status | THIẾU — không có email service integration |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| Email sent | THIẾU | SMTP/SendGrid integration |
| Email opened | THIẾU | Tracking pixel |
| Link clicked | THIẾU | Click tracking |
| Unsubscribe | THIẾU | Unsubscribe management |
| Bounce | THIẾU | Bounce handling |

**Gap (critical):** Không có email service. Cần tích hợp SendGrid hoặc AWS SES.

---

### 2.7 AI Chat (Cross-channel)

| Attribute | Detail |
|-----------|--------|
| Scope | Overlay trên tất cả channels |
| Entity | AI Chat Agent trong hệ thống |
| Current status | CO — AI Chat Agent hoạt động qua Telegram/Website |

**Events tracking:**

| Event | Hiện có | Cần thêm |
|-------|---------|----------|
| Conversation started | CO | Session ID linking |
| Intent detected | CO (AI) | Intent analytics |
| FAQ answered | CO (Knowledge Brain) | FAQ miss rate |
| Human escalation | THIẾU | Escalation tracking |
| Conversation resolved | THIẾU | Resolution tracking |
| Satisfaction score | THIẾU | Post-chat survey |

---

## 3. Cross-Channel Identity Resolution

**Vấn đề:** Cùng 1 người có thể tương tác qua nhiều channels. Cần link các IDs lại.

```
Customer Record
├── telegramId: "123456789"
├── facebookId: "PSID_abc123"
├── zaloId: "zalo_xyz789"
├── tiktokId: NULL ← THIẾU field
├── email: "user@example.com"
└── phone: "0901234567"  ← Master identifier
```

**Identity resolution logic (hiện tại):**
- Phone number là master identifier
- Nếu có phone → link tất cả platform IDs vào 1 Customer record
- Nếu chưa có phone → Lead riêng per platform

**Gap:** Không có automated deduplication khi cùng người dùng nhiều channels khác nhau.

---

## 4. Event Tracking Matrix

| Event Type | Facebook | TikTok | Zalo | Telegram | Website | Email |
|------------|----------|--------|------|----------|---------|-------|
| First contact | CO | CO | CO | CO | CO | CO |
| Identity capture | PHẦN | THIẾU | CO | CO | CO | CO |
| Purchase intent | THIẾU | THIẾU | THIẾU | CO | PHẦN | THIẾU |
| Order placed | THIẾU | THIẾU | THIẾU | CO | CO | N/A |
| Payment | THIẾU | THIẾU | THIẾU | THIẾU | CO | N/A |
| Post-purchase | THIẾU | THIẾU | THIẾU | CO | THIẾU | THIẾU |

---

## 5. Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | TikTok: thêm `tiktokId` vào Customer entity | Low | High |
| P0 | Email service integration (SendGrid) | Medium | High |
| P1 | Facebook Conversions API | High | High |
| P1 | Zalo OA webhook automation | Medium | Medium |
| P2 | Website analytics events | Medium | Medium |
| P2 | Cross-channel identity deduplication | High | Medium |
| P3 | TikTok Shop integration | High | High |
| P3 | Telegram Pay integration | Medium | Low |

---

*File generated: 2026-06-11 | AI Social Commerce OS V3*
