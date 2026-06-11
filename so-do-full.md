# AI Social Commerce OS V3 — Sơ đồ hệ thống đầy đủ

> Hệ thống bán hàng AI tự động đa nền tảng  
> NestJS API + Next.js Web + 16 AI Agents + PostgreSQL + Redis + Qdrant + MinIO

---

## I. SƠ ĐỒ KIẾN TRÚC KỸ THUẬT

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NGƯỜI DÙNG / BROWSER                         │
│                    http://server:3003 (Web UI)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 16 FRONTEND (Port 3003)                   │
│  apps/web/  — App Router, Tailwind CSS, TypeScript                  │
│                                                                      │
│  Pages:  /login  /  /products  /orders  /customers  /leads          │
│          /categories  /brands  /inventory  /payments  /campaigns     │
│          /agents  /analytics  /users                                 │
│                                                                      │
│  Rewrite Proxy: /api/* → http://localhost:3002/api/*                │
│  (Tránh CORS — browser gọi cùng origin)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP (localhost)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NESTJS API (Port 3002)                            │
│  apps/api/  — TypeORM, Swagger /api/docs, JWT, WebSocket            │
│                                                                      │
│  ┌─────────── AUTH ────────────┐  ┌─────────── RBAC ─────────────┐  │
│  │ POST /api/auth/login        │  │ @Roles(ADMIN|MANAGER|STAFF)  │  │
│  │ POST /api/auth/register     │  │ Global AuthGuard (JWT HMAC)  │  │
│  │ GET  /api/auth/me           │  │ Hierarchy:                   │  │
│  │ POST /api/auth/refresh      │  │   VIEWER < STAFF             │  │
│  └─────────────────────────────┘  │   < MANAGER < ADMIN          │  │
│                                   └──────────────────────────────┘  │
│                                                                      │
│  ┌─────────── CORE CRUD ───────────────────────────────────────────┐ │
│  │ /users        /products    /orders      /customers              │ │
│  │ /leads        /payments    /categories  /brands                 │ │
│  │ /inventory    /suppliers   /campaigns   /workflows              │ │
│  │ /analytics    /marketplace                                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────── 16 AI AGENTS (Cron + Manual) ───────────────────────┐ │
│  │ /agents/trend           /agents/affiliate   /agents/content    │ │
│  │ /agents/publisher       /agents/lead-hunter /agents/sales      │ │
│  │ /agents/crm             /agents/video       /agents/seo        │ │
│  │ /agents/trend-predictor /agents/price       /agents/segmentat. │ │
│  │ /agents/email           /agents/telegram    /agents/knowledge  │ │
│  │ /agents/master                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────── V2/V3 CORE ─────────────────────────────────────────┐ │
│  │ RagModule (Vector Search)    AiMemoryModule                    │ │
│  │ ContentFactoryModule         AffiliateIntelligenceModule       │ │
│  │ GatewayModule (WebSocket)    AiModule (Groq/OpenAI/Claude)     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────┬───────────┬──────────┬────────────────┘
               │              │           │          │
               ▼              ▼           ▼          ▼
┌──────────────────┐ ┌──────────┐ ┌────────┐ ┌──────────────────┐
│  PostgreSQL 16   │ │  Redis   │ │ Qdrant │ │     MinIO        │
│  Port: 5432      │ │ Port:6379│ │  6333  │ │   Port: 9000     │
│  (commerce_db)   │ │ Bull MQ  │ │ Vector │ │  File Storage    │
│  TypeORM entities│ │ Job Queue│ │  RAG   │ │  (media/assets)  │
└──────────────────┘ └──────────┘ └────────┘ └──────────────────┘
      Docker Compose: commerce_postgres | commerce_redis
                      commerce_qdrant   | commerce_minio

┌─────────────────────────────────────────────────────────────────────┐
│                    PROCESS MANAGER — PM2                             │
│  commerce-api  (cluster, port 3002, max 512MB, autorestart)         │
│  commerce-web  (cluster, port 3003, max 512MB, autorestart)         │
│  Systemd: pm2-hqdu.service → tự động khởi động khi reboot           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## II. SƠ ĐỒ CHỨC NĂNG ĐẦY ĐỦ

### 1. QUẢN TRỊ HỆ THỐNG

```
1. QUẢN TRỊ HỆ THỐNG
├── 1.1 Xác thực & Bảo mật
│   ├── Đăng nhập bằng email + mật khẩu
│   ├── JWT access token (HMAC-SHA256, 7 ngày)
│   ├── Refresh token (30 ngày)
│   ├── Mã hóa mật khẩu PBKDF2 (10.000 vòng, salt 16 bytes)
│   └── Bảo vệ tất cả routes (Global AuthGuard)
│
└── 1.2 Quản lý người dùng & Phân quyền (RBAC)
    ├── Xem danh sách tài khoản (Manager+)
    ├── Tìm kiếm theo tên / email
    ├── Lọc theo role / trạng thái
    ├── Thống kê số lượng theo role & trạng thái
    ├── Tạo tài khoản mới (Admin only)
    │   ├── Nhập: tên, email, mật khẩu, role
    │   └── Role: Admin | Manager | Staff | Viewer
    ├── Thay đổi role inline (Admin only, không tự đổi mình)
    ├── Kích hoạt / Khóa / Tạm ngừng tài khoản (Admin only)
    ├── Reset mật khẩu (Admin only, tối thiểu 6 ký tự)
    └── Xóa tài khoản (Admin only, không tự xóa mình)

PHÂN QUYỀN CHI TIẾT:
    ADMIN   — Toàn quyền: quản lý users, cấu hình, xóa dữ liệu
    MANAGER — Xem báo cáo, CRUD sản phẩm/đơn/khách, xem users
    STAFF   — Xử lý đơn hàng, quản lý leads, chạy agents
    VIEWER  — Chỉ đọc, không thể thay đổi bất kỳ dữ liệu nào
```

---

### 2. QUẢN LÝ DANH MỤC SẢN PHẨM

```
2. QUẢN LÝ DANH MỤC SẢN PHẨM
├── 2.1 Sản phẩm (Products)
│   ├── Tạo sản phẩm mới
│   │   ├── Tên, mô tả, SKU
│   │   ├── Giá gốc, giá bán, % hoa hồng affiliate
│   │   ├── Danh mục, thương hiệu
│   │   ├── Ảnh sản phẩm (lưu MinIO)
│   │   └── Slug tự động (hỗ trợ tiếng Việt có dấu → không dấu)
│   ├── Sửa thông tin sản phẩm
│   ├── Xóa sản phẩm
│   ├── Tìm kiếm theo tên / SKU
│   ├── Lọc theo danh mục / thương hiệu / trạng thái
│   └── Phân trang (20 sp/trang)
│
├── 2.2 Danh mục (Categories)
│   ├── Thêm danh mục (tên → slug tự động)
│   ├── Sửa tên danh mục
│   ├── Xóa danh mục
│   └── Hỗ trợ danh mục cha / con
│
├── 2.3 Thương hiệu (Brands)
│   ├── Thêm thương hiệu (tên, logo, website)
│   ├── Xóa thương hiệu
│   └── Liên kết với sản phẩm
│
├── 2.4 Tồn kho (Inventory)
│   ├── Xem tồn kho theo sản phẩm / kho
│   ├── Cảnh báo hàng sắp hết (low stock threshold)
│   ├── Điều chỉnh số lượng
│   │   ├── Nhập kho (in)
│   │   ├── Xuất kho (out)
│   │   └── Điều chỉnh thủ công (adjustment)
│   ├── Xem tổng giá trị kho hàng
│   └── Lịch sử giao dịch kho (ai làm, lúc nào, lý do)
│
└── 2.5 Nhà cung cấp (Suppliers)
    ├── Thông tin liên hệ nhà cung cấp
    └── Liên kết sản phẩm với nhà cung cấp
```

---

### 3. QUẢN LÝ BÁN HÀNG

```
3. QUẢN LÝ BÁN HÀNG
├── 3.1 Đơn hàng (Orders)
│   ├── Xem danh sách đơn hàng
│   │   ├── Lọc theo trạng thái, kênh, ngày
│   │   └── Phân trang
│   ├── Tạo đơn hàng thủ công
│   │   ├── Chọn khách hàng
│   │   ├── Thêm sản phẩm + số lượng
│   │   ├── Mã đơn tự sinh: ORD-YYYYMMDD-XXXXXX
│   │   └── Tên sản phẩm tự điền từ DB
│   ├── Cập nhật trạng thái đơn
│   │   pending → confirmed → processing → shipped → delivered → completed
│   │   (hoặc: cancelled / refunded)
│   ├── Xem chi tiết đơn + các mặt hàng
│   ├── Tổng doanh thu hôm nay / tháng
│   └── Số đơn theo trạng thái
│
└── 3.2 Thanh toán (Payments)
    ├── Danh sách giao dịch thanh toán
    ├── Lọc theo phương thức, trạng thái
    ├── Thống kê: tổng thu / theo phương thức / thành công / thất bại
    └── Liên kết với đơn hàng tương ứng
```

---

### 4. QUẢN LÝ KHÁCH HÀNG & LEADS

```
4. QUẢN LÝ KHÁCH HÀNG & LEADS
├── 4.1 Khách hàng (Customers)
│   ├── Danh sách khách hàng
│   ├── Tìm kiếm theo tên / SĐT / email
│   ├── Lọc theo tier
│   ├── Hệ thống phân tier tự động
│   │   Bronze → Silver → Gold → VIP → Diamond
│   │   (dựa trên tổng chi tiêu & số lần mua)
│   ├── Thông tin: tên, SĐT, email, địa chỉ, ngày sinh
│   ├── Lịch sử đơn hàng, tổng chi tiêu
│   ├── Điểm loyalty
│   └── Tạo khách hàng thủ công
│
└── 4.2 Leads (Khách hàng tiềm năng)
    ├── Thu thập tự động từ đa kênh
    │   Facebook | TikTok | Zalo | Web | Telegram | Shopee
    ├── Xem danh sách leads
    ├── AI Score (0–100): mức độ sẵn sàng mua
    │   ├── > 80: Hot lead — ưu tiên liên hệ ngay
    │   ├── 50–80: Warm lead — nurturing
    │   └── < 50: Cold lead — chờ
    ├── Trạng thái pipeline
    │   new → contacted → qualified → converted → lost
    ├── Lọc theo kênh, điểm AI, trạng thái
    └── Chuyển lead thành khách hàng
```

---

### 5. MARKETING & CHIẾN DỊCH

```
5. MARKETING & CHIẾN DỊCH
├── 5.1 Chiến dịch (Campaigns)
│   ├── Tạo chiến dịch marketing
│   │   ├── Tên chiến dịch, mục tiêu
│   │   ├── Nền tảng: Facebook | TikTok | Zalo | Telegram | Email | Google
│   │   ├── Ngân sách, thời gian bắt đầu / kết thúc
│   │   └── Trạng thái: draft → active → paused → completed
│   ├── Theo dõi hiệu quả chiến dịch
│   │   ├── Lượt tiếp cận, click, chuyển đổi
│   │   └── Chi phí / đơn hàng
│   └── Xem danh sách chiến dịch đang chạy
│
└── 5.2 Affiliate Marketing (tự động qua Agent)
    ├── Quét sản phẩm affiliate Shopee / Lazada / TikTok Shop
    ├── Tự động lấy link affiliate
    ├── Tính hoa hồng ước tính
    └── Đăng link vào nội dung tự động
```

---

### 6. PHÂN TÍCH & BÁO CÁO

```
6. PHÂN TÍCH & BÁO CÁO (Analytics)
├── 6.1 Doanh thu
│   ├── Doanh thu hôm nay
│   ├── Doanh thu tháng này
│   ├── Doanh thu 30 ngày qua
│   ├── Số đơn hàng theo kỳ
│   └── So sánh với kỳ trước (% tăng/giảm)
│
├── 6.2 Khách hàng
│   ├── Tổng số khách hàng
│   ├── Khách hàng mới (hôm nay / tháng)
│   ├── Khách VIP / Diamond
│   ├── Tỷ lệ giữ chân (retention rate)
│   └── Phân bổ theo tier
│
├── 6.3 Leads
│   ├── Tổng leads / leads mới hôm nay
│   ├── Tỷ lệ chuyển đổi (conversion rate)
│   ├── Leads theo kênh (FB / TikTok / Zalo / Web)
│   └── Funnel: new → converted
│
└── 6.4 AI Performance
    ├── Tổng số lần agent chạy (24h / 30 ngày)
    ├── Tỷ lệ thành công
    ├── Thời gian chạy trung bình
    ├── Token AI đã sử dụng
    ├── Chi phí AI ước tính
    └── Thống kê chi tiết từng agent
        (runs / success / failed / tokens / avg duration)
```

---

### 7. 16 AI AGENTS TỰ ĐỘNG

```
7. 16 AI AGENTS TỰ ĐỘNG
│
├── NHÓM 1: THU THẬP DỮ LIỆU THỊ TRƯỜNG
│   │
│   ├── 🔥 Trend Hunter Agent                    [Cron: mỗi 4 giờ]
│   │   ├── Quét TikTok trending hashtags
│   │   ├── Quét Facebook trending topics
│   │   ├── Quét Google Trends
│   │   ├── AI scoring từng xu hướng (0-100)
│   │   └── Lưu top products theo xu hướng
│   │
│   ├── 🔗 Affiliate Hunter Agent                [Cron: mỗi 6 giờ]
│   │   ├── Quét Shopee bestsellers
│   │   ├── Quét Lazada hot deals
│   │   ├── Quét TikTok Shop trending
│   │   ├── Lấy link affiliate tự động
│   │   └── Tính hoa hồng ước tính
│   │
│   └── 📈 Trend Predictor Agent                 [Cron: mỗi 6 giờ]
│       ├── Phân tích đa nguồn dữ liệu
│       ├── AI dự báo xu hướng 7–30 ngày tới
│       ├── Confidence score cho từng dự báo
│       └── Đề xuất sản phẩm nên nhập / đẩy
│
├── NHÓM 2: TẠO NỘI DUNG
│   │
│   ├── ✍️  Content Creator Agent                 [Cron: mỗi 1 giờ]
│   │   ├── Nhận trend từ Trend Hunter
│   │   ├── AI viết caption Facebook (hooks + CTA)
│   │   ├── AI viết script TikTok (15s / 30s / 60s)
│   │   ├── AI viết nội dung Telegram
│   │   └── Đa dạng format: review, FOMO, educational
│   │
│   ├── 🎬 Video Creator Agent                   [Cron: mỗi 10 giờ]
│   │   ├── AI tạo script video sản phẩm
│   │   ├── Text-to-Speech (TTS) giọng Việt
│   │   ├── Tạo thumbnail ảnh
│   │   ├── Ghép video + audio
│   │   └── Chuẩn bị upload TikTok
│   │
│   └── 🔍 SEO Agent                             [Cron: mỗi 7 giờ]
│       ├── AI viết bài blog chuẩn SEO
│       ├── Tạo meta title + description
│       ├── Nghiên cứu keyword cluster
│       ├── Internal linking suggestions
│       └── Schema markup tự động
│
├── NHÓM 3: ĐĂNG & PHÂN PHỐI NỘI DUNG
│   │
│   ├── 📣 Social Publisher Agent          [Cron: 8h, 12h, 18h hàng ngày]
│   │   ├── Lấy nội dung từ Content Creator
│   │   ├── Đăng Facebook Page / Group
│   │   ├── Đăng TikTok (video + caption)
│   │   ├── Đăng Telegram channel
│   │   ├── Queue bài theo lịch
│   │   └── Báo cáo: đã đăng / thất bại
│   │
│   └── ✈️  Telegram Bot Agent             [Cron: 9h, 15h, 21h hàng ngày]
│       ├── Gửi flash sale / deal hôm nay
│       ├── Gửi sản phẩm trending
│       ├── Phản hồi câu hỏi khách hàng
│       └── Quản lý nhóm KH VIP
│
├── NHÓM 4: BÁN HÀNG & CHĂM SÓC KHÁCH HÀNG
│   │
│   ├── 🎯 Lead Hunter Agent                     [Cron: mỗi 30 phút]
│   │   ├── Quét comment Facebook (từ khóa mua hàng)
│   │   ├── Thu thập form đăng ký web
│   │   ├── Nhận leads từ Zalo / Telegram
│   │   ├── AI phân loại & chấm điểm lead (0-100)
│   │   └── Phân công lead cho staff
│   │
│   ├── 💬 Sales Agent                           [Real-time]
│   │   ├── AI tư vấn sản phẩm (RAG từ knowledge base)
│   │   ├── Trả lời câu hỏi khách hàng 24/7
│   │   ├── Gợi ý sản phẩm phù hợp
│   │   ├── Xử lý phản đối (objection handling)
│   │   └── Chốt đơn tự động
│   │
│   └── 👥 CRM Agent                             [Cron: mỗi 2 giờ]
│       ├── Tự động nâng tier KH (dựa trên chi tiêu)
│       ├── Phát hiện KH có nguy cơ rời bỏ (churn)
│       ├── Gửi ưu đãi chống churn
│       ├── Nurturing sequence (chuỗi chăm sóc)
│       └── Nhắc nhở: sinh nhật, kỷ niệm mua hàng
│
├── NHÓM 5: PHÂN TÍCH & TỐI ƯU
│   │
│   ├── 💰 Price Intelligence Agent              [Cron: mỗi 1 giờ]
│   │   ├── Theo dõi giá đối thủ Shopee / Lazada / Tiki
│   │   ├── So sánh giá của mình vs đối thủ
│   │   ├── Cảnh báo khi giá đối thủ thấp hơn
│   │   └── Đề xuất điều chỉnh giá / khuyến mãi
│   │
│   ├── 🗂 Segmentation Agent                   [Cron: mỗi 2 giờ]
│   │   ├── Phân khúc KH theo hành vi mua
│   │   ├── RFM Analysis (Recency/Frequency/Monetary)
│   │   ├── Cluster KH bằng AI
│   │   └── Đề xuất chiến lược cho từng phân khúc
│   │
│   └── 📧 Email Marketing Agent                 [Cron: mỗi 8 giờ]
│       ├── Email chào mừng KH mới
│       ├── Email upsell / cross-sell
│       ├── Email remarketing giỏ hàng bỏ dở
│       ├── Email flash sale / deal đặc biệt
│       └── Cá nhân hóa nội dung theo segment
│
└── NHÓM 6: HẠ TẦNG AI
    │
    ├── 🧠 Knowledge Agent                       [Cron: mỗi 3 giờ]
    │   ├── Sync dữ liệu sản phẩm → Qdrant (vector)
    │   ├── Đồng bộ knowledge base nội bộ
    │   ├── AI Q&A từ knowledge base (RAG)
    │   ├── Index tài liệu, chính sách, FAQ
    │   └── Thống kê: số documents, queries
    │
    └── 👑 Executive AI (Master Agent)           [Cron: mỗi 1 giờ]
        ├── Theo dõi trạng thái 15 agents còn lại
        ├── Điều phối thứ tự chạy các agents
        ├── Phát hiện agent lỗi → tự restart
        ├── Tổng hợp KPI toàn hệ thống
        └── Báo cáo định kỳ: doanh thu, leads, hiệu quả AI
```

---

### 8. HẠ TẦNG AI & TRI THỨC

```
8. HẠ TẦNG AI & TRI THỨC
│
├── 8.1 AI Engine (AiModule)
│   ├── Groq — LLaMA 3.1 70B          (mặc định, nhanh, rẻ)
│   ├── OpenAI GPT-4o                  (chất lượng cao)
│   └── Anthropic Claude               (backup / phân tích phức tạp)
│
├── 8.2 RAG — Retrieval-Augmented Generation (RagModule)
│   ├── Lưu embeddings vào Qdrant
│   ├── Tìm kiếm ngữ nghĩa (semantic search)
│   ├── AI trả lời dựa trên knowledge base nội bộ
│   └── Độ chính xác cao hơn AI thuần túy
│
├── 8.3 AI Memory (AiMemoryModule)
│   ├── Ghi nhớ context hội thoại Sales AI
│   ├── Học từ lịch sử tương tác KH
│   └── Cá nhân hóa trải nghiệm từng KH
│
├── 8.4 Content Factory (ContentFactoryModule)
│   ├── Pipeline tạo nội dung hàng loạt
│   ├── Template + AI fill nội dung
│   └── Multi-platform output (FB / TikTok / Telegram / Email)
│
└── 8.5 Affiliate Intelligence (AffiliateIntelligenceModule)
    ├── Phân tích hiệu quả link affiliate
    ├── Tự động chọn sản phẩm tốt nhất để promote
    └── Tối ưu hoa hồng theo từng kênh
```

---

### 9. TÍCH HỢP ĐA KÊNH

```
9. TÍCH HỢP ĐA KÊNH (Marketplace & Social)
│
├── 9.1 Sàn thương mại điện tử
│   ├── Shopee       — Sync SP, đơn hàng, giá, affiliate
│   ├── Lazada       — Sync SP, theo dõi giá đối thủ
│   └── TikTok Shop  — Đăng video, affiliate, đơn hàng
│
├── 9.2 Mạng xã hội
│   ├── Facebook     — Đăng bài, chạy ads, nhận leads comment
│   ├── TikTok       — Đăng video tự động, viral content
│   └── Zalo         — Gửi tin nhắn, chăm sóc KH, nhận leads
│
└── 9.3 Messaging
    ├── Telegram     — Bot tự động, kênh thông báo, nhóm KH VIP
    └── Email        — Transactional + Marketing emails
```

---

### 10. GIAO TIẾP REAL-TIME & JOB QUEUE

```
10. GIAO TIẾP REAL-TIME & XỬ LÝ BẤT ĐỒNG BỘ
│
├── 10.1 WebSocket (GatewayModule)
│   ├── ws://server:3002/ws
│   ├── Thông báo đơn hàng mới real-time
│   ├── Cập nhật trạng thái agent live
│   ├── Dashboard metrics live
│   └── AI Sales chat với khách hàng
│
└── 10.2 Bull Job Queue (Redis-backed)
    ├── Gửi email hàng loạt
    ├── Tạo video (tác vụ nặng)
    ├── Sync marketplace (Shopee / Lazada)
    ├── Xuất báo cáo PDF
    └── Retry tự động khi job thất bại
```

---

### 11. DATABASE SCHEMA CHÍNH

```
11. DATABASE SCHEMA CHÍNH (PostgreSQL)
│
├── users            — Tài khoản hệ thống (id, email, passwordHash, role, status)
├── products         — Sản phẩm (id, name, slug, sku, price, salePrice, categoryId)
├── categories       — Danh mục (id, name, slug, parentId)
├── brands           — Thương hiệu (id, name, logo, website)
├── customers        — Khách hàng (id, name, phone, email, tier, totalSpent)
├── orders           — Đơn hàng (id, code, customerId, status, channel, total)
├── order_items      — Chi tiết đơn (id, orderId, productId, productName, qty, price)
├── leads            — Leads (id, name, phone, platform, score, status, source)
├── payments         — Thanh toán (id, orderId, amount, method, status)
├── inventory        — Tồn kho (id, productId, warehouseId, qty, minQty)
├── inventory_txns   — Giao dịch kho (id, inventoryId, type, qty, reason, userId)
├── suppliers        — Nhà cung cấp (id, name, contact, products)
├── campaigns        — Chiến dịch (id, name, platform, budget, startAt, endAt)
├── agent_logs       — Log agents (id, agent, status, input, output, tokens, durationMs)
├── ai_memories      — Bộ nhớ AI (id, sessionId, role, content, embedding)
├── knowledge_docs   — Tài liệu knowledge base (id, title, content, vector)
├── workflows        — Quy trình tự động (id, name, trigger, steps, active)
└── marketplace_sync — Lịch sử đồng bộ sàn TMĐT
```

---

## III. LUỒNG DỮ LIỆU CHÍNH

```
LUỒNG 1: LEAD → KHÁCH HÀNG → ĐƠN HÀNG
─────────────────────────────────────────
Mạng xã hội (FB/TikTok/Zalo)
    │
    ▼ Lead Hunter Agent (30min)
Leads DB ──→ AI Score ──→ [Hot > 80] ──→ Sales Agent (real-time)
                                              │
                                              ▼
                                         Tư vấn + Chốt đơn
                                              │
                                              ▼
                                         Orders + Order Items
                                              │
                                              ▼
                                    Payments ──→ Analytics
                                              │
                                              ▼
                                    Inventory giảm tồn kho
                                              │
                                              ▼
                                    CRM Agent: nâng tier KH


LUỒNG 2: XU HƯỚNG → NỘI DUNG → ĐĂNG BÀI
──────────────────────────────────────────
Google/TikTok/FB Trends
    │
    ▼ Trend Hunter (4h)
Trend Score ──→ Content Creator (1h)
                    │
                    ├──→ Bài Facebook
                    ├──→ Script TikTok ──→ Video Creator (10h) ──→ Video file
                    └──→ Nội dung Telegram
                              │
                              ▼ Social Publisher (8h/12h/18h)
                         Đăng lên FB / TikTok / Telegram
                              │
                              ▼
                    Leads mới từ comment / click


LUỒNG 3: AGENT ĐIỀU PHỐI (MASTER AI)
──────────────────────────────────────
Executive AI (mỗi 1h)
    │
    ├── Kiểm tra sức khỏe 15 agents
    ├── Tổng hợp KPI: doanh thu, leads, content
    ├── Phát hiện bất thường → cảnh báo
    └── Báo cáo dashboard


LUỒNG 4: KIẾN THỨC → AI PHẢN HỒI
───────────────────────────────────
Dữ liệu SP + FAQ + Chính sách
    │
    ▼ Knowledge Agent (3h)
Qdrant Vector DB
    │
    ▼ RAG Search (real-time)
Sales Agent ──→ Câu trả lời chính xác cho khách
```

---

## IV. THỐNG KÊ HỆ THỐNG

| Thành phần | Chi tiết |
|---|---|
| **Frontend pages** | 14 trang (/login, dashboard, products, orders, customers, leads, categories, brands, inventory, payments, campaigns, agents, analytics, users) |
| **API endpoints** | ~85 endpoints |
| **AI Agents** | 16 agents |
| **Cron jobs** | 14 lịch tự động khác nhau |
| **Kênh tích hợp** | 6 (Shopee, Lazada, TikTok, Facebook, Zalo, Telegram) |
| **AI Providers** | 3 (Groq, OpenAI, Anthropic) |
| **Database tables** | ~18 bảng chính |
| **Cấp phân quyền** | 4 (Admin, Manager, Staff, Viewer) |
| **Dịch vụ hạ tầng** | 4 (PostgreSQL, Redis, Qdrant, MinIO) |
| **Process manager** | PM2 + Systemd auto-start |
| **Port API** | 3002 |
| **Port Web** | 3003 |

---

## V. THÔNG TIN TRUY CẬP

| Dịch vụ | URL |
|---|---|
| Web Admin | `http://server:3003` |
| API | `http://server:3002/api` |
| Swagger Docs | `http://server:3002/api/docs` |
| WebSocket | `ws://server:3002/ws` |
| MinIO Console | `http://server:9001` |
| Qdrant Dashboard | `http://server:6333/dashboard` |

---

*Tài liệu này được tạo tự động từ hệ thống AI Social Commerce OS V3*  
*Cập nhật: 2026-06-11*
