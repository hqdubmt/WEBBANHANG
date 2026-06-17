import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MarketplaceProduct } from './marketplace.service';

const TIKTOK_HASHTAGS = [
  'kemchongnang', 'serumvitaminc', 'tainghe', 'dongho',
  'aothun', 'giaythetao', 'binhgiuinhiet', 'vitamin',
  'trang-diem', 'duong-da', 'thoi-trang-nu', 'do-choi-tre',
];

// TikTok product categories mapped to trending content
const TIKTOK_SHOP_CATEGORIES = [
  { id: '602105', name: 'Sức khỏe & Làm đẹp' },
  { id: '602111', name: 'Thời trang nữ' },
  { id: '602109', name: 'Điện tử' },
  { id: '602113', name: 'Nhà cửa & Đời sống' },
  { id: '602115', name: 'Thể thao' },
];

@Injectable()
export class TikTokScraperService {
  private readonly logger = new Logger(TikTokScraperService.name);

  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9',
    'Referer': 'https://www.tiktok.com/',
  };

  async getTrending(limit = 60): Promise<MarketplaceProduct[]> {
    const [byDiscover, byShop] = await Promise.all([
      this.discoverTrendingContent(),
      this.getTikTokShopProducts(),
    ]);

    const all = [...byDiscover, ...byShop];

    const seen = new Set<string>();
    const unique = all.filter(p => {
      if (seen.has(p.sourceId)) return false;
      seen.add(p.sourceId);
      return true;
    });

    this.logger.log(`TikTok scraper: ${unique.length} sản phẩm`);
    return unique.slice(0, limit);
  }

  private async discoverTrendingContent(): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    try {
      // TikTok's public discover endpoint
      const res = await axios.get('https://www.tiktok.com/api/discover/item/', {
        params: { aid: '1988', type: 1, count: 30, from_page: 'fyp' },
        headers: this.headers,
        timeout: 10000,
      });

      const items: any[] = res.data?.itemList || res.data?.item_list || [];
      items.forEach(item => {
        const product = this.normalizeFromVideo(item);
        if (product) results.push(product);
      });
    } catch (err) {
      this.logger.debug(`TikTok discover: ${err.message}`);
    }

    // Thử endpoint search trending
    try {
      const res = await axios.get('https://www.tiktok.com/api/search/general/full/', {
        params: {
          aid: '1988',
          keyword: 'trending san pham ban chay',
          count: 20,
          offset: 0,
          search_source: 'normal_search',
        },
        headers: this.headers,
        timeout: 10000,
      });

      const items: any[] = res.data?.item_list || [];
      items.forEach(item => {
        const product = this.normalizeFromVideo(item);
        if (product) results.push(product);
      });
    } catch {
      // silent
    }

    return results;
  }

  private async getTikTokShopProducts(): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    await Promise.allSettled(
      TIKTOK_SHOP_CATEGORIES.map(async (cat) => {
        try {
          // TikTok Shop public category listing
          const res = await axios.get('https://affiliate-api.tiktok.com/open_api/v1.3/market/products/search/', {
            params: {
              category_id: cat.id,
              sort_type: 2, // popular
              page_size: 10,
              page_number: 1,
            },
            headers: {
              ...this.headers,
              'Content-Type': 'application/json',
            },
            timeout: 8000,
          });

          const items: any[] = res.data?.data?.products || [];
          items.forEach(p => results.push(this.normalizeShopProduct(p, cat.name)));
        } catch {
          // TikTok Shop API requires auth — silent fail
        }
      })
    );

    return results;
  }

  private normalizeFromVideo(item: any): MarketplaceProduct | null {
    // Extract product info from TikTok video that mentions products
    const desc: string = item.desc || item.content || '';
    const stats = item.stats || item.statistics || {};
    const author = item.author || {};
    const video = item.video || {};

    // Only include if video has product/commerce intent
    const productKeywords = ['sp', 'sản phẩm', 'mua', 'giá', 'sale', 'review', 'mã'];
    const hasProduct = productKeywords.some(kw => desc.toLowerCase().includes(kw));

    if (!hasProduct && !item.product_list?.length) return null;

    const videoId = item.id || item.video_id;
    if (!videoId) return null;

    // Extract product from desc - find price patterns like "giá: 150k" or "150.000đ"
    const priceMatch = desc.match(/(\d+[.,]?\d*)\s*[kK]|(\d{3,}\.?\d{3})\s*[đd]/);
    const price = priceMatch
      ? (priceMatch[1] ? Math.round(Number(priceMatch[1].replace(',', '.')) * 1000) : Number(priceMatch[2].replace(/\./g, '')))
      : 0;

    // Extract product name - first meaningful text before hashtags
    const cleanDesc = desc.replace(/#\w+/g, '').trim();
    const productName = cleanDesc.split(/[.!?\n]/)[0].trim().slice(0, 100) || 'Sản phẩm TikTok';

    return {
      sourceId: `tiktok-${videoId}`,
      platform: 'tiktok',
      name: productName,
      price,
      image: video.cover || video.originCover || '',
      sales: Number(stats.playCount || stats.diggCount || 0),
      commission: 10, // TikTok Shop thường 10-20%
      affiliateLink: `https://www.tiktok.com/@${author.uniqueId || 'user'}/video/${videoId}`,
      category: this.detectCategory(desc),
      shopName: author.nickname || author.uniqueId || 'TikTok Creator',
      rating: 4.5, // TikTok không có rating trực tiếp
      originalUrl: `https://www.tiktok.com/@${author.uniqueId || 'user'}/video/${videoId}`,
    };
  }

  private normalizeShopProduct(p: any, categoryHint?: string): MarketplaceProduct {
    return {
      sourceId: `tiktok-shop-${p.product_id || p.id}`,
      platform: 'tiktok',
      name: p.product_name || p.title || 'Sản phẩm TikTok Shop',
      price: Math.round(Number(p.price?.original_price || p.price || 0)),
      image: p.image?.thumb_url_list?.[0] || p.cover_image || '',
      sales: Number(p.sales || p.sold_count || 0),
      commission: Number(p.commission_rate || 10),
      affiliateLink: p.product_link || `https://shop.tiktok.com/product/${p.product_id || p.id}`,
      category: categoryHint || p.category?.name || 'Khác',
      shopName: p.seller?.name || 'TikTok Shop',
      rating: Number(p.rating || 4.5),
    };
  }

  private detectCategory(text: string): string {
    const lower = text.toLowerCase();
    if (/kem|serum|son|dưỡng|mặt nạ|trang điểm|nước hoa|makeup/.test(lower)) return 'Sức khỏe & Làm đẹp';
    if (/tai nghe|điện thoại|sạc|cáp|điện tử|laptop|earphone/.test(lower)) return 'Điện tử';
    if (/áo|váy|quần|giày|túi|thời trang|outfit|ootd/.test(lower)) return 'Thời trang';
    if (/vitamin|thuốc|thực phẩm chức năng|sức khỏe|bổ sung/.test(lower)) return 'Sức khỏe';
    if (/đồ chơi|trẻ em|bé|baby|mẹ và bé/.test(lower)) return 'Mẹ & Bé';
    if (/nhà|bếp|giường|sofa|đèn|tủ|nội thất/.test(lower)) return 'Nhà cửa';
    if (/thể thao|gym|yoga|bóng|chạy bộ/.test(lower)) return 'Thể thao';
    return 'Khác';
  }
}
