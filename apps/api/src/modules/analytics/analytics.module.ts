import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { Content } from '../../database/entities/content.entity';
import { RevenueSnapshot } from '../../database/entities/revenue-snapshot.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { RevenueOptimizationService } from './revenue-optimization.service';
import { ExecutiveReportsService } from './executive-reports.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Lead, Customer, Product, AgentLog, Content, RevenueSnapshot]),
    AiModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    RevenueAnalyticsService,
    RevenueOptimizationService,
    ExecutiveReportsService,
  ],
  exports: [AnalyticsService, RevenueAnalyticsService, ExecutiveReportsService],
})
export class AnalyticsModule {}
