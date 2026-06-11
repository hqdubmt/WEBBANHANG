import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra kết nối AI' })
  async health() {
    try {
      const result = await this.aiService.complete('Trả lời "OK" bằng 1 từ');
      return { status: 'ok', provider: result.provider, response: result.content };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat với AI Sales' })
  async chat(@Body() body: { messages: any[]; systemPrompt?: string }) {
    return this.aiService.chat(body.messages, body.systemPrompt);
  }
}
