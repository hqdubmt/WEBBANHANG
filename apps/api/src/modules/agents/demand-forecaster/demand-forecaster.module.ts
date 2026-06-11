import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { DemandForecasterService } from './demand-forecaster.service';
import { DemandForecasterController } from './demand-forecaster.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';
import { OrdersModule } from '../../orders/orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule, ProductsModule, OrdersModule],
  controllers: [DemandForecasterController],
  providers: [DemandForecasterService],
  exports: [DemandForecasterService],
})
export class DemandForecasterModule {}
