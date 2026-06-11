import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { PriceAlert } from '../../../database/entities/price-alert.entity';
import { CompetitorMonitorService } from './competitor-monitor.service';
import { CompetitorMonitorController } from './competitor-monitor.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog, PriceAlert]), AiModule, ProductsModule],
  controllers: [CompetitorMonitorController],
  providers: [CompetitorMonitorService],
  exports: [CompetitorMonitorService],
})
export class CompetitorMonitorModule {}
