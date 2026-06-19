import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramAgentService } from './telegram-agent.service';

@ApiTags('Agents - Telegram')
@Controller('agents/telegram')
export class TelegramAgentController {
  constructor(private readonly svc: TelegramAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy Telegram deals agent' })
  run() {
    return this.svc.runDailyDeals();
  }

  @Post('tiktok-shop')
  @ApiOperation({ summary: 'Post TikTok Shop promo lên Telegram + Discord' })
  tiktokShop() {
    return this.svc.postTikTokShop();
  }

  @Post('facebook-content')
  @ApiOperation({ summary: 'Gửi nội dung Facebook Groups về Telegram' })
  facebookContent() {
    return this.svc.sendFacebookGroupsContent(5);
  }
}
