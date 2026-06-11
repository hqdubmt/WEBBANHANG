import { Controller, Get, Post } from '@nestjs/common';
import { PriceAgentService } from './price-agent.service';

@Controller('agents/price')
export class PriceAgentController {
  constructor(private readonly service: PriceAgentService) {}

  @Post('run')
  run() {
    return this.service.checkPrices();
  }

  @Get('alerts')
  alerts() {
    return this.service.getPendingAlerts();
  }
}
