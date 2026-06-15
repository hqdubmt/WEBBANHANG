import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Customer } from './entities/customer.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Lead } from './entities/lead.entity';
import { Content } from './entities/content.entity';
import { AgentLog } from './entities/agent-log.entity';
import { AiMemory } from './entities/ai-memory.entity';
import { EmailCampaign } from './entities/email-campaign.entity';
import { VideoJob } from './entities/video-job.entity';
import { SeoArticle } from './entities/seo-article.entity';
import { PriceAlert } from './entities/price-alert.entity';
// V3 entities
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Inventory } from './entities/inventory.entity';
import { Supplier } from './entities/supplier.entity';
import { Payment } from './entities/payment.entity';
import { Affiliate } from './entities/affiliate.entity';
import { Commission } from './entities/commission.entity';
import { Campaign } from './entities/campaign.entity';
import { Workflow } from './entities/workflow.entity';
import { AgentConfig } from './entities/agent-config.entity';
import { Knowledge } from './entities/knowledge.entity';
import { User } from './entities/user.entity';
// V4 entities
import { DropshipProduct } from './entities/dropship-product.entity';
import { DropshipOrder } from './entities/dropship-order.entity';
import { AffiliatePartner } from './entities/affiliate-partner.entity';
import { AffiliateClick } from './entities/affiliate-click.entity';
import { AffiliateConversion } from './entities/affiliate-conversion.entity';
import { SupplierProduct } from './entities/supplier-product.entity';
// V5 entities
import { Tenant } from './entities/tenant.entity';
import { WhiteLabelClient } from './entities/white-label-client.entity';
import { MarketplaceVendor } from './entities/marketplace-vendor.entity';
import { MarketplaceDispute } from './entities/marketplace-dispute.entity';
import { MobileSession } from './entities/mobile-session.entity';
// V6 Self-Improvement Loop
import { LearningCycle } from './entities/learning-cycle.entity';
import { LessonLearned } from './entities/lesson-learned.entity';
import { DecisionMemory } from './entities/decision-memory.entity';
import { Experiment } from './entities/experiment.entity';
import { PerformanceScorecard } from './entities/performance-scorecard.entity';
// V7 Database fixes — indexes, missing tables
import { CustomerSegment } from './entities/customer-segment.entity';
import { RevenueSnapshot } from './entities/revenue-snapshot.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Notification } from './entities/notification.entity';
import { Coupon } from './entities/coupon.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { AiDecision } from './entities/ai-decision.entity';
// EPIC 04 Omnichannel Inbox
import { InboxConversation } from './entities/inbox-conversation.entity';
import { InboxMessage } from './entities/inbox-message.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'commerce_user',
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB || 'ai_commerce',
      entities: [
        // V1 + V2
        Product, Customer, Order, OrderItem, Lead, Content, AgentLog,
        AiMemory, EmailCampaign, VideoJob, SeoArticle, PriceAlert,
        // V3
        Category, Brand, Inventory, Supplier, Payment, Affiliate,
        Commission, Campaign, Workflow, AgentConfig, Knowledge, User,
        // V4
        DropshipProduct, DropshipOrder, AffiliatePartner, AffiliateClick,
        AffiliateConversion, SupplierProduct,
        // V5
        Tenant, WhiteLabelClient, MarketplaceVendor, MarketplaceDispute, MobileSession,
        // V6 Self-Improvement Loop
        LearningCycle, LessonLearned, DecisionMemory, Experiment, PerformanceScorecard,
        // V7 Database fixes
        CustomerSegment, RevenueSnapshot, AuditLog, Notification, Coupon,
        ProductVariant, AiDecision,
        // EPIC 04 Omnichannel Inbox
        InboxConversation, InboxMessage,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      migrations: ['dist/database/migrations/*.js'],
      migrationsTableName: 'typeorm_migrations',
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
