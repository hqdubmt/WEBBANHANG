import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Order } from '../../database/entities/order.entity';
import { Product } from '../../database/entities/product.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { Content } from '../../database/entities/content.entity';
import { AffiliateConversion } from '../../database/entities/affiliate-conversion.entity';
import { StrategyEngineService } from './strategy-engine.service';
import { ChannelAllocationService } from './channel-allocation.service';
import { GrowthOpportunitiesService } from './growth-opportunities.service';
import { MarketingOrchestratorController } from './marketing-orchestrator.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Lead, Order, Product, Campaign, Content, AffiliateConversion]),
    AiModule,
  ],
  controllers: [MarketingOrchestratorController],
  providers: [StrategyEngineService, ChannelAllocationService, GrowthOpportunitiesService],
  exports: [StrategyEngineService, GrowthOpportunitiesService],
})
export class MarketingOrchestratorModule {}
