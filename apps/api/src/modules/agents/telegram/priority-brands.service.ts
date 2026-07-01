import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface BrandProduct {
  name: string;
  price: number;
  image: string;
  url: string;
  category: string;
  brand: string;
  discount?: number;       // % giảm giá
  originalPrice?: number;  // giá gốc trước giảm
}

// Pool URL sản phẩm ConCung lấy từ sitemap — scraper fetch live data (JSON-LD, SSR)
const CONCUNG_PRODUCT_URLS = [
  // Tã
  'https://concung.com/bim-ta-khuyen-mai/ta-quan-animo-sieu-mem-thoang-xxl-50-mieng-76054.html',
  'https://concung.com/bim-ta-khuyen-mai/ta-dan-huggies-skincare-cuc-dai-l-9-14kg-68-mieng-63950.html',
  'https://concung.com/bim-ta-khuyen-mai/bim-ta-dan-huggies-platinum-nature-made-size-newborn-60-mieng-duoi-5kg-50405.html',
  'https://concung.com/bim-ta-khuyen-mai/ta-quan-sieu-cao-cap-huggies-platinum-nature-made-l-44-mieng-48201.html',
  'https://concung.com/bim-ta-khuyen-mai/bobby-quan-antimos-xua-muoi-l50-2-67271.html',
  'https://concung.com/bim-ta-khuyen-mai/ta-quan-bobby-size-l-70-mieng-6-mieng-69212.html',
  'https://concung.com/bim-ta-khuyen-mai/ta-quan-moony-m-52-mieng-62141.html',
  // Sữa bột
  'https://concung.com/sua-bot/spddct-enfamil-enspire-1-cho-tre-0-12-thang-850g-73720.html',
  'https://concung.com/sua-bot/san-pham-dinh-duong-cong-thucenfamil-a-neuropro-1-c-sec-800gr-70718.html',
  'https://concung.com/sua-bot/san-pham-dinh-duong-cong-thuc-nestle-nan-optipro-plus-4-800g-67166.html',
  'https://concung.com/sua-bot/san-pham-dinh-duong-cong-thuc-nestle-nan-optipro-plus-1-400g-61841.html',
  'https://concung.com/sua-bot/abbott-grow-gold-3-huong-vani-900g-40424.html',
  'https://concung.com/sua-bot/similac-total-comfort-360g-40429.html',
  'https://concung.com/sua-bot/sua-similac-5g-so-2-400g-0-6-thang-43267.html',
  // Bình sữa
  'https://concung.com/do-dung-me-va-be/binh-sua-pigeon-ppsu-softouch-baby-friendly-world-240ml-muong-thu-m-71345.html',
  'https://concung.com/do-dung-me-va-be/binh-sua-pigeon-ppsu-softouch-baby-friendly-world-160ml-muong-thu-ss-71347.html',
  'https://concung.com/do-dung-me-va-be/binh-sua-pigeon-thuy-tinh-softouch-baby-friendly-world-240ml-m-71851.html',
  // Chăm sóc bé
  'https://concung.com/chong-ham/kem-chong-ham-duong-am-bepanthen-30g-43510.html',
  'https://concung.com/tam-goi-toan-than/sua-tam-goi-toan-than-cho-be-cetaphil-230ml-46053.html',
  'https://concung.com/dang-nuoc/nuoc-rua-binh-sua-pigeon-chai-700ml-8631.html',
  'https://concung.com/khan-uot-kho-vai-kho/khan-uot-cao-cap-huggies-bo-hat-mo-72-mieng-45395.html',
  'https://concung.com/khan-uot-kho-vai-kho/khan-uot-diu-nhe-animo-khong-mui-30-to-75937.html',
  // Đồ dùng mẹ & bé
  'https://concung.com/do-dung-me-va-be/xe-day-2-chieu-gap-gon-animo-compact-bs-t68-69652.html',
  'https://concung.com/do-dung-me-va-be/xe-day-2-chieu-animo-q1-xam-xanh-denim-69922.html',
];

@Injectable()
export class PriorityBrandsService {
  private readonly logger = new Logger(PriorityBrandsService.name);

  private cache: { data: BrandProduct[]; ts: number } | null = null;
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000;

