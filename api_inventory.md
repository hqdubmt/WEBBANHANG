# API INVENTORY — AI Social Commerce OS V3

**Ngày phân tích:** 2026-06-11  
**Base URL:** `http://host/api`  
**API Version:** 3.0  
**Swagger:** `GET /api/docs`  
**WebSocket:** `ws://host/ws` (Socket.IO)  
**Global Prefix:** `/api`  
**Auth:** JWT Bearer Token  

---

## TỔNG QUAN

| Metric | Số lượng |
|--------|----------|
| Controllers | 47 |
| Modules | 26+ |
| Agent Controllers | 21 |
| Business Controllers | 26 |
| Tổng endpoints HTTP | ~160+ |
| WebSocket Events (client → server) | 2 (join, leave) |
| WebSocket Events (server → client) | 6 (new_order, new_lead, agent_update, kpi_update, notification, chat_message) |

---

## 1. AUTH APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/auth/setup-status | Public | Kiểm tra hệ thống đã setup chưa |
| POST | /api/auth/setup | Public | Khởi tạo hệ thống lần đầu |
| POST | /api/auth/register | Public | Đăng ký tài khoản mới |
| POST | /api/auth/login | Public | Đăng nhập |
| POST | /api/auth/refresh | Public | Refresh JWT token |
| GET | /api/auth/me | JWT | Lấy thông tin người dùng hiện tại |

---

## 2. USER APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/users | MANAGER+ | Danh sách users |
| GET | /api/users/stats | MANAGER+ | Thống kê users |
| GET | /api/users/:id | MANAGER+ | Chi tiết user |
| POST | /api/users | ADMIN | Tạo user mới |
| PUT | /api/users/:id/role | ADMIN | Cập nhật role |
| PUT | /api/users/:id/status | ADMIN | Cập nhật trạng thái |
| PUT | /api/users/:id/reset-password | ADMIN | Reset mật khẩu |
| DELETE | /api/users/:id | ADMIN | Xóa user |

---

## 3. PRODUCT APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/products | JWT | Tạo sản phẩm mới |
| GET | /api/products | JWT | Danh sách sản phẩm (với filter) |
| GET | /api/products/hot | JWT | Sản phẩm hot |
| GET | /api/products/:id | JWT | Chi tiết sản phẩm |
| PUT | /api/products/:id | JWT | Cập nhật sản phẩm |
| DELETE | /api/products/:id | JWT | Xóa sản phẩm |

---

## 4. CATEGORY APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/categories | JWT | Danh sách danh mục |
| GET | /api/categories/tree | JWT | Cấu trúc cây danh mục |
| GET | /api/categories/:id | JWT | Chi tiết danh mục |
| POST | /api/categories | JWT | Tạo danh mục |
| PUT | /api/categories/:id | JWT | Cập nhật danh mục |
| DELETE | /api/categories/:id | JWT | Xóa danh mục |

---

## 5. BRAND APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/brands | JWT | Danh sách thương hiệu |
| GET | /api/brands/:id | JWT | Chi tiết thương hiệu |
| POST | /api/brands | JWT | Tạo thương hiệu |
| PUT | /api/brands/:id | JWT | Cập nhật thương hiệu |
| DELETE | /api/brands/:id | JWT | Xóa thương hiệu |

---

## 6. INVENTORY APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/inventory/product/:productId | JWT | Tồn kho theo sản phẩm |
| POST | /api/inventory/adjust | JWT | Điều chỉnh tồn kho |
| GET | /api/inventory/low-stock | JWT | Sản phẩm sắp hết hàng |
| GET | /api/inventory/value | JWT | Giá trị kho |

---

## 7. SUPPLIER APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/suppliers | JWT | Danh sách nhà cung cấp |
| GET | /api/suppliers/:id | JWT | Chi tiết nhà cung cấp |
| POST | /api/suppliers | JWT | Tạo nhà cung cấp |
| PUT | /api/suppliers/:id | JWT | Cập nhật nhà cung cấp |
| DELETE | /api/suppliers/:id | JWT | Xóa nhà cung cấp |
| GET | /api/supplier-products | JWT | Danh sách sản phẩm NCC |
| GET | /api/supplier-products/by-supplier/:supplierId | JWT | SP theo NCC |
| GET | /api/supplier-products/:id | JWT | Chi tiết SP NCC |
| POST | /api/supplier-products | JWT | Thêm sản phẩm NCC |
| PUT | /api/supplier-products/:id | JWT | Cập nhật SP NCC |
| DELETE | /api/supplier-products/:id | JWT | Xóa SP NCC |

