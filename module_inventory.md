# module_inventory.md
**AI Social Commerce OS — Foundation Audit V1**
**Date:** 2026-06-11

---

## Backend Modules — NestJS API

### 1. auth
| | |
|-|-|
| **Mục đích** | Xác thực người dùng (JWT), phân quyền RBAC |
| **Trạng thái** | Active — Core module |
| **Dependencies** | users, @nestjs/jwt, crypto |
| **Features** | Login, Register, Refresh token, Guards, Decorators (@Public, @Roles) |
| **Rủi ro** | CORS `origin: '*'` mở toàn cầu; không có rate limiting login |

---

### 2. users
| | |
|-|-|
| **Mục đích** | Quản lý người dùng hệ thống |
| **Trạng thái** | Active |
| **Dependencies** | auth, typeorm, User entity |
| **Features** | CRUD users, role assignment |
| **Rủi ro** | Thấp |

---

### 3. products
| | |
|-|-|
| **Mục đích** | Quản lý catalog sản phẩm |
| **Trạng thái** | Active — Core CRUD |
| **Dependencies** | typeorm, Product entity, categories, brands |
| **Features** | CRUD, DTO validation, quan hệ category/brand |
| **Rủi ro** | Không có pagination mặc định (chưa xác nhận) |

---

### 4. customers
| | |
|-|-|
| **Mục đích** | Quản lý hồ sơ khách hàng, CRM cơ bản |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Customer entity |
| **Features** | CRUD, profile management |
| **Rủi ro** | Thấp |

---

### 5. orders
| | |
|-|-|
| **Mục đích** | Xử lý đơn hàng, order items |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Order/OrderItem entities, inventory, payments |
| **Features** | CRUD, revenue endpoint, order status |
| **Rủi ro** | Không có distributed transaction; inventory update không atomic rõ ràng |

---

### 6. leads
| | |
|-|-|
| **Mục đích** | Quản lý lead bán hàng (sales funnel) |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Lead entity |
| **Features** | CRUD leads, status tracking |
| **Rủi ro** | Thấp |

---

### 7. categories
| | |
|-|-|
| **Mục đích** | Danh mục sản phẩm |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Category entity |
| **Features** | CRUD, hierarchical (nếu có) |
| **Rủi ro** | Thấp |

---

### 8. brands
| | |
|-|-|
| **Mục đích** | Quản lý thương hiệu |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Brand entity |
| **Features** | CRUD brands |
| **Rủi ro** | Thấp |

---

### 9. inventory
| | |
|-|-|
| **Mục đích** | Quản lý tồn kho |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Inventory entity |
| **Features** | Stock tracking, alerts |
| **Rủi ro** | Chưa rõ có optimistic locking không — race condition khi update stock đồng thời |

---

### 10. suppliers
| | |
|-|-|
| **Mục đích** | Quản lý nhà cung cấp |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Supplier/SupplierProduct entities |
| **Features** | CRUD suppliers, supplier products |
| **Rủi ro** | Thấp |

---

### 11. payments
| | |
|-|-|
| **Mục đích** | Xử lý thanh toán |
| **Trạng thái** | Active — Cần review kỹ |
| **Dependencies** | typeorm, Payment entity |
| **Features** | Payment records, status |
| **Rủi ro** | Không rõ có webhook validation từ payment gateway không; không có payment idempotency rõ ràng |

---

### 12. campaigns
| | |
|-|-|
| **Mục đích** | Quản lý chiến dịch marketing |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, Campaign entity |
| **Features** | CRUD campaigns, scheduling |
| **Rủi ro** | Thấp |

---

### 13. marketplace
| | |
|-|-|
| **Mục đích** | Tích hợp Shopee, Lazada, TikTok Shop |
| **Trạng thái** | Active — External API dependent |
| **Dependencies** | axios, marketplace credentials |
| **Features** | Product sync, order sync, API wrappers |
| **Rủi ro** | API keys trong env; không có retry/fallback rõ ràng; rate limits của sàn |

---

### 14. analytics
| | |
|-|-|
| **Mục đích** | Business metrics và reporting |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, multiple entities |
| **Features** | KPI reporting, charts data |
| **Rủi ro** | Có thể gây slow query trên data lớn nếu không có aggregation cache |

---

### 15. ai
| | |
|-|-|
| **Mục đích** | Generic AI integration module |
| **Trạng thái** | Active — Utility |
| **Dependencies** | axios, OpenRouter/OpenAI APIs |
| **Features** | AI completion wrapper |
| **Rủi ro** | API cost không controlled; không có fallback nếu AI service down |

---

