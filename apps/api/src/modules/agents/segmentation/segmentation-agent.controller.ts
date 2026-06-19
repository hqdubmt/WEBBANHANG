import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SegmentationAgentService } from './segmentation-agent.service';

@ApiTags('Agents - Segmentation')
@Controller('agents/segmentation')
export class SegmentationAgentController {
  constructor(private readonly svc: SegmentationAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy customer segmentation agent' })
  run() {
    return this.svc.runDailySegmentation();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê phân khúc khách hàng' })
  stats() {
    return this.svc.getSegmentStats();
  }
}