---

## 8. ORDER APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/orders | JWT | Tạo đơn hàng |
| GET | /api/orders | JWT | Danh sách đơn hàng |
| GET | /api/orders/revenue | JWT | Doanh thu |
| GET | /api/orders/:id | JWT | Chi tiết đơn hàng |
| PUT | /api/orders/:id/status | JWT | Cập nhật trạng thái đơn |

---

## 9. PAYMENT APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/payments | JWT | Danh sách thanh toán |
| GET | /api/payments/order/:orderId | JWT | Thanh toán theo đơn |
| GET | /api/payments/stats | JWT | Thống kê thanh toán |
| GET | /api/payments/:id | JWT | Chi tiết thanh toán |
| POST | /api/payments | JWT | Tạo thanh toán |
| POST | /api/payments/:id/confirm | JWT | Xác nhận thanh toán |
| POST | /api/payments/:id/refund | JWT | Hoàn tiền |

---

## 10. CUSTOMER APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/customers | JWT | Danh sách khách hàng |
| POST | /api/customers | JWT | Tạo khách hàng |
| GET | /api/customers/:id | JWT | Chi tiết khách hàng |
| PUT | /api/customers/:id | JWT | Cập nhật khách hàng |
| POST | /api/customers/:id/upgrade-vip | JWT | Nâng cấp VIP |

---

## 11. LEAD APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/leads | JWT | Tạo lead mới |
| GET | /api/leads | JWT | Danh sách leads |
| GET | /api/leads/hot | JWT | Hot leads |
| PUT | /api/leads/:id/status | JWT | Cập nhật trạng thái lead |

---

## 12. CAMPAIGN APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/campaigns | JWT | Danh sách chiến dịch |
| GET | /api/campaigns/stats | JWT | Thống kê chiến dịch |
| GET | /api/campaigns/:id | JWT | Chi tiết chiến dịch |
| POST | /api/campaigns | JWT | Tạo chiến dịch |
| PUT | /api/campaigns/:id | JWT | Cập nhật chiến dịch |
| POST | /api/campaigns/:id/launch | JWT | Khởi chạy chiến dịch |
| POST | /api/campaigns/:id/complete | JWT | Hoàn thành chiến dịch |
| DELETE | /api/campaigns/:id | JWT | Xóa chiến dịch |

---

## 13. WORKFLOW APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/workflows | JWT | Danh sách workflows |
| GET | /api/workflows/active | JWT | Workflows đang chạy |
| GET | /api/workflows/stats | JWT | Thống kê workflows |
| GET | /api/workflows/:id | JWT | Chi tiết workflow |
| POST | /api/workflows | JWT | Tạo workflow |
| PUT | /api/workflows/:id | JWT | Cập nhật workflow |
| POST | /api/workflows/:id/activate | JWT | Kích hoạt workflow |
| POST | /api/workflows/:id/deactivate | JWT | Tắt workflow |
| DELETE | /api/workflows/:id | JWT | Xóa workflow |

---

## 14. ANALYTICS APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/analytics/dashboard | JWT | Dashboard tổng quan |
| GET | /api/analytics/revenue | JWT | Phân tích doanh thu |
| GET | /api/analytics/leads | JWT | Phân tích leads |
| GET | /api/analytics/customers | JWT | Phân tích khách hàng |
| GET | /api/analytics/ai | JWT | Phân tích AI |
| GET | /api/analytics/content | JWT | Phân tích nội dung |

---

## 15. AFFILIATE PORTAL APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/affiliate-portal/partners | JWT | Danh sách affiliate |
| GET | /api/affiliate-portal/partners/stats | JWT | Thống kê affiliate |
| GET | /api/affiliate-portal/partners/:id | JWT | Chi tiết affiliate |
| GET | /api/affiliate-portal/partners/:id/stats | JWT | Stats từng affiliate |
| POST | /api/affiliate-portal/partners | JWT | Thêm affiliate partner |
| PUT | /api/affiliate-portal/partners/:id | JWT | Cập nhật affiliate |
| PUT | /api/affiliate-portal/partners/:id/approve | JWT | Duyệt affiliate |
| PUT | /api/affiliate-portal/partners/:id/suspend | JWT | Tạm đình chỉ affiliate |
| POST | /api/affiliate-portal/clicks | JWT | Ghi nhận click |
| GET | /api/affiliate-portal/conversions | JWT | Danh sách conversions |
| POST | /api/affiliate-portal/conversions | JWT | Tạo conversion |
| PUT | /api/affiliate-portal/conversions/:id/approve | JWT | Duyệt conversion |
| PUT | /api/affiliate-portal/conversions/:id/pay | JWT | Thanh toán conversion |

