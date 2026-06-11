# API SECURITY REPORT — AI Social Commerce OS V3

**Ngày phân tích:** 2026-06-11  
**Phạm vi:** Authentication, Authorization, Input Validation, Sensitive Endpoints, Security Risks

---

## 1. AUTHENTICATION ANALYSIS

### JWT Implementation
- **Mechanism:** JWT Bearer Token
- **Guard:** `AuthGuard` — global guard qua `APP_GUARD`
- **Token extraction:** `Authorization: Bearer <token>` header
- **Public decorator:** `@Public()` để bypass guard

### Vấn đề JWT
1. **Thiếu refresh token rotation** — `/auth/refresh` không rotate token
2. **Thiếu token blacklist** — logout không thực sự invalidate token
3. **JWT secret từ env** — cần kiểm tra `JWT_SECRET` có đủ entropy không
4. **Không có token expiry rõ ràng** — cần kiểm tra `expiresIn` config

### Setup API — RỦI RO CAO
```
POST /api/auth/setup — @Public() — Không cần auth
```
- Endpoint này tạo admin account đầu tiên
- Nếu không có check "đã setup rồi thì block", đây là **lỗ hổng nghiêm trọng**
- Cần kiểm tra `GET /api/auth/setup-status` có thực sự block `POST /api/auth/setup` sau khi setup không

---

## 2. AUTHORIZATION ANALYSIS

### RBAC Model
```
VIEWER < STAFF < MANAGER < ADMIN
```
- Role hierarchy đúng — cấp cao có quyền của cấp thấp
- Implemented bằng `@Roles()` decorator

### Role Coverage Analysis

| Module | Auth Level | Vấn đề |
|--------|-----------|--------|
| users | MANAGER/ADMIN | ✅ Tốt |
| products | JWT (all roles) | ⚠️ Cần phân quyền tạo/xóa |
| orders | JWT (all roles) | ⚠️ Cần phân quyền theo role |
| payments | JWT (all roles) | ⚠️ NGUY HIỂM — thanh toán không có role check |
| customers | JWT (all roles) | ⚠️ Cần phân quyền |
| leads | JWT (all roles) | ✅ Chấp nhận được |
| affiliate | JWT (all roles) | ⚠️ Cần phân quyền approve/pay |
| enterprise | JWT (all roles) | ⚠️ NGUY HIỂM — multi-tenant management |
| white-label | JWT (all roles) | ⚠️ Cần ADMIN |
| ai-board | JWT (all roles) | ⚠️ Thông tin nhạy cảm |
| business-os | JWT (all roles) | ⚠️ Thông tin nhạy cảm |
| self-improvement | JWT (all roles) | ✅ OK |
| agents/* | JWT (all roles) | ⚠️ Agent execution cần MANAGER+ |
| knowledge-brain/ingest | JWT (all roles) | ⚠️ Data poisoning risk |

---

## 3. SENSITIVE ENDPOINTS ANALYSIS

### CRITICAL — Cần bảo vệ ngay

| Endpoint | Rủi ro | Đề xuất |
|----------|--------|---------|
| POST /api/auth/setup | Setup account không auth | Thêm check "chỉ chạy 1 lần" |
| POST /api/payments/:id/refund | Hoàn tiền — không check role | Yêu cầu MANAGER+ |
| PUT /api/affiliate-portal/conversions/:id/pay | Trả tiền affiliate | Yêu cầu MANAGER+ |
| PATCH /api/enterprise/:id | Quản lý tenant | Yêu cầu ADMIN |
| DELETE /api/enterprise/:id | Xóa tenant | Yêu cầu ADMIN |
| POST /api/knowledge-brain/ingest | Data poisoning | Yêu cầu MANAGER+ |
| POST /api/agents/*/run | Chạy agent không kiểm soát | Rate limit + role check |

### HIGH — Nên bảo vệ

