# API GAP REPORT — AI Social Commerce OS V3

**Ngày phân tích:** 2026-06-11  
**Phạm vi:** Business gaps — nghiệp vụ đã có trong hệ thống nhưng chưa có API tương ứng

---

## 1. CUSTOMER MANAGEMENT GAPS

### Customer Segmentation API
**Thiếu:** Hệ thống không có API segment khách hàng theo hành vi
```
# Đề xuất (chưa tạo)
GET /api/customers/segments
GET /api/customers/segments/:segment
GET /api/customers/at-risk
GET /api/customers/vip
GET /api/customers/churned
```

### Customer Memory API
**Thiếu:** Knowledge Brain có customer intelligence nhưng không có API CRUD customer memory
```
# Đề xuất
GET /api/customers/:id/memory
POST /api/customers/:id/memory
PUT /api/customers/:id/memory/:key
DELETE /api/customers/:id/memory/:key
```

### Customer Health Score API
**Thiếu:** Không có endpoint tính/lấy health score của khách hàng
```
# Đề xuất
GET /api/customers/:id/health-score
GET /api/customers/health-scores
```

### Customer Lifetime Value API
**Thiếu:** Không có endpoint LTV
```
# Đề xuất
GET /api/customers/:id/ltv
GET /api/customers/ltv-ranking
```

---

## 2. REVENUE ANALYTICS GAPS

### KPI Snapshots API
**Thiếu:** Không có API lưu/lấy KPI snapshots lịch sử
```
# Đề xuất
GET /api/kpi/snapshots
GET /api/kpi/snapshots/daily
GET /api/kpi/snapshots/weekly
GET /api/kpi/snapshots/monthly
POST /api/kpi/snapshots
```

### Revenue Attribution API
**Thiếu:** Không biết doanh thu từ kênh nào (content, affiliate, SEO, organic)
```
# Đề xuất
GET /api/analytics/revenue/by-channel
GET /api/analytics/revenue/by-campaign
GET /api/analytics/revenue/by-product
GET /api/analytics/revenue/attribution
```

### Profit Analysis API
**Thiếu:** Không có endpoint phân tích lợi nhuận
```
# Đề xuất
GET /api/analytics/profit
GET /api/analytics/profit/by-product
GET /api/analytics/profit/margins
```

### Funnel Analytics API
**Thiếu:** Không có API đo tỷ lệ chuyển đổi từng bước funnel
```
# Đề xuất
GET /api/analytics/funnel
GET /api/analytics/funnel/conversion-rates
GET /api/analytics/funnel/drop-off-points
```

---

## 3. PRODUCT MANAGEMENT GAPS

### Product Performance API
**Thiếu:** Không có endpoint đánh giá hiệu suất sản phẩm
```
# Đề xuất
GET /api/products/:id/performance
GET /api/products/performance-ranking
GET /api/products/slow-moving
GET /api/products/best-sellers
```

### Product Pricing History API
**Thiếu:** Không có lịch sử thay đổi giá
```
# Đề xuất
GET /api/products/:id/price-history
```

### Bundle/Combo API
**Thiếu:** Không có API quản lý combo/bundle sản phẩm
```
# Đề xuất
GET /api/products/bundles
POST /api/products/bundles
```

---

## 4. SALES & CRM GAPS

### Sales Pipeline API
**Thiếu:** Không có API theo dõi pipeline bán hàng
```
# Đề xuất
GET /api/sales/pipeline
GET /api/sales/pipeline/stages
GET /api/sales/pipeline/by-agent
```

### Follow-up Automation API
**Thiếu:** Không có API quản lý follow-up schedule
```
# Đề xuất
GET /api/crm/followups
POST /api/crm/followups
PUT /api/crm/followups/:id
GET /api/crm/followups/due-today
```

### Customer Conversation History API
**Thiếu:** Không có API lấy toàn bộ lịch sử chat của khách hàng
```
# Đề xuất
GET /api/customers/:id/conversations
GET /api/conversations
GET /api/conversations/:id
```

### Lead Conversion Tracking API
**Thiếu:** Không có API theo dõi lead → customer conversion
```
# Đề xuất
GET /api/leads/:id/conversion-history
GET /api/analytics/conversion-funnel
```

---

## 5. CONTENT & MARKETING GAPS

### Content Performance API
**Thiếu:** Không có API theo dõi hiệu suất từng nội dung
```
# Đề xuất
GET /api/content
GET /api/content/:id
GET /api/content/:id/performance
GET /api/content/top-performing
POST /api/content
```

### Content Calendar API
**Thiếu:** Không có API lập lịch xuất bản nội dung
```
# Đề xuất
GET /api/content/calendar
GET /api/content/scheduled
POST /api/content/:id/schedule
```

### A/B Test API
**Thiếu:** Không có API quản lý A/B testing
```
# Đề xuất
GET /api/experiments
POST /api/experiments
GET /api/experiments/:id/results
```

