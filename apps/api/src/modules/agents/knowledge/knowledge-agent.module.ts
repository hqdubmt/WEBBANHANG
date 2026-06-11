import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { Knowledge } from '../../../database/entities/knowledge.entity';
import { AiModule } from '../../ai/ai.module';
import { RagModule } from '../../rag/rag.module';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { KnowledgeAgentController } from './knowledge-agent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog, Knowledge]), AiModule, RagModule],
  providers: [KnowledgeAgentService],
  controllers: [KnowledgeAgentController],
  exports: [KnowledgeAgentService],
})
export class KnowledgeAgentModule {}
