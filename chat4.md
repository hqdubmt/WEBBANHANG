
# ORDER_AUTOMATION_ENGINE_V2.md

## VERSION
V2 — Nâng cấp từ V1. Thêm event-driven order pipeline, webhook payment integration, inventory reservation với rollback, real-time order tracking, fraud detection engine, và automated post-order flows.

---

## MISSION

Xây dựng Order Automation Engine V2.

Tự động hóa toàn bộ vòng đời đơn hàng với zero manual touchpoints trong 90% cases.

Giảm order processing time từ giờ xuống phút.

Tăng payment success rate và delivery success rate.

---

## PRIMARY OBJECTIVE

Biến:

Lead (scored, qualified)
↓
Order (validated, created)
↓
Payment (confirmed via webhook)
↓
Fulfillment (inventory reserved → packed)
↓
Delivery (tracking real-time)
↓
Completion (CSAT + repeat purchase trigger)
↓
Repeat Customer (LTV tăng)

thành pipeline sự kiện tự động với audit trail đầy đủ.

---

## IMPLEMENTATION RULES

Phải tận dụng và tích hợp trực tiếp:

1. `SalesAgentService` tại `modules/agents/sales/`
2. `CrmAgentService` tại `modules/agents/crm/`
3. `ChatboxService` V4 tại `modules/chatbox/`
4. `OmnichannelService` V2 tại `modules/omnichannel/`
5. `InventoryService` tại `modules/inventory/`
6. `EventsGateway` tại `modules/gateway/`
7. `Order` entity tại `database/entities/order.entity.ts`
8. `OrderItem` entity tại `database/entities/order-item.entity.ts`
9. `Payment` entity tại `database/entities/payment.entity.ts`
10. `Inventory` entity tại `database/entities/inventory.entity.ts`
11. `Coupon` entity tại `database/entities/coupon.entity.ts`
12. `ProductVariant` entity tại `database/entities/product-variant.entity.ts`
13. `AuditLog` entity tại `database/entities/audit-log.entity.ts`
14. PostgreSQL qua TypeORM với transactions
15. Redis cho order queue và inventory locks

---

## STRICT RULES

KHÔNG thay đổi `Order`, `OrderItem`, `Payment` schema hiện tại (chỉ thêm).

KHÔNG refactor `InventoryService`.

KHÔNG thay đổi API orders/payments hiện tại.

KHÔNG phá workflow hiện tại.

Chỉ mở rộng tương thích ngược.

Mọi order mutation phải trong PostgreSQL transaction.

---

## MODULE CẦN TẠO/MỞ RỘNG

```
modules/order-automation/
├── order-automation.module.ts
├── order-automation.controller.ts
├── pipeline/
│   ├── order-pipeline.service.ts        # Event-driven state machine
│   ├── order-validator.service.ts       # Validation chain
│   └── order-processor.service.ts      # Processing logic
├── payment/
│   ├── payment-orchestrator.service.ts  # Payment routing
│   ├── webhooks/
│   │   ├── vnpay-webhook.handler.ts
│   │   ├── momo-webhook.handler.ts
│   │   ├── zalopay-webhook.handler.ts
│   │   └── cod-webhook.handler.ts
│   └── payment-reconciler.service.ts   # Khớp payment với order
├── inventory/
│   ├── inventory-reservation.service.ts # Reserve/release with rollback
├── fulfillment/
│   ├── fulfillment.service.ts           # Packing + dispatch
│   └── shipping-router.service.ts      # Chọn shipping provider
├── notification/
│   ├── order-notification.service.ts    # Customer notifications
├── fraud/
│   ├── fraud-detector.service.ts       # Fraud scoring
├── refund/
│   ├── refund-engine.service.ts
│   └── return-engine.service.ts
├── analytics/
│   ├── order-analytics.service.ts
└── dto/
    ├── create-order.dto.ts
    ├── update-order-status.dto.ts
    └── refund-request.dto.ts
```

---

## REST API ENDPOINTS

