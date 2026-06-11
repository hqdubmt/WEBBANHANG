# API CONTRACT REPORT — AI Social Commerce OS V3

**Ngày phân tích:** 2026-06-11  
**Phạm vi:** Request/Response Contract, DTO Validation, Error Handling, Status Codes

---

## 1. GLOBAL CONFIG

| Thành phần | Giá trị |
|-----------|---------|
| Global Prefix | `/api` |
| ValidationPipe | Bật — `transform: true, whitelist: true` |
| CORS | Dev: tất cả origins. Prod: whitelist từ env |
| API Versioning | Không có (không dùng `/v1`, `/v2`) |
| Content-Type | application/json (default NestJS) |

---

## 2. DTO ANALYSIS

### Tình trạng hiện tại
- Chỉ có **1 DTO file** được tìm thấy: `create-product.dto.ts`
- Phần lớn controllers **không có DTO files** riêng — validation thiếu
- DTO duy nhất hiện có sử dụng `class-validator` và `@ApiProperty` đúng chuẩn

### CreateProductDto (mẫu tốt)
```typescript
class CreateProductDto {
  @ApiProperty() @IsString() name: string
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiProperty() @IsNumber() price: number
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() stock?: number
  @ApiPropertyOptional({ enum: ProductSource }) @IsOptional() @IsEnum(ProductSource) source?
  @ApiPropertyOptional() @IsOptional() @IsString() affiliateLink?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() commission?: number
}
```

**Nhận xét:** DTO mẫu tốt — có validation, có Swagger docs, có optional/required rõ ràng.

### Thiếu DTOs cho các module
- `customers` — không có DTO
- `orders` — không có DTO  
- `leads` — không có DTO
- `campaigns` — không có DTO
- `payments` — không có DTO
- `inventory/adjust` — không có DTO cho payload điều chỉnh tồn kho
- Tất cả 21 agent controllers — không có DTO

---

## 3. REQUEST CONTRACT

### Auth Contract
```
POST /api/auth/login
Body: { email: string, password: string }
Response: { accessToken: string, refreshToken: string, user: {...} }

POST /api/auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string }

GET /api/auth/me
Header: Authorization: Bearer <token>
Response: { id, email, name, role, tenant }
```

### Product Contract
```
POST /api/products
Header: Authorization: Bearer <token>
Body: CreateProductDto (validated)
Response: ProductEntity

GET /api/products
Query: ?search=&category=&source=&page=&limit=
Response: { data: ProductEntity[], total, page, limit }
```

### Order Contract
```
POST /api/orders
Body: { customerId, items: [{productId, qty, price}], ... }
Response: OrderEntity

PUT /api/orders/:id/status
Body: { status: string }
Response: OrderEntity
```

### Sales Agent Contract
```
POST /api/agents/sales/chat
Body: { message: string, sessionId?: string, customerId?: string }
Response: { reply: string, sessionId: string, intent?: string, products?: [] }
```

### Knowledge Brain Contract
```
POST /api/knowledge-brain/ask
Body: { question: string, domain?: string, limit?: number }
Response: { answer: string, sources: [], confidence: number }

POST /api/knowledge-brain/ingest
Body: { type: string, data: object }
Response: { success: boolean, itemsIngested: number }
```

---

## 4. RESPONSE CONTRACT ANALYSIS

### Vấn đề: Thiếu chuẩn hóa response format

**Hiện tại** — mỗi endpoint trả về format khác nhau:
- Một số trả về entity trực tiếp
- Một số trả về `{ data, total, page }`
- Một số trả về `{ success: boolean }`
- Thiếu wrapper chuẩn `{ status, message, data, errors }`

**Đề xuất chuẩn (chưa implement):**
```json
{
  "status": "success",
  "data": { ... },
  "message": "...",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Vấn đề: Thiếu response type declarations
- Controllers không khai báo `@ApiResponse()` decorators đồng nhất
- Swagger thiếu response schemas cho phần lớn endpoints
- Khó contract testing vì không có formal response schema

---

## 5. ERROR HANDLING

### Global Error Format (NestJS default)
```json
{
  "statusCode": 400,
  "message": ["validation error 1", "validation error 2"],
  "error": "Bad Request"
}
```

### Custom Error (auth)
```
401: UnauthorizedException — "Cần đăng nhập"
```

### Vấn đề phát hiện
1. **Không có Global Exception Filter** — dựa hoàn toàn vào NestJS default
2. **Error messages không nhất quán** — đôi khi là array, đôi khi là string
3. **Thiếu error codes** — không có business error codes như `AUTH_001`, `ORDER_001`
4. **Không log errors** — không có error logging interceptor global

---

## 6. HTTP STATUS CODE USAGE

| Endpoint type | Code dùng | Đúng chuẩn |
|--------------|-----------|-----------|
| GET list | 200 | ✅ |
| POST create | 201 (NestJS default) | ✅ |
| PUT/PATCH update | 200 | ✅ |
| DELETE | 200 (nên là 204) | ⚠️ |
| Auth login success | 200/201 | ⚠️ Không nhất quán |
| Validation error | 400 | ✅ |
| Unauthorized | 401 | ✅ |
| Not found | 404 | ✅ |
| Server error | 500 | ✅ |

**Vấn đề:** DELETE nên trả 204 No Content nhưng đang trả 200.

---

## 7. PAGINATION CONTRACT

**Hiện tại:** Một số endpoints hỗ trợ query params `page`, `limit` nhưng:
- Không có chuẩn nhất quán
- `orders`, `customers`, `products` có pagination
- `leads`, `campaigns` không rõ
- Response format pagination không thống nhất

**Đề xuất:** Standard pagination với `?page=1&limit=20&sort=createdAt&order=DESC`

---

## 8. FILTER/SEARCH CONTRACT

- `GET /api/products` hỗ trợ: `search`, `category`, `source`, `page`, `limit`
- `GET /api/orders` hỗ trợ: `status`, `customerId`, `dateFrom`, `dateTo`
- `GET /api/leads` hỗ trợ: query params chưa documented
- Không có chuẩn filter syntax chung

---

## 9. ĐIỂM MẠNH CONTRACT

1. ✅ ValidationPipe global với `whitelist: true` — tự loại bỏ fields thừa
2. ✅ Class-validator trong DTO — validation chặt chẽ khi có DTO
3. ✅ Bearer JWT authentication chuẩn
4. ✅ `transform: true` — tự cast types
5. ✅ Swagger được setup chuẩn với bearer auth

---

## 10. ĐIỂM YẾU CONTRACT

| Vấn đề | Mức độ | Ảnh hưởng |
|--------|--------|-----------|
| 95% controllers thiếu DTO | CRITICAL | Không validate input, dễ crash |
| Response format không chuẩn | HIGH | Frontend khó implement |
| Thiếu Global Exception Filter | HIGH | Lộ stack trace production |
| Thiếu business error codes | MEDIUM | Debug khó |
| DELETE trả 200 thay 204 | LOW | Không ảnh hưởng chức năng |
| Thiếu API versioning | MEDIUM | Backward compat khi upgrade |

---

## ĐIỂM SỐ CONTRACT

| Tiêu chí | Điểm |
|----------|------|
| DTO Coverage | 5/20 |
| Response Consistency | 8/20 |
| Error Handling | 10/20 |
| Status Codes | 14/20 |
| Swagger Docs | 12/20 |
| **Tổng** | **49/100** |
