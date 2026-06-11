# SALES PLAYBOOK FRAMEWORK — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## SALES CONVERSATION STAGES

### Stage 1: Greeting & Discovery
```
AI: "Xin chào [Tên]! Cảm ơn bạn đã quan tâm đến [Shop]. 
     Bạn đang tìm kiếm sản phẩm gì ạ?"

Goal: Xác định nhu cầu, build rapport
```

### Stage 2: Need Analysis
```
AI hỏi:
- "Bạn cần dùng [sản phẩm] để làm gì?"
- "Ngân sách của bạn khoảng bao nhiêu?"
- "Bạn cần giao hàng trong bao lâu?"
```

### Stage 3: Product Recommendation
```
Dựa trên RAG:
- Sản phẩm phù hợp nhất
- Combo value
- Upsell options
```

### Stage 4: Handling Objections
```
Price: "Giá này bao gồm [benefits], so với [competitor] thì..."
Trust: "Shop đã phục vụ [X] khách hàng, xem reviews tại..."
Urgency: "Hiện tại chỉ còn [X] sản phẩm / chương trình kết thúc [date]"
```

### Stage 5: Closing
```
"Để chốt đơn, bạn cho mình xin địa chỉ giao hàng ạ?"
"Bạn muốn thanh toán qua hình thức nào?"
```

---

## PRODUCT PLAYBOOK TEMPLATE

Mỗi sản phẩm cần có:
```yaml
product: "iPhone 15 Pro"
target_customer: "Tech enthusiast, professional"
pain_points:
  - "Điện thoại cũ chậm, pin yếu"
  - "Camera không đủ chất lượng"
benefits:
  - "A17 Pro chip nhanh nhất"
  - "Camera 48MP chuyên nghiệp"
  - "Pin 29h video"
key_objections:
  price_high: "So với Android cùng tầm, iPhone có [advantages]"
  wait: "Phiên bản tiếp theo ra cuối năm, mua ngay để dùng sớm"
closing_offer: "Tặng kèm case + cường lực trị giá 200k"
upsell: "AirPods Pro giảm 500k khi mua cùng"
```

---

## CONVERSATION FRAMEWORK

```
Understand
    ↓
Question
    ↓
Identify Need
    ↓
Propose (từ RAG)
    ↓
Handle Objections (từ library)
    ↓
Close
    ↓
Upsell/Cross-sell
    ↓
CRM Handoff
```

---

## SALES KNOWLEDGE BASE (Đề xuất)

Cần ingest vào Knowledge Brain:
- Danh sách sản phẩm với full features
- FAQ sản phẩm phổ biến
- Chính sách đổi trả, bảo hành
- Combo offers
- Competitor comparison matrix
- Customer testimonials
