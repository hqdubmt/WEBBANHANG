import { MigrationInterface, QueryRunner } from 'typeorm';

export class V7DatabaseFixes1749600000000 implements MigrationInterface {
  name = 'V7DatabaseFixes1749600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── products: add missing columns ─────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "sku" varchar,
        ADD COLUMN IF NOT EXISTS "categoryId" uuid,
        ADD COLUMN IF NOT EXISTS "costPrice" decimal(15,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lowStockThreshold" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "fk_products_categoryId"
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // ── products: indexes ──────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_status_source" ON "products" ("status", "source")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_status_trend" ON "products" ("status", "trendScore")`);

    // ── orders: add missing columns ────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "shippingMethod" varchar,
        ADD COLUMN IF NOT EXISTS "trackingNumber" varchar,
        ADD COLUMN IF NOT EXISTS "shippingCost" decimal(15,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "couponCode" varchar,
        ADD COLUMN IF NOT EXISTS "assignedTo" varchar
    `);

    // ── orders: indexes ────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_customer_status" ON "orders" ("customerId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_status_created" ON "orders" ("status", "createdAt")`);

    // ── order_items: add timestamps ────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "order_items"
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // ── order_items: indexes ───────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" ON "order_items" ("productId")`);

    // ── customers: add missing columns ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "customers"
        ADD COLUMN IF NOT EXISTS "ltv" decimal(15,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "acquisitionSource" varchar,
        ADD COLUMN IF NOT EXISTS "churnRisk" decimal(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "address" varchar,
        ADD COLUMN IF NOT EXISTS "birthday" varchar
    `);

    // ── customers: indexes ─────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_phone" ON "customers" ("phone")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_email" ON "customers" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_customers_tier" ON "customers" ("tier")`);

    // ── leads: add missing columns ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD COLUMN IF NOT EXISTS "assignedTo" varchar,
        ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMPTZ
    `);

    // ── leads: indexes ─────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_status_platform" ON "leads" ("status", "platform")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_status_created" ON "leads" ("status", "createdAt")`);

    // ── contents: indexes ──────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_contents_product_status" ON "contents" ("productId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_contents_platform_status" ON "contents" ("platform", "status")`);

    // ── inventory: indexes ─────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inventory_product_created" ON "inventory" ("productId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inventory_txtype_created" ON "inventory" ("txType", "createdAt")`);

    // ── payments: index ────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payments_order_id" ON "payments" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" ("status")`);

    // ── agent_logs: indexes ────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_agent_logs_agent_created" ON "agent_logs" ("agent", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_agent_logs_status_created" ON "agent_logs" ("status", "createdAt")`);

    // ── affiliate_clicks: indexes ──────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_partner_created" ON "affiliate_clicks" ("partnerId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_referral_created" ON "affiliate_clicks" ("referralCode", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_converted" ON "affiliate_clicks" ("converted")`);

    // ── lessons_learned: add updatedAt ─────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "lessons_learned"
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // ── performance_scorecards: unique constraint ──────────────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_scorecards_period_date_unique"
      ON "performance_scorecards" ("period", "periodDate")
    `);

    // ── NEW TABLE: customer_segments ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "description" text,
        "status" varchar NOT NULL DEFAULT 'active',
        "rules" jsonb,
        "memberCount" integer NOT NULL DEFAULT 0,
        "lastCalculatedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_customer_segments_name" UNIQUE ("name"),
        CONSTRAINT "pk_customer_segments" PRIMARY KEY ("id")
      )
    `);

