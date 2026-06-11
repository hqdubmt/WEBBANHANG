import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
// V1 Agents
import { TrendAgentModule } from './modules/agents/trend/trend-agent.module';
import { AffiliateAgentModule } from './modules/agents/affiliate/affiliate-agent.module';
import { ContentAgentModule } from './modules/agents/content/content-agent.module';
import { SalesAgentModule } from './modules/agents/sales/sales-agent.module';
// V2 Agents
import { MasterAgentModule } from './modules/agents/master/master-agent.module';
import { VideoAgentModule } from './modules/agents/video/video-agent.module';
import { SeoAgentModule } from './modules/agents/seo/seo-agent.module';
import { TrendPredictorModule } from './modules/agents/trend-predictor/trend-predictor.module';
import { PriceAgentModule } from './modules/agents/price/price-agent.module';
import { SegmentationAgentModule } from './modules/agents/segmentation/segmentation-agent.module';
import { EmailAgentModule } from './modules/agents/email/email-agent.module';
import { TelegramAgentModule } from './modules/agents/telegram/telegram-agent.module';
import { ReviewAgentModule } from './modules/agents/review/review-agent.module';
// V2 Core
import { RagModule } from './modules/rag/rag.module';
import { ContentFactoryModule } from './modules/content-factory/content-factory.module';
import { AffiliateIntelligenceModule } from './modules/affiliate-intelligence/affiliate-intelligence.module';
import { AiMemoryModule } from './modules/ai-memory/ai-memory.module';
// V3 Auth & Security
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
// V3 Agents
import { PublisherAgentModule } from './modules/agents/publisher/publisher-agent.module';
import { LeadHunterModule } from './modules/agents/lead-hunter/lead-hunter.module';
import { CrmAgentModule } from './modules/agents/crm/crm-agent.module';
import { KnowledgeAgentModule } from './modules/agents/knowledge/knowledge-agent.module';
// V3 Core Modules
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
// V3 WebSocket
import { GatewayModule } from './modules/gateway/gateway.module';
// V4 Core
import { DropshipModule } from './modules/dropship/dropship.module';
import { AffiliatePortalModule } from './modules/affiliate-portal/affiliate-portal.module';
// V4 Agents
import { VideoOptimizerModule } from './modules/agents/video-optimizer/video-optimizer.module';
import { CompetitorMonitorModule } from './modules/agents/competitor-monitor/competitor-monitor.module';
import { DemandForecasterModule } from './modules/agents/demand-forecaster/demand-forecaster.module';
import { RepricingModule } from './modules/agents/repricing/repricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    DatabaseModule,
    // Auth (global guard)
    AuthModule,
    UsersModule,
    // Core CRUD
    ProductsModule,
    CustomersModule,
    OrdersModule,
    LeadsModule,
    AnalyticsModule,
    AiModule,
    MarketplaceModule,
    // V3 Core
    CategoriesModule,
    BrandsModule,
    InventoryModule,
    SuppliersModule,
    PaymentsModule,
    CampaignsModule,
    WorkflowsModule,
    // V1 Agents
    TrendAgentModule,
    AffiliateAgentModule,
    ContentAgentModule,
    SalesAgentModule,
    // V2 Agents
    MasterAgentModule,
    VideoAgentModule,
    SeoAgentModule,
    TrendPredictorModule,
    PriceAgentModule,
    SegmentationAgentModule,
    EmailAgentModule,
    TelegramAgentModule,
    ReviewAgentModule,
    // V3 Agents
    PublisherAgentModule,
    LeadHunterModule,
    CrmAgentModule,
    KnowledgeAgentModule,
    // V2/V3 Core
    RagModule,
    ContentFactoryModule,
    AffiliateIntelligenceModule,
    AiMemoryModule,
    // V4 Core
    DropshipModule,
    AffiliatePortalModule,
    // V4 Agents
    VideoOptimizerModule,
    CompetitorMonitorModule,
    DemandForecasterModule,
    RepricingModule,
    // WebSocket
    GatewayModule,
  ],
})
export class AppModule {}
