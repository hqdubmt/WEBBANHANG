import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { TrendPredictorService } from './trend-predictor.service';
import { TrendPredictorController } from './trend-predictor.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule, ProductsModule],
  controllers: [TrendPredictorController],
  providers: [TrendPredictorService],
  exports: [TrendPredictorService],
})
export class TrendPredictorModule {}
