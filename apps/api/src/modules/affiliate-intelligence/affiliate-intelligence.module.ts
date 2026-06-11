import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/entities/product.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { AffiliateIntelligenceService } from './affiliate-intelligence.service';
import { AiModule } from '../ai/ai.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, AgentLog]), AiModule, ProductsModule],
  providers: [AffiliateIntelligenceService],
  exports: [AffiliateIntelligenceService],
})
export class AffiliateIntelligenceModule {}
