import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketplaceOptimizerService } from './marketplace-optimizer.service';

@ApiTags('Agent22 MarketplaceOptimizer')
@Controller('agents/marketplace-optimizer')
export class MarketplaceOptimizerController {
  constructor(private readonly svc: MarketplaceOptimizerService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê MarketplaceOptimizer' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy MarketplaceOptimizer thủ công' })
  run() {
    return this.svc.optimize();
  }
}
