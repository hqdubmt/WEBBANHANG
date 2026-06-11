import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { PriceAlert } from '../../../database/entities/price-alert.entity';
import { RepricingService } from './repricing.service';
import { RepricingController } from './repricing.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog, PriceAlert]), AiModule, ProductsModule],
  controllers: [RepricingController],
  providers: [RepricingService],
  exports: [RepricingService],
})
export class RepricingModule {}