---

## 16. AI APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/ai/health | JWT | Kiểm tra kết nối Ollama |
| POST | /api/ai/chat | JWT | Chat với AI |

---

## 17. KNOWLEDGE BRAIN APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/knowledge-brain/dashboard | JWT | Dashboard Knowledge Brain |
| GET | /api/knowledge-brain/product-intelligence | JWT | Tri thức sản phẩm |
| GET | /api/knowledge-brain/customer-intelligence | JWT | Tri thức khách hàng |
| GET | /api/knowledge-brain/business-intelligence | JWT | Tri thức kinh doanh |
| GET | /api/knowledge-brain/market-intelligence | JWT | Tri thức thị trường |
| GET | /api/knowledge-brain/operational-intelligence | JWT | Tri thức vận hành |
| GET | /api/knowledge-brain/executive-questions | JWT | Câu hỏi executive |
| POST | /api/knowledge-brain/ask | JWT | Hỏi Knowledge Brain |
| POST | /api/knowledge-brain/ingest | JWT | Nạp dữ liệu vào KB |
| GET | /api/knowledge-brain/stats | JWT | Thống kê KB |

---

## 18. AI BOARD APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/ai-board/meeting | JWT | Họp AI Board |
| GET | /api/ai-board/ceo | JWT | Góc nhìn CEO |
| GET | /api/ai-board/cfo | JWT | Góc nhìn CFO |
| GET | /api/ai-board/coo | JWT | Góc nhìn COO |
| GET | /api/ai-board/cto | JWT | Góc nhìn CTO |
| GET | /api/ai-board/cmo | JWT | Góc nhìn CMO |
| GET | /api/ai-board/cro | JWT | Góc nhìn CRO |
| GET | /api/ai-board/cso | JWT | Góc nhìn CSO |

---

## 19. BUSINESS OS APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/business-os/dashboard | JWT | Tổng quan Business OS |
| GET | /api/business-os/funnel | JWT | Funnel bán hàng |
| GET | /api/business-os/kpi | JWT | KPI thời gian thực |
| GET | /api/business-os/intelligence | JWT | Business intelligence |
| GET | /api/business-os/priorities | JWT | Ưu tiên hàng đầu |
| GET | /api/business-os/plan | JWT | Kế hoạch hoạt động |
| GET | /api/business-os/questions | JWT | Câu hỏi kinh doanh |
| GET | /api/business-os/report/daily | JWT | Báo cáo hàng ngày |
| GET | /api/business-os/report/weekly | JWT | Báo cáo hàng tuần |

---

## 20. SELF-IMPROVEMENT APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/self-improvement/dashboard | JWT | Dashboard học hỏi |
| GET | /api/self-improvement/observe | JWT | Quan sát hệ thống |
| GET | /api/self-improvement/evaluate | JWT | Đánh giá hiệu suất |
| GET | /api/self-improvement/analyze | JWT | Phân tích sâu |
| GET | /api/self-improvement/daily-loop | JWT | Vòng lặp hàng ngày |
| GET | /api/self-improvement/weekly-retrospective | JWT | Tổng kết tuần |
| GET | /api/self-improvement/monthly-evolution | JWT | Tiến hóa hàng tháng |
| GET | /api/self-improvement/improvement-plan | JWT | Kế hoạch cải tiến |
| GET | /api/self-improvement/scorecard | JWT | Bảng điểm |
| GET | /api/self-improvement/scorecard/today | JWT | Bảng điểm hôm nay |
| GET | /api/self-improvement/scorecard/history | JWT | Lịch sử bảng điểm |
| GET | /api/self-improvement/decisions | JWT | Danh sách quyết định |
| POST | /api/self-improvement/decisions | JWT | Tạo quyết định mới |
| PUT | /api/self-improvement/decisions/:id/outcome | JWT | Cập nhật kết quả quyết định |
| GET | /api/self-improvement/experiments | JWT | Danh sách thử nghiệm |
| POST | /api/self-improvement/experiments | JWT | Tạo thử nghiệm mới |
| PUT | /api/self-improvement/experiments/:id | JWT | Cập nhật thử nghiệm |
| GET | /api/self-improvement/lessons | JWT | Bài học kinh nghiệm |
| GET | /api/self-improvement/lessons/winning-strategies | JWT | Chiến lược thành công |
| GET | /api/self-improvement/lessons/failed-strategies | JWT | Chiến lược thất bại |
| GET | /api/self-improvement/lessons/proven-patterns | JWT | Pattern đã chứng minh |