---

## 6. SEO & TRAFFIC GAPS

### SEO Keywords API
**Thiếu:** Không có API quản lý keywords SEO
```
# Đề xuất
GET /api/seo/keywords
POST /api/seo/keywords
GET /api/seo/keywords/rankings
GET /api/seo/keywords/opportunities
```

### Organic Traffic API
**Thiếu:** Không có API theo dõi traffic từ SEO
```
# Đề xuất
GET /api/analytics/traffic
GET /api/analytics/traffic/by-source
GET /api/analytics/traffic/organic
```

---

## 7. AI MEMORY GAPS

### AI Decision History API
**Thiếu:** Không có API lấy lịch sử quyết định của AI
```
# Đề xuất
GET /api/ai/decisions
GET /api/ai/decisions/by-agent
GET /api/ai/decisions/:id/outcome
```

### AI Performance Metrics API
**Thiếu:** Không có API đo lường chất lượng AI responses
```
# Đề xuất
GET /api/ai/metrics
GET /api/ai/metrics/hallucination-rate
GET /api/ai/metrics/response-quality
```

### Knowledge Brain Health API
**Thiếu:** Monitoring health của Knowledge Brain/Qdrant
```
# Đề xuất
GET /api/knowledge-brain/health
GET /api/knowledge-brain/coverage
GET /api/knowledge-brain/freshness
```

---

## 8. EXECUTIVE REPORTING GAPS

### Executive Reports API
**Thiếu:** Không có API lưu/lấy executive reports
```
# Đề xuất
GET /api/reports
GET /api/reports/daily/:date
GET /api/reports/weekly/:week
GET /api/reports/monthly/:month
POST /api/reports/generate
```

### Strategic Planning API
**Thiếu:** Không có API lưu kế hoạch chiến lược
```
# Đề xuất
GET /api/planning/strategic
GET /api/planning/weekly
POST /api/planning
```

### Business Forecast API
**Thiếu:** Không có API dự báo kinh doanh
```
# Đề xuất
GET /api/forecast/revenue
GET /api/forecast/orders
GET /api/forecast/leads
```

---

## 9. INFRASTRUCTURE & MONITORING GAPS

### System Health API
**Thiếu:** Không có API kiểm tra health toàn hệ thống (ngoài Ollama)
```
# Đề xuất
GET /api/health
GET /api/health/database
GET /api/health/redis
GET /api/health/qdrant
GET /api/health/ollama
GET /api/health/minio
```

### Agent Health API
**Thiếu:** Không có API tổng hợp health của tất cả agents
```
# Đề xuất
GET /api/agents/health
GET /api/agents/status
GET /api/agents/queue-status
```

---

## 10. NOTIFICATION & WEBHOOK GAPS

### Notification Management API
**Thiếu:** Không có API quản lý notifications
```
# Đề xuất
GET /api/notifications
PUT /api/notifications/:id/read
DELETE /api/notifications/:id
POST /api/notifications/mark-all-read
```

### Webhook API
**Thiếu:** Không có API nhận webhooks từ Facebook, Telegram, etc.
```
# Đề xuất
POST /api/webhooks/facebook
POST /api/webhooks/telegram
POST /api/webhooks/payment-gateway
```

---

## TỔNG KẾT GAP ANALYSIS

| Domain | Số endpoints còn thiếu | Mức độ ưu tiên |
|--------|----------------------|----------------|
| Customer Management | ~12 endpoints | HIGH |
| Revenue Analytics | ~10 endpoints | HIGH |
| Sales & CRM | ~12 endpoints | HIGH |
| Content & Marketing | ~10 endpoints | MEDIUM |
| AI Memory | ~8 endpoints | MEDIUM |
| Executive Reporting | ~8 endpoints | MEDIUM |
| Product Management | ~8 endpoints | MEDIUM |
| SEO & Traffic | ~6 endpoints | MEDIUM |
| Infrastructure | ~8 endpoints | HIGH |
| Webhooks | ~4 endpoints | HIGH |
| **Tổng** | **~86 endpoints** | — |

---

## ƯU TIÊN IMPLEMENT

### Priority 1 (Cần ngay)
1. `GET /api/health/*` — Monitoring cơ bản
2. `GET /api/customers/segments` — CRM core
3. `GET /api/analytics/funnel` — Revenue optimization
4. `POST /api/webhooks/*` — Nhận leads từ social
5. `GET /api/agents/health` — Agent monitoring

### Priority 2 (Ngắn hạn)
1. Customer memory CRUD
2. Revenue attribution
3. KPI snapshots history
4. Follow-up automation
5. Conversation history

### Priority 3 (Trung hạn)
1. Content performance
2. SEO keywords management
3. Executive reports
4. Business forecasting
5. A/B test framework
