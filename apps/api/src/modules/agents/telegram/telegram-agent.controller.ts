import { Controller, Post, Get, Body, Query, Param, Headers, Redirect, UnauthorizedException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramBotService } from './telegram-bot.service';
import { TikTokUploaderService } from './tiktok-uploader.service';
import { ZaloPersonalService } from './zalo-personal.service';
import { FacebookGroupsService, CONCUNG_TARGET_GROUPS_FILE } from './facebook-groups.service';
import { FacebookGroupsMyPhamService } from './facebook-groups-mypham.service';
import { AiVideoPipelineService } from './ai-video-pipeline.service';
import { PriorityBrandsService } from './priority-brands.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';
import { RecycleService } from './recycle.service';
import { AiRankingAgentService } from './ai-ranking-agent.service';
import { KillSwitchService } from './kill-switch.service';
import { SelfOptimizationEngineService } from './self-optimization-engine.service';
import { TikTokAdsLayerService } from './tiktok-ads-layer.service';
import { AutoBoostService } from './auto-boost.service';
import { AutoKillService } from './auto-kill.service';
import { ContentRankEngineService } from './content-rank-engine.service';
import { MicroDistributionService } from './micro-distribution.service';
import { DistributionWeightService } from './distribution-weight.service';
import { RevenueBrainService } from './revenue-brain.service';
import { AutonomousDecisionService } from './autonomous-decision.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { AutoScaleService } from './auto-scale.service';
import { AutoDownrankService } from './auto-downrank.service';
import { SelfRegulationService } from './self-regulation.service';
import { EventCollectorService } from './event-collector.service';
import { Public } from '../../auth/auth.guard';
import { FanpageContentService } from './fanpage-content.service';
import { FanpageReceptionService } from './fanpage-reception.service';

@ApiTags('Agents - Telegram')
@Controller('agents/telegram')
export class TelegramAgentController {
  constructor(
    private readonly svc: TelegramAgentService,
    private readonly bot: TelegramBotService,
    private readonly tiktok: TikTokUploaderService,
    private readonly zalo: ZaloPersonalService,
    private readonly fbGroups: FacebookGroupsService,
    private readonly fbGroupsMyPham: FacebookGroupsMyPhamService,
    private readonly aiVideoPipeline: AiVideoPipelineService,
    private readonly priorityBrands: PriorityBrandsService,
    private readonly tracker: AffiliateTrackerService,
    private readonly abTest: ContentVariantService,
    private readonly recycle: RecycleService,
    private readonly aiRanking: AiRankingAgentService,
    private readonly killSwitch: KillSwitchService,
    private readonly selfOpt: SelfOptimizationEngineService,
    private readonly tiktokAdsLayer: TikTokAdsLayerService,
    private readonly autoBoost: AutoBoostService,
    private readonly autoKill: AutoKillService,
    private readonly rankEngine: ContentRankEngineService,
    private readonly microDist: MicroDistributionService,
    private readonly distWeight: DistributionWeightService,
    private readonly revenueBrain: RevenueBrainService,
    private readonly autonomousDecision: AutonomousDecisionService,
    private readonly productLifecycle: ProductLifecycleService,
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly autoScale: AutoScaleService,
    private readonly autoDownrank: AutoDownrankService,
    private readonly selfRegulation: SelfRegulationService,
    private readonly eventCollector: EventCollectorService,
    private readonly fanpageContent: FanpageContentService,
    private readonly fanpageReception: FanpageReceptionService,
  ) {}

  @Public()
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

  @Get('fanpage/preview')
  @ApiOperation({ summary: 'Xem trước nội dung deal + engagement sẽ đăng (không đăng thật)' })
  fanpagePreview() {
    const deal = this.fanpageContent.buildDealPost({
      name: 'Kem Chống Nắng The Face Shop UV Mild Sun Cream SPF 50+',
      price: 189000,
      category: 'Làm đẹp',
      brand: 'THEFACESHOP',
      discount: 25,
      affiliateLink: 'https://go.isclix.com/deep_link/v5/SAMPLE',
    });
    const engagement = this.fanpageContent.nextEngagementPost();
    return { deal, engagement };
  }

