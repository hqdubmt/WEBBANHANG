import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';
import { LeadsModule } from '../../leads/leads.module';
import { CustomersModule } from '../../customers/customers.module';
import { SalesAgentController } from './sales-agent.controller';
import { SalesAgentService } from './sales-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule, ProductsModule, LeadsModule, CustomersModule],
  controllers: [SalesAgentController],
  providers: [SalesAgentService],
  exports: [SalesAgentService],
})
export class SalesAgentModule {}
