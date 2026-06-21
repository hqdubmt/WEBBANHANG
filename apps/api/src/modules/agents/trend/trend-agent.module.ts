import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { AiModule } from '../../ai/ai.module';
import { MarketplaceModule } from '../../marketplace/marketplace.module';
import { TrendAgentController } from './trend-agent.controller';
import { TrendAgentService } from './trend-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule, MarketplaceModule],
  controllers: [TrendAgentController],
  providers: [TrendAgentService],
  exports: [TrendAgentService],
})
export class TrendAgentModule {}