```
POST   /api/orders                           # Tạo đơn hàng
GET    /api/orders                           # List orders
GET    /api/orders/:id                       # Order detail
PATCH  /api/orders/:id/status               # Cập nhật status
POST   /api/orders/:id/confirm              # Xác nhận đơn
POST   /api/orders/:id/cancel               # Hủy đơn
POST   /api/orders/:id/fulfill              # Mark fulfilled
POST   /api/orders/:id/ship                 # Mark shipped (+ tracking)
POST   /api/orders/:id/deliver              # Mark delivered

GET    /api/orders/:id/tracking             # Tracking real-time
GET    /api/orders/:id/timeline             # Full event timeline

POST   /api/orders/:id/refund               # Yêu cầu hoàn tiền
POST   /api/orders/:id/return               # Yêu cầu đổi trả
GET    /api/orders/:id/refund/status        # Refund status

POST   /api/webhooks/vnpay                  # VNPay callback
POST   /api/webhooks/momo                   # MoMo callback
POST   /api/webhooks/zalopay               # ZaloPay callback
POST   /api/webhooks/ghn                    # GHN shipping webhook
POST   /api/webhooks/ghtk                   # GHTK shipping webhook

GET    /api/orders/analytics                # Order analytics
GET    /api/orders/dashboard                # Order dashboard
```

---

## WEBSOCKET EVENTS

### Server → Client

```
orders:created          { order }
orders:status_changed   { orderId, oldStatus, newStatus, timestamp }
orders:payment_received { orderId, amount, method }
orders:shipped          { orderId, trackingNumber, carrier }
orders:delivered        { orderId, deliveredAt }
orders:cancelled        { orderId, reason }
orders:refund_approved  { orderId, refundId, amount }
orders:fraud_flagged    { orderId, score, reasons }
```

---

## ORDER LIFECYCLE (State Machine)

```typescript
enum OrderStatus {
  DRAFT        = 'draft',         # Chatbox đang tạo
  PENDING      = 'pending',       # Đã tạo, chờ confirm
  CONFIRMED    = 'confirmed',     # Đã confirm, chờ thanh toán
  PAID         = 'paid',          # Đã thanh toán
  PROCESSING   = 'processing',    # Đang xử lý/đóng gói
  SHIPPING     = 'shipping',      # Đang giao hàng
  DELIVERED    = 'delivered',     # Đã giao
  COMPLETED    = 'completed',     # Hoàn thành (CSAT collected)
  CANCELLED    = 'cancelled',     # Đã hủy
  REFUNDING    = 'refunding',     # Đang hoàn tiền
  REFUNDED     = 'refunded',      # Đã hoàn tiền
}

// Valid transitions
const TRANSITIONS = {
  draft:       ['pending', 'cancelled'],
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['paid', 'cancelled'],
  paid:        ['processing', 'refunding'],
  processing:  ['shipping', 'refunding'],
  shipping:    ['delivered', 'refunding'],
  delivered:   ['completed', 'refunding'],
  refunding:   ['refunded'],
};
```

---

## ORDER CREATION FLOW

```typescript
// OrderPipeline.createOrder()
async createOrder(dto: CreateOrderDto): Promise<Order> {
  return await this.dataSource.transaction(async (manager) => {

    // 1. Validate
    await orderValidator.validate(dto);       # Product, inventory, pricing

    // 2. Fraud check
    const fraudScore = await fraudDetector.score(dto);
    if (fraudScore > 0.8) throw new FraudException(fraudScore);

    // 3. Reserve inventory (with pessimistic lock)
    await inventoryReservation.reserve(dto.items, orderId);

    // 4. Apply coupon/discount
    const pricing = await pricingService.calculate(dto);

    // 5. Create order record
    const order = await orderRepository.save({
      ...dto,
      ...pricing,
      status: OrderStatus.PENDING,
      source: dto.source,           # 'chatbox', 'website', 'affiliate'
    });

    // 6. Create order items
    await orderItemRepository.save(dto.items.map(item => ({ ...item, orderId: order.id })));

    // 7. Audit log
    await auditLog.record('order.created', { orderId: order.id, userId: dto.customerId });

    // 8. Emit events
    await eventGateway.emit('orders:created', { order });

    // 9. Trigger notifications
    await orderNotification.sendConfirmation(order);

    // 10. CRM update
    await crmAgent.recordOrder(order);

    return order;
  });
}
```

---

## ORDER VALIDATION CHAIN

