import { Controller, Post, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrmAgentService } from './crm-agent.service';

@ApiTags('Agents')
@Controller('agents/crm')
export class CrmAgentController {
  constructor(private readonly service: CrmAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy CRM Agent thủ công' })
  run() {
    return this.service.analyzeCrm();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê CRM' })
  stats() {
    return this.service.getCrmStats();
  }

  @Get('customer/:id')
  @ApiOperation({ summary: 'Phân tích hồ sơ khách hàng' })
  customerProfile(@Param('id') id: string) {
    return this.service.getCustomerProfile(id);
  }
}
