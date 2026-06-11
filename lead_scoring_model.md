# LEAD SCORING MODEL — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## SCORING MODEL HIỆN TẠI

Lead entity có trường `score: decimal(5,2)` với range 0-100.
Scoring được thực hiện bởi Sales Agent AI qua conversation analysis.

---

## ĐỀ XUẤT SCORING FRAMEWORK

### Input Signals

| Signal | Weight | Score Range | Mô tả |
|--------|--------|------------|-------|
| Message intent | 30% | 0-30 | Mua/hỏi giá/so sánh/tìm hiểu |
| Engagement depth | 20% | 0-20 | Số tin nhắn, độ dài hội thoại |
| Urgency signals | 20% | 0-20 | Cần gấp, deadline, budget ready |
| Platform source | 15% | 0-15 | TikTok hot > Facebook > Website |
| Time of day | 15% | 0-15 | Giờ hoạt động cao điểm |

### Intent Classification

| Intent | Score | Keywords |
|--------|-------|---------|
| Ready to buy | 85-100 | mua, đặt, chốt, thanh toán, địa chỉ |
| High interest | 60-84 | giá bao nhiêu, có màu không, ship bao lâu |
| Comparing | 40-59 | so sánh, bên khác, rẻ hơn không |
| Just browsing | 10-39 | xem thôi, hỏi thử, chưa cần |
| No intent | 0-9 | sai số, trả lời nhầm |

### Score Bands

| Band | Score | Action |
|------|-------|--------|
| HOT | 71-100 | Ưu tiên tư vấn ngay, alert nhân viên |
| WARM | 31-70 | Nurture, follow up trong 24h |
| COLD | 0-30 | Drip campaign, re-engage sau 3-7 ngày |

---

## REAL-TIME SCORE UPDATE

```typescript
// Sau mỗi tin nhắn:
const intentScore = await aiService.classify(message);
const newScore = calculateScore(currentScore, intentScore, signals);
await leadRepo.update(leadId, { score: newScore, intent: intentScore.label });
```

---

## LEAD ROUTING RULES (Đề xuất)

| Condition | Action |
|-----------|--------|
| score >= 80 | Notify sales team ngay |
| score >= 60 AND no response 2h | Auto follow-up |
| status = new AND score < 30 | Add to nurture campaign |
| followUpAt < now | Trigger follow-up message |
| status = contacted 3 days no response | Mark cold, add to reactivation |
