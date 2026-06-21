import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramBotService } from './telegram-bot.service';
import { TikTokUploaderService } from './tiktok-uploader.service';
import { Public } from '../../auth/auth.guard';

@ApiTags('Agents - Telegram')
@Controller('agents/telegram')
export class TelegramAgentController {
  constructor(
    private readonly svc: TelegramAgentService,
    private readonly bot: TelegramBotService,
    private readonly tiktok: TikTokUploaderService,
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

  @Post('post-facebook')
  @ApiOperation({ summary: 'Đăng bài lên Facebook Fanpage qua Make.com (có ảnh imgbb)' })
  postFacebook(@Query('count') count?: string) {
    return this.svc.scrapeAndDistribute(count ? parseInt(count) : 3);
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

  // ─── TikTok Auto Upload (không cần API) ──────────────────────────────────

  @Get('tiktok/status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái đăng nhập TikTok' })
  tiktokStatus() {
    return { loggedIn: this.tiktok.hasSession() };
  }

  @Post('tiktok/login')
  @ApiOperation({ summary: 'Lấy QR code đăng nhập TikTok — gửi qua Telegram để quét' })
  async tiktokLogin() {
    const qrBuf = await this.tiktok.getLoginQRImage();
    if (!qrBuf) return { ok: false, message: 'Không lấy được QR code' };
    // Gửi QR qua Telegram để user quét
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (channelId) {
      await this.bot.sendPhoto(channelId, qrBuf, '📱 Quét QR này để đăng nhập TikTok!\n\n⏱ Có 3 phút. Dùng app TikTok → scan QR → OK!');
    }
    return { ok: true, message: 'QR code đã gửi vào Telegram — quét trong 3 phút' };
  }

  @Post('tiktok/upload')
  @ApiOperation({ summary: 'Upload video mới nhất từ /tmp/tiktok_videos/ lên TikTok' })
  async tiktokUpload(@Query('count') count?: string) {
    return this.tiktok.uploadLatestVideos(count ? parseInt(count) : 1);
  }

  @Post('tiktok/logout')
  @ApiOperation({ summary: 'Xoá session TikTok (logout)' })
  tiktokLogout() {
    this.tiktok.clearSession();
    return { ok: true };
  }
}
