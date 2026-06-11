import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoJob } from '../../../database/entities/video-job.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { VideoOptimizerService } from './video-optimizer.service';
import { VideoOptimizerController } from './video-optimizer.controller';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoJob, AgentLog]), AiModule],
  controllers: [VideoOptimizerController],
  providers: [VideoOptimizerService],
  exports: [VideoOptimizerService],
})
export class VideoOptimizerModule {}