  @Post('fanpage/engagement')
  @ApiOperation({ summary: 'Đăng ngay 1 bài engagement lên Facebook Fanpage (poll/tips/relatable)' })
  async fanpageEngagement() {
    return this.svc.runFanpageEngagementPost();
  }

  @Post('fanpage/deal')
  @ApiOperation({ summary: 'Đăng ngay 1 sản phẩm thật lên Facebook Fanpage với template mới' })
  async fanpageDeal() {
    return this.svc.scrapeAndDistribute(1);
  }

  @Post('fanpage/story')
  @ApiOperation({ summary: 'Test đăng 1 Facebook Story (Tin) bằng ảnh URL' })
  async fanpageStory(@Query('image') image?: string) {
    const imageUrl = image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1080&h=1920&fit=crop';
    const ok = await this.svc.postFacebookStory(imageUrl);
    return { success: ok };
  }

  // ─── Facebook Webhook (nhận comment/reaction từ fanpage) ────────────────────

  @Public()
  @Get('fb-webhook')
  @ApiOperation({ summary: 'Facebook webhook verify (GET) — Facebook gọi để xác thực' })
  fbWebhookVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const result = this.fanpageReception.verifyWebhook(mode, token, challenge);
    if (result !== null) return parseInt(result, 10);
    throw new UnauthorizedException('Invalid verify token');
  }

  @Public()
  @Post('fb-webhook')
  @ApiOperation({ summary: 'Facebook webhook events (POST) — nhận comment/reaction realtime' })
  async fbWebhookEvent(@Body() body: any) {
    await this.fanpageReception.handleWebhookEvent(body);
    return { ok: true };
  }

  @Get('fanpage/engagement-stats')
  @ApiOperation({ summary: 'Top bài có engagement cao nhất + thống kê auto-reply' })
  async fanpageEngagementStats() {
    const [topPosts, autoReplies] = await Promise.all([
      this.fanpageReception.getTopPosts(10),
      this.fanpageReception.getAutoReplyStats(),
    ]);
    return { topPosts, autoReplies };
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

  @Public()
  @Get('fb-groups/status')
  @ApiOperation({ summary: 'Trạng thái đăng nhập Facebook Groups' })
  fbGroupsStatus() {
    return { loggedIn: this.fbGroups.isLoggedIn() };
  }

  @Public()
  @Post('fb-groups/load-session')
  @ApiOperation({ summary: 'Load cookie session từ file /tmp/fb_session.json (không cần Playwright)' })
  async fbGroupsLoadSession() {
    const ok = await this.fbGroups.ensureLoggedIn();
    return { ok, loggedIn: this.fbGroups.isLoggedIn(), message: ok ? 'Session hợp lệ ✅' : 'Session không hợp lệ hoặc file chưa tồn tại' };
  }

  @Public()
  @Post('fb-groups/login')
  @ApiOperation({ summary: 'Kích hoạt đăng nhập Facebook bằng FACEBOOK_EMAIL/FACEBOOK_PASSWORD trong .env' })
  async fbGroupsLogin() {
    // Thử load session từ file trước
    const sessionOk = await this.fbGroups.ensureLoggedIn();
    if (sessionOk) return { ok: true, message: 'Session cookie hợp lệ ✅ (không cần login lại)' };
    const email = process.env.FACEBOOK_EMAIL;
    const password = process.env.FACEBOOK_PASSWORD;
    if (!email || !password) return { ok: false, message: 'Chưa cấu hình FACEBOOK_EMAIL / FACEBOOK_PASSWORD trong .env' };
    const ok = await this.fbGroups.loginWithCredentials(email, password);
    return { ok, message: ok ? 'Đăng nhập Facebook thành công ✅' : 'Đăng nhập thất bại — kiểm tra email/password hoặc tắt 2FA' };
  }

  @Public()
  @Post('fb-groups/post')
  @ApiOperation({ summary: 'Auto-post vào Facebook Groups (Playwright, không cần API key)' })
  async fbGroupsPost(
    @Query('count') count?: string,
    @Query('limit') limit?: string,
    @Query('urls') urls?: string,
    @Query('useTargetList') useTargetList?: string,
  ) {
    let groupUrls: string[] = [];
    if (urls) {
      groupUrls = urls.split(',').map(s => s.trim()).filter(Boolean);
    } else if (useTargetList === 'true' || useTargetList === '1') {
      const maxG = limit ? parseInt(limit) : 20;
      const records = this.fbGroups.getMemberGroupsForPosting(maxG);
      groupUrls = records.map(r => r.url);
    } else {
      groupUrls = (process.env.FACEBOOK_GROUP_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (groupUrls.length === 0) groupUrls = await this.svc.getGroupUrlsPublic();
      if (groupUrls.length === 0) {
        // Fallback: dùng target list nếu có
        const records = this.fbGroups.getMemberGroupsForPosting(20);
        groupUrls = records.map(r => r.url);
      }
    }
    if (groupUrls.length === 0) {
      return { sent: 0, message: 'Chưa có group nào — chạy /fb-groups/scan trước' };
    }
    const maxGroups = limit ? parseInt(limit) : groupUrls.length;
    const targets = groupUrls.slice(0, maxGroups);
    const n = count ? parseInt(count) : 1;
    const products = await this.svc.getProductsForPosting(n);
    const sent = await this.fbGroups.postToGroups(products, targets);
    // Cập nhật lastPostedAt cho các group đã post
    if (sent > 0) {
      for (const url of targets.slice(0, sent)) {
        const slug = url.match(/\/groups\/([^/?&#]+)/)?.[1] || url;
        this.fbGroups.markGroupPosted(slug);
      }
    }
    return { sent, groups: targets.length, tried: targets.slice(0, 5) };
  }

  @Public()
  @Post('fb-groups/scan')
  @ApiOperation({ summary: 'Tự động quét + auto-join groups liên quan fanpage, lưu vào target list' })
  async fbGroupsScan(@Query('keywords') keywords?: string) {
    const kws = keywords
      ? keywords.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    return this.svc.runGroupScanAndJoin(kws);
  }

  @Public()
  @Get('fb-groups/targets')
  @ApiOperation({ summary: 'Xem danh sách target groups đã join' })
  fbGroupsTargets() {
    return { groups: this.fbGroups.loadTargetGroups() };
  }


  @Public()
  @Post('fb-groups/targets/add')
  @ApiOperation({ summary: 'Thêm group vào target list thủ công' })
  fbGroupsTargetAdd(@Query('url') url: string, @Query('name') name?: string) {
    if (!url) return { ok: false, message: 'Thiếu url' };
    const rec = this.fbGroups.addTargetGroup(url, name);
    return { ok: true, group: rec };
  }

  @Public()
  @Post('fb-groups/targets/remove')
  @ApiOperation({ summary: 'Xóa group khỏi target list' })
  fbGroupsTargetRemove(@Query('slug') slug: string) {
    const ok = this.fbGroups.removeTargetGroup(slug);
    return { ok };
  }

  @Public()
  @Post('fb-groups/invite-reactors')
  @ApiOperation({ summary: 'Mời người react fanpage posts theo dõi fanpage (Graph API)' })
  async fbGroupsInviteReactors() {
    return this.fbGroups.inviteGroupReactors([]);
  }

  // ─── Campaign Sale Con Cưng (fanpage riêng, group Mẹ & Bé riêng) ───────────

  @Public()
  @Get('fb-groups/live-identity')
  @ApiOperation({ summary: 'Kiểm tra danh tính đang active thực tế trên session (không điều hướng)' })
  async fbGroupsLiveIdentity() {
    return this.fbGroups.getLiveIdentity();
  }

  @Public()
  @Get('fb-groups/inspect-timeline')
  @ApiOperation({ summary: 'Chụp + đọc text các bài viết hiện có trên timeline 1 Page — verify bài đã đăng thật chưa' })
  async fbGroupsInspectTimeline(@Query('pageId') pageId: string) {
    return this.fbGroups.inspectOwnTimeline(pageId);
  }

  @Public()
  @Post('fb-groups/switch-identity')
  @ApiOperation({ summary: 'Chuyển danh tính active (đăng bài với tư cách) sang 1 Page khác trong cùng session — dùng để khôi phục thủ công nếu cron bị lệch danh tính' })
  async fbGroupsSwitchIdentity(@Query('pageId') pageId: string) {
    const ok = await this.fbGroups.switchActiveIdentity(pageId);
    return { ok };
  }

  @Public()
  @Post('fb-groups/concung/scan')
  @ApiOperation({ summary: 'Quét + auto-join group Mẹ & Bé cho campaign Sale Con Cưng' })
  async fbGroupsConcungScan(@Query('keywords') keywords?: string) {
    const kws = keywords
      ? keywords.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    return this.svc.runConcungGroupScanAndJoin(kws);
  }

  @Public()
  @Get('fb-groups/concung/targets')
  @ApiOperation({ summary: 'Xem danh sách group Mẹ & Bé đã join cho campaign Con Cưng' })
  fbGroupsConcungTargets() {
    return { groups: this.fbGroups.loadTargetGroups(CONCUNG_TARGET_GROUPS_FILE) };
  }

  @Public()
  @Post('fb-groups/concung/post')
  @ApiOperation({ summary: 'Đăng campaign Con Cưng vào group Mẹ & Bé ngay (dùng fanpage Sale Con Cưng)' })
  async fbGroupsConcungPost(@Query('limit') limit?: string) {
    return this.svc.runConcungGroupAutoPost(limit ? parseInt(limit) : 10);
  }

  @Public()
  @Post('fb-groups/concung/rejoin')
  @ApiOperation({ summary: 'Join lại group Mẹ & Bé dưới danh tính Sale Con Cưng (fix lỗi join nhầm identity ở lần scan đầu)' })
  async fbGroupsConcungRejoin(@Query('batch') batch?: string) {
    return this.svc.runConcungRejoinGroups(batch ? parseInt(batch) : 25);
  }

  @Public()
  @Post('fb-groups/concung/timeline/deal')
  @ApiOperation({ summary: 'Đăng 1 bài deal Con Cưng lên timeline fanpage Sale Con Cưng ngay' })
  async fbGroupsConcungTimelineDeal() {
    return this.svc.runConcungTimelineDealPost();
  }

  @Public()
  @Post('fb-groups/concung/timeline/engagement')
  @ApiOperation({ summary: 'Đăng 1 bài engagement (tips nuôi con) lên timeline fanpage Sale Con Cưng ngay' })
  async fbGroupsConcungTimelineEngagement() {
    return this.svc.runConcungTimelineEngagementPost();
  }

  @Public()
  @Post('mypham/timeline/deal')
  @ApiOperation({ summary: 'Đăng 1 bài deal mỹ phẩm lên timeline fanpage Chuyên Sale Mỹ Phẩm ngay (Graph API)' })
  async myPhamTimelineDeal() {
    return this.svc.runMyPhamTimelineDealPost();
  }

  @Public()
  @Post('mypham/timeline/engagement')
  @ApiOperation({ summary: 'Đăng 1 bài engagement (tips skincare) lên timeline fanpage Chuyên Sale Mỹ Phẩm ngay (Graph API)' })
  async myPhamTimelineEngagement() {
    return this.svc.runMyPhamTimelineEngagementPost();
  }

  @Public()
  @Post('mypham/follower-cta')
  @ApiOperation({ summary: 'Đăng bài CTA kêu gọi follow trang Chuyên Sale Mỹ Phẩm ngay (Graph API)' })
  async myPhamFollowerCTA() {
    return this.svc.runMyPhamFollowerCTA();
  }

  @Public()
  @Post('mypham/invite-reactors')
  @ApiOperation({ summary: 'Mời người đã react bài đăng gần đây follow trang Chuyên Sale Mỹ Phẩm (Graph API)' })
  async myPhamInviteReactors() {
    return this.svc.runMyPhamInviteReactors();
  }

  // ─── Group cho Chuyên Sale Mỹ Phẩm — tài khoản cá nhân #2 riêng (Playwright) ────────────────

  @Public()
  @Post('mypham/group/login')
  @ApiOperation({ summary: 'Kích hoạt đăng nhập Facebook tài khoản #2 (FACEBOOK_MYPHAM_EMAIL/PASSWORD)' })
  async myPhamGroupLogin() {
    const sessionOk = await this.fbGroupsMyPham.ensureLoggedIn();
    if (sessionOk) return { ok: true, message: 'Session tài khoản #2 hợp lệ ✅ (không cần login lại)' };
    const email = process.env.FACEBOOK_MYPHAM_EMAIL;
    const password = process.env.FACEBOOK_MYPHAM_PASSWORD;
    if (!email || !password) return { ok: false, message: 'Chưa cấu hình FACEBOOK_MYPHAM_EMAIL / FACEBOOK_MYPHAM_PASSWORD trong .env' };
    const ok = await this.fbGroupsMyPham.loginWithCredentials(email, password);
    return { ok, message: ok ? 'Đăng nhập tài khoản #2 thành công ✅' : 'Đăng nhập thất bại — kiểm tra email/password hoặc tắt 2FA' };
  }

  @Public()
  @Post('mypham/group/scan')
  @ApiOperation({ summary: 'Quét + auto-join group mỹ phẩm/làm đẹp cho campaign Chuyên Sale Mỹ Phẩm' })
  async myPhamGroupScan(@Query('keywords') keywords?: string) {
    const kws = keywords
      ? keywords.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    return this.svc.runMyPhamGroupScanAndJoin(kws);
  }

  @Public()
  @Get('mypham/group/targets')
  @ApiOperation({ summary: 'Xem danh sách group mỹ phẩm đã join cho campaign Chuyên Sale Mỹ Phẩm' })
  myPhamGroupTargets() {
    return { groups: this.fbGroupsMyPham.loadTargetGroups() };
  }

  @Public()
  @Post('mypham/group/post')
  @ApiOperation({ summary: 'Đăng campaign mỹ phẩm vào group ngay (dùng fanpage Chuyên Sale Mỹ Phẩm)' })
  async myPhamGroupPost(@Query('limit') limit?: string) {
    return this.svc.runMyPhamGroupAutoPost(limit ? parseInt(limit) : 10);
  }

  @Public()
  @Post('fb-groups/discover')
  @ApiOperation({ summary: 'Tự động tìm Facebook Groups shopping VN và lưu Redis 7 ngày' })
  async fbGroupsDiscover() {
    return this.svc.runGroupDiscoveryNow();
  }

  @Public()
  @Post('fb-groups/logout')
  @ApiOperation({ summary: 'Xoá session Facebook Groups' })
  fbGroupsLogout() {
    this.fbGroups.logout();
    return { ok: true };
  }

  // ─── Follower Growth ─────────────────────────────────────────────────────

  @Post('follower-growth/run')
  @ApiOperation({ summary: 'Kích hoạt thủ công: CTA post + invite likers + đăng groups' })
  async runFollowerGrowth() {
    return this.svc.runFollowerGrowthNow();
  }

  // ─── Optimization Layer ──────────────────────────────────────────────────

  @Public()
  @Get('go/:productId')
  @ApiOperation({ summary: 'Affiliate click tracker — redirect tới affiliate link và ghi nhận click' })
  async trackAndRedirect(
    @Param('productId') productId: string,
    @Query('src') src: string,
    @Res() res: Response,
  ) {
    const source = src || 'unknown';
    const affiliateLink = this.tracker.trackClick(productId, source);
    if (!affiliateLink) {
      res.redirect('https://tiki.vn');
      return;
    }
    res.redirect(302, affiliateLink);
  }

  @Get('tracker/stats')
  @ApiOperation({ summary: 'Xem thống kê click tracking — clicks, CTR theo kênh, top sản phẩm' })
  trackerStats() {
    return this.tracker.getStats();
  }

  @Get('ab/stats')
  @ApiOperation({ summary: 'Xem kết quả A/B test nội dung — variant nào CTR cao nhất' })
  abStats() {
    return this.abTest.getStats();
  }

  @Get('recycle/stats')
  @ApiOperation({ summary: 'Xem lịch sử post và top performers để recycle' })
  recycleStats() {
    return this.recycle.getStats();
  }

  @Post('recycle/run')
  @ApiOperation({ summary: 'Chạy Recycle Engine — tái đăng top bài 3-7 ngày trước' })
  async recycleRun() {
    return this.svc.runRecycleCycle();
  }

  @Post('pipeline/run')
  @ApiOperation({ summary: 'Chạy full Optimization Pipeline: Score → Hook → A/B → Track → Publish → Recycle' })
  async pipelineRun(@Query('count') count?: string) {
    return this.svc.runOptimizedPipeline(count ? parseInt(count) : 10);
  }

  // ─── AI Self-Optimization Layer ──────────────────────────────────────────

  @Get('self-opt/status')
  @ApiOperation({ summary: 'Trạng thái Self-Optimization Engine: boost queue, rewrite queue, last loop result' })
  selfOptStatus() {
    return this.selfOpt.getStatus();
  }

  @Post('self-opt/run')
  @ApiOperation({ summary: 'Chạy ngay Self-Optimization Loop (bình thường tự động mỗi 4 tiếng)' })
  async selfOptRun() {
    return this.selfOpt.runLoop();
  }

  @Post('boost/run')
  @ApiOperation({ summary: 'Boost top sản phẩm trong boost queue — đăng lại với hook tốt nhất' })
  async boostRun() {
    return this.svc.runBoostCycle();
  }

  @Get('kill-switch/stats')
  @ApiOperation({ summary: 'Xem danh sách sản phẩm đã bị kill switch dừng (CTR quá thấp)' })
  killSwitchStats() {
    return this.killSwitch.getStats();
  }

  @Post('kill-switch/revive/:productId')
  @ApiOperation({ summary: 'Khôi phục sản phẩm đã bị kill — cho phép đăng lại' })
  killSwitchRevive(@Param('productId') productId: string) {
    this.killSwitch.revive(productId);
    return { ok: true, productId };
  }

  @Get('ai-ranking/:productId')
  @ApiOperation({ summary: 'Xem quyết định AI ranking cho một sản phẩm (POST|BOOST|REWRITE|SKIP)' })
  async aiRankingDecide(
    @Param('productId') productId: string,
    @Query('name') name?: string,
    @Query('category') category?: string,
  ) {
    const product = this.tracker.getProduct(productId);
    return this.aiRanking.decide(
      productId,
      name || product?.name || 'Unknown',
      category || product?.category || 'Unknown',
    );
  }

  // ─── TikTok Ads AI Layer ──────────────────────────────────────────────────

  @Get('tiktok-ads/status')
  @ApiOperation({ summary: 'Trạng thái TikTok Ads AI Layer: test engine, boost/kill queues, leaderboard, channel weights' })
  tiktokAdsStatus() {
    return this.tiktokAdsLayer.getStatus();
  }

  @Post('tiktok-ads/run')
  @ApiOperation({ summary: 'Chạy ngay TikTok Ads AI Loop: sync → rank → boost/kill → recalibrate weights' })
  async tiktokAdsRun() {
    return this.tiktokAdsLayer.triggerLoop();
  }

  @Get('tiktok-ads/leaderboard')
  @ApiOperation({ summary: 'Bảng xếp hạng content theo TikTok Ads AI score (BOOST/HOLD/STOP)' })
  tiktokAdsLeaderboard() {
    return this.rankEngine.getLeaderboard(20);
  }

  @Get('tiktok-ads/distribution')
  @ApiOperation({ summary: 'Xem phân phối traffic từng content: TEST(10%) / EXPANDING(50%) / FULL(100%)' })
  tiktokAdsDistribution() {
    return this.microDist.getDistributionSummary();
  }

  @Get('tiktok-ads/boost-queue')
  @ApiOperation({ summary: 'Danh sách content WIN đang chờ boost (top score)' })
  tiktokAdsBoostQueue() {
    return this.autoBoost.getStats();
  }

  @Get('tiktok-ads/kill-list')
  @ApiOperation({ summary: 'Danh sách content bị TikTok AI Layer kill (score < 50)' })
  tiktokAdsKillList() {
    return this.autoKill.getStats();
  }

  @Post('tiktok-ads/kill-revive/:productId')
  @ApiOperation({ summary: 'Phục hồi content bị TikTok AI Layer kill' })
  tiktokAdsRevive(@Param('productId') productId: string) {
    const ok = this.autoKill.revive(productId);
    return { ok, productId };
  }

  @Get('tiktok-ads/weights')
  @ApiOperation({ summary: 'Xem và so sánh distribution weights theo kênh (Telegram/Facebook/Discord/...)' })
  tiktokAdsWeights() {
    return this.distWeight.getAllWeights();
  }

  @Post('tiktok-ads/weights/reset')
  @ApiOperation({ summary: 'Reset distribution weights về mặc định (Telegram:1.0, Facebook:0.8, ...)' })
  tiktokAdsWeightsReset() {
    this.distWeight.resetToDefault();
    return { ok: true, weights: this.distWeight.getAllWeights() };
  }

  // ─── Revenue Brain (Fully Autonomous Revenue AI) ──────────────────────────

  @Get('revenue/status')
  @ApiOperation({ summary: 'Trạng thái Revenue Brain: lifecycle, decisions, scale, downrank, events' })
  revenueStatus() {
    return this.revenueBrain.getStatus();
  }

  @Post('revenue/run')
  @ApiOperation({ summary: 'Chạy ngay Revenue Brain Loop: lifecycle → profit score → AI decision → scale/downrank → distribution' })
  async revenueRun() {
    return this.revenueBrain.triggerLoop();
  }

  @Get('revenue/report')
  @ApiOperation({ summary: 'Báo cáo analytics: top sản phẩm, kênh hiệu quả, giờ đăng tốt nhất' })
  revenueReport() {
    return this.revenueBrain.getAnalyticsReport();
  }

  @Get('revenue/brief')
  @ApiOperation({ summary: 'Daily brief text — tóm tắt hệ thống để gửi Telegram' })
  revenueBrief() {
    return { brief: this.revenueBrain.getDailyBrief() };
  }

  @Get('revenue/decisions')
  @ApiOperation({ summary: 'Tất cả quyết định AI: BOOST / HOLD / KILL với confidence score' })
  revenueDecisions() {
    return this.autonomousDecision.decideAll();
  }

  @Get('revenue/decisions/:productId')
  @ApiOperation({ summary: 'Quyết định AI cho 1 sản phẩm cụ thể' })
  revenueDecide(@Param('productId') productId: string) {
    return this.autonomousDecision.decide(productId);
  }

  @Get('revenue/lifecycle')
  @ApiOperation({ summary: 'Lifecycle stats: NEW/TEST/WINNER/LOSER count + top winners & losers' })
  revenueLifecycle() {
    return this.productLifecycle.getStats();
  }

  @Post('revenue/lifecycle/:productId/revive')
  @ApiOperation({ summary: 'Hồi phục sản phẩm LOSER về TEST phase để thử lại' })
  revenueLifecycleRevive(@Param('productId') productId: string) {
    const ok = this.productLifecycle.revive(productId);
    return { ok, productId };
  }

  @Get('revenue/scale')
  @ApiOperation({ summary: 'Danh sách WINNER đang được scale (tăng publish × multiplier)' })
  revenueScale() {
    return this.autoScale.getStats();
  }

  @Get('revenue/downrank')
  @ApiOperation({ summary: 'Danh sách LOSER bị downrank hoặc loại khỏi content queue' })
  revenueDownrank() {
    return this.autoDownrank.getStats();
  }

  @Get('revenue/regulation')
  @ApiOperation({ summary: 'Self-regulation stats: sản phẩm bị throttle, quality score thấp' })
  revenueRegulation() {
    return this.selfRegulation.getStats();
  }

  @Get('revenue/events')
  @ApiOperation({ summary: 'Event collector stats: tổng events, phân loại theo type' })
  revenueEvents() {
    return this.eventCollector.getStats();
  }

  @Get('revenue/events/hourly')
  @ApiOperation({ summary: 'Phân tích click/view/post theo giờ trong ngày (7 ngày gần nhất)' })
  revenueHourlyStats() {
    return this.eventCollector.getHourlyStats();
  }

  @Get('revenue/insight/:productId')
  @ApiOperation({ summary: 'AI giải thích vì sao sản phẩm bán tốt hay kém' })
  revenueInsight(@Param('productId') productId: string) {
    return this.revenueBrain.explainProduct(productId);
  }

  @Get('revenue/compare')
  @ApiOperation({ summary: 'So sánh 2 kênh phân phối: ?a=telegram&b=facebook' })
  revenueCompare(@Query('a') a = 'telegram', @Query('b') b = 'facebook') {
    return this.revenueBrain.compareChannels(a, b);
  }
}
