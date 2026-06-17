import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MarketplaceProduct } from './marketplace.service';

const SHOPEE_KEYWORDS = [
  'kem chống nắng', 'serum vitamin c', 'tai nghe bluetooth',
  'đồng hồ thông minh', 'son dưỡng môi', 'máy sấy tóc',
  'vitamin tổng hợp', 'áo thun nữ', 'giày sneaker nam',
  'bình giữ nhiệt', 'dây sạc nhanh', 'máy massage cổ',
  'thực phẩm chức năng', 'tã bỉm pampers', 'nước tẩy trang',
  'mặt nạ dưỡng da', 'lót thấm giày', 'đèn led phòng ngủ',
];

const SHOPEE_CATEGORY_MAP: Record<string, string> = {
  '100629': 'Sức khỏe & Làm đẹp',
  '100013': 'Điện thoại & Phụ kiện',
  '100007': 'Thời trang nữ',
  '100008': 'Thời trang nam',
  '100017': 'Nhà cửa & Đời sống',
  '100056': 'Thể thao & Du lịch',
  '100011': 'Đồ chơi & Mẹ & Bé',
};

@Injectable()
export class ShopeeScraperService {
  private readonly logger = new Logger(ShopeeScraperService.name);

  private readonly browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://shopee.vn/',
    'X-Api-Source': 'pc',
    'X-Requested-With': 'XMLHttpRequest',
  };

  async getTrending(limit = 60): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    // Thử các endpoint Shopee từ dễ đến khó
    const [bySearch, byCategory] = await Promise.all([
      this.searchByKeywords(SHOPEE_KEYWORDS.slice(0, 6), 5),
      this.getByCategories(4),
    ]);

    results.push(...bySearch, ...byCategory);

    // Dedup by sourceId
    const seen = new Set<string>();
    const unique = results.filter(p => {
      if (seen.has(p.sourceId)) return false;
      seen.add(p.sourceId);
      return true;
    });

    this.logger.log(`Shopee scraper: ${unique.length} sản phẩm`);
    return unique.slice(0, limit);
  }

  private async searchByKeywords(keywords: string[], limitPerKw: number): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    await Promise.allSettled(
      keywords.map(async (kw) => {
        try {
          const res = await axios.get('https://shopee.vn/api/v4/search/search_items', {
            params: {
              by: 'sales',
              keyword: kw,
              limit: limitPerKw,
              newest: 0,
              order: 'desc',
              page_type: 'search',
              scenario: 'PAGE_GLOBAL_SEARCH',
              version: 2,
            },
            headers: this.browserHeaders,
            timeout: 8000,
          });

          const items: any[] = res.data?.items || [];
          items.forEach(item => {
            const p = item.item_basic || item;
            if (p && p.name) {
              results.push(this.normalize(p, kw));
            }
          });
        } catch (err) {
          // Bị block 403 là bình thường — log nhẹ
          const code = err?.response?.status;
          if (code !== 403) this.logger.debug(`Shopee search "${kw}": ${err.message}`);
        }
      })
    );

    return results;
  }

  private async getByCategories(limitPerCat: number): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];
    const categoryIds = Object.keys(SHOPEE_CATEGORY_MAP);

    await Promise.allSettled(
      categoryIds.slice(0, 4).map(async (catId) => {
        try {
          const res = await axios.get('https://shopee.vn/api/v4/search/search_items', {
            params: {
              by: 'sales',
              catid: catId,
              limit: limitPerCat,
              newest: 0,
              order: 'desc',
              page_type: 'shop',
            },
            headers: this.browserHeaders,
            timeout: 8000,
          });

          const items: any[] = res.data?.items || [];
          const catName = SHOPEE_CATEGORY_MAP[catId];
          items.forEach(item => {
            const p = item.item_basic || item;
            if (p && p.name) results.push(this.normalize(p, catName));
          });
        } catch {
          // ignore
        }
      })
    );

    return results;
  }

  private normalize(p: any, categoryHint?: string): MarketplaceProduct {
    const itemId = p.itemid || p.item_id || p.id;
    const shopId = p.shopid || p.shop_id || 0;
    const price = Math.round(Number(p.price || p.price_min || 0) / 100000); // Shopee price in cents x 100000
    const actualPrice = price > 0 ? price : Math.round(Number(p.price_max || 0) / 100000);

    return {
      sourceId: `shopee-${shopId}-${itemId}`,
      platform: 'shopee',
      name: p.name || p.item_name || 'Sản phẩm Shopee',
      price: actualPrice,
      image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '',
      sales: Number(p.sold || p.item_sold_out_stock_monthly || p.historical_sold || 0),
      commission: 7, // Shopee affiliate mặc định ~7-10%
      affiliateLink: itemId ? `https://shopee.vn/product/${shopId}/${itemId}` : '',
      category: p.catid ? SHOPEE_CATEGORY_MAP[String(p.catid)] || categoryHint || 'Khác' : (categoryHint || 'Khác'),
      shopName: p.shop_name || p.shopee_verified ? 'Shopee Mall' : 'Shop Shopee',
      rating: Number(p.item_rating?.rating_star || p.rating_star || 0),
      originalUrl: itemId ? `https://shopee.vn/product/${shopId}/${itemId}` : undefined,
    };
  }
}
