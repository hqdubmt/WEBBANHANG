import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { ProductsModule } from '../../products/products.module';
import { MarketplaceModule } from '../../marketplace/marketplace.module';
import { AffiliateAgentController } from './affiliate-agent.controller';
import { AffiliateAgentService } from './affiliate-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), ProductsModule, MarketplaceModule],
  controllers: [AffiliateAgentController],
  providers: [AffiliateAgentService],
  exports: [AffiliateAgentService],
})
export class AffiliateAgentModule {}
