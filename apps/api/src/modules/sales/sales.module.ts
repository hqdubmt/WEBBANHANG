import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/entities/product.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Order } from '../../database/entities/order.entity';
import { Lead } from '../../database/entities/lead.entity';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { ProductDiscoveryService } from './product-discovery.service';
import { SalesConversationService } from './sales-conversation.service';
import { RecommendationService } from './recommendation.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, OrderItem, Order, Lead]),
    AiModule,
    RagModule,
  ],
  providers: [ProductDiscoveryService, SalesConversationService, RecommendationService],
  controllers: [SalesController],
  exports: [ProductDiscoveryService, SalesConversationService, RecommendationService],
})
export class SalesModule {}
