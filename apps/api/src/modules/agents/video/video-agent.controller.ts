import { Controller, Get, Post, Body } from '@nestjs/common';
import { VideoAgentService } from './video-agent.service';
import { VideoPlatform } from '../../../database/entities/video-job.entity';

@Controller('agents/video')
export class VideoAgentController {
  constructor(private readonly service: VideoAgentService) {}

  @Post('run')
  run(@Body('count') count?: number) {
    return this.service.createDailyVideos(count);
  }

  @Get('pending')
  pending() {
    return this.service.getPendingJobs();
  }
}
