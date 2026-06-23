import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoAutomationRun } from './entities/video-automation-run.entity';
import { VideoSource } from './entities/video-source.entity';
import { VideoAutomationService } from './video-automation.service';
import { VideoAutomationController } from './video-automation.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoAutomationRun, VideoSource]), AiModule],
  controllers: [VideoAutomationController],
  providers: [VideoAutomationService],
  exports: [VideoAutomationService],
})
export class VideoAutomationModule {}
