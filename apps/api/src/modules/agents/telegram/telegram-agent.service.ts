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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ScrapedProduct {
  name: string;
  price: number;
  image: string;
  category: string;
  affiliateLink: string;
  originalUrl: string;
  discount?: number;
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

  private readonly AT_PID = process.env.ACCESSTRADE_PID || '';
  private readonly AT_AID = process.env.ACCESSTRADE_TIKI_AID || '';
  private readonly AT_SHOPEE_AID = process.env.ACCESSTRADE_SHOPEE_AID || '';
  private readonly AT_CONCUNG_AID = process.env.ACCESSTRADE_CONCUNG_AID || '5204532880919025215';
  private readonly AT_THEFACESHOP_AID = process.env.ACCESSTRADE_THEFACESHOP_AID || '4679977611385258995';
  private readonly AT_HOANGHA_AID = process.env.ACCESSTRADE_HOANGHA_AID || '5229340396064683522';

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
  ) {}

  // Cào + đăng mỗi 2 giờ từ 8h-22h lên TẤT CẢ platform
  @Cron('0 8,10,12,14,16,18,20,22 * * *')
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

  // Lọc bỏ link 404/410 trước khi đăng — chỉ loại explicit dead link, timeout → giữ lại
  private async filterDeadLinks(products: ScrapedProduct[]): Promise<ScrapedProduct[]> {
    if (!products.length) return [];
    const headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'vi-VN,vi;q=0.9',
    };
    const checks = await Promise.allSettled(
      products.map(p =>
        axios.head(p.originalUrl, { timeout: 6000, maxRedirects: 5, validateStatus: () => true, headers })
          .then(r => r.status !== 404 && r.status !== 410)
          .catch(() => true), // timeout hoặc lỗi mạng → giữ lại để không bỏ nhầm
      )
    );
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

  async scrapeAndDistribute(count = 10): Promise<{ scraped: number; results: Record<string, number> }> {
    const log = this.logRepo.create({ agent: AgentName.TELEGRAM, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      // Reset AT status check mỗi lần chạy để detect khi được duyệt
      this.atWorking = null;
      const atOk = await this.checkATDeeplink();
      if (!atOk) {
        this.logger.warn('⚠️ AT deeplink chưa hoạt động → dùng link Tiki trực tiếp (chưa có hoa hồng). Vào accesstrade.vn join campaign TIKI CPS!');
      }

      // Pool cố định 30 sp để luôn có đủ sp mới sau dedup (Tiki ~41 sp, 12h TTL)
      const POOL_SIZE = 30;
      const [tikiProducts, shopeeProducts] = await Promise.all([
        this.scrapeTikiProducts(POOL_SIZE),
        this.scrapeShopeeProducts(Math.ceil(count * 1.5)),
      ]);

      // Ưu tiên brand hoa hồng cao (40%) + Tiki/Shopee (60%)
      const priorityCount = Math.max(2, Math.floor(count * 0.4));
      const priorityRaw = await this.priorityBrands.getProducts(priorityCount);
      const priorityProducts: ScrapedProduct[] = priorityRaw.map(p => {
        const aidMap: Record<string, string> = {
          'concung.com': this.AT_CONCUNG_AID,
          'thefaceshop.com.vn': this.AT_THEFACESHOP_AID,
          'hoanghamobile.com': this.AT_HOANGHA_AID,
        };
        const domain = Object.keys(aidMap).find(d => p.url.includes(d)) || '';
        const aid = aidMap[domain] || this.AT_AID;
        const urlEnc = Buffer.from(p.url).toString('base64');
        const affiliateLink = this.AT_PID && aid
          ? `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${aid}?sub4=tele&url_enc=${encodeURIComponent(urlEnc)}`
          : p.url;
        return { name: p.name, price: p.price, image: p.image, category: p.category, affiliateLink, originalUrl: p.url, discount: p.discount };
      });

      const tikiShopeeProducts: ScrapedProduct[] = [];
      const maxLen = Math.max(tikiProducts.length, shopeeProducts.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < tikiProducts.length) tikiShopeeProducts.push(tikiProducts[i]);
        if (i < shopeeProducts.length) tikiShopeeProducts.push(shopeeProducts[i]);
      }

      // Xen kẽ: 2 sp priority → 3 sp Tiki/Shopee → 2 sp priority → ...
      const rawProducts: ScrapedProduct[] = [];
      let pi = 0, ti = 0;
      while (pi < priorityProducts.length || ti < tikiShopeeProducts.length) {
        if (pi < priorityProducts.length) rawProducts.push(priorityProducts[pi++]);
        if (pi < priorityProducts.length) rawProducts.push(priorityProducts[pi++]);
        for (let k = 0; k < 3 && ti < tikiShopeeProducts.length; k++) rawProducts.push(tikiShopeeProducts[ti++]);
      }

      // Lọc bỏ sản phẩm đã đăng trong 48h qua, rồi loại link 404, cap tại count
      let products = await this.filterUnposted(rawProducts);
      products = await this.filterDeadLinks(products);
      products = products.slice(0, count); // giới hạn đăng đúng count sp mỗi run

      this.logger.log(`Priority brands: ${priorityProducts.length} | Tiki: ${tikiProducts.length} | Shopee: ${shopeeProducts.length} → ${products.length} chưa đăng`);

      const results: Record<string, number> = {
        telegram: 0, discord: 0, zalo: 0, n8n: 0, facebook: 0,
      };

      for (let i = 0; i < products.length; i++) {
        const p = products[i];

        // Chạy song song tất cả platform
        const [tg, dc, zl, fb] = await Promise.allSettled([
          this.postTelegram(p, i),
          this.postDiscord(p, i),
          this.postZaloOA(p),
          this.postMakeFacebook(p, i),
        ]);

        const anySuccess = [tg, dc, zl, fb].some(r => r.status === 'fulfilled' && r.value);
        if (tg.status === 'fulfilled' && tg.value) results.telegram++;
        if (dc.status === 'fulfilled' && dc.value) results.discord++;
        if (zl.status === 'fulfilled' && zl.value) results.zalo++;
        if (fb.status === 'fulfilled' && fb.value) results.facebook++;

        // Đánh dấu đã đăng để tránh lặp lại trong 48h
        if (anySuccess) await this.markPosted(p.originalUrl);

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
    const half = Math.ceil(count / 2);
    const [tiki, shopee] = await Promise.all([
      this.scrapeTikiProducts(half),
      this.scrapeShopeeProducts(half),
    ]);
    return [...tiki, ...shopee].slice(0, count).map(p => ({
      name: p.name,
      price: p.price,
      url: p.affiliateLink || p.originalUrl,
      image: p.image,
      category: p.category,
    }));
  }

  // ─── Tiki Scraper (không lưu DB) ─────────────────────────────────────────

  private atWorking: boolean | null = null;

  private async checkATDeeplink(): Promise<boolean> {
    if (this.atWorking !== null) return this.atWorking;
    if (!this.AT_PID || !this.AT_AID) {
      this.atWorking = false;
      this.logger.warn('AT Deeplink: Thiếu PID/AID ❌');
      return false;
    }
    // Test thực tế deeplink go.isclix.com
    try {
      const urlEnc = Buffer.from('https://tiki.vn/').toString('base64');
      const testUrl = `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${this.AT_AID}?sub4=check&url_enc=${encodeURIComponent(urlEnc)}`;
      const res = await axios.get(testUrl, { maxRedirects: 3, timeout: 8000, validateStatus: () => true });
      this.atWorking = res.status < 400;
      this.logger.log(`AT Deeplink: ${this.atWorking ? 'OK ✅ (go.isclix.com)' : `❌ HTTP ${res.status} — dùng link trực tiếp`}`);
    } catch {
      this.atWorking = false;
      this.logger.warn('AT Deeplink: Không kết nối được, dùng link trực tiếp');
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

    const toScraped = (p: any, catName: string): ScrapedProduct => {
      const productUrl = `https://tiki.vn/${p.url_key}.html`;
      return {
        name: p.name || '',
        price: p.price,
        image: p.thumbnail_url || '',
        category: catName,
        affiliateLink: productUrl,
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

  private buildShopeeAffiliateLink(productUrl: string): string {
    if (this.AT_PID && this.AT_SHOPEE_AID) {
      const urlEnc = Buffer.from(productUrl).toString('base64');
      return `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${this.AT_SHOPEE_AID}?sub4=tele&url_enc=${encodeURIComponent(urlEnc)}`;
    }
    return productUrl;
  }

  private async scrapeShopeeProducts(count: number): Promise<ScrapedProduct[]> {
    const results: ScrapedProduct[] = [];
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9',
      'Referer': 'https://shopee.vn/',
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
            results.push({ name: p.name, price, image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '', category: 'Shopee', affiliateLink: url, originalUrl: url });
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
            results.push({ name: p.name, price, image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '', category: cat, affiliateLink: url, originalUrl: url });
          });
        } catch { /* ignore */ }
      }),
    ]);

    // Dedup
    const seen = new Set<string>();
    return results.filter(p => {
      if (seen.has(p.originalUrl)) return false;
      seen.add(p.originalUrl);
      return true;
    }).slice(0, count);
  }

  // ─── Platform Publishers ──────────────────────────────────────────────────

  private readonly CTA = '\n\n👥 Theo dõi kênh: t.me/banhang1';

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

    const markdown = `${hook}\n${discountLine}${emoji} *${p.name.slice(0, 80)}*\n\n💰 *${pf}*\n\n🔗 [Đặt hàng ngay](${link})\n\n#${tag} #${source} #deal${this.CTA}`;
    const plain    = `${hook}\n${discountLine}${emoji} ${p.name.slice(0, 80)}\n\n💰 ${pf}\n\n🔗 ${link}\n\n#${tag} #${source} #deal${this.CTA}`;
    const html     = `${hook}\n${discountLine ? `<b>${this.escapeHtml(discountLine.trim())}</b>\n` : ''}${emoji} <b>${this.escapeHtml(p.name.slice(0, 80))}</b>\n\n💰 <b>${pf}</b>\n\n🔗 <a href="${link}">Đặt hàng ngay</a>\n\n#${tag} #${source} #deal${this.CTA}`;

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

    const isShopee = p.originalUrl.includes('shopee.vn');
    const link = isShopee ? this.buildShopeeAffiliateLink(p.originalUrl) : this.buildAffiliateLink(p.originalUrl, 'tele');
    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const hook = HOOKS[index % HOOKS.length];
    const { html } = this.buildText(link, p, index);

    // Tạo ảnh product card
    const imgBuffer = await this.imgGen.generateProductCard({
      name: p.name,
      price: pf,
      category: p.category,
      imageUrl: p.image,
      hook,
      source: isShopee ? 'shopee' : 'tiki',
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
    const isShopeeD = p.originalUrl.includes('shopee.vn');
    const link = isShopeeD ? this.buildShopeeAffiliateLink(p.originalUrl) : this.buildAffiliateLink(p.originalUrl, 'discord');
    const source = isShopeeD ? 'Shopee' : 'Tiki';

    // Tạo ảnh product card
    const imgBuffer = await this.imgGen.generateProductCard({
      name: p.name, price: pf, category: p.category,
      imageUrl: p.image, hook, source: isShopeeD ? 'shopee' : 'tiki',
    });

    const embed = {
      title: `${hook} ${emoji} ${p.name.slice(0, 100)}`,
      description: `💰 **${pf}**\n\n🏷️ ${p.category}\n\n[Đặt hàng ngay →](${link})`,
      url: link,
      color: isShopeeD ? 0xEE4D2D : 0xFF6B35,
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
          { type: 'button', buttons: [{ title: 'Mua ngay tại Tiki', image_icon: '', type: 'oa.open.url', payload: { url: p.affiliateLink } }] },
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
      return res.data?.data?.display_url || res.data?.data?.url || null;
    } catch (e: any) {
      this.logger.debug(`imgbb upload lỗi: ${e.message}`);
      return null;
    }
  }

  private async postMakeFacebook(p: ScrapedProduct, index: number): Promise<boolean> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const webhookUrl = process.env.MAKE_FACEBOOK_WEBHOOK;
    if (!pageId && !webhookUrl) return false;

    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const emoji = Object.entries(CAT_EMOJI).find(([k]) => p.category.includes(k))?.[1] ?? '🛒';
    const hook = HOOKS[index % HOOKS.length];
    const isShopee = p.originalUrl.includes('shopee.vn');
    const link = isShopee
      ? this.buildShopeeAffiliateLink(p.originalUrl)
      : this.buildAffiliateLink(p.originalUrl, 'fb');
    const tag = p.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');
    const source = isShopee ? 'Shopee' : 'Tiki';

    const message = [
      `${hook} ${emoji}`,
      ``,
      `${p.name.slice(0, 150)}`,
      ``,
      `💰 Giá: ${pf}`,
      `🏷️ ${p.category} (${source})`,
      ``,
      `👉 Mua ngay: ${link}`,
      ``,
      `#deal #${tag} #${source.toLowerCase()} #muasam #khuyenmai`,
      ``,
      `📢 Theo dõi Telegram nhận deal sớm hơn: https://t.me/banhang1`,
    ].join('\n');

    // Tạo card 1080x1080 → upload imgbb → lấy public URL
    let imageUrl: string | null = null;
    try {
      const imgBuf = await this.imgGen.generateProductCard({
        name: p.name, price: pf, category: p.category,
        imageUrl: p.image, hook, source: isShopee ? 'shopee' : 'tiki',
      });
      if (imgBuf) imageUrl = await this.uploadToImgbb(imgBuf);
    } catch { /* bỏ qua */ }

    // Cách 1: Gọi thẳng Facebook Graph API (có ảnh branded)
    if (pageId && pageToken) {
      try {
        if (imageUrl) {
          // POST ảnh kèm caption
          await axios.post(
            `https://graph.facebook.com/v19.0/${pageId}/photos`,
            null,
            {
              params: { url: imageUrl, caption: message, access_token: pageToken, published: true },
              timeout: 15000,
            },
          );
        } else {
          // Fallback: text + link kèm ảnh gốc Tiki/Shopee
          await axios.post(
            `https://graph.facebook.com/v19.0/${pageId}/feed`,
            null,
            {
              params: {
                message,
                link: p.image || link,
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
          source,
        }, { timeout: 10000 });
        this.logger.log(`Make.com Facebook OK: ${p.name.slice(0, 40)}`);
        return true;
      } catch (e: any) {
        this.logger.debug(`Make.com Facebook lỗi: ${e.response?.data || e.message}`);
      }
    }

    return false;
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

    const products = await this.scrapeTikiProducts(count);
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
      const link = this.buildAffiliateLink(p.originalUrl, 'oneatweb');

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
    const products = await this.scrapeTikiProducts(count);
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
          source: p.originalUrl.includes('shopee.vn') ? 'shopee' : 'tiki',
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
    const link = isShopee ? this.buildShopeeAffiliateLink(p.originalUrl) : this.buildAffiliateLink(p.originalUrl, 'tele');
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
    const link = isShopee ? this.buildShopeeAffiliateLink(p.originalUrl) : this.buildAffiliateLink(p.originalUrl, 'discord');
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

        // 3. Build affiliate link gốc (AT deeplink)
        const aidMap: Record<string, string> = {
          'concung.com': this.AT_CONCUNG_AID,
          'thefaceshop.com.vn': this.AT_THEFACESHOP_AID,
          'hoanghamobile.com': this.AT_HOANGHA_AID,
        };
        const domain = Object.keys(aidMap).find(d => sp.url.includes(d)) || '';
        const atAffiliateLink = isShopee
          ? this.buildShopeeAffiliateLink(sp.url)
          : (domain ? `https://go.isclix.com/deep_link/v5/${this.AT_PID}/${aidMap[domain]}?sub4=opt&url_enc=${encodeURIComponent(Buffer.from(sp.url).toString('base64'))}` : this.buildAffiliateLink(sp.url, 'opt'));

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

        // Build tracker URLs per source
        const tgTrackerUrl = this.affiliateTracker.buildTrackerUrl(trackerId, 'tele');
        const fbTrackerUrl = this.affiliateTracker.buildTrackerUrl(trackerId, 'fb');
        const dcTrackerUrl = this.affiliateTracker.buildTrackerUrl(trackerId, 'discord');

        // 6. Publish với tracker URL thay vì direct affiliate link
        const p: ScrapedProduct = {
          name: sp.name,
          price: sp.price,
          image: sp.image,
          category: sp.category,
          affiliateLink: tgTrackerUrl,
          originalUrl: sp.url,
          discount: sp.discount,
        };

        const [tg, dc, zl, fb] = await Promise.allSettled([
          this.postTelegramWithContent(p, bestVariant.fullText.replace(atAffiliateLink, tgTrackerUrl)),
          this.postDiscordWithLink(p, dcTrackerUrl, i),
          this.postZaloOA(p),
          this.postMakeFacebookWithLink(p, fbTrackerUrl, i),
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
          trackerUrl: tgTrackerUrl,
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

      const tgTrackerUrl = this.affiliateTracker.buildTrackerUrl(candidate.trackerId, 'tele');
      const recycleText = `♻️ *TOP DEAL TUẦN NÀY*\n\n${nextVariant.fullText.replace(product.affiliateLink, tgTrackerUrl)}`;

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
