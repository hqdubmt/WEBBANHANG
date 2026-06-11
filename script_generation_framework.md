# Script Generation Framework — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## 1. Script Structure

```
┌─────────────────────────────────────────────────────────────┐
│ COMMERCIAL VIDEO SCRIPT STRUCTURE                           │
├─────────────────┬────────────┬────────────────────────────  ┤
│ Section         │ Duration   │ Purpose                      │
├─────────────────┼────────────┼────────────────────────────  ┤
│ 1. HOOK         │ 0–3 seconds│ Stop the scroll              │
│ 2. PROBLEM      │ 3–8 sec    │ Pain point identification     │
│ 3. SOLUTION     │ 8–25 sec   │ Product as answer            │
│ 4. BENEFITS     │ 25–40 sec  │ 3 key benefits               │
│ 5. OFFER        │ 40–50 sec  │ Price, discount, guarantee   │
│ 6. CTA          │ 50–60 sec  │ Clear next action            │
└─────────────────┴────────────┴────────────────────────────  ┘
```

---

## 2. Hook Patterns

### Type A: Question Hook
```
"Bạn có biết tại sao [pain point]?"
"Tại sao hầu hết [target audience] đều gặp phải [problem]?"
"Bạn có đang [negative outcome]?"
```

### Type B: Bold Statement Hook
```
"[Product] giúp bạn [benefit] chỉ trong [time]"
"500 khách hàng đã [positive result] với [product]"
"Đây là lý do [category expert] khuyên dùng [product]"
```

### Type C: Before/After Hook
```
"Trước khi dùng [product]: [negative state]"
"Sau 7 ngày: [positive transformation]"
```

### Type D: Urgency Hook
```
"Chỉ còn [N] ngày để nhận ưu đãi [X]%"
"[N] người đã mua hôm nay — bạn thì sao?"
```

**Best performing hook type** (từ thực tế thị trường VN): Type B và C có conversion rate cao hơn 30% so với Type A.

---

## 3. LLM Prompt Template

```
SYSTEM:
Bạn là chuyên gia viết script video ngắn cho TikTok/Reels thị trường Việt Nam.
Viết script đơn giản, dễ đọc, phát âm tự nhiên bằng TTS.
KHÔNG dùng ký tự đặc biệt, dấu chấm than thái quá.
Mỗi câu tối đa 12 từ để TTS đọc rõ ràng.

PRODUCT CONTEXT:
Tên sản phẩm: {productName}
Giá: {price} VND
Mô tả: {productDescription}
Lợi ích chính: {productBenefits}
Ưu đãi hiện tại: {currentPromotion}

MARKET CONTEXT:
Xu hướng: {trendContext}
Đối tượng mục tiêu: {targetAudience}

USER:
Viết script video {durationSeconds} giây cho platform {platform}.

Yêu cầu format JSON:
{
  "hook": "Câu hook (0-3 giây)",
  "problem": "Mô tả pain point (3-8 giây)",
  "solution": "Giới thiệu sản phẩm (8-25 giây)",
  "benefits": ["Lợi ích 1", "Lợi ích 2", "Lợi ích 3"],
  "offer": "Giá + khuyến mãi (40-50 giây)",
  "cta": "Kêu gọi hành động (50-60 giây)",
  "fullScript": "Toàn bộ script liền mạch",
  "estimatedDurationSeconds": 45
}
```

---

## 4. Script Length Guidelines

| Platform | Duration | Words Estimate | Sentences |
|----------|----------|---------------|-----------|
| TikTok (short) | 15s | 30–45 words | 4–6 |
| TikTok (standard) | 30s | 60–90 words | 8–12 |
| TikTok (full) | 60s | 120–150 words | 16–20 |
| Facebook Reels | 30–60s | 60–150 words | 8–20 |
| YouTube Shorts | 45–60s | 90–150 words | 12–20 |

**Vietnamese TTS speaking rate:** ~120 words per minute

---

## 5. Script Quality Checklist

```
Pre-TTS Checklist:
☐ Không có ký tự đặc biệt (©, ™, *, #)
☐ Số được viết bằng chữ ("một triệu" không phải "1,000,000")
☐ Mỗi câu ≤ 12 từ
☐ Không có từ nước ngoài chưa giải thích
☐ Có hook trong câu đầu tiên
☐ Có ít nhất 1 benefit cụ thể (không chung chung)
☐ Có CTA cụ thể (không phải "hãy liên hệ")
☐ Giá chính xác với product.price trong DB
☐ Ưu đãi không quá hạn (check campaigns.endDate)
```

---

## 6. Script Variants for A/B Testing

```
For each product, generate 2 script variants:
  Variant A: Problem-focused hook → solution approach
  Variant B: Result-focused hook → social proof approach

Sau 7 ngày:
  Compare: Views, Watch Time (%), Leads generated
  Winner script pattern → feed vào LessonLearned entity
  Loser pattern → negative example trong future prompts
```

---

## 7. Example Generated Script

```
Sản phẩm: Kem dưỡng da ban đêm XYZ

HOOK: "Tại sao da bạn vẫn khô dù đã dưỡng ẩm mỗi ngày?"

PROBLEM: "Hầu hết kem dưỡng chỉ giữ ẩm bề mặt. Ban đêm da mất nước 
gấp đôi ban ngày mà không ai bổ sung."

SOLUTION: "Kem dưỡng đêm XYZ với công nghệ HydroLock thấm sâu 5 lớp da.
Hoạt động trong 8 tiếng bạn ngủ."

BENEFITS: "Sáng dậy da mềm và căng. Giảm thâm nám sau hai tuần. 
Không nhờn, không bí."

OFFER: "Hôm nay chỉ còn 285.000 đồng — giảm 30%. Freeship toàn quốc."

CTA: "Nhắn tin 'XYZ' để đặt hàng ngay nhé!"

ESTIMATED DURATION: 42 giây
```
