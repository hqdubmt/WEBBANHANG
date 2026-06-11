import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RepricingService } from './repricing.service';

@ApiTags('Agent20 RepricingAgent')
@Controller('agents/repricing')
export class RepricingController {
  constructor(private readonly svc: RepricingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê RepricingAgent' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy RepricingAgent thủ công' })
  run() {
    return this.svc.reprice();
  }
}
