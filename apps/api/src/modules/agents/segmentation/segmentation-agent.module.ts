import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../../database/entities/customer.entity';
import { Order } from '../../../database/entities/order.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { SegmentationAgentService } from './segmentation-agent.service';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order, AgentLog]), AiModule],
  providers: [SegmentationAgentService],
  exports: [SegmentationAgentService],
})
export class SegmentationAgentModule {}
