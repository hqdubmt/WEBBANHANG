import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceAlert } from '../../../database/entities/price-alert.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { PriceAgentService } from './price-agent.service';
import { PriceAgentController } from './price-agent.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([PriceAlert, AgentLog]), AiModule, ProductsModule],
  controllers: [PriceAgentController],
  providers: [PriceAgentService],
  exports: [PriceAgentService],
})
export class PriceAgentModule {}