  async getProducts(count = 6): Promise<BrandProduct[]> {
    if (this.cache && Date.now() - this.cache.ts < this.CACHE_TTL) {
      const cached = this.cache.data;
      const highDiscount = cached.filter(p => (p.discount || 0) >= 30).sort((a, b) => (b.discount || 0) - (a.discount || 0));
      const rest = cached.filter(p => (p.discount || 0) < 30).sort(() => Math.random() - 0.5);
      return [...highDiscount, ...rest].slice(0, count);
    }

    // Tier 1 — hoa hồng 8-15%, giá tầm trung, tiêu dùng → ưu tiên cao nhất
    const [tfs, bestme, cc2] = await Promise.allSettled([
      this.scrapeTHEFACESHOP(10),   // mỹ phẩm: commission cao, giá 100-500k
      this.scrapeBestme(6),          // DHC: supplement, ít hoàn trả
      Promise.resolve([] as BrandProduct[]), // placeholder cho group cân bằng
    ]);

    // Con Cưng chạy riêng (async per-URL, không block group trên)
    const ccPromise = this.scrapeConCung(6); // nhu cầu cao nhất, tiêu dùng thiết yếu

    // Tier 2 — hoa hồng ổn, giá vừa, thời trang/hành lý
    const [juno, lug] = await Promise.allSettled([
      this.scrapeJuno(5),            // thời trang nữ: convert tốt từ visual
      this.scrapeLUG(5),             // hành lý: discount thật (API trả về so sánh giá)
    ]);

    // Tier 3 — điện thoại: hoa hồng thấp (1-2%) nhưng giữ để tăng trust kênh
    const [hhm, cells, fpt] = await Promise.allSettled([
      this.scrapeHoangHa(3),         // giảm từ 6→3: hoa hồng thấp
      this.scrapeCellphones(2),      // giảm từ 4→2: chỉ để đa dạng
      this.scrapeFPTShop(2),         // giảm từ 4→2: chỉ để đa dạng
    ]);

    const cc = await ccPromise;

    const g = (r: PromiseSettledResult<BrandProduct[]>) => r.status === 'fulfilled' ? r.value : [];
    const all = [
      ...g(tfs), ...g(bestme), ...cc,           // Tier 1
      ...g(juno), ...g(lug),                    // Tier 2
      ...g(hhm), ...g(cells), ...g(fpt),        // Tier 3
    ];

    if (all.length > 0) {
      this.cache = { data: all, ts: Date.now() };
      this.logger.log(
        `Priority brands | T1: TFS=${g(tfs).length} DHC=${g(bestme).length} CC=${cc.length} ` +
        `| T2: JUNO=${g(juno).length} LUG=${g(lug).length} ` +
        `| T3: HHM=${g(hhm).length} CPS=${g(cells).length} FPT=${g(fpt).length} ` +
        `→ ${all.length} tổng`,
      );
    }

    const highDiscount = all.filter(p => (p.discount || 0) >= 30).sort((a, b) => (b.discount || 0) - (a.discount || 0));
    const rest = all.filter(p => (p.discount || 0) < 30).sort(() => Math.random() - 0.5);
    return [...highDiscount, ...rest].slice(0, count);
  }