```typescript
// Validators chạy theo thứ tự
const validators = [
  ProductAvailabilityValidator,    # Sản phẩm còn active
  InventoryStockValidator,         # Còn đủ tồn kho
  PricingConsistencyValidator,     # Giá không bị tamper
  CouponValidator,                 # Coupon còn hiệu lực + điều kiện
  CustomerInfoValidator,           # Địa chỉ, phone valid
  ShippingAreaValidator,           # Địa chỉ giao hàng được hỗ trợ
  DuplicateOrderDetector,         # Chặn duplicate trong 5 phút
  FraudPreScreenValidator,        # Quick fraud check trước khi process
];
```

---

## PAYMENT ENGINE

### Supported Payment Methods

```typescript
enum PaymentMethod {
  COD          = 'cod',
  BANK_TRANSFER = 'bank_transfer',
  VNPAY        = 'vnpay',
  MOMO         = 'momo',
  ZALOPAY      = 'zalopay',
  VISA_MC      = 'visa_mc',        # Via payment gateway
  STORE_CREDIT  = 'store_credit',  # Điểm tích lũy
}
```

### Payment Flow

```
Order confirmed
↓
PaymentOrchestrator.initiate(orderId, method)
↓
Generate payment URL/QR (VNPay, MoMo, ZaloPay)
  hoặc
Confirm COD (no gateway needed)
↓
Customer pays
↓
Webhook received: POST /api/webhooks/{provider}
↓
WebhookHandler.verify(signature)         # Verify HMAC signature
↓
PaymentReconciler.match(webhookData)     # Match với pending order
↓
Order.status → PAID
↓
InventoryReservation.confirm(orderId)    # Convert reserve → deduct
↓
EventGateway.emit('orders:payment_received', data)
↓
OrderNotification.sendPaymentConfirmation()
↓
CrmAgent.updatePurchaseHistory()
```

### VNPay Webhook Handler

```typescript
@Post('/api/webhooks/vnpay')
async handleVnpay(@Body() body: VnpayWebhook, @Req() req: Request) {
  // 1. Verify signature
  const isValid = vnpayService.verifySignature(body, process.env.VNPAY_HASH_SECRET);
  if (!isValid) throw new UnauthorizedException('Invalid VNPay signature');

  // 2. Process
  if (body.vnp_ResponseCode === '00') {
    await paymentReconciler.confirmPayment({
      orderId: body.vnp_TxnRef,
      transactionId: body.vnp_TransactionNo,
      amount: body.vnp_Amount / 100,
      method: PaymentMethod.VNPAY,
    });
  } else {
    await paymentReconciler.failPayment(body.vnp_TxnRef, body.vnp_ResponseCode);
  }

  return { RspCode: '00', Message: 'Confirm Success' };
}
```

---

## INVENTORY INTEGRATION

### Reservation Flow (Redis lock)

```typescript
// InventoryReservationService
async reserve(items: OrderItem[], orderId: string): Promise<void> {
  for (const item of items) {
    const lock = await redis.set(
      `inventory:lock:${item.productVariantId}`,
      orderId,
      'NX', 'PX', 30000  // 30 second lock
    );
    if (!lock) throw new InventoryLockException(item.productVariantId);

    const inventory = await inventoryRepo.findOne({ productVariantId: item.productVariantId });
    if (inventory.available < item.quantity) {
      throw new InsufficientStockException(item.productVariantId, item.quantity);
    }

    await inventoryRepo.update(
      { productVariantId: item.productVariantId },
      {
        reserved: () => `reserved + ${item.quantity}`,
        available: () => `available - ${item.quantity}`,
      }
    );
  }
}

// Khi cancel/expire: release reserved
async release(items: OrderItem[]): Promise<void> { ... }

// Khi payment confirmed: deduct from stock
async confirm(items: OrderItem[]): Promise<void> { ... }
```

---

## SHIPPING ENGINE

### Shipping Providers (tích hợp)

```typescript
enum ShippingProvider {
  GHN   = 'ghn',    # Giao Hàng Nhanh
  GHTK  = 'ghtk',   # Giao Hàng Tiết Kiệm
  VNPT  = 'vnpt',   # VNPost
  GRAB  = 'grab',   # GrabExpress
  MANUAL = 'manual', # Tự giao
}
```

