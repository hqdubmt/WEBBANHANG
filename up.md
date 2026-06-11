# UPGRADE_RULES.md

## MỤC TIÊU

Nâng cấp AI Social Commerce OS theo từng phiên bản.

Yêu cầu bắt buộc:

* Không phá vỡ API cũ
* Không đổi database schema hiện có nếu không có migration
* Không đổi URL frontend hiện có
* Không đổi tên module hiện có
* Không xóa tính năng đã hoạt động
* Mọi nâng cấp phải tương thích ngược (Backward Compatible)

---

# KIẾN TRÚC BẤT BIẾN

Các module sau được xem là CORE.

KHÔNG ĐƯỢC ĐỔI TÊN.

apps/api

apps/web

modules/auth

modules/users

modules/products

modules/orders

modules/customers

modules/leads

modules/payments

modules/categories

modules/brands

modules/inventory

modules/campaigns

modules/analytics

modules/agents

modules/rag

modules/ai-memory

modules/content-factory

modules/affiliate

---

# API COMPATIBILITY

Không được sửa:

POST /api/auth/login

POST /api/auth/register

GET /api/auth/me

GET /api/products

POST /api/products

GET /api/orders

POST /api/orders

GET /api/customers

POST /api/customers

GET /api/leads

POST /api/leads

Nếu cần nâng cấp:

Tạo endpoint mới.

Ví dụ:

/api/products

↓

/api/v2/products/search

Không sửa endpoint cũ.

---

# DATABASE COMPATIBILITY

Không được:

DROP TABLE

RENAME TABLE

RENAME COLUMN

Xóa dữ liệu

Chỉ được:

ADD COLUMN

ADD TABLE

CREATE INDEX

CREATE VIEW

CREATE MATERIALIZED VIEW

Mọi thay đổi phải có migration.

Ví dụ:

Migration_20260611_AddAffiliateScore

Migration_20260612_AddVideoCampaigns

---

# FRONTEND COMPATIBILITY

Không đổi route:

/products

/orders

/customers

/leads

/analytics

/agents

Nếu cần thêm:

/products/insights

/orders/forecast

/analytics/ai

Không được đổi route cũ.

---

# VERSIONING

## V1

Core Commerce

Auth

RBAC

Products

Orders

Customers

Inventory

Analytics

---

## V2

Affiliate Engine

RAG

AI Sales

Content Factory

Lead Hunter

Telegram

---

## V3

Video Factory

SEO Engine

Trend Predictor

Executive AI

Price Intelligence

Customer Segmentation

---

## V4

Marketplace

Supplier Portal

Dropship Portal

Affiliate Portal

---

## V5

Multi Tenant SaaS

Workspace

Organization

Billing

Subscription

---

## V6

AI Livestream

AI Call Center

Voice Agent

Realtime Sales Agent

---

# AI AGENT EXPANSION RULE

Agent mới phải thêm.

Không sửa Agent cũ.

Ví dụ:

Agent01 TrendHunter

Agent02 AffiliateHunter

...

Agent16 ExecutiveAI

Thêm mới:

Agent17 VideoOptimizer

Agent18 CompetitorMonitor

Agent19 DemandForecaster

Agent20 RepricingAgent

---

# DATABASE EXTENSION RULE

Nếu cần thêm tính năng:

Tạo bảng mới.

Ví dụ:

video_campaigns

affiliate_clicks

affiliate_conversions

competitor_prices

customer_segments

voice_calls

livestream_sessions

Không sửa bảng cũ nếu không cần.

---

# FEATURE FLAG SYSTEM

Mọi tính năng mới phải bật/tắt được.

Ví dụ:

FEATURE_AI_SALES=true

FEATURE_VIDEO_FACTORY=false

FEATURE_CALL_CENTER=false

FEATURE_MULTI_TENANT=false

---

# DEPLOYMENT RULE

Không được sửa:

Docker service name

postgres

redis

qdrant

minio

api

web

Nếu thêm:

video-worker

voice-worker

analytics-worker

---

# CLAUDE CODE RULES

Trước khi code:

1. Đọc MASTER_ARCHITECTURE.md
2. Đọc DATABASE_SCHEMA.md
3. Đọc API_SPEC.md
4. Đọc UPGRADE_RULES.md

Không được tự ý:

* đổi tên file
* đổi tên module
* đổi endpoint
* đổi database schema

Mọi thay đổi phải:

* migration
* backward compatible
* có test

---

# UPGRADE PATH

V1
↓
V2 Affiliate + AI Chat
↓
V3 Content + Video
↓
V4 Marketplace
↓
V5 SaaS
↓
V6 AI Commerce OS

END
