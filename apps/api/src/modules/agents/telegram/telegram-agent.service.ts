import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { ImageGeneratorService } from './image-generator.service';

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
];

const SHOPEE_CAT_MAP: Record<string, string> = {
  '100629': 'Sức khỏe & Làm đẹp', '100013': 'Điện thoại & Phụ kiện',
  '100007': 'Thời trang nữ', '100008': 'Thời trang nam',
  '100017': 'Nhà cửa & Đời sống',
};

@Injectable()
export class TelegramAgentService {
  private readonly logger = new Logger(TelegramAgentService.name);

  private readonly AT_PID = process.env.ACCESSTRADE_PID || '';
  private readonly AT_AID = process.env.ACCESSTRADE_TIKI_AID || '';
  private readonly AT_SHOPEE_AID = process.env.ACCESSTRADE_SHOPEE_AID || '';

  constructor(
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    private readonly imgGen: ImageGeneratorService,
  ) {}

  // Cào + đăng mỗi 2 giờ từ 8h-22h lên TẤT CẢ platform
  @Cron('0 8,10,12,14,16,18,20,22 * * *')
  async runDailyDeals() {
    this.logger.log('Multi-Platform Agent: cào + đăng deal...');
    await this.scrapeAndDistribute(10);
  }

  // Morning batch lớn hơn
  @Cron('0 9 * * *')
  async runMorningBatch() {
    this.logger.log('Multi-Platform Agent: morning batch...');
    await this.scrapeAndDistribute(30);
  }

  // TikTok Shop promo — 11h và 19h mỗi ngày
  @Cron('0 11,19 * * *')
  async runTikTokShopPromo() {
    this.logger.log('TikTok Shop promo...');
    await this.postTikTokShop();
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

      // Cào Tiki + Shopee song song
      const half = Math.ceil(count / 2);
      const [tikiProducts, shopeeProducts] = await Promise.all([
        this.scrapeTikiProducts(half),
        this.scrapeShopeeProducts(half),
      ]);

      // Xen kẽ Tiki và Shopee để đa dạng nguồn hàng
      const products: ScrapedProduct[] = [];
      const maxLen = Math.max(tikiProducts.length, shopeeProducts.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < tikiProducts.length) products.push(tikiProducts[i]);
        if (i < shopeeProducts.length) products.push(shopeeProducts[i]);
      }

      this.logger.log(`Cào ${tikiProducts.length} Tiki + ${shopeeProducts.length} Shopee → ${products.length} sản phẩm`);

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

        if (tg.status === 'fulfilled' && tg.value) results.telegram++;
        if (dc.status === 'fulfilled' && dc.value) results.discord++;
        if (zl.status === 'fulfilled' && zl.value) results.zalo++;
        if (fb.status === 'fulfilled' && fb.value) results.facebook++;

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

  // ─── Tiki Scraper (không lưu DB) ─────────────────────────────────────────

  private atWorking: boolean | null = null;

  private async checkATDeeplink(): Promise<boolean> {
    if (this.atWorking !== null) return this.atWorking;
    this.atWorking = !!(this.AT_PID && this.AT_AID);
    this.logger.log(`AT Deeplink: ${this.atWorking ? 'OK ✅ (go.isclix.com)' : 'Thiếu PID/AID ❌'}`);
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

    const results: ScrapedProduct[] = [];
    const shuffled = [...TIKI_CATEGORIES].sort(() => Math.random() - 0.5);
    const catsNeeded = Math.min(shuffled.length, Math.ceil(count / 5));
    const perCat = Math.ceil(count / catsNeeded);

    for (const cat of shuffled.slice(0, catsNeeded)) {
      if (results.length >= count) break;
      try {
        const page = Math.floor(Math.random() * 6) + 1;
        const res = await axios.get('https://tiki.vn/api/v2/products', {
          params: { limit: perCat + 5, sort: 'top_seller', category: cat.id, page },
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Referer': 'https://tiki.vn', 'Accept': 'application/json',
          },
          timeout: 10000,
        });

        const items: any[] = res.data?.data || [];
        for (const p of items) {
          if (results.length >= count) break;
          if (!p.url_key || !p.price || p.price <= 0) continue;

          // url_key đã chứa "-p{id}" ở cuối rồi, không thêm nữa
          const productUrl = `https://tiki.vn/${p.url_key}.html`;
          results.push({
            name: p.name || '',
            price: p.price,
            image: p.thumbnail_url || '',
            category: cat.name,
            affiliateLink: productUrl, // platform-specific link built per-post
            originalUrl: productUrl,
          });
        }
      } catch (e) {
        this.logger.debug(`Tiki scrape lỗi: ${e.message}`);
      }
    }