  // Scrape sản phẩm giảm giá cao từ Tiki (flash sale + deals)
  private async scrapeHighDiscount(limit = 10): Promise<BrandProduct[]> {
    const results: BrandProduct[] = [];

    // 1. Thử Tiki Flash Sale endpoint
    try {
      const flashRes = await axios.get('https://tiki.vn/api/v2/deals/flash-sale', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Referer': 'https://tiki.vn',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });
      const sessions: any[] = flashRes.data?.data || flashRes.data?.items || [];
      for (const session of sessions.slice(0, 3)) {
        if (results.length >= limit) break;
        try {
          const itemsRes = await axios.get('https://tiki.vn/api/v2/deals/flash-sale/items', {
            params: { flash_sale_id: session.id, limit: 20 },
            headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'Referer': 'https://tiki.vn' },
            timeout: 8000,
          });
          const items: any[] = itemsRes.data?.data || [];
          for (const p of items) {
            if (results.length >= limit) break;
            const price = Number(p.price || 0);
            const listPrice = Number(p.list_price || p.original_price || 0);
            const discountRate = Number(p.discount_rate || (listPrice > price ? Math.round((listPrice - price) / listPrice * 100) : 0));
            if (!p.url_key || price <= 0 || discountRate < 20) continue;
            results.push({
              name: p.name || '',
              price,
              originalPrice: listPrice || undefined,
              discount: discountRate,
              image: p.thumbnail_url || '',
              url: `https://tiki.vn/${p.url_key}.html`,
              category: p.categories?.name || 'Flash Sale',
              brand: 'Tiki Flash Sale',
            });
          }
        } catch { /* ignore */ }
      }
    } catch (e: any) {
      this.logger.debug(`Tiki Flash Sale: ${e.message}`);
    }

    // 2. Fallback: cào từng danh mục Tiki, lọc sp giảm >= 30%
    if (results.length < limit) {
      const HIGH_DISCOUNT_CATS = [1789, 8322, 1520, 1883, 8371, 1815];
      for (const catId of HIGH_DISCOUNT_CATS) {
        if (results.length >= limit) break;
        try {
          const res = await axios.get('https://tiki.vn/api/v2/products', {
            params: { limit: 30, sort: 'top_seller', category: catId, page: 1 },
            headers: {
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
              'Referer': 'https://tiki.vn',
              'Accept': 'application/json',
            },
            timeout: 10000,
          });
          const items: any[] = res.data?.data || [];
          for (const p of items) {
            if (results.length >= limit) break;
            const price = Number(p.price || 0);
            const listPrice = Number(p.list_price || p.original_price || 0);
            const discountRate = Number(p.discount_rate || (listPrice > price && price > 0 ? Math.round((listPrice - price) / listPrice * 100) : 0));
            if (!p.url_key || price <= 0 || discountRate < 30) continue;
            // Tránh trùng với flash sale đã có
            const url = `https://tiki.vn/${p.url_key}.html`;
            if (results.some(r => r.url === url)) continue;
            results.push({
              name: p.name || '',
              price,
              originalPrice: listPrice || undefined,
              discount: discountRate,
              image: p.thumbnail_url || '',
              url,
              category: p.categories?.name || 'Tiki Deals',
              brand: 'Tiki',
            });
          }
          await new Promise(r => setTimeout(r, 300));
        } catch { /* ignore */ }
      }
    }

    const sorted = results.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    this.logger.log(`High Discount: ${sorted.length} sp (>= 20% off), top: ${sorted[0]?.discount || 0}% off`);
    return sorted.slice(0, limit);
  }

  // THEFACESHOP: dùng API JSON trực tiếp
  private async scrapeTHEFACESHOP(limit = 12): Promise<BrandProduct[]> {
    const collections = [
      { slug: 'sieu-sale-the-face-shop', ruleId: '1003096660' },
      { slug: 'mat-na', ruleId: null },
      { slug: 'serum', ruleId: null },
      { slug: 'kem-duong-am', ruleId: null },
    ];

    const results: BrandProduct[] = [];

    for (const col of collections) {
      if (results.length >= limit) break;
      try {
        const params: Record<string, string> = {
          collections: col.slug,
          disableDynamic: 'true',
          sort: 'priority,ASC',
          limit: '20',
          page: '1',
          'join': 'detail||name,langCode',
        };
        if (col.ruleId) params.sortRuleCollectionId = col.ruleId;

        const res = await axios.get('https://tfs-api.hsv-tech.io/client/products', {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://thefaceshop.com.vn/',
            'Origin': 'https://thefaceshop.com.vn',
          },
          timeout: 10000,
        });

        const items: any[] = res.data?.data || [];
        for (const p of items) {
          if (results.length >= limit) break;
          const nameVi = (p.detail || []).find((d: any) => d.langCode === 'vi')?.name
            || (p.detail || [])[0]?.name;
          if (!nameVi || nameVi === p.sku) continue;

          const price = Number(p.discountPrice || p.currentPrice || p.minPrice || 0);
          if (price <= 0) continue;

          const thumb = p.thumbnail || '';
          const image = thumb ? `https://image.hsv-tech.io/400x0/${thumb}` : '';
          const url = `https://thefaceshop.com.vn/products/${p.slug}`;

          results.push({ name: nameVi, price, image, url, category: 'Làm đẹp', brand: 'THEFACESHOP' });
        }

        await new Promise(r => setTimeout(r, 400));
      } catch (e: any) {
        this.logger.debug(`THEFACESHOP ${col.slug}: ${e.message}`);
      }
    }