---

## 21. MARKETPLACE APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/marketplace/status | JWT | Trạng thái marketplace |
| GET | /api/marketplace/trending | JWT | Sản phẩm trending |
| GET | /api/marketplace/search | JWT | Tìm kiếm marketplace |
| POST | /api/marketplace/affiliate-link | JWT | Tạo affiliate link |
| POST | /api/marketplace/best-affiliate | JWT | Tìm affiliate tốt nhất |

---

## 22. DROPSHIP APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/dropship/products | JWT | Sản phẩm dropship |
| GET | /api/dropship/products/stats | JWT | Thống kê SP dropship |
| GET | /api/dropship/products/:id | JWT | Chi tiết SP dropship |
| POST | /api/dropship/products | JWT | Thêm SP dropship |
| PUT | /api/dropship/products/:id | JWT | Cập nhật SP dropship |
| DELETE | /api/dropship/products/:id | JWT | Xóa SP dropship |
| GET | /api/dropship/orders | JWT | Đơn hàng dropship |
| GET | /api/dropship/orders/stats | JWT | Thống kê đơn dropship |
| GET | /api/dropship/orders/:id | JWT | Chi tiết đơn dropship |
| POST | /api/dropship/orders | JWT | Tạo đơn dropship |
| PUT | /api/dropship/orders/:id/status | JWT | Cập nhật trạng thái đơn dropship |

---

## 23. ENTERPRISE APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/enterprise | JWT | Danh sách enterprise tenants |
| GET | /api/enterprise/stats | JWT | Thống kê enterprise |
| GET | /api/enterprise/:id | JWT | Chi tiết tenant |
| POST | /api/enterprise | JWT | Tạo tenant mới |
| PATCH | /api/enterprise/:id | JWT | Cập nhật tenant |
| PATCH | /api/enterprise/:id/uptime | JWT | Cập nhật uptime |
| DELETE | /api/enterprise/:id | JWT | Xóa tenant |

---

## 24. WHITE-LABEL APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/white-label | JWT | Danh sách white-label clients |
| GET | /api/white-label/stats | JWT | Thống kê white-label |
| GET | /api/white-label/:id | JWT | Chi tiết client |
| POST | /api/white-label | JWT | Tạo white-label client |
| PATCH | /api/white-label/:id | JWT | Cập nhật client |
| POST | /api/white-label/:id/complete-onboarding | JWT | Hoàn thành onboarding |
| DELETE | /api/white-label/:id | JWT | Xóa client |

---

## 25. MOBILE APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/mobile/stats | JWT | Thống kê mobile |
| GET | /api/mobile/retention | JWT | Tỷ lệ giữ chân người dùng |
| POST | /api/mobile/session | JWT | Tạo phiên mobile |
| PATCH | /api/mobile/session/:id/end | JWT | Kết thúc phiên mobile |

---

## 26. AI AGENT APIs (21 agents)

### agents/content
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/content/run | JWT | Chạy Content Agent |
| GET | /api/agents/content/pending | JWT | Nội dung chờ duyệt |
| POST | /api/agents/content/:id/publish | JWT | Xuất bản nội dung |

### agents/video
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/video/run | JWT | Chạy Video Agent |
| GET | /api/agents/video/pending | JWT | Video chờ duyệt |

### agents/seo
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/seo/run | JWT | Chạy SEO Agent |
| GET | /api/agents/seo/drafts | JWT | Bản nháp SEO |

### agents/publisher
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/publisher/run | JWT | Chạy Publisher Agent |
| GET | /api/agents/publisher/stats | JWT | Thống kê Publisher |

### agents/lead-hunter
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/lead-hunter/run | JWT | Chạy Lead Hunter |
| POST | /api/agents/lead-hunter/ingest | JWT | Nạp lead mới |
| GET | /api/agents/lead-hunter/stats | JWT | Thống kê Lead Hunter |

### agents/sales
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/sales/chat | JWT | Tư vấn bán hàng AI |
| DELETE | /api/agents/sales/session/:sessionId | JWT | Xóa phiên chat |

