import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CompetitorMonitorService } from './competitor-monitor.service';

@ApiTags('Agent18 CompetitorMonitor')
@Controller('agents/competitor-monitor')
export class CompetitorMonitorController {
  constructor(private readonly svc: CompetitorMonitorService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê CompetitorMonitor' })
  stats() {
    return this.svc.getStats();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Cảnh báo giá đối thủ gần nhất' })
  alerts() {
    return this.svc.getAlerts();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy CompetitorMonitor thủ công' })
  run() {
    return this.svc.monitor();
  }
}