### Shipping Router

```typescript
// Chọn provider tự động dựa trên:
// - Địa chỉ giao hàng (tỉnh thành)
// - Khối lượng/kích thước
// - Tốc độ yêu cầu
// - Chi phí tối ưu
// - Availability
async selectProvider(order: Order): Promise<ShippingProvider> { ... }
```

### Tracking Webhooks

```
GHN:  POST /api/webhooks/ghn  → parse status → update order
GHTK: POST /api/webhooks/ghtk → parse status → update order
→ EventGateway.emit('orders:status_changed', ...)
→ OrderNotification.sendShippingUpdate()
```

---

## ORDER STATUS MODEL

Thêm vào `Order` entity (backwards compatible):

```typescript
{
  // Shipping
  shippingProvider?: ShippingProvider;
  trackingNumber?: string;
  shippingFee: number;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingStatus?: string;

  // Payment
  paymentTransactionId?: string;
  paymentCompletedAt?: Date;
  paymentFailureReason?: string;

  // Fulfillment
  processedAt?: Date;
  shippedAt?: Date;

  // Post-order
  completedAt?: Date;
  csatRequested: boolean;
  csatScore?: number;

  // Fraud
  fraudScore?: number;
  fraudFlags?: string[];
  requiresReview: boolean;

  // Source tracking
  source: OrderSource;             # 'website', 'chatbox', 'affiliate', etc.
  affiliateId?: string;
  campaignId?: string;
}

enum OrderSource {
  WEBSITE    = 'website',
  CHATBOX    = 'chatbox',
  FACEBOOK   = 'facebook',
  TELEGRAM   = 'telegram',
  ZALO       = 'zalo',
  AFFILIATE  = 'affiliate',
  MOBILE_APP = 'mobile_app',
}
```

---

## CUSTOMER NOTIFICATIONS

Tự động gửi qua `OrderNotificationService`:

| Event            | Channel           | Timing      |
|------------------|-------------------|-------------|
| Order created    | Chat + Email      | Immediate   |
| Payment received | Chat + Email      | Immediate   |
| Order processing | Chat              | +5 min      |
| Shipped          | Chat + SMS/Zalo   | Immediate   |
| Out for delivery | Chat + Telegram   | Morning     |
| Delivered        | Chat + Email      | Immediate   |
| CSAT request     | Chat              | +30 min     |

---

## FRAUD DETECTION ENGINE

```typescript
interface FraudAnalysis {
  score: number;               # 0.0 - 1.0 (1.0 = highest risk)
  flags: FraudFlag[];
  decision: 'approve' | 'review' | 'block';
}

enum FraudFlag {
  DUPLICATE_ORDER_5MIN    = 'duplicate_order',      # Same customer, same products
  MULTIPLE_FAILED_PAY     = 'multiple_failed_pay',  # > 3 failed payments
  SUSPICIOUS_ADDRESS      = 'suspicious_address',   # PO box, fake address pattern
  HIGH_VALUE_NEW_CUSTOMER = 'high_value_new',       # > 5M VND, first order
  MISMATCHED_IP_REGION    = 'ip_region_mismatch',   # IP != shipping address region
  VELOCITY_ABUSE          = 'velocity_abuse',       # > 5 orders/hour same IP
  STOLEN_COUPON           = 'stolen_coupon',        # Coupon used > max times
  ACCOUNT_AGE             = 'new_account_high_value', # Account < 1 day, high order
}

// Score thresholds:
// 0.0 - 0.3: Auto approve
// 0.3 - 0.7: Flag for review (but process)
// 0.7 - 1.0: Hold for manual review
```

---

## REFUND ENGINE

```typescript
// RefundEngineService.initiateRefund()
async initiateRefund(orderId: string, items: RefundItem[], reason: string): Promise<Refund> {
  // 1. Validate: order phải DELIVERED hoặc COMPLETED
  // 2. Calculate refund amount
  // 3. Determine refund method (same as payment method)
  // 4. Create refund record
  // 5. If auto-approvable (< 100K VND, COD order) → approve immediately
  // 6. Else → queue for supervisor approval
  // 7. Notify customer
}

// Auto-approve criteria:
// - Amount ≤ 100,000 VND
// - COD payment
// - Product defect with photo evidence
// - Customer CSAT history > 4.0
```

