import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { Customer } from '../../../database/entities/customer.entity';
import { Order } from '../../../database/entities/order.entity';
import { Lead } from '../../../database/entities/lead.entity';
import { AiModule } from '../../ai/ai.module';
import { CrmAgentService } from './crm-agent.service';
import { CrmAgentController } from './crm-agent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog, Customer, Order, Lead]), AiModule],
  providers: [CrmAgentService],
  controllers: [CrmAgentController],
  exports: [CrmAgentService],
})
export class CrmAgentModule {}
