# technical_debt_report.md
**AI Social Commerce OS — Foundation Audit V1**
**Date:** 2026-06-11

---

## Duplicate Code

### DUP-01: Agent structure lặp lại ở mọi agent module
**Mô tả:** 26 agent modules đều có cùng pattern: service + module + cron job. Mỗi agent tự implement agent execution loop thay vì kế thừa từ base class.
**Tác động:** Bug fix phải apply 26 lần; inconsistent behavior giữa agents.
**Vị trí:** `apps/api/src/modules/agents/*/`
**Giải pháp:** Abstract `BaseAgentService` với template method pattern.

---

### DUP-02: API client methods lặp lại ở frontend
**Mô tả:** `lib/api.ts` có pattern `list, get, create, update, delete` lặp lại cho mỗi entity (products, orders, customers, leads, categories, brands...).
**Tác động:** Code nhiều; mỗi entity phải copy-paste endpoints.
**Vị trí:** `apps/web/src/lib/api.ts`
**Giải pháp:** Generic CRUD factory `createResourceApi<T>(basePath)`.

---

### DUP-03: Entity base fields lặp lại (id, createdAt, updatedAt)
**Mô tả:** Mỗi entity tự khai báo `@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn` thay vì extend `BaseEntity`.
**Tác động:** Inconsistent timestamp handling; extra boilerplate.
**Vị trí:** `apps/api/src/database/entities/*.ts`

---

### DUP-04: Affiliate module phân tách không rõ ràng
**Mô tả:** Có cả `affiliate-intelligence` và `affiliate-portal` — chồng chéo functionality với `agents/affiliate`.
**Tác động:** Không rõ module nào là source of truth cho affiliate logic.
**Vị trí:** `apps/api/src/modules/affiliate-intelligence/`, `affiliate-portal/`, `agents/affiliate/`

---

## Dead Code

### DEAD-01: codebackup/ directory
**Mô tả:** `/codebackup/rclone/` và các file backup tồn tại trong repo.
**Tác động:** Tăng repo size; gây nhầm lẫn về active code.
**Vị trí:** `/home/hqdu/quangdu/webbanhang/codebackup/`
**Giải pháp:** Remove hoàn toàn, dùng git history nếu cần recover.

---

### DEAD-02: SYSTEM-WORKFLOW.md đã bị xóa nhưng vẫn trong git staging
**Mô tả:** `git status` cho thấy ` D SYSTEM-WORKFLOW.md` — file đã staged delete.
**Tác động:** Confusion về documentation state.
**Vị trí:** Root directory

---

### DEAD-03: agents/knowledge tồn tại ở cả v2 và v3
**Mô tả:** `agents/knowledge` xuất hiện trong cả v2 (merged) và v3 agents list.
**Tác động:** Không rõ version nào active; code version nào đang được dùng.
**Vị trí:** `apps/api/src/modules/agents/knowledge/`

---

### DEAD-04: Open WebUI service có thể unused
**Mô tả:** `open-webui` service trong docker-compose cho phép manual LLM management — nhưng trong production workflow, Ollama được gọi programmatically qua API.
**Tác động:** Extra service chạy không cần thiết trong production.
**Vị trí:** `docker-compose.yml` service `open-webui`

---

### DEAD-05: start-api.sh / start-web.sh scripts
**Mô tả:** Scripts `start-api.sh` và `start-web.sh` tồn tại bên cạnh PM2 ecosystem.config.js và Makefile — không rõ scripts này còn được dùng không.
**Tác động:** Multiple deployment methods → confusion.
**Vị trí:** Root directory

---

## Unused Modules

### UNUSED-01: Multi-tenancy infrastructure không active
**Mô tả:** `Tenant` entity, `enterprise` module, `white-label` module đã built nhưng `ENABLE_MULTI_TENANT=false`.
**Tác động:** Code complexity không mang lại value; testing overhead.
**Vị trí:** `apps/api/src/modules/enterprise/`, `white-label/`, `Tenant entity`
**Trạng thái:** Infrastructure sẵn sàng nhưng chưa enable.

---

### UNUSED-02: Mobile module deployment chưa rõ
**Mô tả:** `mobile` module + `MobileSession` entity + `agents/mobile-engagement` tồn tại nhưng không thấy mobile app trong repo.
**Tác động:** Backend code cho client chưa tồn tại.
**Vị trí:** `apps/api/src/modules/mobile/`

---

### UNUSED-03: Livestream feature
**Mô tả:** `LIVESTREAM_PLATFORM` và `LIVESTREAM_STREAM_KEY` trong `.env.example` nhưng không thấy livestream module trong modules list.
**Tác động:** Feature được plan nhưng chưa implement; dead env variables.

---

