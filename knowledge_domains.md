# KNOWLEDGE DOMAINS — AI Social Commerce OS V3

**Ngày:** 2026-06-11

---

## DOMAIN 1: PRODUCT KNOWLEDGE

**Nguồn dữ liệu:**
- Bảng `products` — tên, giá, mô tả, category, stock, source
- Bảng `order_items` — doanh thu, số lượng bán theo sản phẩm
- Bảng `categories` — phân loại sản phẩm
- Bảng `inventory` — tồn kho
- Bảng `suppliers` — nhà cung cấp

**Tri thức cung cấp:**
- Top sản phẩm theo doanh thu (top 10)
- Sản phẩm margin cao nhất
- Best sellers
- Tổng SKUs
- Sản phẩm affiliate

**API:** `GET /api/knowledge-brain/product-intelligence`

**Qdrant Collection:** `products`

**Trạng thái:** ✅ Đang hoạt động

---

## DOMAIN 2: CUSTOMER KNOWLEDGE

**Nguồn dữ liệu:**
- Bảng `customers` — profile, tier (REGULAR/VIP), contact
- Bảng `orders` — lịch sử mua hàng, tổng chi tiêu
- Bảng `leads` — trạng thái, nguồn, điểm
- Sales Agent sessions — hội thoại

**Tri thức cung cấp:**
- Top khách hàng theo chi tiêu (top 10)
- Số khách VIP, mới, churn risk
- Tỷ lệ repeat buyers
- Tỷ lệ acquisition 30 ngày

**API:** `GET /api/knowledge-brain/customer-intelligence`

**Qdrant Collection:** `customers`

**Trạng thái:** ✅ Đang hoạt động

---

## DOMAIN 3: BUSINESS KNOWLEDGE

**Nguồn dữ liệu:**
- Bảng `orders` — revenue, growth, total orders
- Bảng `leads` — conversion rate
- Bảng `campaigns` — số lượng chiến dịch

**Tri thức cung cấp:**
- Revenue tháng này vs tháng trước
- Growth rate %
- Tỷ lệ chuyển đổi lead → order
- Điểm nghẽn conversion
- Số campaigns đang chạy

**API:** `GET /api/knowledge-brain/business-intelligence`

**Qdrant Collection:** `business`

**Trạng thái:** ✅ Đang hoạt động

---

## DOMAIN 4: MARKET KNOWLEDGE

**Nguồn dữ liệu:**
- Bảng `price_alerts` — so sánh giá với đối thủ
- Bảng `knowledge` (domain=market) — market trends
- Trend Agent outputs
- Competitor Monitor outputs

**Tri thức cung cấp:**
- Price alerts từ competitor monitoring
- Market trends tổng hợp
- Giá đối thủ vs giá mình

**API:** `GET /api/knowledge-brain/market-intelligence`

**Qdrant Collection:** `market`

**Trạng thái:** ⚠️ Phụ thuộc Trend Agent chạy định kỳ

---

## DOMAIN 5: OPERATIONAL KNOWLEDGE

**Nguồn dữ liệu:**
- Bảng `agent_logs` — logs 24h của tất cả agents
- Infrastructure metrics (via Prometheus)

**Tri thức cung cấp:**
- Agent success rate 24h
- Danh sách failing agents
- Performance per agent (avg duration ms)
- System health status

**API:** `GET /api/knowledge-brain/operational-intelligence`

**Qdrant Collection:** `operational`

**Trạng thái:** ✅ Đang hoạt động (nếu có agent_logs)

---

## EXECUTIVE QUESTIONS ENGINE (Cross-domain)

Hệ thống tự động trả lời 8 câu hỏi chiến lược bằng cách tổng hợp dữ liệu từ tất cả domains:

| # | Câu hỏi | Domain | Confidence |
|---|---------|--------|-----------|
| 1 | Sản phẩm nào tốt nhất? | PRODUCT | 30–90% |
| 2 | Khách hàng nào giá trị nhất? | CUSTOMER | 20–85% |
| 3 | Kênh nào hiệu quả nhất? | BUSINESS | 40–80% |
| 4 | Chiến dịch nào hiệu quả nhất? | BUSINESS | 50% |
| 5 | Điều gì đang làm mất tiền? | BUSINESS | 75% |
| 6 | Điều gì tăng doanh thu nhanh nhất? | CUSTOMER | 70% |
| 7 | Đâu là cơ hội lớn nhất? | MARKET | 65% |
| 8 | Đâu là rủi ro lớn nhất? | OPERATIONAL | 85% |

---

## DOMAIN COVERAGE MAP

| Domain | PostgreSQL | Qdrant | LLM | Trạng thái |
|--------|-----------|-------|-----|-----------|
| Product | ✅ Tốt | ✅ Có | ✅ | ACTIVE |
| Customer | ✅ Tốt | ✅ Có | ✅ | ACTIVE |
| Business | ✅ Tốt | ✅ Có | ✅ | ACTIVE |
| Market | ⚠️ Partial | ✅ Có | ✅ | PARTIAL |
| Operational | ✅ Tốt | ✅ Có | ✅ | ACTIVE |

---

## THIẾU DOMAIN

| Domain thiếu | Ý nghĩa |
|-------------|---------|
| Content Performance | Nội dung nào hiệu quả nhất? |
| Channel Intelligence | Facebook vs TikTok vs Telegram |
| Supplier Intelligence | NCC nào tốt nhất? |
| Inventory Intelligence | Tồn kho như thế nào? |
| Affiliate Intelligence | Đối tác nào mang nhiều doanh thu? |
