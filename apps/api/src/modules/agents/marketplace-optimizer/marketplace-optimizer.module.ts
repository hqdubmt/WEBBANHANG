import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceVendor } from '../../../database/entities/marketplace-vendor.entity';
import { MarketplaceDispute } from '../../../database/entities/marketplace-dispute.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { MarketplaceOptimizerService } from './marketplace-optimizer.service';
import { MarketplaceOptimizerController } from './marketplace-optimizer.controller';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([MarketplaceVendor, MarketplaceDispute, AgentLog]), AiModule],
  controllers: [MarketplaceOptimizerController],
  providers: [MarketplaceOptimizerService],
  exports: [MarketplaceOptimizerService],
})
export class MarketplaceOptimizerModule {}
