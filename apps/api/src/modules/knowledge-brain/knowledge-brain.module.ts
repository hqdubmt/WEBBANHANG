import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { Lead } from '../../database/entities/lead.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { Knowledge } from '../../database/entities/knowledge.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { PriceAlert } from '../../database/entities/price-alert.entity';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { KnowledgeBrainService } from './knowledge-brain.service';
import { KnowledgeBrainController } from './knowledge-brain.controller';
import { DbDiscoveryService } from './db-discovery.service';
import { ApiDiscoveryService } from './api-discovery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order, OrderItem, Customer, Product, Lead,
      AgentLog, Knowledge, Campaign, PriceAlert,
    ]),
    AiModule,
    RagModule,
  ],
  providers: [KnowledgeBrainService, DbDiscoveryService, ApiDiscoveryService],
  controllers: [KnowledgeBrainController],
  exports: [KnowledgeBrainService, DbDiscoveryService, ApiDiscoveryService],
})
export class KnowledgeBrainModule {}
