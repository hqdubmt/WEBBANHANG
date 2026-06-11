import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublisherAgentService } from './publisher-agent.service';

@ApiTags('Agents')
@Controller('agents/publisher')
export class PublisherAgentController {
  constructor(private readonly service: PublisherAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Đăng bài tự động lên các kênh' })
  run() {
    return this.service.publishPendingContent();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê đăng bài' })
  stats() {
    return this.service.getPublishStats();
  }
}
