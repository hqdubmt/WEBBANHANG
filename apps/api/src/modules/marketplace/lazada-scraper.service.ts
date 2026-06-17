import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MarketplaceProduct } from './marketplace.service';

const LAZADA_KEYWORDS = [
  'serum', 'kem chong nang', 'son duong', 'may say toc',
  'tai nghe bluetooth', 'binh giu nhiet', 'ao thun nam',
  'giay sneaker', 'dong ho thong minh', 'sac du phong',
  'may massage', 'vitamin c', 'ta bim', 'do choi tre em',
];

const LAZADA_CATEGORIES = [
  { slug: 'kem-chong-nang', name: 'Làm đẹp' },
  { slug: 'tai-nghe', name: 'Điện tử' },
  { slug: 'ao-thun', name: 'Thời trang nam' },
  { slug: 'giay-sneaker', name: 'Giày dép' },
  { slug: 'binh-giu-nhiet', name: 'Nhà cửa' },
  { slug: 'dong-ho-thong-minh', name: 'Đồng hồ' },
];

@Injectable()
export class LazadaScraperService {
  private readonly logger = new Logger(LazadaScraperService.name);

  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.lazada.vn/',
  };

  private readonly ajaxHeaders = {
    ...this.headers,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
  };

  async getTrending(limit = 60): Promise<MarketplaceProduct[]> {
    const [bySearch, byTag] = await Promise.all([
      this.searchByKeywords(LAZADA_KEYWORDS.slice(0, 5), 5),
      this.getByTagPages(LAZADA_CATEGORIES.slice(0, 4)),
    ]);

    const all = [...bySearch, ...byTag];

    // Dedup
    const seen = new Set<string>();
    const unique = all.filter(p => {
      if (seen.has(p.sourceId)) return false;
      seen.add(p.sourceId);
      return true;
    });

    this.logger.log(`Lazada scraper: ${unique.length} sản phẩm`);
    return unique.slice(0, limit);
  }

  private async searchByKeywords(keywords: string[], limitPerKw: number): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    await Promise.allSettled(
      keywords.map(async (kw) => {
        try {
          // Lazada AJAX catalog search
          const res = await axios.get('https://www.lazada.vn/catalog/', {
            params: { ajax: 'true', q: kw, sort: 'popularity', page: 1, pageSize: limitPerKw },
            headers: this.ajaxHeaders,
            timeout: 10000,
          });

          const items: any[] = res.data?.mods?.listItems || [];
          items.forEach(p => results.push(this.normalize(p)));
        } catch (err) {
          this.logger.debug(`Lazada search "${kw}": ${err.message}`);

          // Fallback: scrape HTML page
          try {
            await this.scrapeHtmlPage(`https://www.lazada.vn/catalog/?q=${encodeURIComponent(kw)}`, results);
          } catch {
            // silent
          }
        }
      })
    );

    return results;
  }

  private async getByTagPages(categories: typeof LAZADA_CATEGORIES): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    await Promise.allSettled(
      categories.map(async (cat) => {
        try {
          const res = await axios.get(`https://www.lazada.vn/tag/${cat.slug}/`, {
            params: { ajax: 'true', isFirstRequest: 'true', page: 1, pageSize: 10, sort: 'popularity' },
            headers: this.ajaxHeaders,
            timeout: 10000,
          });

          const items: any[] = res.data?.mods?.listItems || [];
          items.forEach(p => results.push(this.normalize(p, cat.name)));
        } catch {
          // Lazada tag pages may not support AJAX — try HTML fallback
          try {
            await this.scrapeHtmlPage(`https://www.lazada.vn/tag/${cat.slug}/`, results, cat.name);
          } catch {
            // silent
          }
        }
      })
    );

    return results;
  }

  private async scrapeHtmlPage(url: string, results: MarketplaceProduct[], categoryHint?: string): Promise<void> {
    const res = await axios.get(url, { headers: this.headers, timeout: 12000 });
    const html: string = res.data;

    // Lazada injects JSON into script tags or data attributes
    // Try __moduleData__ or window.pageData patterns
    const jsonMatch = html.match(/window\.__moduleData__\s*=\s*(\{.+?\})\s*;/s) ||
                       html.match(/"listItems"\s*:\s*(\[.+?\])\s*[,}]/s);

    if (!jsonMatch) return;

    try {
      const data = JSON.parse(jsonMatch[1]);
      const items: any[] = data?.mods?.listItems || (Array.isArray(data) ? data : []);
      items.forEach(p => results.push(this.normalize(p, categoryHint)));
      return;
    } catch {
      // Try cheerio fallback for product cards
    }

    // Extract product links using regex (no cheerio needed)
    const linkMatches = html.matchAll(/<a[^>]*href="(https:\/\/www\.lazada\.vn\/products\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/a>/g);
    const priceMatches = [...html.matchAll(/(\d{2,3}(?:\.\d{3})+)\s*đ/g)].map(m => m[1]);
    const nameMatches = [...html.matchAll(/class="[^"]*title[^"]*"[^>]*>([^<]{10,100})</g)].map(m => m[1].trim());

    let idx = 0;
    for (const m of linkMatches) {
      const link = m[1];
      const img = m[2].replace(/^\/\//, 'https://');
      const name = nameMatches[idx] || `Sản phẩm Lazada ${idx + 1}`;
      const price = this.parsePrice(priceMatches[idx] || '0');
      const itemId = link.match(/\/i(\d+-\d+)\.html/)?.[1] || `lzd-html-${idx}`;

      results.push({
        sourceId: `lazada-${itemId}`,
        platform: 'lazada',
        name,
        price,
        image: img,
        sales: 0,
        commission: 6,
        affiliateLink: link,
        category: categoryHint || 'Khác',
        shopName: 'Lazada',
        rating: 0,
        originalUrl: link,
      });

      idx++;
      if (idx >= 10) break;
    }
  }

  private normalize(p: any, categoryHint?: string): MarketplaceProduct {
    const link = p.productUrl || p.url || '';
    const itemId = p.itemId || p.productId || link.match(/\/i(\d+-\d+)\.html/)?.[1] || `lzd-${Date.now()}`;
    const priceText = p.priceShow || p.price || '0';

    return {
      sourceId: `lazada-${itemId}`,
      platform: 'lazada',
      name: p.name || p.productName || 'Sản phẩm Lazada',
      price: this.parsePrice(priceText),
      image: (p.image || '').replace(/^\/\//, 'https://'),
      sales: this.parseSold(p.itemSoldCntShow || p.soldCount || '0'),
      commission: 6,
      affiliateLink: link.startsWith('http') ? link : `https://www.lazada.vn${link}`,
      category: p.categoryName || p.category || categoryHint || 'Khác',
      shopName: p.sellerName || p.shopName || 'Lazada',
      rating: Number(p.ratingScore || p.rating || 0),
      originalUrl: link.startsWith('http') ? link : `https://www.lazada.vn${link}`,
    };
  }

  private parsePrice(text: string): number {
    const digits = String(text).replace(/[^\d]/g, '');
    return Number(digits) || 0;
  }

  private parseSold(text: string): number {
    const s = String(text).toLowerCase();
    if (s.includes('k')) return Math.round(Number(s.replace('k', '')) * 1000);
    const n = Number(s.replace(/[^\d]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}
