import { Controller, Post, Get, Body, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramBotService } from './telegram-bot.service';
import { TikTokUploaderService } from './tiktok-uploader.service';
import { ZaloPersonalService } from './zalo-personal.service';
import { FacebookGroupsService } from './facebook-groups.service';
import { AiVideoPipelineService } from './ai-video-pipeline.service';
import { PriorityBrandsService } from './priority-brands.service';
import { Public } from '../../auth/auth.guard';

@ApiTags('Agents - Telegram')
@Controller('agents/telegram')
export class TelegramAgentController {
  constructor(
    private readonly svc: TelegramAgentService,
    private readonly bot: TelegramBotService,
    private readonly tiktok: TikTokUploaderService,
    private readonly zalo: ZaloPersonalService,
    private readonly fbGroups: FacebookGroupsService,
    private readonly aiVideoPipeline: AiVideoPipelineService,
    private readonly priorityBrands: PriorityBrandsService,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy Telegram deals agent' })
  run() {
    return this.svc.runDailyDeals();
  }

  @Post('priority-brands/refresh')
  @ApiOperation({ summary: 'Xóa cache sản phẩm ưu tiên (Con Cưng, THEFACESHOP) và scrape lại ngay' })
  async refreshPriorityBrands() {
    this.priorityBrands.invalidateCache();
    const products = await this.priorityBrands.getProducts(10);
    return { count: products.length, products: products.map(p => ({ name: p.name, price: p.price, url: p.url, brand: p.brand })) };
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

  // ─── AI Video Pipeline (Ollama + Piper TTS + FFmpeg) ─────────────────────

  @Post('ai-video/run')
  @ApiOperation({ summary: 'Chạy AI Video Pipeline: RSS/Shopee → Ollama → Piper TTS → FFmpeg → YouTube/FB Reels/TikTok → Sheets' })
  async aiVideoPipelineRun(@Query('count') count?: string) {
    return this.aiVideoPipeline.run(count ? parseInt(count) : 3);
  }

  // Telegram Bot Webhook — Telegram gọi endpoint này khi có tin nhắn
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Telegram bot webhook receiver' })
  async webhook(@Body() update: any, @Headers('x-telegram-bot-api-secret-token') secret: string) {
    // Xác thực secret token nếu đã cấu hình
    const expected = process.env.WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
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

  // ─── Zalo Personal (không cần API key) ───────────────────────────────────

  @Get('zalo/status')
  @ApiOperation({ summary: 'Trạng thái đăng nhập Zalo personal' })
  async zaloStatus() {
    const loggedIn = this.zalo.isLoggedIn() || await this.zalo.restoreSession();
    const groupCount = loggedIn ? await this.zalo.getGroupCount() : 0;
    return { loggedIn, groupCount };
  }

  @Post('zalo/login')
  @ApiOperation({ summary: 'Lấy QR Zalo — gửi qua Telegram để quét (không cần API key)' })
  async zaloLogin() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !chatId) return { ok: false, message: 'Chưa cấu hình Telegram bot' };
    this.zalo.loginWithQR(token, chatId);
    return { ok: true, message: 'QR Zalo đang được tạo — kiểm tra Telegram' };
  }

  @Post('zalo/post')
  @ApiOperation({ summary: 'Đăng deal vào tất cả Zalo groups (không cần API key)' })
  async zaloPost(@Query('count') count?: string) {
    const n = count ? parseInt(count) : 3;
    const products = await this.svc.getProductsForPosting(n);
    const sent = await this.zalo.postToGroups(products);
    return { sent, products: products.length };
  }

  @Post('zalo/logout')
  @ApiOperation({ summary: 'Xoá session Zalo' })
  zaloLogout() {
    this.zalo.logout();
    return { ok: true };
  }

  // ─── Facebook Groups (Playwright, không cần API key) ─────────────────────

  @Get('fb-groups/status')
  @ApiOperation({ summary: 'Trạng thái đăng nhập Facebook Groups' })
  fbGroupsStatus() {
    return { loggedIn: this.fbGroups.isLoggedIn() };
  }

  @Post('fb-groups/login')
  @ApiOperation({ summary: 'Hướng dẫn lấy Facebook cookie để đăng nhập không cần API' })
  async fbGroupsLogin() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !chatId) return { ok: false };
    await this.fbGroups.loginWithPlaywright(token, chatId);
    return { ok: true, message: 'Hướng dẫn đã gửi vào Telegram' };
  }

  @Post('fb-groups/set-cookie')
  @ApiOperation({ summary: 'Set Facebook cookie string (từ browser DevTools)' })
  async fbGroupsSetCookie(@Body() body: { cookie: string }) {
    const ok = await this.fbGroups.setCookiesFromString(body.cookie);
    return { ok, message: ok ? 'Đăng nhập Facebook thành công' : 'Cookie không hợp lệ' };
  }

  @Post('fb-groups/post')
  @ApiOperation({ summary: 'Auto-post vào Facebook Groups (Playwright, không cần API key)' })
  async fbGroupsPost(@Query('count') count?: string) {
    const groupUrls = (process.env.FACEBOOK_GROUP_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (groupUrls.length === 0) {
      return { sent: 0, message: 'Chưa cấu hình FACEBOOK_GROUP_URLS trong .env' };
    }
    const n = count ? parseInt(count) : 3;
    const products = await this.svc.getProductsForPosting(n);
    const sent = await this.fbGroups.postToGroups(products, groupUrls);
    return { sent, groups: groupUrls.length };
  }

  @Post('fb-groups/logout')
  @ApiOperation({ summary: 'Xoá session Facebook Groups' })
  fbGroupsLogout() {
    this.fbGroups.logout();
    return { ok: true };
  }
}
