import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MobileEngagementService } from './mobile-engagement.service';

@ApiTags('Agent23 MobileEngagement')
@Controller('agents/mobile-engagement')
export class MobileEngagementController {
  constructor(private readonly svc: MobileEngagementService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê MobileEngagement' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy MobileEngagement thủ công' })
  run() {
    return this.svc.analyze();
  }
}
