import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnterpriseHealthService } from './enterprise-health.service';

@ApiTags('Agent24 EnterpriseHealth')
@Controller('agents/enterprise-health')
export class EnterpriseHealthController {
  constructor(private readonly svc: EnterpriseHealthService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê EnterpriseHealth' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy EnterpriseHealth thủ công' })
  run() {
    return this.svc.check();
  }
}
