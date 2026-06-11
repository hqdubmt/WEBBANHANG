import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { ReviewAgentService } from './review-agent.service';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule, ProductsModule],
  providers: [ReviewAgentService],
  exports: [ReviewAgentService],
})
export class ReviewAgentModule {}
