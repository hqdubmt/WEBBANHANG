import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import Redis from 'ioredis';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { ImageGeneratorService } from './image-generator.service';
import { VideoGeneratorService } from './video-generator.service';
import { PriorityBrandsService } from './priority-brands.service';
import { ProductScoreService } from './product-score.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';
import { RecycleService } from './recycle.service';
import { KillSwitchService } from './kill-switch.service';
import { SelfOptimizationEngineService } from './self-optimization-engine.service';
import { FacebookGroupsService, CONCUNG_TARGET_GROUPS_FILE } from './facebook-groups.service';
import { FanpageContentService } from './fanpage-content.service';
import { FanpageReceptionService } from './fanpage-reception.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ScrapedProduct {
  name: string;
  price: number;
  image: string;
  category: string;
  brand?: string;
  affiliateLink: string;
  originalUrl: string;
  discount?: number;
  trackerId?: string; // tracker ID để ghi nhận click theo kênh (tele/discord/fb)
}

const TIKI_CATEGORIES = [
  { id: 1789, name: 'Điện thoại & Phụ kiện' },
  { id: 8322, name: 'Làm đẹp' },
  { id: 1520, name: 'Sức khỏe' },
  { id: 1883, name: 'Nhà cửa & Đời sống' },
  { id: 8371, name: 'Thời trang nữ' },
  { id: 1686, name: 'Thời trang nam' },
  { id: 4221, name: 'Thực phẩm & Đồ uống' },
  { id: 8594, name: 'Đồ chơi & Mẹ & Bé' },
  { id: 1815, name: 'Điện tử - Điện máy' },
  { id: 2549, name: 'Thể thao & Du lịch' },
];

const CAT_EMOJI: Record<string, string> = {
  'Điện thoại': '📱', 'Làm đẹp': '💄', 'Sức khỏe': '💊',
  'Thực phẩm': '🍎', 'Đồ chơi': '🧸', 'Nhà cửa': '🏠',
  'Thời trang nữ': '👗', 'Thời trang nam': '👔',
  'Điện tử': '💻', 'Thể thao': '⚽',
};

const HOOKS = [
  '🔥 HOT DEAL', '💥 GIÁ SỐC', '⚡ FLASH SALE',
  '🎯 MUA NGAY KẺO HẾT', '✨ ƯU ĐÃI HÔM NAY',
  '🛍️ KHUYẾN MÃI LỚN', '💰 TIẾT KIỆM NGAY',
];

const SHOPEE_KEYWORDS = [
  'kem chống nắng', 'serum vitamin c', 'tai nghe bluetooth',
  'son dưỡng môi', 'vitamin tổng hợp', 'áo thun nữ',
  'giày sneaker', 'bình giữ nhiệt', 'máy massage', 'đồng hồ thông minh',
  // Ưu tiên baby & beauty để khớp Con Cưng / THEFACESHOP
  'sữa bột enfamil', 'tã bỉm huggies', 'sữa rửa mặt thefaceshop',
  'kem chống nắng the face shop', 'tã pampers', 'đồ chơi trẻ em',
];

const SHOPEE_CAT_MAP: Record<string, string> = {
  '100629': 'Sức khỏe & Làm đẹp', '100013': 'Điện thoại & Phụ kiện',
  '100007': 'Thời trang nữ', '100008': 'Thời trang nam',
  '100017': 'Nhà cửa & Đời sống',
};


@Injectable()
export class TelegramAgentService {
  private readonly logger = new Logger(TelegramAgentService.name);

  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6380,
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  private readonly POSTED_KEY = 'posted:products';
  private readonly POSTED_TTL = 12 * 3600; // 12 giờ — sp có thể tái xuất hiện sáng và chiều

  private readonly FB_GROUPS_KEY = 'fb:groups:discovered';
  private readonly FB_GROUPS_TTL = 7 * 24 * 3600; // 7 ngày

  private readonly GROUP_SEARCH_KEYWORDS = [
    'hội săn sale giảm giá việt nam',
    'deal hot khuyến mãi mỗi ngày',
    'mã giảm giá tiki shopee lazada',
    'hội mua sắm online giá rẻ',
    'săn deal online việt nam',
    'hàng giảm giá khuyến mãi hôm nay',
    'hội mua bán hàng giá tốt',
    'group mua bán online hồ chí minh',
    'group mua bán online hà nội',
    'hội thích mua sắm tiết kiệm',
  ];

  // Keyword scan group Mẹ & Bé — dùng riêng cho campaign Sale Con Cưng
  private readonly CONCUNG_GROUP_KEYWORDS = [
    'hội mẹ bỉm sữa',
    'mẹ và bé giá tốt',
    'chợ mẹ và bé',
    'đồ sơ sinh giá rẻ',
    'hội nuôi con bằng sữa mẹ',
    'mẹ bỉm sữa hà nội',
    'mẹ bỉm sữa hồ chí minh',
    'chia sẻ kinh nghiệm nuôi con',
    'thanh lý đồ sơ sinh',
    'group mẹ và bé',
  ];

  private readonly AT_PID = process.env.ACCESSTRADE_PID || '';
  private readonly AT_AID = process.env.ACCESSTRADE_CONCUNG_AID || ''; // dùng cho health-check
  // URL pattern → AID — chỉ các chiến dịch approval=successful trên AT (verified 2026-07-01)
  private readonly AT_URL_MAP: ReadonlyArray<[string, string]> = [
    // ── Mẹ & Bé / Làm đẹp / Thời trang ──────────────────────────────────────
    ['concung.com',        process.env.ACCESSTRADE_CONCUNG_AID || ''],
    ['thefaceshop.com.vn', process.env.ACCESSTRADE_THEFACESHOP_AID || ''],
    ['bestme.vn',          process.env.ACCESSTRADE_DHC_AID || ''],
    ['vascara.com',        process.env.ACCESSTRADE_VASCARA_AID || ''],
    ['juno.vn',            process.env.ACCESSTRADE_JUNO_AID || ''],
    ['lug.vn',             process.env.ACCESSTRADE_LUG_AID || ''],
    ['pnj.com.vn',         process.env.ACCESSTRADE_PNJ_AID || ''],
    // ── Công nghệ / Điện tử ───────────────────────────────────────────────────
    ['hoanghamobile.com',  process.env.ACCESSTRADE_HOANGHA_AID || ''],
    ['cellphones.com.vn',  process.env.ACCESSTRADE_CELLPHONES_AID || ''],
    // fptshop.com.vn bị 500 từ AT gateway — AID 5435... chỉ hợp lệ cho shop.fpt.vn
    ['shop.fpt.vn',        process.env.ACCESSTRADE_FPT_AID || ''],
    // ── Giáo dục / Khoá học online ────────────────────────────────────────────
    ['unica.vn',           process.env.ACCESSTRADE_UNICA_AID || ''],
    ['gitiho.com',         process.env.ACCESSTRADE_GITIHO_AID || ''],
    ['ila.edu.vn',         process.env.ACCESSTRADE_ILA_AID || ''],
    // ── Telecom / SIM ─────────────────────────────────────────────────────────
    ['wintel.vn',          process.env.ACCESSTRADE_WINTEL_AID || ''],
    // ── Du lịch / Vé ─────────────────────────────────────────────────────────
    ['vemaybay.vn',        process.env.ACCESSTRADE_VEMAYBAY_AID || ''],
    // ── Thương mại quốc tế ────────────────────────────────────────────────────
    ['alibaba.com',        process.env.ACCESSTRADE_ALIBABA_AID || ''],
    ['lazada.com.my',      process.env.ACCESSTRADE_LAZADA_MY_AID || ''],
    // ── Marketplace ───────────────────────────────────────────────────────────
    ['tiktok.com',         process.env.ACCESSTRADE_TIKTOKSHOP_AID || ''],
    ['shopee.vn',          process.env.ACCESSTRADE_SHOPEE_AID || ''],
  ];

  constructor(
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    private readonly imgGen: ImageGeneratorService,
    private readonly videoGen: VideoGeneratorService,
    private readonly priorityBrands: PriorityBrandsService,
    private readonly productScore: ProductScoreService,
    private readonly affiliateTracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
    private readonly recycleService: RecycleService,
    private readonly killSwitch: KillSwitchService,
    private readonly selfOpt: SelfOptimizationEngineService,
    private readonly fbGroups: FacebookGroupsService,
    private readonly fanpageContent: FanpageContentService,
    private readonly fanpageReception: FanpageReceptionService,
  ) {}

  // Cào + đăng mỗi 2 giờ từ 8h-22h lên TẤT CẢ platform
  // Peak times Việt Nam: nghỉ trưa (11:30, 13:00), tan làm (17:30), tối prime (20:00, 21:30)
  @Cron('30 7,11,13,17,20,21 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runDailyDeals() {
    this.logger.log('Multi-Platform Agent: cào + đăng deal...');
    await this.scrapeAndDistribute(10);
  }

  // TikTok Shop promo — 11h và 19h mỗi ngày
  @Cron('0 11,19 * * *')
  async runTikTokShopPromo() {
    this.logger.log('TikTok Shop promo...');
    await this.postTikTokShop();
  }