### 16. rag
| | |
|-|-|
| **Mục đích** | Retrieval-Augmented Generation pipeline |
| **Trạng thái** | Active — Core AI |
| **Dependencies** | Qdrant, Ollama, knowledge entities |
| **Features** | Document ingestion, embedding, semantic search |
| **Rủi ro** | Ollama service down = RAG fail; embedding quality phụ thuộc model |

---

### 17. knowledge-brain
| | |
|-|-|
| **Mục đích** | Knowledge base tập trung, tích hợp RAG |
| **Trạng thái** | Active — Modified recently (git status: M) |
| **Dependencies** | rag, Qdrant, typeorm |
| **Features** | Knowledge storage, retrieval, update cycle |
| **Rủi ro** | File đã bị modify — cần verify trạng thái sau commit mới nhất |

---

### 18. ai-memory
| | |
|-|-|
| **Mục đích** | Lưu trữ context AI giữa các phiên làm việc |
| **Trạng thái** | Active |
| **Dependencies** | typeorm, AiMemory entity |
| **Features** | Context persistence, agent memory |
| **Rủi ro** | Memory bloat nếu không có TTL/cleanup policy |

---

### 19. ai-board
| | |
|-|-|
| **Mục đích** | AI Board of Directors — ra quyết định chiến lược tự động |
| **Trạng thái** | Active — V6 feature |
| **Dependencies** | ai, knowledge-brain, self-improvement |
| **Features** | Strategic decisions, board meetings automation |
| **Rủi ro** | Cao — tự động hóa quyết định kinh doanh mà không có human approval |

---

### 20. self-improvement
| | |
|-|-|
| **Mục đích** | Learning loops — hệ thống tự cải thiện từ kết quả |
| **Trạng thái** | Active — Modified recently (git status: M) |
| **Dependencies** | ai, typeorm (LearningCycle, LessonLearned, DecisionMemory, Experiment, PerformanceScorecard) |
| **Features** | Experiment tracking, lesson learning, performance scoring |
| **Rủi ro** | File đã bị modify — cần verify. Rủi ro: AI tự thay đổi behavior mà không có kiểm soát |

---

### 21. agents/trend (v1)
| | |
|-|-|
| **Mục đích** | Phân tích xu hướng thị trường |
| **Trạng thái** | Active |
| **Dependencies** | ai, marketplace, external data |
| **Rủi ro** | Data freshness; external API dependency |

---

### 22. agents/affiliate (v1)
| | |
|-|-|
| **Mục đích** | Tự động hóa affiliate marketing |
| **Trạng thái** | Active |
| **Dependencies** | affiliate entities, campaigns |
| **Rủi ro** | Commission calculation accuracy |

---

### 23. agents/content (v1)
| | |
|-|-|
| **Mục đích** | Tạo nội dung tự động (text, captions) |
| **Trạng thái** | Active |
| **Dependencies** | ai, content-factory, OpenRouter |
| **Rủi ro** | Nội dung AI không qua review; inappropriate content risk |

---

### 24. agents/sales (v1)
| | |
|-|-|
| **Mục đích** | Tự động hóa quy trình bán hàng |
| **Trạng thái** | Active |
| **Dependencies** | leads, customers, ai |
| **Rủi ro** | Automated sales actions without human review |

---

### 25. agents/master (v2)
| | |
|-|-|
| **Mục đích** | Điều phối tất cả agents |
| **Trạng thái** | Active — Orchestrator |
| **Dependencies** | Tất cả agents khác |
| **Rủi ro** | Single point of failure cho toàn bộ AI system |

---

### 26. agents/video (v2)
| | |
|-|-|
| **Mục đích** | Tạo video content tự động |
| **Trạng thái** | Active |
| **Dependencies** | TTS (OpenAI/Kokoro), MinIO, VideoJob entity |
| **Rủi ro** | Disk usage; TTS API cost; video processing CPU-intensive |

---

### 27. agents/seo (v2)
| | |
|-|-|
| **Mục đích** | Tối ưu SEO cho sản phẩm và nội dung |
| **Trạng thái** | Active |
| **Dependencies** | ai, products, SeoArticle entity |
| **Rủi ro** | AI-generated SEO content có thể bị Google penalize |

---

### 28. agents/price (v2)
| | |
|-|-|
| **Mục đích** | Định giá động dựa trên thị trường |
| **Trạng thái** | Active |
| **Dependencies** | products, marketplace, PriceAlert entity |
| **Features** | Price drop threshold: 5% |
| **Rủi ro** | Tự động thay đổi giá — cần safeguards về min/max price |

---

### 29. agents/email (v2)
| | |
|-|-|
| **Mục đích** | Email marketing tự động |
| **Trạng thái** | Active |
| **Dependencies** | nodemailer, SMTP, EmailCampaign entity, customers |
| **Rủi ro** | Spam risk; GDPR compliance; email deliverability |

