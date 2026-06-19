import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../../database/entities/customer.entity';
import { Order } from '../../../database/entities/order.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { SegmentationAgentService } from './segmentation-agent.service';
import { SegmentationAgentController } from './segmentation-agent.controller';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order, AgentLog]), AiModule],
  providers: [SegmentationAgentService],
  controllers: [SegmentationAgentController],
  exports: [SegmentationAgentService],
})
export class SegmentationAgentModule {}