  // Báo cáo CEO — chạy 6:30 sáng hàng ngày, gửi qua Telegram
  @Cron('30 6 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runMorningRevenueReport() {
    // Dùng offset +7h để lấy ngày VN (toISOString luôn UTC, không dùng được trực tiếp)
    const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
    vnNow.setUTCDate(vnNow.getUTCDate() - 1);
    const dateStr = vnNow.toISOString().split('T')[0];

    const [daily, topBrands] = await Promise.all([
      this.affiliateTracker.getDailyRevenueSummary(dateStr),
      this.affiliateTracker.getAllTimeTopBrands(5),
    ]);

    const dailyTotal = Object.values(daily).reduce((a, b) => a + b, 0);
    const dailyLines = Object.entries(daily)
      .sort(([, a], [, b]) => b - a)
      .map(([brand, rev]) => `  ${brand}: ${Math.round(rev / 1000)}k VND`)
      .join('\n');

    const topLines = topBrands
      .map((b, i) => `  ${i + 1}. ${b.brand}: ${Math.round(b.revenue / 1000)}k (${b.posts} posts)`)
      .join('\n');

    const report = [
      `📊 Báo cáo Affiliate CEO — ${dateStr}`,
      `💰 EPC ước tính hôm qua: ${Math.round(dailyTotal / 1000)}k VND`,
      dailyLines || '  (chưa có dữ liệu)',
      '',
      `🏆 Top brands tích lũy:`,
      topLines || '  (chưa có dữ liệu)',
    ].join('\n');

    this.logger.log(report);

    // Gửi lên Telegram channel
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHANNEL_ID;
      if (token && chatId) {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: report,
          parse_mode: 'HTML',
        });
      }
    } catch (e: any) {
      this.logger.warn(`Không gửi được báo cáo sáng: ${e.message}`);
    }
  }

  // ─── Redis dedup helpers ───────────────────────────────────────────────────

  private postedKey(url: string): string {
    // Normalize URL: bỏ query string, chỉ giữ path
    try { url = new URL(url).origin + new URL(url).pathname; } catch {}
    return url.toLowerCase();
  }

  private async filterUnposted(products: ScrapedProduct[]): Promise<ScrapedProduct[]> {
    if (!products.length) return [];
    try {
      const keys = products.map(p => this.postedKey(p.originalUrl));
      const results = await Promise.all(keys.map(k => this.redis.get(`${this.POSTED_KEY}:${k}`)));
      const filtered = products.filter((_, i) => !results[i]);
      this.logger.log(`Dedup: ${products.length} sp → ${filtered.length} chưa đăng (bỏ ${products.length - filtered.length} trùng)`);
      return filtered;
    } catch {
      return products; // Redis lỗi → không lọc, vẫn chạy bình thường
    }
  }

  private async markPosted(url: string): Promise<void> {
    try {
      const key = `${this.POSTED_KEY}:${this.postedKey(url)}`;
      await this.redis.set(key, '1', 'EX', this.POSTED_TTL);
    } catch {}
  }

  // Lọc bỏ link 404/410 trước khi đăng — dùng GET+stream để tránh 405 khi HEAD bị reject
  private async filterDeadLinks(products: ScrapedProduct[]): Promise<ScrapedProduct[]> {
    if (!products.length) return [];
    const headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'vi-VN,vi;q=0.9',
    };
    const checkUrl = async (url: string): Promise<boolean> => {
      try {
        const res = await axios.get(url, {
          timeout: 8000,
          maxRedirects: 10,
          validateStatus: () => true,
          responseType: 'stream',
          headers,
        });
        // Đóng stream ngay để không download body
        try { res.data?.destroy?.(); } catch { /* ignore */ }
        return res.status < 400;
      } catch {
        return true; // lỗi mạng / timeout → giữ lại, không bỏ nhầm
      }
    };
    const checks = await Promise.allSettled(products.map(p => checkUrl(p.originalUrl)));
    const valid = products.filter((_, i) => {
      const r = checks[i];
      return r.status === 'fulfilled' ? r.value : true;
    });
    const dead = products.length - valid.length;
    this.logger.log(`Link check: ${products.length} sp → bỏ ${dead} link chết → ${valid.length} hợp lệ`);
    return valid;
  }

  // Gửi batch nội dung Facebook Groups về Telegram lúc 7h sáng
  @Cron('0 7 * * *')
  async runFacebookGroupsBatch() {
    this.logger.log('Tạo nội dung Facebook Groups...');
    await this.sendFacebookGroupsContent(5);
  }

  // Đăng bài engagement (poll/tips/relatable) — 3×/tuần để xây follow
  // Thứ 2/4/6 lúc 9h sáng — giờ reach cao, không xen với deal 8h
  // Engagement post hàng ngày 9:30 sáng — xây follow bằng nội dung không bán hàng
  @Cron('30 9 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runFanpageEngagementPost() {
    const pageId    = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const webhookUrl = process.env.MAKE_FACEBOOK_WEBHOOK;
    if (!pageId && !webhookUrl) return;

    const text = this.fanpageContent.nextEngagementPost();
    this.logger.log(`Fanpage engagement post: ${text.split('\n')[0]}`);

    if (pageId && pageToken) {
      try {
        await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, null, {
          params: { message: text, access_token: pageToken },
          timeout: 15000,
        });
        this.logger.log('Fanpage engagement post OK (Graph API)');
        return;
      } catch (e: any) {
        this.logger.debug(`Fanpage engagement Graph API lỗi: ${e.response?.data?.error?.message || e.message}`);
      }
    }

    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, { message: text, type: 'engagement' }, { timeout: 10000 });
        this.logger.log('Fanpage engagement post OK (webhook)');
      } catch (e: any) {
        this.logger.debug(`Fanpage engagement webhook lỗi: ${e.message}`);
      }
    }
  }

  // Poll engagement mỗi 35 phút — lấy likes/comments/shares của bài vừa đăng
  @Cron('*/35 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runEngagementPoll() {
    await this.fanpageReception.pollDueEngagements();
  }

  async scrapeAndDistribute(count = 10): Promise<{ scraped: number; results: Record<string, number> }> {
    const log = this.logRepo.create({ agent: AgentName.TELEGRAM, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      // Reset AT status check mỗi lần chạy để detect khi được duyệt
      this.atWorking = null;
      const atOk = await this.checkATDeeplink();
      if (!atOk) {
        this.logger.warn('⚠️ AT deeplink chưa hoạt động → kiểm tra lại API key / PID tại accesstrade.vn');
      }

      // Chỉ lấy sản phẩm từ brand có AT campaign đã được duyệt — không scrape Tiki/Shopee (chưa approved)
      const priorityRaw = await this.priorityBrands.getProducts(count * 3);
      const priorityProducts: ScrapedProduct[] = priorityRaw
        .map(p => {
          const affiliateLink = this.buildAffiliateLinkSmart(p.url, 'tele');
          if (!affiliateLink) {
            this.logger.debug(`Bỏ qua brand chưa có campaign AT: ${p.url.split('/')[2]}`);
          }
          return affiliateLink
            ? { name: p.name, price: p.price, image: p.image, category: p.category, brand: p.brand, affiliateLink, originalUrl: p.url, discount: p.discount }
            : null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      const rawProducts: ScrapedProduct[] = [...priorityProducts];

      // Lọc bỏ sản phẩm đã đăng trong 48h qua, rồi loại link 404/link AT lỗi, cap tại count
      let products = await this.filterUnposted(rawProducts);
      products = await this.filterDeadLinks(products);
      products = await this.filterInvalidAffiliateLinks(products); // luôn check AT link trước khi đăng
      products = products.slice(0, count); // giới hạn đăng đúng count sp mỗi run

      // Register mỗi sản phẩm với tracker để click từ bất kỳ kênh nào đều được ghi nhận
      for (const p of products) {
        if (p.affiliateLink.includes('go.isclix.com')) {
          p.trackerId = this.affiliateTracker.register(p.name, p.category, p.originalUrl, p.affiliateLink);
        }
      }

      // CEO dashboard: log EPC ước tính của batch này trước khi đăng
      const batchEPC = products.reduce((sum, p) => {
        const epc = this.productScore.estimatedEPC({ brand: p.brand ?? 'Unknown', price: p.price, category: p.category });
        return sum + epc;
      }, 0);
      this.logger.log(`Brands có AT link: ${priorityProducts.length} sp → ${products.length} chưa đăng | EPC pool: ${Math.round(batchEPC / 1000)}k VND`);

      const results: Record<string, number> = {
        telegram: 0, discord: 0, zalo: 0, n8n: 0, facebook: 0, story: 0,
      };

      for (let i = 0; i < products.length; i++) {
        const p = products[i];

        // Upload ảnh branded card một lần — dùng chung cho cả bài viết lẫn story
        const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
        const hook = HOOKS[i % HOOKS.length];
        let sharedImageUrl: string | null = p.image || null;
        try {
          const imgBuf = await this.imgGen.generateProductCard({
            name: p.name, price: pf, category: p.category,
            imageUrl: p.image, hook, source: p.originalUrl.includes('shopee.vn') ? 'shopee' : 'tiki',
          });
          if (imgBuf) {
            const hosted = await this.uploadToImgbb(imgBuf);
            if (hosted) sharedImageUrl = hosted;
          }
        } catch { /* bỏ qua lỗi generate */ }

        // Chạy song song tất cả platform, truyền ảnh đã upload thay vì generate lại
        // Story chỉ đăng 1 lần/run (sản phẩm đầu tiên) để tránh FB rate limit
        const [tg, dc, zl, story] = await Promise.allSettled([
          this.postTelegram(p, i),
          this.postDiscord(p, i),
          this.postZaloOA(p),
          i === 0 ? this.postFacebookStory(sharedImageUrl) : Promise.resolve(false),
        ]);
        // FB riêng để lấy postId → lưu mapping cho auto-reply comment
        const fbPostId = await this.postMakeFacebookWithImage(p, i, sharedImageUrl);
        if (fbPostId && !fbPostId.startsWith('webhook_')) {
          const directLink =
            (p.affiliateLink?.includes('go.isclix.com') ? p.affiliateLink : null)
            ?? this.buildAffiliateLinkSmart(p.originalUrl, 'fb')
            ?? p.originalUrl;
          await this.fanpageReception.storePostProduct(fbPostId, {
            name: p.name, link: directLink, affiliateLink: directLink,
            category: p.category, trackerId: p.trackerId,
          });
        }

        const anySuccess = [tg, dc, zl].some(r => r.status === 'fulfilled' && r.value) || !!fbPostId;
        if (tg.status === 'fulfilled' && tg.value) results.telegram++;
        if (dc.status === 'fulfilled' && dc.value) results.discord++;
        if (zl.status === 'fulfilled' && zl.value) results.zalo++;
        if (fbPostId) results.facebook++;
        if (story.status === 'fulfilled' && story.value) results.story++;

        // Đánh dấu đã đăng + ghi revenue ước tính vào Redis
        if (anySuccess) {
          await this.markPosted(p.originalUrl);
          const epc = this.productScore.estimatedEPC({ brand: p.brand ?? 'Unknown', price: p.price, category: p.category });
          await this.affiliateTracker.recordRevenue(p.brand ?? 'Unknown', epc);
        }

        await new Promise(r => setTimeout(r, 1300));
      }

      // Push batch tới n8n webhook để n8n distribute thêm
      const n8nSent = await this.pushToN8n(products);
      results.n8n = n8nSent ? products.length : 0;

      const totalSent = Object.values(results).reduce((a, b) => a + b, 0);
      this.logger.log(`Kết quả: ${JSON.stringify(results)}`);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { scraped: products.length, ...results } as any,
        durationMs: Date.now() - startMs,
      });

      return { scraped: products.length, results };
    } catch (e) {
      this.logger.error('Multi-Platform Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return { scraped: 0, results: {} };
    }
  }

  // Public helper: lấy sản phẩm đã có affiliate link để Zalo/FB dùng
  async getProductsForPosting(count = 5): Promise<Array<{ name: string; price: number; url: string; image?: string; category?: string }>> {
    this.atWorking = null;
    await this.checkATDeeplink();
    // Dùng priorityBrands (brands có AT campaign duyệt) thay vì scrapeTiki/Shopee trực tiếp
    const raw = await this.priorityBrands.getProducts(count * 3);
    const products = raw
      .map(p => {
        const affiliateLink = this.buildAffiliateLinkSmart(p.url, 'fb');
        if (!affiliateLink) return null;
        return { name: p.name, price: p.price, url: affiliateLink, image: p.image, category: p.category };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .slice(0, count);
    if (products.length === 0) {
      // Fallback: Shopee vẫn có AT campaign
      const shopee = await this.scrapeShopeeProducts(count);
      return shopee.map(p => ({ name: p.name, price: p.price, url: p.affiliateLink || p.originalUrl, image: p.image, category: p.category }));
    }
    return products;
  }

  // ─── Tiki Scraper (không lưu DB) ─────────────────────────────────────────

  // ─── Affiliate link pre-post verification ─────────────────────────────────

  // Cache theo AID (tất cả link cùng AID hành xử giống nhau)
  private readonly affiliateLinkCache = new Map<string, { ok: boolean; ts: number }>();
  private readonly AFFILIATE_CACHE_TTL = 30 * 60 * 1000; // 30 phút

  private async verifyAffiliateLink(link: string): Promise<boolean> {
    if (!link.includes('go.isclix.com')) return false;

    // Cache theo URL đầy đủ (bao gồm url_enc) để mỗi link đích được kiểm tra riêng
    const cacheKey = link;
    const cached = this.affiliateLinkCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.AFFILIATE_CACHE_TTL) return cached.ok;

    const set = (ok: boolean) => { this.affiliateLinkCache.set(cacheKey, { ok, ts: Date.now() }); return ok; };

    // Giải mã URL đích từ url_enc trong deeplink → kiểm tra trực tiếp
    try {
      const urlEncMatch = link.match(/[?&]url_enc=([^&]+)/);
      if (urlEncMatch) {
        const destUrl = Buffer.from(
          decodeURIComponent(urlEncMatch[1]), 'base64'
        ).toString('utf8').split('?')[0]; // bỏ UTM params
        if (destUrl.startsWith('http')) {
          const res = await axios.get(destUrl, {
            timeout: 8000,
            maxRedirects: 10,
            validateStatus: () => true,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' },
          });
          try { res.data?.destroy?.(); } catch { /* ignore */ }
          if (res.status >= 400) {
            this.logger.warn(`AT link check: dest ${res.status}: ${destUrl.slice(-50)}`);
            return set(false);
          }
          return set(true);
        }
      }
    } catch (e: any) {
      // Nếu không giải mã được hoặc lỗi mạng → fallback kiểm tra go.isclix.com
    }

    // Fallback: kiểm tra AT gateway có phản hồi không
    try {
      const res = await axios.get(link, {
        maxRedirects: 2,
        timeout: 8000,
        validateStatus: s => s < 500,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' },
      });
      return set(res.status < 400);
    } catch (e: any) {
      const status = e?.response?.status;
      if ([301, 302, 307, 308].includes(status)) return set(true);
      this.logger.warn(`AT link check lỗi: ${e.code ?? status}: ${cacheKey.slice(-30)}`);
      return set(false);
    }
  }

  // Kiểm tra affiliate link TRƯỚC KHI ĐĂNG — bỏ sản phẩm có link AT lỗi
  private async filterInvalidAffiliateLinks(products: ScrapedProduct[]): Promise<ScrapedProduct[]> {
    if (!products.length) return [];
    const checks = await Promise.allSettled(
      products.map(p => {
        const link = p.affiliateLink?.includes('go.isclix.com')
          ? p.affiliateLink
          : (this.buildAffiliateLinkSmart(p.originalUrl, 'tele') ?? '');
        return link ? this.verifyAffiliateLink(link) : Promise.resolve(false);
      }),
    );
    const valid = products.filter((_, i) => {
      const r = checks[i];
      return r.status === 'fulfilled' && r.value;
    });
    const dropped = products.length - valid.length;
    if (dropped > 0) this.logger.warn(`AT pre-check: bỏ ${dropped}/${products.length} sp link lỗi`);
    else this.logger.log(`AT pre-check: tất cả ${valid.length} sp link hợp lệ ✅`);
    return valid;
  }

  // ──────────────────────────────────────────────────────────────────────────

  private atWorking: boolean | null = null;

  private async checkATDeeplink(): Promise<boolean> {
    if (this.atWorking !== null) return this.atWorking;
    if (!this.AT_PID) {
      this.atWorking = false;
      this.logger.warn('AT Deeplink: Thiếu ACCESSTRADE_PID ❌');
      return false;
    }
    // Dùng campaign đầu tiên đang active trong AT_URL_MAP để health-check
    // (không dùng Tiki AID vì ti.ki NXDOMAIN — campaign đó đã chết)
    const activeEntry = this.AT_URL_MAP.find(([, aid]) => aid);
    if (!activeEntry) {
      this.atWorking = false;
      this.logger.warn('AT Deeplink: Không có campaign nào được cấu hình AID ❌');
      return false;
    }
    const [domain, aid] = activeEntry;
    try {
      const urlEnc = Buffer.from(`https://${domain}/`).toString('base64');
      const testUrl = `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${aid}?sub4=check&url_enc=${encodeURIComponent(urlEnc)}`;
      const res = await axios.get(testUrl, { maxRedirects: 0, timeout: 8000, validateStatus: s => s >= 200 && s < 400 });
      this.atWorking = true;
      this.logger.log(`AT Deeplink OK ✅ — ${domain} → ${res.status} (PID: ${this.AT_PID})`);
    } catch (e: any) {
      // axios throws on redirect when maxRedirects:0 — 302 IS success
      const status = e?.response?.status;
      if (status === 301 || status === 302 || status === 307 || status === 308) {
        this.atWorking = true;
        this.logger.log(`AT Deeplink OK ✅ — ${domain} → ${status} redirect`);
      } else {
        this.atWorking = false;
        this.logger.warn(`AT Deeplink ❌ — ${domain} ${status ? `HTTP ${status}` : e.message}`);
      }
    }
    return this.atWorking;
  }

  private buildAffiliateLink(productUrl: string, platform = 'tele'): string {
    if (this.AT_PID && this.AT_AID) {
      const urlEnc = Buffer.from(productUrl).toString('base64');
      return `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${this.AT_AID}?sub4=${platform}&url_enc=${encodeURIComponent(urlEnc)}`;
    }
    return productUrl;
  }

  // Đổi sub4 trong link AT sang platform cụ thể (tele/fb/discord)
  private atLinkForPlatform(atLink: string, platform: string): string {
    return atLink.replace(/sub4=[^&]+/, `sub4=${platform}`);
  }

  // Tra campaign AID theo URL — trả null nếu không có campaign được duyệt
  private buildAffiliateLinkSmart(productUrl: string, platform = 'tele'): string | null {
    if (!this.AT_PID) return null;
    const u = productUrl.toLowerCase();
    const entry = this.AT_URL_MAP.find(([pattern, aid]) => aid && u.includes(pattern));
    if (!entry) return null;
    const urlEnc = Buffer.from(productUrl).toString('base64');
    return `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${entry[1]}?sub4=${platform}&url_enc=${encodeURIComponent(urlEnc)}`;
  }

  private async shorten(longUrl: string): Promise<string> {
    // go.isclix.com AT link đã redirect thẳng đến Tiki — không cần rút gọn thêm
    return longUrl;
  }

  private async scrapeTikiProducts(count: number): Promise<ScrapedProduct[]> {
    if (!this.AT_PID || !this.AT_AID) {
      this.logger.warn('Chưa cấu hình ACCESSTRADE_PID / ACCESSTRADE_TIKI_AID');
    }

    const tikiHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Referer': 'https://tiki.vn', 'Accept': 'application/json',
    };

    // sub4 sẽ được ghi đè theo platform khi post — dùng 'tele' làm default
    const toScraped = (p: any, catName: string): ScrapedProduct => {
      const productUrl = `https://tiki.vn/${p.url_key}.html`;
      // Tiki.vn không có campaign được AT duyệt → affiliateLink = productUrl (sẽ bị lọc sau)
      const affiliateLink = this.buildAffiliateLinkSmart(productUrl, 'tele') ?? productUrl;
      return {
        name: p.name || '',
        price: p.price,
        image: p.thumbnail_url || '',
        category: catName,
        affiliateLink,
        originalUrl: productUrl,
        discount: p.discount_rate ?? 0,
      };
    };

    // Bước 1: Ưu tiên cào chính hãng giảm giá ≥20% theo từng danh mục
    const highDiscountResults: ScrapedProduct[] = [];
    const shuffledCats = [...TIKI_CATEGORIES].sort(() => Math.random() - 0.5);

    await Promise.allSettled(
      shuffledCats.map(async (cat) => {
        try {
          const res = await axios.get('https://tiki.vn/api/v2/products', {
            params: { limit: 10, sort: 'discount', category: cat.id, is_authentic: 1, discount_from: 20 },
            headers: tikiHeaders, timeout: 10000,
          });
          const items: any[] = (res.data?.data || [])
            .filter((p: any) => p.url_key && p.price > 0 && (p.discount_rate ?? 0) >= 20);
          highDiscountResults.push(...items.map(p => toScraped(p, cat.name)));
        } catch { /* bỏ qua lỗi từng danh mục */ }
      })
    );

    this.logger.log(`Tiki chính hãng giảm giá: ${highDiscountResults.length} sản phẩm`);

    if (highDiscountResults.length >= count) {
      // Xáo trong từng tier để mỗi run chọn sp khác nhau (không luôn top-N cố định)
      const shuffle = <T>(arr: T[]) => arr.sort(() => Math.random() - 0.5);
      const tier1 = shuffle(highDiscountResults.filter(p => (p.discount ?? 0) >= 40));
      const tier2 = shuffle(highDiscountResults.filter(p => (p.discount ?? 0) >= 25 && (p.discount ?? 0) < 40));
      const tier3 = shuffle(highDiscountResults.filter(p => (p.discount ?? 0) < 25));
      return [...tier1, ...tier2, ...tier3].slice(0, count);
    }

    // Bước 2: Bổ sung từ top_seller nếu chưa đủ
    const fallbackResults: ScrapedProduct[] = [];
    const needed = count - highDiscountResults.length;
    const seenUrls = new Set(highDiscountResults.map(p => p.originalUrl));
    const catsNeeded = Math.min(shuffledCats.length, Math.ceil(needed / 5));
    const perCat = Math.ceil(needed / catsNeeded);

    for (const cat of shuffledCats.slice(0, catsNeeded)) {
      if (fallbackResults.length >= needed) break;
      try {
        const res = await axios.get('https://tiki.vn/api/v2/products', {
          params: { limit: perCat + 5, sort: 'top_seller', category: cat.id },
          headers: tikiHeaders, timeout: 10000,
        });
        const items: any[] = res.data?.data || [];
        for (const p of items) {
          if (fallbackResults.length >= needed) break;
          if (!p.url_key || !p.price || p.price <= 0) continue;
          const productUrl = `https://tiki.vn/${p.url_key}.html`;
          if (seenUrls.has(productUrl)) continue;
          seenUrls.add(productUrl);
          fallbackResults.push(toScraped(p, cat.name));
        }
      } catch (e) {
        this.logger.debug(`Tiki scrape lỗi: ${e.message}`);
      }
    }

    return [...highDiscountResults, ...fallbackResults].slice(0, count);
  }

  // ─── Shopee Scraper ───────────────────────────────────────────────────────

  private buildShopeeAffiliateLink(productUrl: string, platform = 'tele'): string {
    return this.buildAffiliateLinkSmart(productUrl, platform) ?? productUrl;
  }

  // Cào sản phẩm giảm giá từ Con Cưng — dùng campaign CON CƯNG KOC CAMP 2026 đã được duyệt
  private async scrapeConcungProducts(count: number): Promise<ScrapedProduct[]> {
    const concungAid = process.env.ACCESSTRADE_CONCUNG_AID || '';
    if (!this.AT_PID || !concungAid) return [];
    try {
      const res = await axios.get('https://api.concung.com/api/v5/products', {
        params: { promotion: true, limit: count * 2, sort: 'discount_desc', status: 1 },
        headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://concung.com' },
        timeout: 10000,
      });
      const items: any[] = res.data?.data?.products || res.data?.products || [];
      return items
        .filter(p => p.price && p.sale_price && p.sale_price < p.price)
        .slice(0, count)
        .map(p => {
          const productUrl = `https://concung.com/${p.slug || p.url || p.id}`;
          const urlEnc = Buffer.from(productUrl).toString('base64');
          const discount = Math.round((1 - p.sale_price / p.price) * 100);
          return {
            name: p.name || p.title || '',
            price: p.sale_price,
            image: p.image || p.thumbnail || '',
            category: 'Mẹ & Bé',
            brand: 'Con Cưng',
            affiliateLink: `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${concungAid}?sub4=tele&url_enc=${encodeURIComponent(urlEnc)}`,
            originalUrl: productUrl,
            discount,
          };
        });
    } catch (e: any) {
      this.logger.debug(`Con Cưng scrape lỗi: ${e.message}`);
      return [];
    }
  }

  private async scrapeShopeeProducts(count: number): Promise<ScrapedProduct[]> {
    if (!this.AT_PID) {
      this.logger.debug('Shopee: bỏ qua (chưa cấu hình ACCESSTRADE_PID)');
      return [];
    }

    const results: ScrapedProduct[] = [];
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9',
      'Referer': 'https://shopee.vn/',
    };

    const buildShopeeLink = (url: string) => {
      // Dùng smart routing — trả về null nếu không có campaign
      return this.buildAffiliateLinkSmart(url, 'tele') ?? url;
    };

    // Tìm theo keyword + lấy theo category song song
    const keywords = SHOPEE_KEYWORDS.sort(() => Math.random() - 0.5).slice(0, 3);
    const catIds = Object.keys(SHOPEE_CAT_MAP).sort(() => Math.random() - 0.5).slice(0, 2);

    await Promise.allSettled([
      ...keywords.map(async (kw) => {
        try {
          const res = await axios.get('https://shopee.vn/api/v4/search/search_items', {
            params: { by: 'sales', keyword: kw, limit: 5, newest: 0, order: 'desc', page_type: 'search', version: 2 },
            headers: browserHeaders, timeout: 8000,
          });
          (res.data?.items || []).forEach((item: any) => {
            const p = item.item_basic || item;
            if (!p?.name || !p?.itemid) return;
            const price = Math.round(Number(p.price || p.price_min || 0) / 100000);
            if (price <= 0) return;
            const url = `https://shopee.vn/product/${p.shopid}/${p.itemid}`;
            results.push({ name: p.name, price, image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '', category: 'Shopee', affiliateLink: buildShopeeLink(url), originalUrl: url });
          });
        } catch { /* bị block là bình thường */ }
      }),
      ...catIds.map(async (catId) => {
        try {
          const res = await axios.get('https://shopee.vn/api/v4/search/search_items', {
            params: { by: 'sales', catid: catId, limit: 5, newest: 0, order: 'desc', page_type: 'shop' },
            headers: browserHeaders, timeout: 8000,
          });
          (res.data?.items || []).forEach((item: any) => {
            const p = item.item_basic || item;
            if (!p?.name || !p?.itemid) return;
            const price = Math.round(Number(p.price || p.price_min || 0) / 100000);
            if (price <= 0) return;
            const url = `https://shopee.vn/product/${p.shopid}/${p.itemid}`;
            const cat = SHOPEE_CAT_MAP[catId] || 'Shopee';
            results.push({ name: p.name, price, image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '', category: cat, affiliateLink: buildShopeeLink(url), originalUrl: url });
          });
        } catch { /* ignore */ }
      }),
    ]);

    // Dedup + chỉ giữ sản phẩm có campaign AT được duyệt
    const seen = new Set<string>();
    const withCommission: ScrapedProduct[] = [];
    for (const p of results) {
      if (seen.has(p.originalUrl)) continue;
      seen.add(p.originalUrl);
      const link = this.buildAffiliateLinkSmart(p.originalUrl, 'tele');
      if (!link) continue; // không có campaign → bỏ qua
      withCommission.push({ ...p, affiliateLink: link });
    }
    this.logger.debug(`Shopee: ${withCommission.length}/${results.length} sản phẩm có campaign`);
    return withCommission.slice(0, count);
  }

  // ─── Platform Publishers ──────────────────────────────────────────────────

  private readonly CTA = '\n\n👥 Kênh Telegram: t.me/banhang1\n🏠 Fanpage FB: https://www.facebook.com/profile.php?id=1181780431684077';

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private buildText(link: string, p: ScrapedProduct, index: number): { markdown: string; plain: string; html: string } {
    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const emoji = Object.entries(CAT_EMOJI).find(([k]) => p.category.includes(k))?.[1] ?? '🛒';
    const hook = HOOKS[index % HOOKS.length];
    const tag = p.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');
    const source = p.originalUrl.includes('shopee.vn') ? 'shopee' : 'tiki';

    const discountLine = (p.discount || 0) >= 20 ? `🔥 GIẢM ${p.discount}%\n` : '';

    const htmlLink = link.replace(/&/g, '&amp;'); // required by Telegram HTML parser
    const markdown = `${hook}\n${discountLine}${emoji} *${p.name.slice(0, 80)}*\n\n💰 *${pf}*\n\n🔗 [Đặt hàng ngay](${link})\n\n#${tag} #${source} #deal${this.CTA}`;
    const plain    = `${hook}\n${discountLine}${emoji} ${p.name.slice(0, 80)}\n\n💰 ${pf}\n\n🔗 ${link}\n\n#${tag} #${source} #deal${this.CTA}`;
    const html     = `${hook}\n${discountLine ? `<b>${this.escapeHtml(discountLine.trim())}</b>\n` : ''}${emoji} <b>${this.escapeHtml(p.name.slice(0, 80))}</b>\n\n💰 <b>${pf}</b>\n\n🔗 <a href="${htmlLink}">Đặt hàng ngay</a>\n\n#${tag} #${source} #deal${this.CTA}`;

    return { markdown, plain, html };
  }

  // Telegram — gửi ảnh product card + caption
  private async postTelegram(p: ScrapedProduct, index: number): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    const chatIds = [
      process.env.TELEGRAM_CHANNEL_ID,
      ...(process.env.TELEGRAM_GROUP_IDS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);

    if (chatIds.length === 0) return false;

    // Luôn dùng AT link từ p.affiliateLink (đã được filterInvalidAffiliateLinks xác nhận)
    // Chỉ rebuild nếu chưa có — không bao giờ fallback về originalUrl (không hoa hồng)
    const link = p.affiliateLink?.includes('go.isclix.com')
      ? this.atLinkForPlatform(p.affiliateLink, 'tele')
      : this.buildAffiliateLinkSmart(p.originalUrl, 'tele');
    if (!link) { this.logger.warn(`Skip Telegram: ${p.name.slice(0, 30)} — không có AT link`); return false; }

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const hook = HOOKS[index % HOOKS.length];
    const { html } = this.buildText(link, p, index);

    const brandLabel = p.brand ?? (p.originalUrl.includes('shopee.vn') ? 'Shopee' : 'Brand');
    // Tạo ảnh product card
    const imgBuffer = await this.imgGen.generateProductCard({
      name: p.name,
      price: pf,
      category: p.category,
      imageUrl: p.image,
      hook,
      source: 'tiki' as const,
    });

    let anySuccess = false;
    for (const chatId of chatIds) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (imgBuffer) {
            // Gửi ảnh + caption HTML (link đầy đủ, không bị cắt tại &)
            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('photo', imgBuffer, { filename: 'deal.jpg', contentType: 'image/jpeg' });
            form.append('caption', html.slice(0, 1024));
            form.append('parse_mode', 'HTML');
            await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
              headers: form.getHeaders(),
              timeout: 30000,
            });
          } else {
            // Fallback: gửi text HTML nếu không tạo được ảnh
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
              chat_id: chatId, text: html, parse_mode: 'HTML',
              disable_web_page_preview: false,
            }, { timeout: 20000 });
          }
          anySuccess = true;
          break;
        } catch (e: any) {
          if (e?.response?.status === 429) {
            const wait = (e.response.data?.parameters?.retry_after || 15) + 1;
            await new Promise(r => setTimeout(r, wait * 1000));
          } else if (e.code === 'ECONNABORTED' || (e.message || '').includes('timeout')) {
            await new Promise(r => setTimeout(r, 3000));
          } else {
            this.logger.debug(`Telegram [${chatId}] lỗi: ${e.response?.data?.description || e.message}`);
            break;
          }
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return anySuccess;
  }

  // Discord — gửi ảnh product card + embed
  private async postDiscord(p: ScrapedProduct, index: number): Promise<boolean> {
    const webhooks = [
      process.env.DISCORD_WEBHOOK_URL,
      ...(process.env.DISCORD_WEBHOOK_URLS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);

    if (webhooks.length === 0) return false;

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const emoji = Object.entries(CAT_EMOJI).find(([k]) => p.category.includes(k))?.[1] ?? '🛒';
    const hook = HOOKS[index % HOOKS.length];
    const link = p.affiliateLink?.includes('go.isclix.com')
      ? this.atLinkForPlatform(p.affiliateLink, 'discord')
      : this.buildAffiliateLinkSmart(p.originalUrl, 'discord');
    if (!link) { this.logger.warn(`Skip Discord: ${p.name.slice(0, 30)} — không có AT link`); return false; }

    const source = p.brand || p.category;
    // Tạo ảnh product card
    const imgBuffer = await this.imgGen.generateProductCard({
      name: p.name, price: pf, category: p.category,
      imageUrl: p.image, hook, source: 'tiki' as const,
    });

    const embed = {
      title: `${hook} ${emoji} ${p.name.slice(0, 100)}`,
      description: `💰 **${pf}**\n\n🏷️ ${p.category}\n\n[Đặt hàng ngay →](${link})`,
      url: link,
      color: 0xFF6B35,
      image: imgBuffer ? { url: 'attachment://deal.jpg' } : (p.image ? { url: p.image } : undefined),
      footer: { text: `👥 t.me/banhang1 | ${source} Affiliate Deal` },
    };

    const results = await Promise.allSettled(
      webhooks.map(async (url) => {
        if (imgBuffer) {
          const form = new FormData();
          form.append('payload_json', JSON.stringify({ embeds: [embed] }));
          form.append('files[0]', imgBuffer, { filename: 'deal.jpg', contentType: 'image/jpeg' });
          return axios.post(url, form, { headers: form.getHeaders(), timeout: 20000 });
        }
        return axios.post(url, { embeds: [embed] }, { timeout: 10000 });
      })
    );

    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.filter(r => r.status === 'rejected').length;
    if (fail > 0) this.logger.debug(`Discord: ${ok} thành công, ${fail} lỗi`);
    return ok > 0;
  }

  // Zalo OA
  private async postZaloOA(p: ScrapedProduct): Promise<boolean> {
    const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
    if (!accessToken) return false;

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    try {
      await axios.post('https://openapi.zalo.me/v2.0/oa/article/create', {
        type: 'normal',
        status: 'published',
        title: p.name.slice(0, 100),
        description: `Giá: ${pf} | Hoa hồng 8% | ${p.category}`,
        cover: { photo_url: p.image || '', status: 'show' },
        body: [
          { type: 'text', content: `🔥 ${p.name}\n💰 Giá: ${pf}\n💸 Hoa hồng: 8%` },
          { type: 'button', buttons: [{ title: `Mua ngay ${p.brand ? 'tại ' + p.brand : 'ngay'}`, image_icon: '', type: 'oa.open.url', payload: { url: p.affiliateLink } }] },
        ],
      }, {
        headers: { access_token: accessToken, 'Content-Type': 'application/json' },
      });
      return true;
    } catch (e) {
      this.logger.debug(`Zalo OA lỗi: ${e.message}`);
      return false;
    }
  }

  // n8n webhook — push batch để n8n distribute thêm (email, Sheets, etc.)
  private async pushToN8n(products: ScrapedProduct[]): Promise<boolean> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) return false;

    try {
      await axios.post(webhookUrl, {
        source: 'affiliate-agent',
        timestamp: new Date().toISOString(),
        count: products.length,
        products: products.map(p => ({
          name: p.name,
          price: p.price,
          category: p.category,
          affiliateLink: p.affiliateLink,
          image: p.image,
        })),
      }, { timeout: 5000 });
      return true;
    } catch (e) {
      this.logger.debug(`n8n webhook lỗi: ${e.message}`);
      return false;
    }
  }

  // ─── Make.com → Facebook Fanpage ─────────────────────────────────────────

  private async uploadToImgbb(imgBuf: Buffer): Promise<string | null> {
    const key = process.env.IMGBB_API_KEY;
    if (!key) return null;
    try {
      const base64 = imgBuf.toString('base64');
      const form = new FormData();
      form.append('key', key);
      form.append('image', base64);
      const res = await axios.post('https://api.imgbb.com/1/upload', form, {
        headers: form.getHeaders(),
        timeout: 15000,
      });
      if (res.data?.error) {
        this.logger.debug(`imgbb lỗi: ${res.data.error.message || JSON.stringify(res.data.error)}`);
        return null;
      }
      return res.data?.data?.display_url || res.data?.data?.url || null;
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || e.message;
      this.logger.debug(`imgbb upload lỗi: ${msg}`);
      return null;
    }
  }

  // Phiên bản nhận imageUrl đã upload sẵn — trả về fbPostId để theo dõi engagement
  private async postMakeFacebookWithImage(p: ScrapedProduct, index: number, imageUrl: string | null): Promise<string | null> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const webhookUrl = process.env.MAKE_FACEBOOK_WEBHOOK;
    if (!pageId && !webhookUrl) return null;

    // Luôn dùng direct AT link trong bài viết FB — tracker URL dạng IP:port bị FB filter
    const link = p.affiliateLink?.includes('go.isclix.com')
      ? this.atLinkForPlatform(p.affiliateLink, 'fb')
      : this.buildAffiliateLinkSmart(p.originalUrl, 'fb');
    if (!link) { this.logger.warn(`Skip Facebook: ${p.name.slice(0, 30)} — không có AT link`); return null; }

    const message = this.fanpageContent.buildDealPost({
      name: p.name, price: p.price, category: p.category,
      brand: p.brand, discount: p.discount, affiliateLink: link,
    });
    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';

    if (pageId && pageToken) {
      try {
        let fbPostId: string | undefined;
        if (imageUrl) {
          const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/photos`, null, {
            params: { url: imageUrl, caption: message, access_token: pageToken, published: true },
            timeout: 45000,
          });
          // FB trả về {id: "photo_id", post_id: "page_post_id"}
          fbPostId = res.data?.post_id || `${pageId}_${res.data?.id}`;
        } else {
          const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, null, {
            params: { message, link, access_token: pageToken },
            timeout: 15000,
          });
          fbPostId = res.data?.id;
        }
        this.logger.log(`Facebook Graph API OK: ${p.name.slice(0, 40)} → post_id=${fbPostId}`);
        return fbPostId ?? `${pageId}_unknown_${Date.now()}`;
      } catch (e: any) {
        this.logger.debug(`Facebook Graph API lỗi: ${e.response?.data?.error?.message || e.message} → thử Make.com`);
      }
    }

    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, {
          message, link, image_url: imageUrl || p.image || '',
          title: p.name.slice(0, 200), price: pf, category: p.category,
          source: p.brand || p.category,
        }, { timeout: 10000 });
        this.logger.log(`Make.com Facebook OK: ${p.name.slice(0, 40)}`);
        return `webhook_${Date.now()}`; // không có postId thật, dùng placeholder
      } catch (e: any) {
        this.logger.debug(`Make.com Facebook lỗi: ${e.response?.data || e.message}`);
      }
    }
    return null;
  }

  private async postMakeFacebook(p: ScrapedProduct, index: number): Promise<boolean> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const webhookUrl = process.env.MAKE_FACEBOOK_WEBHOOK;
    if (!pageId && !webhookUrl) return false;

    const isShopee = p.originalUrl.includes('shopee.vn');
    // Đảm bảo link FB dùng sub4=fb (không lấy nguyên p.affiliateLink vì nó có sub4=tele)
    const link =
      (p.trackerId && this.affiliateTracker.buildTrackerUrl(p.trackerId, 'fb'))
      ?? (p.affiliateLink?.includes('go.isclix.com') ? this.atLinkForPlatform(p.affiliateLink, 'fb') : null)
      ?? this.buildAffiliateLinkSmart(p.originalUrl, 'fb')
      ?? p.originalUrl;

    // Dùng template fanpage phù hợp với category + brand thay vì format generic cũ
    const message = this.fanpageContent.buildDealPost({
      name: p.name,
      price: p.price,
      category: p.category,
      brand: p.brand,
      discount: p.discount,
      affiliateLink: link,
    });

    // Tạo card 1080x1080 → upload imgbb → lấy public URL
    // Nếu imgbb bị rate-limit, fallback dùng ảnh gốc từ Tiki/Shopee CDN
    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const hook = HOOKS[index % HOOKS.length];
    let imageUrl: string | null = p.image || null; // fallback luôn sẵn có
    try {
      const imgBuf = await this.imgGen.generateProductCard({
        name: p.name, price: pf, category: p.category,
        imageUrl: p.image, hook, source: isShopee ? 'shopee' : 'tiki',
      });
      if (imgBuf) {
        const hosted = await this.uploadToImgbb(imgBuf);
        if (hosted) imageUrl = hosted; // dùng branded card nếu upload thành công
      }
    } catch { /* bỏ qua lỗi generate */ }

    // Cách 1: Gọi thẳng Facebook Graph API
    if (pageId && pageToken) {
      try {
        if (imageUrl) {
          // POST ảnh kèm caption (branded card hoặc ảnh gốc CDN)
          await axios.post(
            `https://graph.facebook.com/v19.0/${pageId}/photos`,
            null,
            {
              params: { url: imageUrl, caption: message, access_token: pageToken, published: true },
              timeout: 45000, // FB cần fetch ảnh từ imgbb → cần 30-40s, 15s không đủ
            },
          );
        } else {
          // Fallback: text-only + affiliate link preview
          await axios.post(
            `https://graph.facebook.com/v19.0/${pageId}/feed`,
            null,
            {
              params: {
                message,
                link,
                access_token: pageToken,
              },
              timeout: 15000,
            },
          );
        }
        this.logger.log(`Facebook Graph API OK: ${p.name.slice(0, 40)}`);
        return true;
      } catch (e: any) {
        this.logger.debug(`Facebook Graph API lỗi: ${e.response?.data?.error?.message || e.message} → thử Make.com`);
      }
    }

    // Cách 2: Make.com webhook (fallback nếu Graph API lỗi)
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, {
          message,
          link,
          image_url: imageUrl || p.image || '',
          title: p.name.slice(0, 200),
          price: pf,
          category: p.category,
          source: isShopee ? 'Shopee' : (p.brand || p.category),
        }, { timeout: 10000 });
        this.logger.log(`Make.com Facebook OK: ${p.name.slice(0, 40)}`);
        return true;
      } catch (e: any) {
        this.logger.debug(`Make.com Facebook lỗi: ${e.response?.data || e.message}`);
      }
    }

    return false;
  }

  // Tạo Facebook Story (Tin) — chạy song song với bài viết thường
  // Flow: upload ảnh unpublished → lấy photo_id → tạo story
  async postFacebookStory(imageUrl: string | null): Promise<boolean> {
    const pageId    = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageId || !pageToken || !imageUrl) return false;

    try {
      // Bước 1: Upload ảnh lên Facebook (published=false) → lấy photo_id
      const uploadRes = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/photos`,
        null,
        {
          params: {
            url: imageUrl,
            published: 'false',
            temporary: 'true',
            access_token: pageToken,
          },
          timeout: 30000,
        },
      );
      const photoId: string = uploadRes.data?.id;
      if (!photoId) throw new Error('Upload ảnh không trả về photo_id');

      // Bước 2: Tạo Story từ photo_id
      const storyRes = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/photo_stories`,
        null,
        {
          params: { photo_id: photoId, access_token: pageToken },
          timeout: 20000,
        },
      );

      const storyId = storyRes.data?.post_id || storyRes.data?.id;
      this.logger.log(`Facebook Story (Tin) OK ✅ → story_id=${storyId}`);
      return true;
    } catch (e: any) {
      const err = e.response?.data?.error?.message || e.message;
      this.logger.warn(`Facebook Story lỗi: ${err}`);
      return false;
    }
  }

  // ─── TikTok Shop Promo ────────────────────────────────────────────────────

  private readonly TIKTOK_SHOP_CODE = 'VNLCKTW7X6';
  private readonly TIKTOK_SHOP_URL = 'https://vt.tiktok.com/ZSQWTKHxm/?page=TikTokShop';

  private readonly TIKTOK_HOOKS = [
    '🛍️ SHOP TIKTOK CỦA CHÚNG TÔI',
    '🔥 XEM NGAY CỬA HÀNG TIKTOK',
    '✨ SẢN PHẨM MỚI VỀ RỒI!',
    '⚡ DEAL HOT TRÊN TIKTOK SHOP',
    '💥 VÀO SHOP XEM HÀNG NÀO!',
  ];

  async postTikTokShop(): Promise<{ telegram: boolean; discord: boolean }> {
    const hook = this.TIKTOK_HOOKS[Math.floor(Math.random() * this.TIKTOK_HOOKS.length)];
    const shopUrl = this.TIKTOK_SHOP_URL;

    const [tg, dc] = await Promise.allSettled([
      this.postTikTokTelegram(hook, shopUrl),
      this.postTikTokDiscord(hook, shopUrl),
    ]);

    return {
      telegram: tg.status === 'fulfilled' && tg.value,
      discord: dc.status === 'fulfilled' && dc.value,
    };
  }

  private async postTikTokTelegram(hook: string, shopUrl: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    const chatIds = [
      process.env.TELEGRAM_CHANNEL_ID,
      ...(process.env.TELEGRAM_GROUP_IDS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);
    if (chatIds.length === 0) return false;

    const text = `${hook}\n\n🎁 Ghé thăm TikTok Shop của chúng tôi!\n\n📦 Hàng trăm sản phẩm chất lượng\n💰 Giá cạnh tranh — Flash sale mỗi ngày\n🚚 Giao hàng nhanh toàn quốc\n\n👉 [Vào Shop ngay](${shopUrl})\n\n#tiktokshop #muasam #deal`;

    let ok = false;
    for (const chatId of chatIds) {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: false,
        }, { timeout: 20000 });
        ok = true;
      } catch (e: any) {
        this.logger.debug(`TikTok Telegram [${chatId}]: ${e.response?.data?.description || e.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return ok;
  }

  private async postTikTokDiscord(hook: string, shopUrl: string): Promise<boolean> {
    const webhooks = [
      process.env.DISCORD_WEBHOOK_URL,
      ...(process.env.DISCORD_WEBHOOK_URLS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);
    if (webhooks.length === 0) return false;

    const payload = {
      embeds: [{
        title: `${hook} 🎵`,
        description: `📦 **Hàng trăm sản phẩm** chất lượng\n💰 Giá cạnh tranh — Flash sale mỗi ngày\n🚚 Giao hàng nhanh toàn quốc\n\n**👉 [Vào Shop ngay →](${shopUrl})**`,
        url: shopUrl,
        color: 0xFF0050,
        footer: { text: `TikTok Shop • ${this.TIKTOK_SHOP_CODE}` },
        thumbnail: { url: 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png' },
      }],
    };

    const results = await Promise.allSettled(
      webhooks.map(url => axios.post(url, payload, { timeout: 10000 }))
    );
    return results.some(r => r.status === 'fulfilled');
  }

  // ─── Facebook Groups Content Generator ───────────────────────────────────

  async sendFacebookGroupsContent(count = 5): Promise<{ sent: number }> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !chatId) return { sent: 0 };

    // Dùng priority brands (có AT link) thay vì Tiki (không có campaign được duyệt)
    const rawBrands = await this.priorityBrands.getProducts(count * 2);
    const products: ScrapedProduct[] = rawBrands
      .map(p => {
        const affiliateLink = this.buildAffiliateLinkSmart(p.url, 'fb');
        return affiliateLink
          ? { name: p.name, price: p.price, image: p.image, category: p.category, brand: p.brand, affiliateLink, originalUrl: p.url, discount: p.discount }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .slice(0, count);
    if (products.length === 0) return { sent: 0 };

    // Gửi header
    const header = `📋 *NỘI DUNG FACEBOOK GROUPS HÔM NAY*\n${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nCopy từng bài bên dưới đăng lên các group 👇`;
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text: header, parse_mode: 'Markdown',
    }, { timeout: 10000 }).catch(() => {});

    await new Promise(r => setTimeout(r, 1000));

    let sent = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
      const emoji = Object.entries(CAT_EMOJI).find(([k]) => p.category.includes(k))?.[1] ?? '🛒';
      const link = p.affiliateLink?.includes('go.isclix.com')
        ? this.atLinkForPlatform(p.affiliateLink, 'fb')
        : (this.buildAffiliateLinkSmart(p.originalUrl, 'fb') ?? p.originalUrl);

      // Facebook format: plain text, nhiều emoji, không markdown
      const fbPost = [
        `${HOOKS[i % HOOKS.length]} ${emoji}`,
        ``,
        `${p.name.slice(0, 120)}`,
        ``,
        `💰 Giá: ${pf}`,
        `🏷️ ${p.category}`,
        ``,
        `👉 Mua ngay: ${link}`,
        ``,
        `#deal #tiki #muasam #${p.category.replace(/\s+/g, '').replace(/[&\-\/]/g, '')} #khuyenmai`,
      ].join('\n');

      try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: `📌 *Bài ${i + 1}/${products.length}* — Copy đăng Facebook:\n\n\`\`\`\n${fbPost}\n\`\`\``,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }, { timeout: 10000 });
        sent++;
      } catch (e: any) {
        this.logger.debug(`FB content lỗi: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 800));
    }

    // Gửi footer nhắc đăng
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: `✅ Xong! ${sent} bài đã sẵn sàng.\n\n📌 Đăng vào các group Facebook:\n• Deal Tiki mỗi ngày\n• Săn sale Online VN\n• Mua sắm thông minh\n• Khuyến mãi Tiki Lazada Shopee\n\n⏰ Đăng rải đều trong ngày để reach cao nhất!`,
      parse_mode: 'Markdown',
    }, { timeout: 10000 }).catch(() => {});

    return { sent };
  }

  // ─── TikTok Video Generator ───────────────────────────────────────────────

  // Cron 11h và 19h mỗi ngày — tạo video TikTok từ deal hot nhất
  @Cron('0 11,19 * * *')
  async runTikTokVideoJob() {
    this.logger.log('TikTok Video Job: tạo video...');
    await this.generateTikTokBatch(3);
  }

  async generateTikTokBatch(count = 3): Promise<{ generated: number; telegramSent: number; discordSent: number; savedPaths: string[] }> {
    // Dùng priority brands (có AT commission link) thay vì Tiki
    const rawBrands = await this.priorityBrands.getProducts(count * 2);
    const products: ScrapedProduct[] = rawBrands
      .map(p => {
        const affiliateLink = this.buildAffiliateLinkSmart(p.url, 'tele');
        return affiliateLink
          ? { name: p.name, price: p.price, image: p.image, category: p.category, brand: p.brand, affiliateLink, originalUrl: p.url, discount: p.discount }
          : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .slice(0, count);
    const results = { generated: 0, telegramSent: 0, discordSent: 0, savedPaths: [] as string[] };

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      try {
        const videoBuf = await this.videoGen.generateProductVideo({
          name: p.name,
          price: new Intl.NumberFormat('vi-VN').format(p.price) + 'đ',
          category: p.category,
          imageUrl: p.image,
          hook: HOOKS[i % HOOKS.length],
          source: 'tiki' as const,
        });

        if (!videoBuf) continue;
        results.generated++;

        // Lưu ra disk để người dùng tải lên TikTok thủ công
        const tiktokDir = path.join(os.tmpdir(), 'tiktok_videos');
        if (!fs.existsSync(tiktokDir)) fs.mkdirSync(tiktokDir, { recursive: true });
        const filename = `deal_${Date.now()}_${i}.mp4`;
        const savedPath = path.join(tiktokDir, filename);
        fs.writeFileSync(savedPath, videoBuf);
        results.savedPaths.push(savedPath);
        this.logger.log(`TikTok video lưu: ${savedPath}`);

        // Đăng video lên Telegram
        const tgOk = await this.postVideoTelegram(p, i, videoBuf);
        if (tgOk) results.telegramSent++;

        // Đăng video lên Discord
        const dcOk = await this.postVideoDiscord(p, i, videoBuf);
        if (dcOk) results.discordSent++;

        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        this.logger.warn(`TikTok video lỗi sp ${i}: ${e.message}`);
      }
    }

    this.logger.log(`TikTok batch: ${JSON.stringify(results)}`);
    return results;
  }

  private async postVideoTelegram(p: ScrapedProduct, index: number, videoBuf: Buffer): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    const chatIds = [
      process.env.TELEGRAM_CHANNEL_ID,
      ...(process.env.TELEGRAM_GROUP_IDS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);
    if (chatIds.length === 0) return false;

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const isShopee = p.originalUrl.includes('shopee.vn');
    const link = this.buildAffiliateLinkSmart(p.originalUrl, 'tele') ?? p.originalUrl;
    const hook = HOOKS[index % HOOKS.length];
    const tag = p.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');
    const caption = `${hook} 🎬\n\n${p.name.slice(0, 80)}\n\n💰 ${pf}\n\n👉 ${link}\n\n#${tag} #tiktokdeal #dealngon`;

    let ok = false;
    for (const chatId of chatIds) {
      try {
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('video', videoBuf, { filename: 'deal.mp4', contentType: 'video/mp4' });
        form.append('caption', caption.slice(0, 1024));
        form.append('supports_streaming', 'true');
        await axios.post(`https://api.telegram.org/bot${token}/sendVideo`, form, {
          headers: form.getHeaders(),
          timeout: 60000,
        });
        ok = true;
      } catch (e: any) {
        this.logger.debug(`Video Telegram [${chatId}] lỗi: ${e.response?.data?.description || e.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return ok;
  }

  private async postVideoDiscord(p: ScrapedProduct, index: number, videoBuf: Buffer): Promise<boolean> {
    const webhooks = [
      process.env.DISCORD_WEBHOOK_URL,
      ...(process.env.DISCORD_WEBHOOK_URLS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);
    if (webhooks.length === 0) return false;

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const isShopee = p.originalUrl.includes('shopee.vn');
    const link = this.buildAffiliateLinkSmart(p.originalUrl, 'discord') ?? p.originalUrl;
    const hook = HOOKS[index % HOOKS.length];

    const embed = {
      title: `${hook} 🎬 ${p.name.slice(0, 80)}`,
      description: `💰 **${pf}** | ${p.category}\n\n👉 [Đặt hàng ngay →](${link})\n\n*Video này dành để đăng lên TikTok*`,
      color: 0xFF0050,
      footer: { text: 'TikTok Video Deal | t.me/banhang1' },
    };

    // Discord free limit 25MB — check size
    if (videoBuf.length > 24 * 1024 * 1024) {
      this.logger.warn(`Video quá lớn (${Math.round(videoBuf.length / 1024 / 1024)}MB) cho Discord`);
      const results = await Promise.allSettled(
        webhooks.map(url => axios.post(url, { embeds: [embed] }, { timeout: 10000 }))
      );
      return results.some(r => r.status === 'fulfilled');
    }

    const results = await Promise.allSettled(
      webhooks.map(async (url) => {
        const form = new FormData();
        form.append('payload_json', JSON.stringify({ embeds: [embed] }));
        form.append('files[0]', videoBuf, { filename: 'deal.mp4', contentType: 'video/mp4' });
        return axios.post(url, form, { headers: form.getHeaders(), timeout: 60000 });
      })
    );
    return results.some(r => r.status === 'fulfilled');
  }

  // ─── Optimization Pipeline ────────────────────────────────────────────────

  // Full pipeline: Crawl → Score → Hook A/B → Track → Publish
  async runOptimizedPipeline(count = 10): Promise<{ scored: number; published: number; results: Record<string, number> }> {
    const log = this.logRepo.create({ agent: AgentName.TELEGRAM, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      // 1. Crawl sản phẩm
      this.atWorking = null;
      await this.checkATDeeplink();

      const half = Math.ceil(count / 2);
      const [tikiProducts, shopeeProducts] = await Promise.all([
        this.scrapeTikiProducts(half),
        this.scrapeShopeeProducts(half),
      ]);

      const priorityCount = Math.max(2, Math.floor(count * 0.4));
      const priorityRaw = await this.priorityBrands.getProducts(priorityCount);
      const allRaw = [
        ...priorityRaw.map(p => ({ name: p.name, price: p.price, image: p.image, category: p.category, brand: p.brand, url: p.url, discount: p.discount, originalPrice: p.originalPrice })),
        ...tikiProducts.map(p => ({ name: p.name, price: p.price, image: p.image, category: p.category, brand: 'Tiki', url: p.originalUrl, discount: p.discount })),
        ...shopeeProducts.map(p => ({ name: p.name, price: p.price, image: p.image, category: p.category, brand: 'Shopee', url: p.originalUrl, discount: p.discount })),
      ];

      // 2. Score & filter → top 20%
      const scored = this.productScore.filter(allRaw, 0.2);
      this.logger.log(`Optimization Pipeline: ${allRaw.length} sp crawled → ${scored.length} sp qua filter (top 20%)`);

      const results: Record<string, number> = { telegram: 0, discord: 0, zalo: 0, facebook: 0 };

      for (let i = 0; i < scored.length; i++) {
        const sp = scored[i];
        const isShopee = sp.url.includes('shopee.vn');

        // 3. Build affiliate link — bỏ qua sản phẩm không có campaign hoặc link lỗi
        const atAffiliateLink = this.buildAffiliateLinkSmart(sp.url, 'opt');
        if (!atAffiliateLink) {
          this.logger.debug(`Skip no-campaign: ${sp.url.split('/')[2]}`);
          continue;
        }
        if (!await this.verifyAffiliateLink(atAffiliateLink)) {
          this.logger.warn(`Skip AT link lỗi: ${sp.url.split('/')[2]}`);
          continue;
        }

        // 4. Đăng ký tracker → lấy /go/ URL
        const trackerId = this.affiliateTracker.register(sp.name, sp.category, sp.url, atAffiliateLink);

        // Kill switch: bỏ qua sản phẩm kém đã học được từ data thật
        if (this.killSwitch.isKilled(trackerId)) {
          this.logger.debug(`Skip killed product: ${sp.name.slice(0, 40)}`);
          continue;
        }

        // Rewrite queue: xóa cache hook → tạo hook mới
        if (this.selfOpt.isInRewriteQueue(trackerId)) {
          this.contentVariant.clearVariants(trackerId);
          this.selfOpt.consumeRewrite(trackerId);
        }

        // 5. Tạo A/B content variants
        const variants = await this.contentVariant.createVariants(trackerId, sp, atAffiliateLink);
        const bestVariant = this.contentVariant.getBestVariant(trackerId) || variants[0];
        if (!bestVariant) continue;

        // Tracker đã register ở bước trước — không cần gọi buildTrackerUrl ở đây

        // 6. Publish với link AccessTrade trực tiếp (luôn hoạt động từ mọi thiết bị)
        const p: ScrapedProduct = {
          name: sp.name,
          price: sp.price,
          image: sp.image,
          category: sp.category,
          affiliateLink: atAffiliateLink,
          originalUrl: sp.url,
          discount: sp.discount,
        };

        const [tg, dc, zl, fb] = await Promise.allSettled([
          this.postTelegramWithContent(p, bestVariant.fullText),
          this.postDiscordWithLink(p, atAffiliateLink, i),
          this.postZaloOA(p),
          this.postMakeFacebookWithLink(p, atAffiliateLink, i),
        ]);

        if (tg.status === 'fulfilled' && tg.value) results.telegram++;
        if (dc.status === 'fulfilled' && dc.value) results.discord++;
        if (zl.status === 'fulfilled' && zl.value) results.zalo++;
        if (fb.status === 'fulfilled' && fb.value) results.facebook++;

        // Record impression for A/B testing
        this.contentVariant.recordImpression(trackerId, bestVariant.variantIndex);

        // 7. Ghi vào recycle history
        this.recycleService.recordPost({
          trackerId,
          productName: sp.name,
          category: sp.category,
          trackerUrl: atAffiliateLink,
          hookUsed: bestVariant.hook,
          platforms: Object.entries(results).filter(([, v]) => v > 0).map(([k]) => k),
          postedAt: new Date(),
        });

        await new Promise(r => setTimeout(r, 1300));
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { scored: scored.length, ...results } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Optimization Pipeline xong: ${JSON.stringify(results)}`);
      return { scored: scored.length, published: Object.values(results).reduce((a, b) => a + b, 0), results };
    } catch (e) {
      await this.logRepo.update(log.id, { status: AgentRunStatus.FAILED, errorMessage: e.message, durationMs: Date.now() - startMs });
      this.logger.error(`Optimization Pipeline lỗi: ${e.message}`);
      return { scored: 0, published: 0, results: {} };
    }
  }

  // Recycle Engine: tái đăng top bài 3-7 ngày trước với hook mới
  async runRecycleCycle(): Promise<{ recycled: number; results: Record<string, number> }> {
    const candidates = this.recycleService.getCandidates(3, 7, 5);
    if (candidates.length === 0) {
      this.logger.log('Recycle: Không có bài đủ điều kiện (3-7 ngày, có click)');
      return { recycled: 0, results: {} };
    }

    const results: Record<string, number> = { telegram: 0, discord: 0 };
    let recycled = 0;

    for (const candidate of candidates) {
      const product = this.affiliateTracker.getProduct(candidate.trackerId);
      if (!product) continue;

      // Xoay hook để không trùng lặp nội dung cũ
      const variants = await this.contentVariant.createVariants(candidate.trackerId, {
        name: product.name, price: 0, image: '', url: product.originalUrl,
        category: product.category, brand: '',
      }, product.affiliateLink);

      // Dùng variant tiếp theo (không phải best để tránh trùng)
      const nextVariant = variants[recycled % variants.length] || variants[0];
      if (!nextVariant) continue;

      const recycleText = `♻️ *TOP DEAL TUẦN NÀY*\n\n${nextVariant.fullText}`;

      // Gửi lên Telegram
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatIds = [
        process.env.TELEGRAM_CHANNEL_ID,
        ...(process.env.TELEGRAM_GROUP_IDS || '').split(',').map(s => s.trim()),
      ].filter(Boolean);

      for (const chatId of chatIds) {
        try {
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId, text: recycleText, parse_mode: 'Markdown',
            disable_web_page_preview: false,
          }, { timeout: 20000 });
          results.telegram++;
        } catch (e) {
          this.logger.debug(`Recycle Telegram lỗi: ${e.message}`);
        }
      }

      this.recycleService.markRecycled(candidate.trackerId);
      recycled++;
      await new Promise(r => setTimeout(r, 1000));
    }

    this.logger.log(`Recycle xong: ${recycled} bài tái đăng`);
    return { recycled, results };
  }

  // Helper: post Telegram với content tự do (từ hook agent)
  private async postTelegramWithContent(p: ScrapedProduct, content: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    const chatIds = [
      process.env.TELEGRAM_CHANNEL_ID,
      ...(process.env.TELEGRAM_GROUP_IDS || '').split(',').map(s => s.trim()),
    ].filter(Boolean);
    if (chatIds.length === 0) return false;

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const hook = content.split('\n')[0] || '🔥 HOT DEAL';

    const imgBuffer = await this.imgGen.generateProductCard({
      name: p.name, price: pf, category: p.category,
      imageUrl: p.image, hook, source: p.originalUrl.includes('shopee.vn') ? 'shopee' : 'tiki',
    });

    let ok = false;
    for (const chatId of chatIds) {
      try {
        if (imgBuffer) {
          const form = new FormData();
          form.append('chat_id', chatId);
          form.append('photo', imgBuffer, { filename: 'deal.jpg', contentType: 'image/jpeg' });
          form.append('caption', content.slice(0, 1024));
          form.append('parse_mode', 'Markdown');
          await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, { headers: form.getHeaders(), timeout: 30000 });
        } else {
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId, text: content.slice(0, 4096), parse_mode: 'Markdown',
          }, { timeout: 20000 });
        }
        ok = true;
      } catch (e: any) {
        this.logger.debug(`Telegram [${chatId}] lỗi: ${e.response?.data?.description || e.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return ok;
  }

  // Helper: Discord với tracker link
  private async postDiscordWithLink(p: ScrapedProduct, link: string, index: number): Promise<boolean> {
    return this.postDiscord({ ...p, affiliateLink: link }, index);
  }

  // Helper: Facebook với tracker link
  private async postMakeFacebookWithLink(p: ScrapedProduct, link: string, index: number): Promise<boolean> {
    return this.postMakeFacebook({ ...p, affiliateLink: link, originalUrl: p.originalUrl }, index);
  }

  // ─── Boost Cycle ─────────────────────────────────────────────────────────

  // Đăng lại sản phẩm trong boost queue với hook tốt nhất + badge BOOST
  async runBoostCycle(): Promise<{ boosted: number; results: Record<string, number> }> {
    const boostIds = this.selfOpt.getStatus().boostQueue;
    if (boostIds.length === 0) {
      this.logger.log('Boost Cycle: Boost queue trống');
      return { boosted: 0, results: {} };
    }

    const results: Record<string, number> = { telegram: 0, discord: 0 };
    let boosted = 0;

    for (const productId of boostIds.slice(0, 5)) {
      const product = this.affiliateTracker.getProduct(productId);
      if (!product) continue;

      const bestVariant = this.contentVariant.getBestVariant(productId);
      if (!bestVariant) continue;

      const boostText = `🚀 *TOP DEAL — ĐANG HOT*\n\n${bestVariant.fullText}`;
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatIds = [
        process.env.TELEGRAM_CHANNEL_ID,
        ...(process.env.TELEGRAM_GROUP_IDS || '').split(',').map(s => s.trim()),
      ].filter(Boolean);

      for (const chatId of chatIds) {
        try {
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId, text: boostText, parse_mode: 'Markdown', disable_web_page_preview: false,
          }, { timeout: 20000 });
          results.telegram++;
        } catch (e) {
          this.logger.debug(`Boost Telegram lỗi: ${e.message}`);
        }
      }

      this.logger.log(`Boost: ${product.name.slice(0, 40)} (${product.clicks} clicks)`);
      boosted++;
      await new Promise(r => setTimeout(r, 1000));
    }

    this.logger.log(`Boost Cycle xong: ${boosted} sản phẩm`);
    return { boosted, results };
  }

  // ─── Follower Growth ─────────────────────────────────────────────────────

  // Đăng bài CTA kêu gọi follow fanpage: T2, T4, T6 lúc 9h VN
  @Cron('0 9 * * 1,3,5')
  async runFollowerGrowthPost() {
    this.logger.log('Follower Growth: đăng bài CTA...');
    await this.postFollowerCTA();
  }

  // Refresh Facebook session để không bị đăng xuất (mỗi 6h)
  @Cron('0 */6 * * *')
  async runFbSessionRefresh() {
    await this.fbGroups.refreshSession();
  }

  // Mời người đã like bài đăng → theo dõi trang (mỗi 6h)
  @Cron('30 */6 * * *')
  async runInvitePostLikers() {
    await this.invitePostLikers();
  }

  // ĐÃ TẮT (2026-07-03): job cũ đăng không giới hạn vào toàn bộ group cache Redis (419 group),
  // chạy chồng lấn với runTargetGroupAutoPost() và là nguyên nhân gây FB checkpoint lúc 18:51 (2/7).
  // Giữ lại method postToFacebookGroups() để có thể gọi thủ công qua runFollowerGrowthNow() nếu cần.
  // @Cron('0 */8 * * *')
  async runFacebookGroupPost() {
    await this.postToFacebookGroups();
  }

  // Tự động tìm group Facebook mới mỗi thứ 2 lúc 3h sáng VN
  @Cron('0 3 * * 1')
  async runGroupDiscovery() {
    await this.discoverAndSaveGroups();
  }

  // Auto-scan + join groups mới mỗi thứ 3 và thứ 6 lúc 2h VN
  @Cron('0 2 * * 2,5', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runAutoScanAndJoin() {
    this.logger.log('[CRON] Auto-scan & join groups mới...');
    await this.runGroupScanAndJoin();
  }

  // Auto-post deal vào target groups — 15 groups/lần, mỗi giờ 1 lần từ 6h đến 22h VN (17 khung giờ/ngày)
  @Cron('0 6-22 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runTargetGroupAutoPost() {
    this.logger.log('[CRON] Auto-post vào target groups...');
    await this.runGroupAutoPost(15);
  }

  // Mời reactor fanpage posts theo dõi page (mỗi ngày 22h VN)
  @Cron('0 22 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runInviteReactors() {
    this.logger.log('[CRON] Mời reactors theo dõi fanpage...');
    await this.fbGroups.inviteGroupReactors([]);
  }

  // ── Campaign Sale Con Cưng ──
  // Scan + join group Mẹ & Bé — T4 và CN lúc 3h VN (lệch giờ với scan chính T3/T6 2h, tránh trùng)
  @Cron('0 3 * * 3,0', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runConcungAutoScanAndJoin() {
    this.logger.log('[CRON] Concung: Auto-scan & join group Mẹ & Bé...');
    await this.runConcungGroupScanAndJoin();
  }

  // TẠM TẮT (2026-07-03): 145 group trong danh sách được join dưới danh tính fanpage CHÍNH (scan cũ
  // không chuyển identity trước khi join) — Sale Con Cưng chưa thực sự là thành viên nên post sẽ luôn
  // fail (hiện nút "Tham gia nhóm" thay vì ô đăng bài). Cần chạy runConcungRejoinGroupsCron đủ nhiều
  // đợt trước khi bật lại job này.
  // @Cron('45 9,13,17,21 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runConcungGroupAutoPostCron() {
    this.logger.log('[CRON] Concung: Auto-post campaign vào group Mẹ & Bé...');
    await this.runConcungGroupAutoPost(10);
  }

  // Join lại các group Mẹ & Bé dưới danh tính Sale Con Cưng (fix lỗi join nhầm identity ở lần scan
  // đầu) — chia nhỏ 25 group/lần, 1 lần/ngày, để giảm hành vi bất thường trên tài khoản
  async runConcungRejoinGroups(batchSize = 25): Promise<{ joined: number; pending: number; tried: number }> {
    if (!this.CONCUNG_PAGE_ID) return { joined: 0, pending: 0, tried: 0 };
    const switched = await this.fbGroups.switchActiveIdentity(this.CONCUNG_PAGE_ID);
    if (!switched) {
      this.logger.warn('Concung rejoin: chuyển identity sang Sale Con Cưng thất bại — bỏ qua lần này');
      return { joined: 0, pending: 0, tried: 0 };
    }
    let result = { joined: 0, pending: 0, tried: 0 };
    try {
      result = await this.fbGroups.rejoinAsActiveIdentity(CONCUNG_TARGET_GROUPS_FILE, batchSize);
    } finally {
      if (this.MAIN_PAGE_PROFILE_ID) {
        const restored = await this.fbGroups.switchActiveIdentity(this.MAIN_PAGE_PROFILE_ID);
        if (!restored) this.logger.error('Concung rejoin: KHÔNG chuyển lại được fanpage chính — kiểm tra thủ công qua /fb-groups/switch-identity');
      }
    }
    return result;
  }

  @Cron('30 4 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runConcungRejoinGroupsCron() {
    this.logger.log('[CRON] Concung: join lại group dưới danh tính Sale Con Cưng...');
    const r = await this.runConcungRejoinGroups(25);
    this.logger.log(`Concung rejoin xong: tried=${r.tried}, joined=${r.joined}, pending=${r.pending}`);
  }

  async runGroupDiscoveryNow(): Promise<{ found: number; groups: string[] }> {
    const groups = await this.discoverAndSaveGroups();
    return { found: groups.length, groups };
  }

  async runGroupScanAndJoin(keywords?: string[]): Promise<{ discovered: number; joined: number; pending: number; totalTargets: number }> {
    const kws = keywords?.length ? keywords : this.GROUP_SEARCH_KEYWORDS;
    const result = await this.fbGroups.autoScanAndJoin(kws);
    const totalTargets = this.fbGroups.loadTargetGroups().length;
    this.logger.log(`Scan & Join: discovered=${result.discovered}, joined=${result.joined}, pending=${result.pending}, total=${totalTargets}`);
    return { ...result, totalTargets };
  }

  async runGroupAutoPost(maxGroups = 10): Promise<{ sent: number; groups: number }> {
    const records = this.fbGroups.getMemberGroupsForPosting(maxGroups);
    if (records.length === 0) {
      this.logger.log('autoPost: không có group nào — chạy scan trước');
      return { sent: 0, groups: 0 };
    }
    const products = await this.getProductsForPosting(1);
    const sent = await this.fbGroups.postToGroups(products, records.map(r => r.url));
    if (sent > 0) {
      for (const r of records.slice(0, sent)) this.fbGroups.markGroupPosted(r.slug);
    }
    return { sent, groups: records.length };
  }

  // ─── Campaign Sale Con Cưng (fanpage riêng, group Mẹ & Bé riêng) ───────────

  private readonly CONCUNG_PAGE_ID = process.env.FACEBOOK_CONCUNG_PAGE_ID || '';
  private readonly CONCUNG_PAGE_NAME = process.env.FACEBOOK_CONCUNG_PAGE_NAME || 'Sale Con Cưng';
  private readonly CONCUNG_PAGE_URL = process.env.FACEBOOK_CONCUNG_PAGE_URL
    || (this.CONCUNG_PAGE_ID ? `https://www.facebook.com/profile.php?id=${this.CONCUNG_PAGE_ID}` : '');
  // ID dạng profile.php của fanpage chính — dùng để chuyển identity về lại sau khi đăng campaign Con Cưng
  private readonly MAIN_PAGE_PROFILE_ID = process.env.FACEBOOK_PAGE_PROFILE_ID || '';

  async runConcungGroupScanAndJoin(keywords?: string[]): Promise<{ discovered: number; joined: number; pending: number; totalTargets: number }> {
    const kws = keywords?.length ? keywords : this.CONCUNG_GROUP_KEYWORDS;
    const result = await this.fbGroups.autoScanAndJoin(kws, CONCUNG_TARGET_GROUPS_FILE);
    const totalTargets = this.fbGroups.loadTargetGroups(CONCUNG_TARGET_GROUPS_FILE).length;
    this.logger.log(`Concung Scan & Join: discovered=${result.discovered}, joined=${result.joined}, pending=${result.pending}, total=${totalTargets}`);
    return { ...result, totalTargets };
  }

  async runConcungGroupAutoPost(maxGroups = 10): Promise<{ sent: number; groups: number }> {
    if (!this.CONCUNG_PAGE_ID) {
      this.logger.warn('Concung autoPost: chưa cấu hình FACEBOOK_CONCUNG_PAGE_ID trong .env');
      return { sent: 0, groups: 0 };
    }
    const records = this.fbGroups.getMemberGroupsForPosting(maxGroups, CONCUNG_TARGET_GROUPS_FILE);
    if (records.length === 0) {
      this.logger.log('Concung autoPost: không có group nào — chạy scan trước');
      return { sent: 0, groups: 0 };
    }
    const raw = await this.priorityBrands.getConCungProducts(1);
    const products = raw
      .map(p => {
        const affiliateLink = this.buildAffiliateLinkSmart(p.url, 'fb');
        if (!affiliateLink) return null;
        return { name: p.name, price: p.price, url: affiliateLink, image: p.image, category: p.category };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
    if (products.length === 0) {
      this.logger.warn('Concung autoPost: không lấy được sản phẩm Con Cưng');
      return { sent: 0, groups: 0 };
    }
    // Chuyển active identity sang Sale Con Cưng trước khi đăng — bắt buộc, không post nếu chuyển thất bại
    // (tránh lặp lại lỗi đăng nhầm danh tính fanpage chính)
    const switched = await this.fbGroups.switchActiveIdentity(this.CONCUNG_PAGE_ID);
    if (!switched) {
      this.logger.warn('Concung autoPost: chuyển identity sang Sale Con Cưng thất bại — bỏ qua lần này');
      return { sent: 0, groups: 0 };
    }

    let sent = 0;
    try {
      sent = await this.fbGroups.postToGroups(products, records.map(r => r.url), {
        pageName: this.CONCUNG_PAGE_NAME,
        pageUrl: this.CONCUNG_PAGE_URL,
        hashtags: '#mevabe #concung #dososinh #meandbe #bimsua',
        listFile: CONCUNG_TARGET_GROUPS_FILE,
      });
      if (sent > 0) {
        for (const r of records.slice(0, sent)) this.fbGroups.markGroupPosted(r.slug, CONCUNG_TARGET_GROUPS_FILE);
      }
    } finally {
      // Luôn chuyển về fanpage chính sau khi xong, kể cả khi lỗi — job đăng deal chung chạy hàng giờ
      // phải luôn thấy đúng identity mặc định
      if (this.MAIN_PAGE_PROFILE_ID) {
        const restored = await this.fbGroups.switchActiveIdentity(this.MAIN_PAGE_PROFILE_ID);
        if (!restored) this.logger.error('Concung autoPost: KHÔNG chuyển lại được fanpage chính — cần kiểm tra thủ công qua /fb-groups/switch-identity');
      }
    }
    return { sent, groups: records.length };
  }

  // Đăng 1 bài (deal hoặc engagement) lên chính timeline Sale Con Cưng — luôn switch identity đi/về
  private async postToConcungTimeline(text: string): Promise<boolean> {
    if (!this.CONCUNG_PAGE_ID) {
      this.logger.warn('Concung timeline post: chưa cấu hình FACEBOOK_CONCUNG_PAGE_ID');
      return false;
    }
    const switched = await this.fbGroups.switchActiveIdentity(this.CONCUNG_PAGE_ID);
    if (!switched) {
      this.logger.warn('Concung timeline post: chuyển identity thất bại — bỏ qua lần này');
      return false;
    }
    let ok = false;
    try {
      ok = await this.fbGroups.postToOwnTimeline(this.CONCUNG_PAGE_ID, text);
    } finally {
      if (this.MAIN_PAGE_PROFILE_ID) {
        const restored = await this.fbGroups.switchActiveIdentity(this.MAIN_PAGE_PROFILE_ID);
        if (!restored) this.logger.error('Concung timeline post: KHÔNG chuyển lại được fanpage chính — kiểm tra thủ công qua /fb-groups/switch-identity');
      }
    }
    return ok;
  }

  async runConcungTimelineDealPost(): Promise<{ ok: boolean }> {
    const raw = await this.priorityBrands.getConCungProducts(1);
    if (raw.length === 0) return { ok: false };
    const p = raw[0];
    const affiliateLink = this.buildAffiliateLinkSmart(p.url, 'fb');
    if (!affiliateLink) return { ok: false };
    const text = this.fanpageContent.buildDealPost({
      name: p.name, price: p.price, category: p.category,
      brand: p.brand, discount: p.discount, affiliateLink,
    });
    const ok = await this.postToConcungTimeline(text);
    return { ok };
  }

  async runConcungTimelineEngagementPost(): Promise<{ ok: boolean }> {
    const text = this.fanpageContent.buildEngagementPost('tips_baby');
    const ok = await this.postToConcungTimeline(text);
    return { ok };
  }

  // Cron riêng cho timeline Sale Con Cưng — giống nhịp fanpage chính (6 deal + 1 engagement/ngày),
  // lệch phút so với job group Con Cưng (:45) và job group chính (:00) để không chạy chồng
  @Cron('15 8,12,15,18,20,22 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runConcungTimelineDealPostCron() {
    this.logger.log('[CRON] Concung: đăng deal lên timeline Sale Con Cưng...');
    await this.runConcungTimelineDealPost();
  }

  @Cron('15 10 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runConcungTimelineEngagementPostCron() {
    this.logger.log('[CRON] Concung: đăng engagement post lên timeline Sale Con Cưng...');
    await this.runConcungTimelineEngagementPost();
  }

  private readonly GROUPS_FILE = '/app/fb_data/fb_discovered_groups.json';
  private groupsCache: string[] = [];

  private async discoverAndSaveGroups(): Promise<string[]> {
    const loggedIn = await this.fbGroups.ensureLoggedIn();
    if (!loggedIn) {
      this.logger.log('Group discovery: không thể đăng nhập Facebook — bỏ qua');
      return [];
    }
    this.logger.log('Bắt đầu tự động tìm Facebook groups...');
    const urls = await this.fbGroups.discoverGroupUrls(this.GROUP_SEARCH_KEYWORDS);
    if (urls.length > 0) {
      this.groupsCache = urls;
      // Lưu file local làm backup chính
      try {
        require('fs').writeFileSync(this.GROUPS_FILE, JSON.stringify(urls));
        this.logger.log(`Đã lưu ${urls.length} group URLs vào file backup`);
      } catch {}
      // Thử lưu Redis
      try {
        await this.redis.set(this.FB_GROUPS_KEY, JSON.stringify(urls), 'EX', this.FB_GROUPS_TTL);
        this.logger.log(`Đã lưu ${urls.length} group URLs vào Redis (TTL 7 ngày)`);
      } catch (e: any) {
        this.logger.warn(`Redis lưu groups lỗi: ${e.message} (đã có file backup)`);
      }
    }
    return urls;
  }

  async getGroupUrlsPublic(): Promise<string[]> { return this.getGroupUrls(); }

  private async getGroupUrls(): Promise<string[]> {
    // Ưu tiên env var nếu có cấu hình thủ công
    const envUrls = (process.env.FACEBOOK_GROUP_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (envUrls.length > 0) return envUrls;
    // In-memory cache
    if (this.groupsCache.length > 0) return this.groupsCache;
    // File backup
    try {
      const fs = require('fs');
      if (fs.existsSync(this.GROUPS_FILE)) {
        const urls: string[] = JSON.parse(fs.readFileSync(this.GROUPS_FILE, 'utf8'));
        if (urls.length > 0) { this.groupsCache = urls; return urls; }
      }
    } catch {}
    // Redis
    try {
      const stored = await this.redis.get(this.FB_GROUPS_KEY);
      if (stored) {
        const urls: string[] = JSON.parse(stored);
        this.groupsCache = urls;
        this.logger.log(`Groups từ Redis: ${urls.length} groups`);
        return urls;
      }
    } catch {}
    return [];
  }

  async runFollowerGrowthNow(): Promise<{ ctaPost: boolean; invited: number; groupsPosted: number }> {
    const [cta, invite, group] = await Promise.allSettled([
      this.postFollowerCTA().then(() => true).catch(() => false),
      this.invitePostLikers(),
      this.postToFacebookGroups(),
    ]);
    return {
      ctaPost: cta.status === 'fulfilled' ? cta.value as boolean : false,
      invited: invite.status === 'fulfilled' ? (invite.value as any).invited : 0,
      groupsPosted: group.status === 'fulfilled' ? (group.value as any).posted : 0,
    };
  }

  private async postFollowerCTA(): Promise<void> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageId || !pageToken) return;

    const variants = [
      {
        hook: '🔔 BẠN ĐÃ THEO DÕI TRANG CHƯA?',
        body: 'Mỗi ngày chúng tôi chia sẻ hàng chục deal HOT từ Tiki, Shopee — giảm đến 70%!\n\n✅ Nhấn "Theo dõi" để:\n• Nhận deal sớm nhất trước khi hết hàng\n• Không bỏ lỡ flash sale siêu hot\n• Tiết kiệm hàng triệu đồng mỗi tháng',
      },
      {
        hook: '🎁 DEAL HOT MỖI NGÀY — MIỄN PHÍ 100%!',
        body: 'Chúng tôi săn deal giúp bạn. Bạn chỉ cần:\n\n1️⃣ Nhấn THEO DÕI trang\n2️⃣ Bật thông báo 🔔\n3️⃣ Nhận deal hot và mua hàng giảm giá mỗi ngày!',
      },
      {
        hook: '💰 TIẾT KIỆM MỖI NGÀY VỚI DEAL HOT!',
        body: 'Hàng ngàn người đã theo dõi trang để nhận deal hot hàng ngày.\n\nBạn thì sao? 👇\n\n👉 Nhấn THEO DÕI ngay để không bỏ lỡ!\n📢 Chia sẻ cho bạn bè cùng tiết kiệm nhé!',
      },
    ];
    const v = variants[Math.floor(Math.random() * variants.length)];
    const message = `${v.hook}\n\n${v.body}\n\n#muasam #deal #tiki #shopee #khuyenmai #tietsiem`;

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        null,
        { params: { message, access_token: pageToken }, timeout: 15000 },
      );
      this.logger.log('Follower CTA post OK ✅');
    } catch (e: any) {
      this.logger.debug(`Follower CTA lỗi: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  private async invitePostLikers(): Promise<{ invited: number; checked: number }> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageId || !pageToken) return { invited: 0, checked: 0 };

    let invited = 0;
    let checked = 0;
    try {
      // Lấy 5 bài đăng gần nhất
      const postsRes = await axios.get(`https://graph.facebook.com/v19.0/${pageId}/posts`, {
        params: { fields: 'id', limit: 5, access_token: pageToken },
        timeout: 10000,
      });
      const posts: any[] = postsRes.data?.data || [];

      for (const post of posts.slice(0, 3)) {
        const likesRes = await axios.get(`https://graph.facebook.com/v19.0/${post.id}/likes`, {
          params: { fields: 'id', limit: 50, access_token: pageToken },
          timeout: 10000,
        });
        const likers: any[] = likesRes.data?.data || [];
        checked += likers.length;

        for (const liker of likers.slice(0, 25)) {
          try {
            // Thử mời qua Graph API (Facebook restrict — graceful fail)
            await axios.post(
              `https://graph.facebook.com/v19.0/${pageId}/subscriptions`,
              null,
              { params: { subscriber: liker.id, access_token: pageToken }, timeout: 5000 },
            );
            invited++;
            await new Promise(r => setTimeout(r, 300));
          } catch { /* đã follow hoặc API không hỗ trợ */ }
        }
      }
    } catch (e: any) {
      this.logger.debug(`Invite likers lỗi: ${e.message}`);
    }

    if (checked > 0) this.logger.log(`Invite likers: kiểm tra ${checked} → mời được ${invited}`);
    return { invited, checked };
  }

  private async postToFacebookGroups(): Promise<{ posted: number; failed: number }> {
    const groupUrls = await this.getGroupUrls();
    if (groupUrls.length === 0) {
      this.logger.log('FB Groups: chưa có group nào (env trống, Redis trống). Chạy discover trước.');
      return { posted: 0, failed: 0 };
    }

    // Ưu tiên dùng Playwright (cookie session) nếu đã đăng nhập
    if (this.fbGroups.isLoggedIn()) {
      const products = await this.getProductsForPosting(2);
      const sent = await this.fbGroups.postToGroups(products, groupUrls);
      this.logger.log(`FB Groups (Playwright): ${sent}/${groupUrls.length} OK`);
      return { posted: sent, failed: groupUrls.length - sent };
    }

    // Fallback: Graph API group post (cần page là admin group)
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageToken) return { posted: 0, failed: 0 };

    const products = await this.scrapeTikiProducts(2);
    if (!products.length) return { posted: 0, failed: 0 };
    const p = products[0];
    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const link = this.buildAffiliateLinkSmart(p.originalUrl, 'fbgroup') ?? p.originalUrl;
    const tag = p.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');
    const message = [
      `🔥 HOT DEAL | ${p.category.toUpperCase()}`,
      ``,
      `${p.name.slice(0, 100)}${(p.discount ?? 0) >= 20 ? ` (Giảm ${p.discount}%)` : ''}`,
      ``,
      `💰 Giá: ${pf}`,
      `👉 Mua ngay: ${link}`,
      ``,
      `📢 Theo dõi trang để nhận deal hot mỗi ngày!`,
      `#deal #${tag} #muasam #khuyenmai`,
    ].join('\n');

    let posted = 0;
    let failed = 0;
    for (const url of groupUrls) {
      const match = url.match(/groups\/(\d+)/);
      if (!match) { failed++; continue; }
      try {
        await axios.post(`https://graph.facebook.com/v19.0/${match[1]}/feed`, null, {
          params: { message, access_token: pageToken },
          timeout: 15000,
        });
        this.logger.log(`Group API OK: ${match[1]}`);
        posted++;
        await new Promise(r => setTimeout(r, 2000));
      } catch (e: any) {
        this.logger.debug(`Group ${match[1]} lỗi: ${e.response?.data?.error?.message || e.message}`);
        failed++;
      }
    }
    if (posted + failed > 0) this.logger.log(`FB Groups API: ${posted} OK, ${failed} lỗi`);
    return { posted, failed };
  }

  async sendCustomerCareMessage(telegramId: string, message: string): Promise<boolean> {
    if (!process.env.TELEGRAM_BOT_TOKEN) return false;
    try {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: telegramId, text: message, parse_mode: 'Markdown',
      });
      return true;
    } catch (e) {
      this.logger.error(`Không gửi được tới ${telegramId}: ${e.message}`);
      return false;
    }
  }
}
