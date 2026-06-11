import { Controller, Get, Post } from '@nestjs/common';
import { MasterAgentService } from './master-agent.service';

@Controller('agents/master')
export class MasterAgentController {
  constructor(private readonly service: MasterAgentService) {}

  @Post('run')
  run() {
    return this.service.evaluateAndAssign();
  }

  @Get('kpi')
  kpi() {
    return this.service.getSystemKpi();
  }
}