---

### 30. agents/telegram (v2)
| | |
|-|-|
| **Mục đích** | Marketing qua Telegram channel |
| **Trạang thái** | Active |
| **Dependencies** | Telegram Bot API, axios |
| **Rủi ro** | Bot token exposure; spam |

---

### 31. agents/publisher (v3)
| | |
|-|-|
| **Mục đích** | Xuất bản nội dung lên nhiều nền tảng cùng lúc |
| **Trạng thái** | Active |
| **Dependencies** | Facebook API, Telegram, marketplace APIs |
| **Rủi ro** | Token expiry; platform rate limits; content moderation risk |

---

### 32. agents/lead-hunter (v3)
| | |
|-|-|
| **Mục đích** | Tìm kiếm và qualify leads tự động |
| **Trạng thái** | Active |
| **Dependencies** | leads, ai, external data sources |
| **Rủi ro** | Data privacy; scraping có thể vi phạm ToS |

---

### 33. agents/crm (v3)
| | |
|-|-|
| **Mục đích** | CRM automation — follow-up, nurturing tự động |
| **Trạng thái** | Active |
| **Dependencies** | customers, leads, email, ai |
| **Rủi ro** | Automated outreach cần human oversight |

---

### 34. agents/video-optimizer (v4)
| | |
|-|-|
| **Mục đích** | Tối ưu video cho từng platform |
| **Trạng thái** | Active |
| **Dependencies** | VideoJob entity, MinIO |
| **Rủi ro** | Tài nguyên CPU; storage cost |

---

### 35. agents/competitor-monitor (v4)
| | |
|-|-|
| **Mục đích** | Theo dõi giá và hoạt động của đối thủ |
| **Trạng thái** | Active |
| **Dependencies** | marketplace APIs, external data |
| **Rủi ro** | Scraping ToS violation; data accuracy |

---

### 36. agents/demand-forecaster (v4)
| | |
|-|-|
| **Mục đích** | Dự báo nhu cầu sản phẩm |
| **Trạng thái** | Active |
| **Dependencies** | orders, inventory, ai |
| **Rủi ro** | Forecast accuracy; inventory decisions based on AI predictions |

---

### 37. agents/repricing (v4)
| | |
|-|-|
| **Mục đích** | Tự động định giá lại theo thị trường |
| **Trạng thái** | Active |
| **Dependencies** | products, competitor-monitor, price agent |
| **Rủi ro** | Price war risk; margin erosion |

---

### 38. agents/marketplace-optimizer (v5)
| | |
|-|-|
| **Mục đích** | Tối ưu hóa listing trên sàn TMĐT |
| **Trạng thái** | Active |
| **Dependencies** | marketplace, ai, products |
| **Rủi ro** | Platform ToS về automated optimization |

---

### 39. agents/mobile-engagement (v5)
| | |
|-|-|
| **Mục đích** | Tương tác với mobile users (push notifications) |
| **Trạng thái** | Active |
| **Dependencies** | FCM, APNS, MobileSession entity |
| **Rủi ro** | Push notification fatigue; FCM/APNS key security |

---

### 40. content-factory
| | |
|-|-|
| **Mục đích** | Factory tạo nội dung hàng loạt (text, image captions) |
| **Trạng thái** | Active |
| **Dependencies** | ai, Content entity |
| **Rủi ro** | AI content quality; volume không kiểm soát được |

---

### 41. affiliate-intelligence / affiliate-portal
| | |
|-|-|
| **Mục đích** | Phân tích và quản lý affiliate marketing |
| **Trạng thái** | Active |
| **Dependencies** | AffiliatePartner, AffiliateClick, AffiliateConversion, Commission entities |
| **Rủi ro** | Commission calculation bugs = tài chính sai |

---

### 42. business-os
| | |
|-|-|
| **Mục đích** | Business Operating System — dashboard tổng hợp |
| **Trạng thái** | Active |
| **Dependencies** | analytics, agents, ai-board |
| **Rủi ro** | Thấp |

---

### 43. dropship
| | |
|-|-|
| **Mục đích** | Quản lý dropshipping |
| **Trạng thái** | Active |
| **Dependencies** | DropshipProduct/Order entities, suppliers |
| **Rủi ro** | Supplier reliability; order sync accuracy |

---

### 44. enterprise / white-label
| | |
|-|-|
| **Mục đích** | Enterprise features, white-label solutions |
| **Trạng thái** | Active — Multi-tenancy disabled (ENABLE_MULTI_TENANT=false) |
| **Dependencies** | Tenant entity, WhiteLabelClient entity |
| **Rủi ro** | Multi-tenant isolation chưa tested kỹ |

