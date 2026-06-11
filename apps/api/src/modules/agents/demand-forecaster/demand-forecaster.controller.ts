import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DemandForecasterService } from './demand-forecaster.service';

@ApiTags('Agent19 DemandForecaster')
@Controller('agents/demand-forecaster')
export class DemandForecasterController {
  constructor(private readonly svc: DemandForecasterService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê DemandForecaster' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy DemandForecaster thủ công' })
  run() {
    return this.svc.forecast();
  }
}
