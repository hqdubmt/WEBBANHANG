import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalesAgentService } from './sales-agent.service';
import { LeadPlatform } from '../../../database/entities/lead.entity';

@ApiTags('Agents')
@Controller('agents/sales')
export class SalesAgentController {
  constructor(private readonly service: SalesAgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Gửi tin nhắn cho AI Sales' })
  chat(
    @Body()
    body: {
      sessionId?: string;
      platform: LeadPlatform;
      platformUserId: string;
      message: string;
      customerName?: string;
    },
  ) {
    return this.service.handleMessage({
      sessionId: body.sessionId || `${body.platform}-${body.platformUserId}`,
      ...body,
    });
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: 'Xóa session chat' })
  clearSession(@Param('sessionId') sessionId: string) {
    this.service.clearSession(sessionId);
    return { message: 'Session cleared' };
  }
}
