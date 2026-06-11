import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { Content } from '../../../database/entities/content.entity';
import { AiModule } from '../../ai/ai.module';
import { PublisherAgentService } from './publisher-agent.service';
import { PublisherAgentController } from './publisher-agent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog, Content]), AiModule],
  providers: [PublisherAgentService],
  controllers: [PublisherAgentController],
  exports: [PublisherAgentService],
})
export class PublisherAgentModule {}
