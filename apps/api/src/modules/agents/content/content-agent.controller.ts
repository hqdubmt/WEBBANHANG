import { Controller, Post, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContentAgentService } from './content-agent.service';

@ApiTags('Agents')
@Controller('agents/content')
export class ContentAgentController {
  constructor(private readonly service: ContentAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Tạo nội dung hàng loạt' })
  run() {
    return this.service.createBulkContent();
  }

  @Get('pending')
  @ApiOperation({ summary: 'Danh sách bài chờ đăng' })
  pending() {
    return this.service.getPendingContents();
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Đăng bài lên mạng xã hội' })
  publish(@Param('id') id: string) {
    return this.service.publishContent(id);
  }
}