---

### 45. gateway (WebSocket)
| | |
|-|-|
| **Mục đích** | Real-time events qua Socket.io |
| **Trạng thái** | Active |
| **Dependencies** | socket.io, auth |
| **Rủi ro** | WebSocket auth validation chưa rõ ràng |

---

## Frontend Modules — Next.js

### Pages (App Router)

| Route | Component | Mục đích |
|-------|-----------|----------|
| `/login` | login/page.tsx | Public — login page |
| `/` | (dashboard)/page.tsx | Dashboard home |
| `/agents` | agents/page.tsx | Quản lý AI agents |
| `/ai-board` | ai-board/page.tsx | AI Board |
| `/analytics` | analytics/page.tsx | Analytics & reports |
| `/brands` | brands/page.tsx | Quản lý brands |
| `/business-os` | business-os/page.tsx | Business OS |
| `/campaigns` | campaigns/page.tsx | Marketing campaigns |
| `/categories` | categories/page.tsx | Danh mục |
| `/customers` | customers/page.tsx | Khách hàng |
| `/dropship` | dropship/page.tsx | Dropshipping |
| `/inventory` | inventory/page.tsx | Tồn kho |
| `/knowledge-brain` | knowledge-brain/page.tsx | Knowledge base |
| `/leads` | leads/page.tsx | Leads |
| `/mobile-metrics` | mobile-metrics/page.tsx | Mobile analytics |
| `/orders` | orders/page.tsx | Đơn hàng |
| `/payments` | payments/page.tsx | Thanh toán |
| `/users` | users/page.tsx | Quản lý users |

### Components

| Component | Mục đích | Kích thước |
|-----------|----------|-----------|
| Sidebar.tsx | Navigation sidebar | 5.0KB (complex) |
| DataTable.tsx | Reusable data table | Medium |
| Modal.tsx | Modal dialogs | Small |
| StatCard.tsx | KPI stat cards | Small |
| PageHeader.tsx | Page titles | Small |
| Logo.tsx | Brand logo | Small |

### Libraries (lib/)

| File | Mục đích |
|------|----------|
| api.ts | HTTP client, endpoint wrappers (auth, products, orders, customers, leads, categories, brands, inventory...) |
| auth.tsx | Auth utilities (token management) |

**Rủi ro Frontend:**
- Token lưu trong localStorage (XSS risk)
- Không có state management library → Context hell tiềm ẩn
- Không có UI component library → design inconsistency risk
- Không có chart library được detect → analytics pages có thể dùng plain data

---

## Entity Inventory (Database)

| Entity | Nhóm | Quan hệ chính |
|--------|------|--------------|
| User | Auth | roles, auth |
| Product | Commerce | Category, Brand, Inventory |
| Customer | Commerce | Orders, Leads |
| Order | Commerce | OrderItems, Customer, Payment |
| OrderItem | Commerce | Order, Product |
| Lead | Commerce | Customer |
| Category | Catalog | Products |
| Brand | Catalog | Products |
| Inventory | Warehouse | Product |
| Supplier | Supply | SupplierProduct |
| SupplierProduct | Supply | Supplier, Product |
| Payment | Finance | Order |
| Campaign | Marketing | — |
| AgentLog | AI Ops | — |
| AgentConfig | AI Ops | — |
| AiMemory | AI | — |
| Content | Content | — |
| EmailCampaign | Email | — |
| SeoArticle | SEO | — |
| VideoJob | Video | — |
| PriceAlert | Pricing | Product |
| Workflow | Automation | — |
| Affiliate | Affiliate | — |
| Commission | Affiliate | Affiliate |
| Knowledge | RAG | — |
| DropshipProduct | Dropship | Product |
| DropshipOrder | Dropship | Order |
| AffiliatePartner | Affiliate | — |
| AffiliateClick | Affiliate | AffiliatePartner |
| AffiliateConversion | Affiliate | AffiliateClick |
| Tenant | Multi-tenant | — |
| WhiteLabelClient | Enterprise | Tenant |
| MarketplaceVendor | Marketplace | — |
| MarketplaceDispute | Marketplace | — |
| MobileSession | Mobile | User |
| LearningCycle | Self-Improvement | — |
| LessonLearned | Self-Improvement | LearningCycle |
| DecisionMemory | Self-Improvement | — |
| Experiment | Self-Improvement | — |
| PerformanceScorecard | Self-Improvement | — |

**Tổng:** 43 entities (approximate, based on module analysis)

---

*Audit conducted: 2026-06-11 | Version: Foundation Audit V1*
