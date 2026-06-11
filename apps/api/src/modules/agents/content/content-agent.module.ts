import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../../database/entities/content.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';
import { ContentAgentController } from './content-agent.controller';
import { ContentAgentService } from './content-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Content, AgentLog]), AiModule, ProductsModule],
  controllers: [ContentAgentController],
  providers: [ContentAgentService],
  exports: [ContentAgentService],
})
export class ContentAgentModule {}
