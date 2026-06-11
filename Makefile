.PHONY: up down logs build restart ps install dev

# Khởi động toàn bộ stack
up:
	docker compose up -d

# Dừng tất cả
down:
	docker compose down

# Xem logs
logs:
	docker compose logs -f --tail=100

# Log của từng service
logs-api:
	docker compose logs -f api

logs-db:
	docker compose logs -f postgres

# Build lại API
build:
	docker compose build api

# Khởi động lại API
restart-api:
	docker compose restart api

# Xem trạng thái
ps:
	docker compose ps

# Cài dependencies (chạy lần đầu)
install:
	cd apps/api && npm install

# Chạy dev mode (không dùng Docker)
dev:
	cd apps/api && npm run start:dev

# Khởi động infra (postgres, redis, minio, n8n, ollama) nhưng không chạy api
infra:
	docker compose up -d postgres redis minio n8n ollama open-webui

# Pull model Ollama
pull-model:
	docker exec commerce_ollama ollama pull qwen2.5:7b

# Vào psql
psql:
	docker exec -it commerce_postgres psql -U commerce_user -d ai_commerce

# Reset database (cẩn thận!)
db-reset:
	docker compose down -v
	docker compose up -d postgres
	sleep 5

# Xem agent logs
agent-logs:
	docker exec -it commerce_postgres psql -U commerce_user -d ai_commerce -c "SELECT agent, status, duration_ms, created_at FROM agent_logs ORDER BY created_at DESC LIMIT 20;"

# --- V3 Commands ---

# Monitoring stack
monitoring:
	docker compose up -d prometheus grafana loki uptime-kuma

# Qdrant vector DB
qdrant:
	docker compose up -d qdrant

# Full V3 stack (tất cả services)
up-v3:
	docker compose up -d

# Kiểm tra health tất cả services
health:
	@echo "=== Service Health ==="
	@docker compose ps --format "table {{.Name}}\t{{.Status}}"

# Xem KPI dashboard (API endpoint)
kpi:
	@curl -s http://localhost:3001/api/agents/master/kpi | python3 -m json.tool 2>/dev/null || echo "API chưa khởi động"

# Chạy tất cả agents thủ công
run-agents:
	@curl -s -X POST http://localhost:3001/api/agents/trend/run > /dev/null && echo "Trend Agent: OK"
	@curl -s -X POST http://localhost:3001/api/agents/affiliate/run > /dev/null && echo "Affiliate Agent: OK"
	@curl -s -X POST http://localhost:3001/api/agents/content/run > /dev/null && echo "Content Agent: OK"
	@curl -s -X POST http://localhost:3001/api/agents/publisher/run > /dev/null && echo "Publisher Agent: OK"
	@curl -s -X POST http://localhost:3001/api/agents/crm/run > /dev/null && echo "CRM Agent: OK"
	@curl -s -X POST http://localhost:3001/api/agents/knowledge/sync > /dev/null && echo "Knowledge Agent: OK"

# Backup database
backup:
	@mkdir -p backups
	@docker exec commerce_postgres pg_dump -U commerce_user ai_commerce | gzip > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup xong: backups/"

# Xem Swagger docs
docs:
	@echo "Swagger UI: http://localhost:3001/api/docs"
	@xdg-open http://localhost:3001/api/docs 2>/dev/null || true