| Endpoint | Rủi ro | Đề xuất |
|----------|--------|---------|
| DELETE /api/products/:id | Xóa sản phẩm | Yêu cầu MANAGER+ |
| DELETE /api/categories/:id | Xóa danh mục | Yêu cầu MANAGER+ |
| DELETE /api/workflows/:id | Xóa workflow | Yêu cầu MANAGER+ |
| GET /api/ai-board/* | Business insights nhạy cảm | Yêu cầu MANAGER+ |
| GET /api/business-os/* | KPI, plans nhạy cảm | Yêu cầu MANAGER+ |

---

## 4. INPUT VALIDATION

### Tình trạng hiện tại
- `ValidationPipe` global với `whitelist: true` — ✅ tốt
- Nhưng **chỉ 1 DTO** có validation decorators (`create-product.dto.ts`)
- Phần lớn controllers nhận raw body không validate

### Rủi ro Input Injection

| Loại | Rủi ro | Tình trạng |
|------|--------|-----------|
| SQL Injection | TypeORM parameterized queries | ✅ Được bảo vệ |
| XSS | Thiếu sanitization HTML | ⚠️ Cần kiểm tra |
| SSRF | AI/Marketplace URLs | ⚠️ Cần validate URLs |
| ReDoS | RegEx validators | ✅ class-validator ổn |
| Mass Assignment | whitelist: true | ✅ Được bảo vệ |
| Type Confusion | Thiếu @IsString/@IsNumber | ⚠️ 95% routes thiếu |

---

## 5. WEBSOCKET SECURITY

### EventsGateway Analysis
```typescript
@WebSocketGateway({
  cors: { origin: '*' },  // ⚠️ NGUY HIỂM
  namespace: '/ws',
})
```

**Vấn đề WebSocket:**
1. **CORS origin: '*'** — Bất kỳ domain nào cũng kết nối được
2. **Không có authentication** — Không validate token khi kết nối
3. **Không có authorization** — Bất kỳ client nào join được bất kỳ room
4. **Room isolation thiếu** — Client có thể join `orders`, `dashboard` mà không cần quyền

**Rủi ro:**
- Attacker join room `orders` — nhận tất cả đơn hàng real-time
- Attacker join room `dashboard` — nhận KPI, doanh thu real-time
- Information leakage nghiêm trọng

---

## 6. API RATE LIMITING

### Tình trạng hiện tại
- **KHÔNG CÓ** rate limiting
- Tất cả endpoints có thể bị abuse không giới hạn
- AI endpoints (POST /api/ai/chat, POST /api/agents/sales/chat) có thể bị tấn công cost

**Rủi ro:**
- Brute force `/api/auth/login`
- Spam `/api/agents/*/run` — tốn LLM tokens
- DoS qua `/api/knowledge-brain/ask`

---

## 7. DATA EXPOSURE RISKS

### Thiếu Field Filtering
- Entities được trả về trực tiếp không qua transform
- Password hash có thể lộ nếu User entity không exclude
- Cần dùng `@Exclude()` trên sensitive fields

### Tenant Isolation
- Multi-tenant (enterprise, white-label) nhưng không rõ có tenant isolation không
- Cần kiểm tra: User của tenant A có xem được data tenant B không?

---

## 8. CORS CONFIGURATION

```typescript
// Dev: origin: true (tất cả)
// Prod: allowedOrigins từ ALLOWED_ORIGINS env
```
- Dev mode: ✅ Chấp nhận được
- Prod mode: ✅ Whitelist — tốt
- WebSocket: ⚠️ origin: '*' — NGUY HIỂM

---

## 9. SECURITY RISKS SUMMARY

| Rủi ro | Mức độ | Tình trạng |
|--------|--------|-----------|
| WebSocket không auth | CRITICAL | Chưa fix |
| Thiếu Rate Limiting | HIGH | Chưa có |
| Payment/Refund không role check | HIGH | Chưa fix |
| Setup endpoint có thể abuse | HIGH | Cần kiểm tra |
| 95% routes thiếu input validation | HIGH | Cần thêm DTOs |
| Thiếu token blacklist (logout) | MEDIUM | Cần implement |
| Data exposure qua entities | MEDIUM | Cần @Exclude() |
| SSRF qua AI URL inputs | MEDIUM | Cần URL validation |
| Agent execution không role check | MEDIUM | Cần MANAGER+ |
| Thiếu audit logging | MEDIUM | Không có log |

---

## 10. ĐIỂM MẠNH SECURITY

1. ✅ JWT-based authentication toàn hệ thống
2. ✅ RBAC với role hierarchy rõ ràng
3. ✅ TypeORM parameterized queries — bảo vệ SQL injection
4. ✅ ValidationPipe whitelist — bảo vệ mass assignment
5. ✅ HTTPS via Nginx (infrastructure level)
6. ✅ Public decorator rõ ràng — biết endpoint nào public

---

## SECURITY SCORE

| Tiêu chí | Điểm |
|----------|------|
| Authentication | 14/20 |
| Authorization | 8/20 |
| Input Validation | 6/20 |
| WebSocket Security | 2/10 |
| Rate Limiting | 0/10 |
| Data Protection | 12/20 |
| Audit/Logging | 3/10 |
| Infrastructure | 8/10 |
| **Tổng** | **53/100** |