---

## RETURN ENGINE

```typescript
enum ReturnReason {
  WRONG_PRODUCT    = 'wrong_product',
  DEFECTIVE        = 'defective',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGE_OF_MIND   = 'change_of_mind',
  DAMAGED          = 'damaged',
  MISSING_PARTS    = 'missing_parts',
}

// Return window: configurable per product category (default 7 days)
// Return flow: Request → Inspection → Approve → Replacement or Refund
```

---

## CRM INTEGRATION

Sau mỗi order event:

```typescript
await crmAgent.updatePurchaseHistory({
  customerId,
  orderId,
  orderValue,
  products: orderItems,
  paymentMethod,
  shippingAddress,
  orderStatus,
  completedAt,
});

// CRM updates:
// - totalOrders++
// - totalSpent += orderValue
// - lastPurchaseAt = now
// - ltv = recalculate
// - segment = re-evaluate (based on RFM)
// - tags: add 'purchased', remove 'lead' if applicable
```

---

## AI MEMORY INTEGRATION

Namespace `order:{customerId}`:

```typescript
{
  purchasedProducts: string[],       # productIds
  orderPreferences: {
    preferredPayment: PaymentMethod,
    preferredShipping: ShippingProvider,
    preferredDeliveryTime: string,
  },
  returnHistory: ReturnEvent[],
  avgOrderValue: number,
  purchaseFrequency: number,         # days between orders
}
```

---

## ORDER ANALYTICS

```typescript
interface OrderAnalytics {
  period: DateRange;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;            # orders / sessions
  paymentSuccessRate: number;
  deliverySuccessRate: number;
  cancellationRate: number;
  refundRate: number;
  bySource: SourceMetrics[];
  byPaymentMethod: PaymentMetrics[];
  topProducts: ProductMetrics[];
  topCustomers: CustomerMetrics[];
}
```

---

## EXECUTIVE INSIGHTS

```
GET /api/orders/insights
```

- Kênh nào tạo nhiều đơn nhất? (by source)
- Sản phẩm nào bán tốt nhất? (top products)
- Tỷ lệ thanh toán thành công theo phương thức?
- Tỷ lệ giao hàng thành công theo provider?
- Nguyên nhân hủy đơn phổ biến?
- Giờ nào trong ngày đơn nhiều nhất?
- Fraud rate và tổng thiệt hại được ngăn chặn?

---

## SECURITY

- Webhook signature verification (HMAC) cho mọi payment provider
- Idempotency keys cho payment processing (chống duplicate webhook)
- PostgreSQL transaction isolation: SERIALIZABLE cho inventory
- Audit log mọi order mutation với before/after values
- Refund action requires supervisor role
- Rate limit: 10 orders/customer/hour

---

## IMPLEMENTATION PRIORITY

```
P1 (Week 1):
  - Order state machine
  - Inventory reservation với Redis lock
  - COD và Bank Transfer flow
  - Order notifications cơ bản

P2 (Week 2):
  - VNPay + MoMo webhook handlers
  - Fraud detection (rule-based)
  - Shipping webhook integration (GHN)
  - Refund engine cơ bản

P3 (Week 3):
  - ZaloPay + additional providers
  - Return engine
  - AI fraud scoring (Claude)
  - Analytics dashboard
  - Proactive delivery updates
```

---

## SUCCESS CRITERIA

Order Automation Engine V2 phải:

* Order processing time ≤ 30 giây (from creation to confirmation)
* Payment webhook processing ≤ 5 giây
* Inventory lock collision rate ≤ 0.1%
* Zero oversell (inventory reservation accuracy 100%)
* Fraud detection block rate ≥ 95% for known patterns
* Delivery notification accuracy ≥ 99%
* Refund processing ≤ 24 giờ cho auto-approve cases
* Không phá bất kỳ API hoặc schema nào hiện có

---

## NORTH STAR METRIC

Orders Completed Per Day
×
Payment Success Rate
×
Delivery Success Rate
×
Zero Fraud Loss Rate (1 - fraud_loss / total_revenue)

---

# END OF FILE