    // ── NEW TABLE: revenue_snapshots ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "revenue_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "period" varchar NOT NULL,
        "snapshotDate" date NOT NULL,
        "totalRevenue" decimal(15,2) NOT NULL DEFAULT 0,
        "totalCost" decimal(15,2) NOT NULL DEFAULT 0,
        "grossProfit" decimal(15,2) NOT NULL DEFAULT 0,
        "grossMarginPercent" decimal(5,2) NOT NULL DEFAULT 0,
        "totalOrders" integer NOT NULL DEFAULT 0,
        "totalNewCustomers" integer NOT NULL DEFAULT 0,
        "avgOrderValue" decimal(15,2) NOT NULL DEFAULT 0,
        "affiliateRevenue" decimal(15,2) NOT NULL DEFAULT 0,
        "dropshipRevenue" decimal(15,2) NOT NULL DEFAULT 0,
        "conversionRate" decimal(5,2) NOT NULL DEFAULT 0,
        "breakdown" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_revenue_snapshots_period_date" UNIQUE ("period", "snapshotDate"),
        CONSTRAINT "pk_revenue_snapshots" PRIMARY KEY ("id")
      )
    `);

    // ── NEW TABLE: audit_logs ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" varchar,
        "userEmail" varchar,
        "action" varchar NOT NULL,
        "entityType" varchar NOT NULL,
        "entityId" varchar,
        "before" jsonb,
        "after" jsonb,
        "ipAddress" varchar,
        "userAgent" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_created" ON "audit_logs" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entityType", "entityId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created" ON "audit_logs" ("action", "createdAt")`);

    // ── NEW TABLE: notifications ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipientId" varchar,
        "recipientType" varchar,
        "channel" varchar NOT NULL,
        "title" varchar NOT NULL,
        "body" text NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "externalId" varchar,
        "sentAt" TIMESTAMPTZ,
        "readAt" TIMESTAMPTZ,
        "errorMessage" varchar,
        "meta" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_status" ON "notifications" ("recipientId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_channel_status" ON "notifications" ("channel", "status")`);

    // ── NEW TABLE: coupons ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar NOT NULL,
        "description" text,
        "type" varchar NOT NULL,
        "value" decimal(15,2) NOT NULL,
        "minOrderAmount" decimal(15,2) NOT NULL DEFAULT 0,
        "maxDiscountAmount" decimal(15,2),
        "usageLimit" integer NOT NULL DEFAULT 0,
        "usedCount" integer NOT NULL DEFAULT 0,
        "perUserLimit" integer NOT NULL DEFAULT 1,
        "status" varchar NOT NULL DEFAULT 'active',
        "startsAt" TIMESTAMPTZ,
        "expiresAt" TIMESTAMPTZ,
        "applicableProductId" varchar,
        "applicableSegmentId" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_coupons_code" UNIQUE ("code"),
        CONSTRAINT "pk_coupons" PRIMARY KEY ("id")
      )
    `);

    // ── NEW TABLE: product_variants ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "name" varchar NOT NULL,
        "sku" varchar,
        "price" decimal(15,2) NOT NULL,
        "costPrice" decimal(15,2) NOT NULL DEFAULT 0,
        "stock" integer NOT NULL DEFAULT 0,
        "status" varchar NOT NULL DEFAULT 'active',
        "attributes" jsonb,
        "imageUrl" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_product_variants" PRIMARY KEY ("id"),
        CONSTRAINT "fk_product_variants_product"
          FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_product_variants_product_status" ON "product_variants" ("productId", "status")`);

    // ── NEW TABLE: ai_decisions ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_decisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "agentName" varchar NOT NULL,
        "decisionType" varchar NOT NULL,
        "description" text,
        "input" jsonb,
        "decision" jsonb,
        "confidence" decimal(5,2) NOT NULL DEFAULT 0,
        "outcome" varchar NOT NULL DEFAULT 'pending',
        "outcomeData" jsonb,
        "relatedEntityType" varchar,
        "relatedEntityId" varchar,
        "agentLogId" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ai_decisions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_decisions_agent_created" ON "ai_decisions" ("agentName", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_decisions_type_created" ON "ai_decisions" ("decisionType", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_decisions_outcome" ON "ai_decisions" ("outcome")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_decisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "revenue_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_segments"`);

    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "fk_products_categoryId"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "sku"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "categoryId"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "costPrice"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "lowStockThreshold"`);

    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingMethod"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "trackingNumber"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingCost"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "couponCode"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "assignedTo"`);

    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN IF EXISTS "createdAt"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN IF EXISTS "updatedAt"`);

    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "ltv"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "acquisitionSource"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "churnRisk"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "address"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "birthday"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "assignedTo"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "followUpAt"`);

    await queryRunner.query(`ALTER TABLE "lessons_learned" DROP COLUMN IF EXISTS "updatedAt"`);
  }
}
