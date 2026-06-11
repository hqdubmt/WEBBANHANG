import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeadHunterService, RawLead } from './lead-hunter.service';

@ApiTags('Agents')
@Controller('agents/lead-hunter')
export class LeadHunterController {
  constructor(private readonly service: LeadHunterService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy Lead Hunter thủ công' })
  run() {
    return this.service.huntLeads();
  }

  @Post('ingest')
  @ApiOperation({ summary: 'Nhập lead từ webhook/nguồn ngoài' })
  ingest(@Body() raw: RawLead) {
    return this.service.ingestLead(raw);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê leads' })
  stats() {
    return this.service.getLeadStats();
  }
}