### UNUSED-04: Các env variables không có module tương ứng
**Mô tả:**
- `FCM_SERVER_KEY` / `APNS_KEY_ID` / `APNS_TEAM_ID` — push notifications (mobile chưa có)
- `BACKUP_S3_BUCKET` / `BACKUP_RETENTION_DAYS` — automated backup chưa implement
- `KOKORO_URL` — TTS alternative (chưa rõ có module nào dùng)
**Tác động:** False sense of feature completeness.

---

## Weak Architecture Points

### ARCH-01: Database auto-synchronize = production risk
**Mô tả:** TypeORM `synchronize: true` trong dev mode. Không có migration files. Production chỉ có `synchronize: false` nhưng không có migration runner trong CI/CD.
**Impact:** CRITICAL — schema change không có rollback path; potential data loss.
**Vị trí:** Database configuration module

---

### ARCH-02: Monolithic NestJS với 33 modules
**Mô tả:** Toàn bộ 33 modules load trong 1 NestJS app → large startup time; mọi module trong 1 process.
**Impact:** Không thể scale individual modules; memory pressure; coupling.
**Giải pháp tiềm năng:** Module federation hoặc micro-services cho high-load agents.

---

### ARCH-03: Agent orchestration thiếu observability
**Mô tả:** `agents/master` điều phối 26 agents nhưng không có distributed tracing (OpenTelemetry) để track agent execution chains.
**Impact:** Khi agent chain fail, khó debug nguyên nhân gốc.
**Vị trí:** `apps/api/src/modules/agents/master/`

---

### ARCH-04: No event sourcing / audit trail
**Mô tả:** Business-critical operations (order creation, price changes, affiliate conversions) không có audit log entity.
**Impact:** Không traceable history; compliance issues; debugging production issues khó.
**Có sẵn:** `AgentLog` entity cho agents, nhưng không có tương đương cho business operations.

---

### ARCH-05: Frontend không có global state management
**Mô tả:** Next.js app không dùng Redux/Zustand/Jotai — chỉ có React useState/Context.
**Impact:** Khi app scale thêm features, prop drilling và context re-render sẽ là vấn đề.
**Vị trí:** `apps/web/src/`

---

### ARCH-06: Không có API versioning
**Mô tả:** Tất cả routes dùng `/api/*` không có version prefix.
**Impact:** Breaking changes không có migration period; frontend và backend phải deploy đồng thời.
**Fix:** `/api/v1/*` prefix với version header support.

---

### ARCH-07: Port configuration inconsistency
**Mô tả:**
- Docker Compose: API port `3001`
- PM2 ecosystem: API port `3002`
- Next.js next.config.ts: proxy đến port `3002` (ecosystem) nhưng API_HOST default `localhost:3002`
- nginx.conf: proxy đến `api:3001` (Docker)
**Impact:** Port mismatch khi switch giữa Docker và PM2 deployment modes; potential 502 errors.

---

### ARCH-08: Không có circuit breaker cho external services
**Mô tả:** Calls đến Shopee/Lazada/TikTok/OpenRouter/Ollama không có circuit breaker pattern.
**Impact:** Cascading failures; all agents stop working nếu 1 external service slow.
**Fix:** `nestjs-opossum` hoặc implement circuit breaker pattern với Bull queue retry.

---

### ARCH-09: Knowledge Brain và RAG module overlap
**Mô tả:** Cả `rag` module và `knowledge-brain` module đều handle RAG pipeline.
**Impact:** Không rõ single source of truth; potential dual writes to Qdrant.
**Vị trí:** `apps/api/src/modules/rag/`, `apps/api/src/modules/knowledge-brain/`

---

### ARCH-10: Self-improvement loop không có safety guardrails
**Mô tả:** Module `self-improvement` có thể thay đổi agent configurations dựa trên AI decisions. Không có confirmation step hoặc rollback mechanism.
**Impact:** AI tự thay đổi system behavior trong production mà không có human review.
**Vị trí:** `apps/api/src/modules/self-improvement/self-improvement.service.ts` (đang modified)

---

## Summary

| Category | Count | Priority |
|----------|-------|---------|
| Duplicate Code | 4 items | Medium |
| Dead Code | 5 items | Low-Medium |
| Unused Modules | 4 items | Medium |
| Weak Architecture | 10 items | High-Critical |

**Top 3 khoản nợ kỹ thuật cần giải quyết ngay:**
1. **ARCH-01** — Database migrations (CRITICAL — data loss risk)
2. **ARCH-07** — Port inconsistency (HIGH — deployment failures)
3. **ARCH-03** — Agent observability (HIGH — production debugging)

---

*Audit conducted: 2026-06-11 | Version: Foundation Audit V1*