    return results.sort(() => Math.random() - 0.5).slice(0, count);
  }

  // ─── Shopee Scraper ───────────────────────────────────────────────────────

  private buildShopeeAffiliateLink(productUrl: string): string {
    // Dùng AT deeplink nếu có SHOPEE_AID, không thì link trực tiếp
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
            const url = `https://shopee.vn/${p.name.replace(/\s+/g, '-')}-i.${p.shopid}.${p.itemid}`;
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
            const url = `https://shopee.vn/${p.name.replace(/\s+/g, '-')}-i.${p.shopid}.${p.itemid}`;
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

  private buildText(link: string, p: ScrapedProduct, index: number): { markdown: string; plain: string } {
    const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
    const emoji = Object.entries(CAT_EMOJI).find(([k]) => p.category.includes(k))?.[1] ?? '🛒';
    const hook = HOOKS[index % HOOKS.length];
    const tag = p.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');

    const source = p.originalUrl.includes('shopee.vn') ? 'shopee' : 'tiki';
    const markdown = `${hook}\n${emoji} *${p.name.slice(0, 80)}*\n\n💰 *${pf}*\n\n🔗 [Đặt hàng ngay](${link})\n\n#${tag} #${source} #deal${this.CTA}`;
    const plain = `${hook}\n${emoji} ${p.name.slice(0, 80)}\n\n💰 ${pf}\n\n🔗 ${link}\n\n#${tag} #${source} #deal${this.CTA}`;

    return { markdown, plain };
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
    const { plain } = this.buildText(link, p, index);

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
            // Gửi ảnh + caption
            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('photo', imgBuffer, { filename: 'deal.jpg', contentType: 'image/jpeg' });
            form.append('caption', plain.slice(0, 1024));
            form.append('parse_mode', 'Markdown');
            await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
              headers: form.getHeaders(),
              timeout: 30000,
            });
          } else {
            // Fallback: gửi text nếu không tạo được ảnh
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
              chat_id: chatId, text: plain, parse_mode: 'Markdown',
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

  // Discord — post tới tất cả webhook trong DISCORD_WEBHOOK_URL + DISCORD_WEBHOOK_URLS
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

    const payload = {
      embeds: [{
        title: `${hook} ${emoji} ${p.name.slice(0, 100)}`,
        description: `💰 **${pf}**\n\n🏷️ ${p.category}\n\n[Đặt hàng ngay →](${link})`,
        url: link,
        color: isShopeeD ? 0xEE4D2D : 0xFF6B35,
        thumbnail: p.image ? { url: p.image } : undefined,
        footer: { text: `👥 Theo dõi Telegram: t.me/banhang1 | ${source} Affiliate Deal` },
      }],
    };

    const results = await Promise.allSettled(
      webhooks.map(url => axios.post(url, payload, { timeout: 10000 }))
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

  private async postMakeFacebook(p: ScrapedProduct, index: number): Promise<boolean> {
    const webhookUrl = process.env.MAKE_FACEBOOK_WEBHOOK;
    if (!webhookUrl) return false;

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

    try {
      await axios.post(webhookUrl, {
        message,
        link,
        image_url: p.image || '',
        title: p.name.slice(0, 200),
        price: pf,
        category: p.category,
        source,
      }, { timeout: 10000 });
      return true;
    } catch (e: any) {
      this.logger.debug(`Make.com Facebook lỗi: ${e.response?.data || e.message}`);
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
