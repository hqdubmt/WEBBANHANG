import { Controller, Get, Post } from '@nestjs/common';
import { TrendPredictorService } from './trend-predictor.service';

@Controller('agents/trend-predictor')
export class TrendPredictorController {
  constructor(private readonly service: TrendPredictorService) {}

  @Post('run')
  run(): Promise<any> {
    return this.service.predictTrends();
  }
}
