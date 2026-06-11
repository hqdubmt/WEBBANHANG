import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VideoOptimizerService } from './video-optimizer.service';

@ApiTags('Agent17 VideoOptimizer')
@Controller('agents/video-optimizer')
export class VideoOptimizerController {
  constructor(private readonly svc: VideoOptimizerService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê VideoOptimizer' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy VideoOptimizer thủ công' })
  run() {
    return this.svc.optimizeVideos();
  }
}