### agents/crm
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/crm/run | JWT | Chạy CRM Agent |
| GET | /api/agents/crm/stats | JWT | Thống kê CRM |
| GET | /api/agents/crm/customer/:id | JWT | Hồ sơ khách hàng từ CRM |

### agents/knowledge
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/knowledge/sync | JWT | Đồng bộ knowledge |
| POST | /api/agents/knowledge/add | JWT | Thêm knowledge item |
| GET | /api/agents/knowledge/search | JWT | Tìm kiếm knowledge |
| GET | /api/agents/knowledge/stats | JWT | Thống kê knowledge |

### agents/trend
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/trend/run | JWT | Chạy Trend Agent |

### agents/trend-predictor
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/trend-predictor/run | JWT | Chạy Trend Predictor |

### agents/price
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/price/run | JWT | Chạy Price Agent |
| GET | /api/agents/price/alerts | JWT | Cảnh báo giá |

### agents/repricing
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/repricing/stats | JWT | Thống kê repricing |
| POST | /api/agents/repricing/run | JWT | Chạy Repricing Agent |

### agents/competitor-monitor
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/competitor-monitor/stats | JWT | Thống kê monitoring |
| GET | /api/agents/competitor-monitor/alerts | JWT | Cảnh báo đối thủ |
| POST | /api/agents/competitor-monitor/run | JWT | Chạy Competitor Monitor |

### agents/demand-forecaster
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/demand-forecaster/stats | JWT | Thống kê dự báo |
| POST | /api/agents/demand-forecaster/run | JWT | Chạy Demand Forecaster |

### agents/affiliate
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/affiliate/run | JWT | Chạy Affiliate Agent |
| POST | /api/agents/affiliate/product/:id | JWT | Xử lý sản phẩm affiliate |

### agents/marketplace-optimizer
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/marketplace-optimizer/stats | JWT | Thống kê marketplace |
| POST | /api/agents/marketplace-optimizer/run | JWT | Chạy Marketplace Optimizer |

### agents/video-optimizer
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/video-optimizer/stats | JWT | Thống kê video optimization |
| POST | /api/agents/video-optimizer/run | JWT | Chạy Video Optimizer |

### agents/mobile-engagement
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/mobile-engagement/stats | JWT | Thống kê mobile engagement |
| POST | /api/agents/mobile-engagement/run | JWT | Chạy Mobile Engagement Agent |

### agents/enterprise-health
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/enterprise-health/stats | JWT | Thống kê enterprise health |
| POST | /api/agents/enterprise-health/run | JWT | Chạy Enterprise Health Agent |

### agents/whitelabel-onboarding
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | /api/agents/whitelabel-onboarding/stats | JWT | Thống kê onboarding |
| POST | /api/agents/whitelabel-onboarding/run | JWT | Chạy Whitelabel Onboarding Agent |

### agents/master
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/agents/master/run | JWT | Chạy Master Agent |
| GET | /api/agents/master/kpi | JWT | KPI toàn hệ thống |

---

## 27. WEBSOCKET EVENTS

**Namespace:** `/ws`  
**Transport:** Socket.IO

### Client → Server Events

| Event | Payload | Mô tả |
|-------|---------|-------|
| join | room: string | Tham gia room |
| leave | room: string | Rời room |

### Server → Client Events

| Event | Room | Payload | Mô tả |
|-------|------|---------|-------|
| new_order | orders, dashboard | order object | Đơn hàng mới |
| new_lead | leads, dashboard | lead object | Lead mới |
| agent_update | agents | {agent, status, data, ts} | Cập nhật trạng thái agent |
| kpi_update | dashboard | {kpi data, ts} | Cập nhật KPI |
| notification | user:{userId} | {message, type, ts} | Thông báo cá nhân |
| chat_message | chat:{sessionId} | message object | Tin nhắn AI chat |

### Available Rooms

- `orders` — theo dõi đơn hàng
- `leads` — theo dõi leads
- `agents` — theo dõi agents
- `dashboard` — dashboard realtime
- `user:{userId}` — thông báo cá nhân
- `chat:{sessionId}` — phiên chat AI

---

## TỔNG KẾT

- **Tổng endpoints HTTP:** ~163 endpoints
- **Tổng agents:** 21 Agent controllers
- **WebSocket security:** KHÔNG có authentication khi kết nối (CORS origin: '*')
- **Swagger:** Có, tại `/api/docs`, có Bearer auth documentation
- **API Versioning:** Chưa có (dùng prefix v1/v2 chưa được implement)
