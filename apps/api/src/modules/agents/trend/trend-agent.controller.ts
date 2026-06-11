import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrendAgentService } from './trend-agent.service';

@ApiTags('Agents')
@Controller('agents/trend')
export class TrendAgentController {
  constructor(private readonly service: TrendAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy Trend Agent thủ công' })
  run(): Promise<any> {
    return this.service.scanTrends();
  }
}
