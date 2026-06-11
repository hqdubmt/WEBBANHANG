# OBJECTION HANDLING LIBRARY — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## OBJECTION 1: Giá Cao

**Tín hiệu nhận biết:** "đắt quá", "mắc vậy", "chỗ khác rẻ hơn", "bên X giá thấp hơn"

**Responses:**

A) So sánh giá trị:
```
"Giá [X]đ bao gồm [benefits]. Nếu tính ra mỗi ngày chỉ [X/365]đ 
— tương đương 1 ly cà phê. [Product] sẽ giúp bạn [benefit] hàng ngày."
```

B) Competitor comparison:
```
"Bên [competitor] [X]đ nhưng không có [key feature]. 
[Our product] có [advantage] nên đáng đầu tư hơn."
```

C) Bundle offer:
```
"Nếu thấy đắt, mình có combo [product + accessory] với giá ưu đãi hơn."
```

---

## OBJECTION 2: Chưa Cần / Chưa Vội

**Tín hiệu:** "để sau", "chưa cần gấp", "tính rồi", "hỏi vậy thôi"

**Responses:**

A) Urgency (nếu có):
```
"Hiện tại chương trình giảm [X]% chỉ còn đến [date]. 
Sau đó giá sẽ trở về [original_price]đ."
```

B) FOMO:
```
"Tuần trước mình đã bán hết [X] cái. Hiện còn [stock] cái cuối. 
Bạn muốn mình giữ 1 cái không?"
```

C) Value:
```
"Mình hiểu. Thực ra [product] sẽ giúp [benefit] từ ngay ngày đầu. 
Bạn dùng để làm gì nhỉ? Mình tư vấn thêm nhé."
```

---

## OBJECTION 3: Đang So Sánh / Xem Thêm

**Tín hiệu:** "để xem thêm", "so sánh giá", "hỏi nhiều chỗ", "bên X thế nào"

**Responses:**

A) USP highlight:
```
"Điểm khác biệt của bên mình là [unique_advantage]. 
Bạn cần tính năng này không?"
```

B) Social proof:
```
"[X] khách hàng đã chọn [product] và 95% hài lòng. 
Bạn xem review tại [link]."
```

C) Decision support:
```
"Bạn đang so sánh với bên nào? Mình có thể giúp 
so sánh trực tiếp để bạn quyết định dễ hơn."
```

---

## OBJECTION 4: Không Tin Tưởng / Nghi Ngờ

**Tín hiệu:** "uy tín không", "lừa đảo không", "hàng giả không", "ship về có đúng không"

**Responses:**

A) Social proof:
```
"Shop hoạt động từ [năm], đã bán [X] đơn, rating [X]/5. 
Xem tại [link fanpage/shopee]."
```

B) Guarantee:
```
"Cam kết hàng chính hãng, đổi trả trong [X] ngày nếu có vấn đề. 
Mình ship COD (trả tiền khi nhận hàng) nếu bạn muốn."
```

---

## OBJECTION 5: Chưa Có Ngân Sách

**Tín hiệu:** "hết tiền", "chưa có tiền", "tháng sau", "trả góp không"

**Responses:**

A) Installment:
```
"Bên mình có trả góp 0% qua [credit card/app] từ [X]đ/tháng. 
Bạn có thẻ [bank] không?"
```

B) Smaller option:
```
"Bạn có thể bắt đầu với [lower_tier_product] chỉ [price]đ trước, 
sau đó nâng cấp khi cần."
```

---

## OBJECTION 6: Để Suy Nghĩ Thêm

**Tín hiệu:** "để nghĩ thêm", "hỏi vợ/chồng", "quyết định sau", "liên hệ lại sau"

**Responses:**
```
"Okay! Mình sẽ giữ giá này cho bạn thêm [X] ngày. 
Nếu có câu hỏi gì cứ nhắn mình nhé. 
Bạn muốn mình nhắc bạn sau [1/3/7 ngày] không?"
```

---

## AI IMPLEMENTATION

Thư viện objections này nên được:
1. Ingest vào Knowledge Brain (domain=PRODUCT, type=FAQ)
2. RAG retrieval khi Sales Agent detect objection intent
3. Customize per product type
