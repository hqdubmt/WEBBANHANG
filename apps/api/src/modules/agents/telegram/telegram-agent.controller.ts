import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramBotService } from './telegram-bot.service';
import { Public } from '../../auth/auth.guard';

@ApiTags('Agents - Telegram')
@Controller('agents/telegram')
export class TelegramAgentController {
  constructor(
    private readonly svc: TelegramAgentService,
    private readonly bot: TelegramBotService,
  ) {}

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

  @Post('tiktok-videos')
  @ApiOperation({ summary: 'Tạo video 9:16 từ deal → đăng Telegram + Discord + lưu để up TikTok' })
  async tiktokVideos(@Query('count') count?: string) {
    return this.svc.generateTikTokBatch(count ? parseInt(count) : 3);
  }

  // Telegram Bot Webhook — Telegram gọi endpoint này khi có tin nhắn
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Telegram bot webhook receiver' })
  async webhook(@Body() update: any) {
    await this.bot.handleUpdate(update);
    return { ok: true };
  }

  @Post('webhook/register')
  @ApiOperation({ summary: 'Đăng ký webhook URL với Telegram' })
  async registerWebhook(@Query('url') url: string) {
    const ok = await this.bot.registerWebhook(url);
    return { ok };
  }

  @Get('webhook/info')
  @ApiOperation({ summary: 'Xem trạng thái webhook hiện tại' })
  webhookInfo() {
    return this.bot.getWebhookInfo();
  }
}