    this.logger.log(`THEFACESHOP: ${results.length} sản phẩm`);
    return results;
  }

  // Hoàng Hà Mobile: scrape JSON-LD từ trang sản phẩm cụ thể (direct product pages)
  // URL format mới /dien-thoai/[slug] cho hàng 2024-2025, /dien-thoai-di-dong/[slug] cho cũ hơn
  private async scrapeHoangHa(limit = 3): Promise<BrandProduct[]> {
    const PRODUCT_URLS: Array<{ url: string; cat: string }> = [
      // iPhone 16 series — trang sp riêng lẻ có JSON-LD đúng
      { url: 'https://hoanghamobile.com/dien-thoai/iphone-16', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/iphone-16-pro', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/iphone-16-pro-max', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/iphone-16-plus', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/iphone-16e-128gb', cat: 'Điện thoại' },
      // Samsung S25
      { url: 'https://hoanghamobile.com/dien-thoai/samsung-galaxy-s25', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/samsung-galaxy-s25-plus', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/samsung-galaxy-s25-ultra', cat: 'Điện thoại' },
      // Mid-range phổ biến
      { url: 'https://hoanghamobile.com/dien-thoai/oppo-reno12-5g', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai/xiaomi-14-12gb-256gb-chinh-hang', cat: 'Điện thoại' },
      // Apple Watch
      { url: 'https://hoanghamobile.com/dong-ho/apple-watch/apple-watch-se/apple-watch-se-2-2024', cat: 'Đồng hồ thông minh' },
      // iPhone 15 (format cũ — vẫn còn bán)
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/apple-iphone-15-128gb-chinh-hang-vn-a', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/apple-iphone-15-pro-max-256gb-chinh-hang-vn-a', cat: 'Điện thoại' },
    ];

    const results: BrandProduct[] = [];
    const shuffled = [...PRODUCT_URLS].sort(() => Math.random() - 0.5);

    for (const s of shuffled) {
      if (results.length >= limit) break;
      try {
        const res = await axios.get(s.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          decompress: true,
          timeout: 12000,
        });

        const html: string = res.data;
        const jldMatches = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g) || [];
        for (const block of jldMatches) {
          try {
            const d = JSON.parse(block.replace(/<[^>]+>/g, ''));
            if (d['@type'] !== 'Product') continue;
            const name = (d.name || '').trim();
            const offers = Array.isArray(d.offers) ? d.offers[0] : (d.offers || {});
            const price = Number(offers.price || offers.lowPrice || 0);
            if (!name || price <= 0) continue;
            if (s.cat === 'Điện thoại' && price < 1_000_000) continue;
            const image = Array.isArray(d.image) ? d.image[0] : (d.image || '');
            results.push({ name, price, image, url: s.url, category: s.cat, brand: 'Hoàng Hà Mobile' });
            break;
          } catch { /* ignore */ }
        }

        await new Promise(r => setTimeout(r, 600));
      } catch (e: any) {
        this.logger.debug(`Hoàng Hà ${s.url.split('/').pop()}: ${e.message}`);
      }
    }

    this.logger.log(`Hoàng Hà Mobile: ${results.length} sản phẩm`);
    return results;
  }

  // ConCung: scrape live từ pool URL (JSON-LD có sẵn trên SSR page)
  private async scrapeConCung(limit = 5): Promise<BrandProduct[]> {
    const shuffled = [...CONCUNG_PRODUCT_URLS].sort(() => Math.random() - 0.5);
    const results: BrandProduct[] = [];

    for (const url of shuffled) {
      if (results.length >= limit) break;
      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36' },
          timeout: 10000,
        });
        const html: string = res.data;
        const jldMatches = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g) || [];
        for (const block of jldMatches) {
          try {
            const d = JSON.parse(block.replace(/<[^>]+>/g, ''));
            if (d['@type'] !== 'Product') continue;
            const name = d.name || '';
            const price = Number(d.offers?.price || d.offers?.lowPrice || 0);
            const image = Array.isArray(d.image) ? d.image[0] : (d.image || '');
            if (!name || price <= 0) continue;
            results.push({ name, price, image, url, category: 'Mẹ & Bé', brand: 'Con Cưng' });
            break;
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    this.logger.log(`ConCung: ${results.length} sản phẩm`);
    return results;
  }

  // ─── Scraper helper: fetch JSON-LD từ pool URLs ─────────────────────────────
  private async scrapeJsonLdPool(
    urls: string[],
    limit: number,
    brand: string,
    category: string,
  ): Promise<BrandProduct[]> {
    const results: BrandProduct[] = [];
    for (const url of urls) {
      if (results.length >= limit) break;
      try {
        const res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          timeout: 12000,
        });
        const html: string = res.data;
        const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g) || [];
        for (const block of blocks) {
          try {
            const d = JSON.parse(block.replace(/<[^>]+>/g, ''));
            if (d['@type'] !== 'Product') continue;
            const name = (d.name || '').trim();
            const offers = Array.isArray(d.offers) ? d.offers[0] : (d.offers || {});
            const price = Number(offers.price || offers.lowPrice || 0);
            if (!name || price <= 0) continue;
            const image = Array.isArray(d.image) ? d.image[0] : (d.image || '');
            results.push({ name, price, image, url, category, brand });
            break;
          } catch { /* ignore */ }
        }
        await new Promise(r => setTimeout(r, 500));
      } catch { /* ignore */ }
    }
    this.logger.log(`${brand}: ${results.length} sản phẩm`);
    return results;
  }

  // ─── LUG: Haravan products.json API ─────────────────────────────────────────
  private async scrapeLUG(limit = 4): Promise<BrandProduct[]> {
    const results: BrandProduct[] = [];
    try {
      const res = await axios.get('https://lug.vn/products.json', {
        params: { limit: 20, page: 1 },
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
        timeout: 10000,
      });
      const prods: any[] = (res.data?.products || []).sort(() => Math.random() - 0.5);
      for (const p of prods) {
        if (results.length >= limit) break;
        const name = (p.name || '').trim();
        const price = Number(p.price || 0);
        if (!name || price <= 0 || !p.alias) continue;
        const compareAt = Number(p.compare_at_price_min || 0);
        const discount = compareAt > price ? Math.round((compareAt - price) / compareAt * 100) : 0;
        results.push({
          name,
          price,
          originalPrice: compareAt > price ? compareAt : undefined,
          discount: discount || undefined,
          image: p.featured_image || '',
          url: `https://lug.vn/products/${p.alias}`,
          category: 'Hành lý & Balo',
          brand: 'LUG',
        });
      }
    } catch (e: any) {
      this.logger.debug(`LUG: ${e.message}`);
    }
    this.logger.log(`LUG: ${results.length} sản phẩm`);
    return results;
  }

  // ─── CellphoneS: JSON-LD từ product pages (hardcoded popular URLs) ───────────
  private async scrapeCellphones(limit = 4): Promise<BrandProduct[]> {
    const URLS = [
      'https://cellphones.com.vn/iphone-16.html',
      'https://cellphones.com.vn/iphone-16-pro.html',
      'https://cellphones.com.vn/iphone-16-pro-max.html',
      'https://cellphones.com.vn/iphone-16-plus.html',
      'https://cellphones.com.vn/samsung-galaxy-s25.html',
      'https://cellphones.com.vn/samsung-galaxy-s25-ultra.html',
      'https://cellphones.com.vn/samsung-galaxy-s25-plus.html',
      'https://cellphones.com.vn/samsung-galaxy-a56.html',
      'https://cellphones.com.vn/oppo-reno13.html',
      'https://cellphones.com.vn/xiaomi-redmi-note-14.html',
      'https://cellphones.com.vn/airpods-4.html',
      'https://cellphones.com.vn/airpods-pro-2.html',
    ];
    const shuffled = [...URLS].sort(() => Math.random() - 0.5).slice(0, limit * 2);
    return this.scrapeJsonLdPool(shuffled, limit, 'CellphoneS', 'Điện thoại & Phụ kiện');
  }

  // ─── FPT Shop: sitemap phones → JSON-LD ──────────────────────────────────────
  private async scrapeFPTShop(limit = 4): Promise<BrandProduct[]> {
    const FALLBACK = [
      'https://fptshop.com.vn/dien-thoai/iphone-16-128gb',
      'https://fptshop.com.vn/dien-thoai/iphone-17',
      'https://fptshop.com.vn/dien-thoai/samsung-galaxy-s25',
      'https://fptshop.com.vn/dien-thoai/samsung-galaxy-s25-ultra',
      'https://fptshop.com.vn/dien-thoai/xiaomi-redmi-note-14',
      'https://fptshop.com.vn/dien-thoai/oppo-reno13-f',
    ];
    let pool: string[] = FALLBACK;
    try {
      const sitemapRes = await axios.get('https://fptshop.com.vn/products/sitemap-dien-thoai.xml', {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
        timeout: 10000,
      });
      const xml: string = sitemapRes.data;
      const found = [...xml.matchAll(/<loc>(https:\/\/fptshop\.com\.vn[^<]+)<\/loc>/g)].map(m => m[1]);
      if (found.length > 0) pool = found;
    } catch { /* use fallback */ }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, limit * 2);
    return this.scrapeJsonLdPool(shuffled, limit, 'FPT Shop', 'Điện thoại & Phụ kiện');
  }

  // ─── Juno: extract slugs from homepage RSC data → JSON-LD ───────────────────
  private async scrapeJuno(limit = 4): Promise<BrandProduct[]> {
    const FALLBACK_SLUGS = [
      'giay-sandal-quai-dan-cheo-9t',
      'giay-bup-be-mui-nhon-gzb',
      'tui-xach-nho-bowling-bag-trang-tri-charm-',
      'tui-xach-trung-top-handle-bag-phoi-khoa-',
      'tui-xach-nho-hobo-bag-with-bow-6',
      'giay-sandal-de-xuong-ugs',
      'tui-xach-nho-deo-vai-phoi-xich-d',
      'balo-front-flap-bucket-backpack-yqtn',
    ];
    let slugs: string[] = [];
    try {
      const res = await axios.get('https://juno.vn', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000,
      });
      const html: string = res.data;
      const found = [...html.matchAll(/\/products\/([a-z0-9][a-z0-9-]{4,})/g)].map(m => m[1]);
      slugs = [...new Set(found)];
    } catch { /* use fallback */ }
    if (slugs.length === 0) slugs = FALLBACK_SLUGS;
    const urls = slugs
      .sort(() => Math.random() - 0.5)
      .slice(0, limit * 2)
      .map(s => `https://juno.vn/products/${s}`);
    return this.scrapeJsonLdPool(urls, limit, 'Juno', 'Thời trang nữ');
  }

  // ─── bestme.vn (DHC): extract slugs from collections page → JSON-LD ─────────
  private async scrapeBestme(limit = 4): Promise<BrandProduct[]> {
    const FALLBACK_SLUGS = [
      'vien-uong-collagen-dhc',
      'vien-uong-vitamin-c-dhc',
      'vien-uong-coenzyme-q10-dhc',
      'vien-uong-biotin-ngan-rung-toc-dhc',
      'vien-uong-giu-am-cap-nuoc-dhc-hyaluronic-acid',
      'dau-tay-trang-dhc-olive-deep-cleansing-oil-ss-70ml',
      'vien-uong-canxi-dhc-calcium-cbp',
      'serum-duong-mi-dhc-eyelash-tonic',
    ];
    let slugs: string[] = [];
    try {
      const res = await axios.get('https://bestme.vn/collections/all', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 12000,
      });
      const html: string = res.data;
      const found = [...html.matchAll(/\/products\/([a-z0-9][a-z0-9-]{4,})/g)].map(m => m[1]);
      slugs = [...new Set(found)];
    } catch { /* use fallback */ }
    if (slugs.length === 0) slugs = FALLBACK_SLUGS;
    const urls = slugs
      .sort(() => Math.random() - 0.5)
      .slice(0, limit * 2)
      .map(s => `https://bestme.vn/products/${s}`);
    return this.scrapeJsonLdPool(urls, limit, 'bestme.vn', 'Làm đẹp & Sức khỏe');
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
