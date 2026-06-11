# SALES PIPELINE DESIGN — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## SALES PIPELINE HIỆN TẠI

```
LEAD CAPTURE
  ├── Facebook (platform=facebook)
  ├── Telegram (platform=telegram)
  ├── Zalo (platform=zalo)
  ├── TikTok (platform=tiktok)
  └── Website (platform=website)
        │
        ▼
LEAD SCORING (Tự động)
  ├── score: 0-100 (decimal)
  ├── intent: string (từ AI analysis)
  └── status: new → contacted → qualified → converted → lost
        │
        ▼
AI SALES CONVERSATION
  ├── POST /api/agents/sales/chat
  ├── Session: {platform}-{platformUserId}
  ├── RAG context: Knowledge Brain
  └── Ollama LLM response
        │
        ▼
ORDER CREATION
  ├── POST /api/orders
  └── Lead status → CONVERTED
        │
        ▼
CRM HANDOFF
  └── Customer created/updated
```

---

## LEAD ENTITY ANALYSIS

| Field | Type | Mô tả |
|-------|------|-------|
| platform | enum | facebook/telegram/zalo/tiktok/website |
| platformUserId | string | ID của user trên platform |
| name | string | Tên khách hàng |
| content | text | Tin nhắn đầu tiên |
| score | decimal 0-100 | Lead score |
| intent | string | Ý định mua (từ AI) |
| status | enum | new/contacted/qualified/converted/lost |
| customerId | string | Link tới Customer sau conversion |
| followUpAt | timestamptz | Thời điểm cần follow up |
| meta | jsonb | Metadata bổ sung |

---

## LEAD SCORING MODEL HIỆN TẠI

Scoring được thực hiện bởi Sales Agent Service khi nhận tin nhắn:
- Intent classification
- Engagement level
- Message content analysis

**Score bands:**
- 0-30: Cold (ít quan tâm)
- 31-70: Warm (có quan tâm)
- 71-100: Hot (sẵn sàng mua)

---

## SALES CONVERSATION FRAMEWORK

```typescript
// Sales Agent: POST /api/agents/sales/chat
{
  sessionId: "{platform}-{userId}",
  platform: LeadPlatform,
  platformUserId: string,
  message: string,
  customerName?: string
}

// Flow:
1. Nhận tin nhắn
2. Tạo/lấy session context
3. Get knowledge context (RAG)
4. Generate AI response
5. Lưu conversation history
6. Update lead score
7. Return response
```

---

## OBJECTION HANDLING (AI-powered)

Thông qua RAG + LLM, Sales Agent xử lý các objection phổ biến:
- Giá cao → So sánh value, đề xuất combo
- Chưa cần → Tạo urgency, highlight benefits
- Đang xem thêm → USP, social proof
- Không tin tưởng → Testimonials, guarantees
- Chưa có tiền → Installment options

---

## MULTI-PLATFORM SUPPORT

| Platform | Status | Integration |
|---------|--------|------------|
| Facebook Messenger | ✅ Schema ready | Cần webhook |
| Telegram | ✅ Schema ready | Cần webhook |
| Zalo | ✅ Schema ready | Cần webhook |
| TikTok | ✅ Schema ready | Cần webhook |
| Website chat | ✅ WebSocket sẵn sàng | Có |

---

## GAPS TRONG SALES PIPELINE

| Gap | Impact |
|----|--------|
| Không có webhook Facebook/Telegram | Lead không được capture tự động |
| Không có follow-up automation | Leads cold nguội dần |
| Không có lead routing rules | Manual assignment |
| Không có A/B test scripts | Không tối ưu conversion |
| Thiếu upsell/cross-sell logic | Giảm AOV |
