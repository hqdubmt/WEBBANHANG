import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface BrandProduct {
  name: string;
  price: number;
  image: string;
  url: string;
  category: string;
  brand: string;
}

// Con Cưng chặn hoàn toàn headless và sitemap — dùng curated list thật
// Cập nhật giá thủ công khi cần (giá thường ổn định 3-6 tháng)
const CONCUNG_CURATED: BrandProduct[] = [
  { name: 'Sữa Bột Enfamil A+ 1 900g (0-6 Tháng)', price: 520000, image: 'https://cdn.concung.com/2022/09/53568-86895-sua-bot-enfamil.webp', url: 'https://concung.com/sua-bot-enfamil-a-1-900g.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Tã Quần Huggies Skin Perfect Size L 88 Miếng', price: 392000, image: 'https://cdn.concung.com/2022/08/52756-84710-ta-quan-huggies-l88.webp', url: 'https://concung.com/ta-quan-huggies-skin-perfect-size-l-88-mieng.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Tã Quần Pampers Premium Care XL 46 Miếng', price: 285000, image: 'https://cdn.concung.com/2022/10/54088-88123-ta-quan-pampers.webp', url: 'https://concung.com/ta-quan-pampers-premium-care-xl-46-mieng.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Sữa Bột NAN Optipro 3 800g (1-3 Tuổi)', price: 436000, image: 'https://cdn.concung.com/2022/06/50847-80816-sua-bot-nan-optipro-3.webp', url: 'https://concung.com/sua-bot-nan-optipro-3-800g.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Bình Sữa Pigeon PPSU Cổ Rộng 240ml', price: 245000, image: 'https://cdn.concung.com/2023/03/58136-96175-binh-sua-pigeon.webp', url: 'https://concung.com/binh-sua-pigeon-ppsu-co-rong-240ml.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Tã Dán Bobby Newborn 1 94 Miếng (Sơ Sinh)', price: 189000, image: 'https://cdn.concung.com/2023/01/56689-93247-ta-dan-bobby.webp', url: 'https://concung.com/ta-dan-bobby-newborn-1-94-mieng.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Sữa Bột Abbott Grow 4 900g (Trên 3 Tuổi)', price: 485000, image: 'https://cdn.concung.com/2022/07/51895-82769-sua-bot-abbott-grow.webp', url: 'https://concung.com/sua-bot-abbott-grow-4-900g.html', category: 'Mẹ & Bé', brand: 'Con Cưng' },
  { name: 'Đồ Chơi Lego Duplo Xếp Hình Sáng Tạo', price: 450000, image: 'https://cdn.concung.com/2023/06/60891-101325-lego-duplo.webp', url: 'https://concung.com/do-choi-xep-hinh-sang-tao-lego-duplo.html', category: 'Đồ Chơi', brand: 'Con Cưng' },
];

@Injectable()
export class PriorityBrandsService {
  private readonly logger = new Logger(PriorityBrandsService.name);

  private cache: { data: BrandProduct[]; ts: number } | null = null;
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000;

  async getProducts(count = 6): Promise<BrandProduct[]> {
    if (this.cache && Date.now() - this.cache.ts < this.CACHE_TTL) {
      return [...this.cache.data].sort(() => Math.random() - 0.5).slice(0, count);
    }

    const [tfs, hhm] = await Promise.allSettled([
      this.scrapeTHEFACESHOP(12),
      this.scrapeHoangHa(8),
    ]);

    const live: BrandProduct[] = [
      ...(tfs.status === 'fulfilled' ? tfs.value : []),
      ...(hhm.status === 'fulfilled' ? hhm.value : []),
    ];

    // Con Cưng curated list — random chọn 5 trong 8
    const cc = [...CONCUNG_CURATED].sort(() => Math.random() - 0.5).slice(0, 5);

    const all = [...live, ...cc];

    if (all.length > 0) {
      this.cache = { data: all, ts: Date.now() };
      this.logger.log(`Priority brands: TFS=${tfs.status === 'fulfilled' ? tfs.value.length : 0} HHM=${hhm.status === 'fulfilled' ? hhm.value.length : 0} CC=${cc.length} → ${all.length} tổng`);
    }

    return [...all].sort(() => Math.random() - 0.5).slice(0, count);
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

  // Hoàng Hà Mobile: scrape JSON-LD từ series pages (SSR, không cần Playwright)
  private async scrapeHoangHa(limit = 8): Promise<BrandProduct[]> {
    // Series pages lấy từ sitemap — cập nhật mỗi khi có model mới
    const seriesPages = [
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/iphone/iphone-16-series', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/iphone/iphone-15-series', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/samsung/galaxy-s-series/samsung-galaxy-s25-ai-phone', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/oppo/oppo-reno15-series', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/xiaomi/xiaomi-redmi-note-series', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dien-thoai-di-dong/samsung/samsung-galaxy-a-series', cat: 'Điện thoại' },
      { url: 'https://hoanghamobile.com/dong-ho/samsung-galaxy-watch', cat: 'Đồng hồ thông minh' },
      { url: 'https://hoanghamobile.com/dong-ho/apple-watch', cat: 'Đồng hồ thông minh' },
      { url: 'https://hoanghamobile.com/may-tinh-bang/ipad', cat: 'Máy tính bảng' },
    ];

    const results: BrandProduct[] = [];

    for (const s of seriesPages) {
      if (results.length >= limit) break;
      try {
        const res = await axios.get(s.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          timeout: 12000,
        });

        const html: string = res.data;

        // Parse JSON-LD Product schema
        const jldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
        let name = '', price = 0;
        for (const block of jldMatches) {
          try {
            const inner = block.replace(/<[^>]+>/g, '');
            const d = JSON.parse(inner);
            if (d['@type'] === 'Product') {
              name = d.name || '';
              const offers = d.offers || {};
              price = Number(offers.lowPrice || offers.price || 0);
              break;
            }
          } catch { /* ignore */ }
        }

        // Bỏ qua tên generic hoặc giá bất hợp lý
        if (!name || name.length < 8 || price <= 0) continue;
        if (['Điện thoại', 'Máy tính bảng', 'Đồng hồ'].includes(name)) continue;
        if (s.cat === 'Điện thoại' && price < 1_000_000) continue;

        // Lấy ảnh đầu tiên từ CDN Hoàng Hà
        const imgMatch = html.match(/https:\/\/cdn\.hoanghamobile\.vn\/Uploads\/[^\s"',;]+\.(?:jpg|png|webp)/);
        const image = imgMatch ? imgMatch[0] : '';

        results.push({ name, price, image, url: s.url, category: s.cat, brand: 'Hoàng Hà Mobile' });
        await new Promise(r => setTimeout(r, 600));
      } catch (e: any) {
        this.logger.debug(`Hoàng Hà ${s.url.split('/').pop()}: ${e.message}`);
      }
    }

    this.logger.log(`Hoàng Hà Mobile: ${results.length} sản phẩm`);
    return results;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
