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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'commerce_user',
      password: process.env.POSTGRES_PASSWORD || 'commerce_pass_2024',
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
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
