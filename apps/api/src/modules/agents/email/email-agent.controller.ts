import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailAgentService } from './email-agent.service';

@ApiTags('Agents - Email')
@Controller('agents/email')
export class EmailAgentController {
  constructor(private readonly svc: EmailAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy email marketing agent' })
  run() {
    return this.svc.runDailyEmailCampaigns();
  }
}
