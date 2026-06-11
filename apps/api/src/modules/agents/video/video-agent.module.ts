import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoJob } from '../../../database/entities/video-job.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { VideoAgentService } from './video-agent.service';
import { VideoAgentController } from './video-agent.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoJob, AgentLog]), AiModule, ProductsModule],
  controllers: [VideoAgentController],
  providers: [VideoAgentService],
  exports: [VideoAgentService],
})
export class VideoAgentModule {}
