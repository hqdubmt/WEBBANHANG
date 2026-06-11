# risk_report.md
**AI Social Commerce OS — Foundation Audit V1**
**Date:** 2026-06-11

---

## Security Risks

### CRITICAL

**SEC-01: CORS mở toàn cầu**
- **Mô tả:** `main.ts` cấu hình `enableCors({ origin: '*' })` — cho phép mọi domain gọi API
- **Tác động:** Cross-origin attacks; unauthorized API access từ bất kỳ website nào
- **Vị trí:** `apps/api/src/main.ts`
- **Fix:** Restrict đến domain cụ thể trong production (`origin: ['https://yourdomain.com']`)

**SEC-02: Secret keys hardcoded trong ecosystem.config.js**
- **Mô tả:** File PM2 config chứa credentials:
  - `APP_SECRET: dev_secret_key_2026` (JWT signing key)
  - `POSTGRES_PASSWORD: commerce_pass_2026`
  - `REDIS_PASSWORD: redis_pass_2026`
- **Tác động:** Bất kỳ ai đọc được source code (GitHub repo bị expose, collaborators) đều biết production credentials
- **Vị trí:** `ecosystem.config.js` (file đang trong git: `M  ecosystem.config.js`)
- **Fix:** Dùng `.env` file không commit; PM2 env interpolation từ shell env

**SEC-03: JWT token lưu trong localStorage**
- **Mô tả:** Frontend `lib/auth.tsx` lưu JWT token trong localStorage
- **Tác động:** Bất kỳ XSS nào sẽ đánh cắp được JWT token → full account takeover
- **Vị trí:** `apps/web/src/lib/auth.tsx`
- **Fix:** Dùng HTTP-only cookie; hoặc ít nhất sessionStorage thay localStorage

**SEC-04: Không có rate limiting**
- **Mô tả:** Không tìm thấy `@nestjs/throttler` hoặc any rate limiting middleware
- **Tác động:** Brute force attacks trên `/api/auth/login`; DoS attacks; credential stuffing
- **Vị trí:** `apps/api/src/`
- **Fix:** Thêm `@nestjs/throttler` với limit trên auth endpoints

---

### HIGH

**SEC-05: Webhook secret validation chưa xác nhận**
- **Mô tả:** `WEBHOOK_SECRET` có trong env nhưng chưa xác nhận được dùng để validate incoming webhooks từ Shopee/Lazada/TikTok
- **Tác động:** Fake webhook injection → fake orders, payments
- **Vị trí:** `apps/api/src/modules/marketplace/`

**SEC-06: Input sanitization không rõ ràng**
- **Mô tả:** GlobalValidationPipe có whitelist/transform nhưng không có sanitization cho HTML/script injection
- **Tác động:** Stored XSS qua product descriptions, content fields
- **Vị trí:** `apps/api/src/main.ts`
- **Fix:** Dùng `sanitize-html` hoặc `DOMPurify` trước khi lưu content fields

**SEC-07: WebSocket authentication mơ hồ**
- **Mô tả:** Socket.io gateway tồn tại nhưng chưa xác nhận auth mechanism cho WS connections
- **Tác động:** Unauthorized real-time access
- **Vị trí:** `apps/api/src/modules/gateway/`

**SEC-08: Marketplace API credentials trong plain env**
- **Mô tả:** Shopee/Lazada/TikTok secrets, Facebook access tokens trong `.env` file
- **Tác động:** Token leak = loss of marketplace access, potential abuse
- **Fix:** Xem xét secrets manager (Vault, AWS Secrets Manager) cho production

---

### MEDIUM

**SEC-09: AI Board tự động hóa quyết định kinh doanh**
- **Mô tả:** `ai-board` module có thể ra quyết định chiến lược tự động không có human approval
- **Tác động:** AI quyết định sai → business losses
- **Fix:** Thêm approval workflow cho high-impact decisions

**SEC-10: self-improvement module có thể thay đổi behavior AI**
- **Mô tả:** Module này tự học và điều chỉnh agent behavior — chưa có audit trail rõ ràng
- **Tác động:** Unexpected AI behavior changes in production
- **File đang modified:** `apps/api/src/modules/self-improvement/self-improvement.service.ts`

---

## Performance Risks

### HIGH

**PERF-01: Không có database migration files**
- **Mô tả:** `synchronize: true` trong development; không có migration files
- **Tác động:** Production schema changes nguy hiểm (auto-sync có thể drop columns)
- **Vị trí:** Database config
- **Fix:** Disable synchronize, tạo TypeORM migration files

**PERF-02: Analytics queries chưa có aggregation cache**
- **Mô tả:** Analytics module query trực tiếp vào các entity tables (Orders, Products, Customers)
- **Tác động:** Slow query khi data lớn; full table scans tiềm ẩn
- **Fix:** Materialized views hoặc Redis cache cho aggregate queries

**PERF-03: 26 AI agents chạy parallel trên 1 instance**
- **Mô tả:** Tất cả agents dùng chung 1 NestJS process; agents gọi external AI APIs (OpenRouter, Ollama)
- **Tác động:** High memory usage; API latency tích lũy; single process bottleneck
- **Vị trí:** PM2 config: `instances: 1, max_memory_restart: '512M'`
- **Fix:** Tách agents sang worker processes; Bull queue với dedicated workers

**PERF-04: Video processing CPU-intensive trên main thread**
- **Mô tả:** `agents/video` tạo video — tiềm ẩn blocking operations
- **Tác động:** API latency spike khi video generation chạy
- **Fix:** Bull queue với dedicated worker process

---

### MEDIUM

**PERF-05: Memory limit 512MB cho toàn bộ hệ thống**
- **Mô tả:** PM2 `max_memory_restart: '512M'` — thấp cho hệ thống 26 agents + NestJS
- **Tác động:** Frequent process restarts; service interruptions

**PERF-06: AI memory không có TTL/cleanup**
- **Mô tả:** AiMemory entity tích lũy không giới hạn
- **Tác động:** Database bloat; slow queries trên memory lookups theo thời gian

**PERF-07: Qdrant collections management**
- **Mô tả:** Chưa rõ vector collections được quản lý như thế nào (indexing strategy, collection size)
- **Tác động:** RAG latency tăng khi vector DB lớn

---

## Scalability Risks

### HIGH

**SCALE-01: Single instance deployment**
- **Mô tả:** PM2 `instances: 1` — không horizontal scaling
- **Tác động:** Không có high availability; single point of failure
- **Fix:** Load balancer + multiple instances; hoặc chuyển sang Kubernetes

**SCALE-02: Local Ollama không scale**
- **Mô tả:** Ollama chạy local trên server — single GPU/CPU
- **Tác động:** AI throughput bị giới hạn bởi hardware; không scale horizontally
- **Fix:** Multiple Ollama instances hoặc chuyển sang cloud AI (OpenRouter đã có)

**SCALE-03: Không có database connection pooling rõ ràng**
- **Mô tả:** TypeORM default connection pool; không có PgBouncer
- **Tác động:** Connection exhaustion dưới high load

---

### MEDIUM

**SCALE-04: Bull queue trên single Redis instance**
- **Mô tả:** Job queue dùng single Redis — no clustering configured
- **Tác động:** Redis failure = entire job queue failure

**SCALE-05: MinIO single instance**
- **Mô tả:** Single MinIO instance không có distributed mode
- **Tác động:** Storage single point of failure; không có replication

**SCALE-06: Multi-tenancy disabled**
- **Mô tả:** `ENABLE_MULTI_TENANT=false` — infrastructure có nhưng chưa production-ready
- **Tác động:** Không thể onboard multiple tenants ngay

---

## Reliability Risks

### HIGH

**REL-01: Không có database migrations**
- **Mô tả:** Schema thay đổi không có migration history → rollback không thể
- **Tác động:** Irreversible schema changes; data corruption tiềm ẩn
- **Fix:** TypeORM migration files + migration CI/CD step

**REL-02: No graceful shutdown**
- **Mô tả:** Không có SIGTERM handler trong `main.ts`; PM2 hard restart
- **Tác động:** In-flight requests bị drop khi deploy; database connections bị orphaned
- **Fix:** `app.enableShutdownHooks()` trong NestJS

**REL-03: External API dependencies không có fallback**
- **Mô tả:** OpenRouter, Shopee/Lazada/TikTok APIs — không có circuit breaker hoặc fallback
- **Tác động:** Một API down → toàn bộ agent liên quan fail

**REL-04: AI agent failures không isolated**
- **Mô tả:** Agents chạy chung process — 1 agent crash có thể ảnh hưởng agents khác
- **Tác động:** Cascading failure trong agent system

---

### MEDIUM

**REL-05: No structured logging**
- **Mô tả:** Chưa thấy Pino/Winston configured — có thể dùng `console.log`
- **Tác động:** Log parsing khó; debug production issues chậm
- **Fix:** Pino (NestJS recommended) với JSON output → Loki

**REL-06: Health check chỉ tại `/health`**
- **Mô tả:** CI/CD health check chỉ check HTTP 200 tại `/health`; không check DB, Redis, Qdrant
- **Tác động:** Deploy "success" ngay cả khi DB connection fail

**REL-07: Backup chỉ manual**
- **Mô tả:** `make backup` command có sẵn nhưng không automated
- **Tác động:** Data loss nếu không run backup thường xuyên

---

## Maintainability Risks

### HIGH

**MAINT-01: 33 modules trong 1 NestJS app**
- **Mô tả:** Tất cả modules trong `app.module.ts` — monolithic imports
- **Tác động:** Build time tăng; khó test individual modules; coupling risk

**MAINT-02: Agent versioning không nhất quán**
- **Mô tả:** v1→v5 agents tồn tại song song; v2 `agents/knowledge` bị override bởi v3
- **Tác động:** Không rõ version nào đang dùng; dead code risk

**MAINT-03: Không có API versioning**
- **Mô tả:** API không có versioning (`/api/v1/...`)
- **Tác động:** Breaking changes ảnh hưởng frontend/clients ngay lập tức

**MAINT-04: TypeScript strict mode chưa xác nhận**
- **Mô tả:** Chưa verify tsconfig strict settings
- **Tác động:** Runtime type errors tiềm ẩn

---

### MEDIUM

**MAINT-05: Không có test files**
- **Mô tả:** Jest configured nhưng không thấy test files trong audit
- **Tác động:** Regression bugs không detected; refactoring rủi ro cao

**MAINT-06: codebackup/ folder trong repo**
- **Mô tả:** `/codebackup/` chứa legacy/backup code
- **Tác động:** Confusion về active code; repo size tăng

**MAINT-07: Frontend không có error boundaries**
- **Mô tả:** Next.js app không thấy error.tsx/global error handling
- **Tác động:** Unhandled React errors crash toàn page

**MAINT-08: Frontend thiếu loading states rõ ràng**
- **Mô tả:** API calls trong frontend chưa rõ có loading/error states không
- **Tác động:** UX xấu; silent failures

---

*Audit conducted: 2026-06-11 | Version: Foundation Audit V1*
