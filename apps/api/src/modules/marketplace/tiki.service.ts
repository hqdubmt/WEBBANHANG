import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MarketplaceProduct } from './marketplace.service';

const TIKI_CATEGORIES = [
  { id: 1789,  name: 'Điện thoại & Phụ kiện' },
  { id: 1815,  name: 'Điện tử - Điện máy' },
  { id: 8322,  name: 'Làm đẹp' },
  { id: 1520,  name: 'Sức khỏe' },
  { id: 1883,  name: 'Nhà cửa & Đời sống' },
  { id: 2549,  name: 'Thể thao' },
  { id: 8371,  name: 'Thời trang nữ' },
  { id: 1686,  name: 'Thời trang nam' },
  { id: 4221,  name: 'Thực phẩm' },
  { id: 8594,  name: 'Đồ chơi & Mẹ & Bé' },
];

const HOT_KEYWORDS = [
  'kem chống nắng', 'serum collagen', 'vitamin c', 'tai nghe bluetooth',
  'đồng hồ thông minh', 'bình giữ nhiệt', 'máy sấy tóc', 'son dưỡng',
  'áo thun nam', 'giày sneaker', 'túi xách nữ', 'dây sạc nhanh',
  'máy massage', 'thực phẩm chức năng', 'tã bỉm', 'đồ chơi trẻ em',
];

@Injectable()
export class TikiService {
  private readonly logger = new Logger(TikiService.name);
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
    'Referer': 'https://tiki.vn',
    'Accept': 'application/json',
  };

  async getTopSellers(limit = 60): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];
    const perCat = Math.ceil(limit / TIKI_CATEGORIES.length);

    await Promise.allSettled(
      TIKI_CATEGORIES.map(async (cat) => {
        try {
          const res = await axios.get('https://tiki.vn/api/v2/products', {
            params: { limit: perCat, sort: 'top_seller', category: cat.id },
            headers: this.headers,
            timeout: 8000,
          });
          const items: MarketplaceProduct[] = (res.data?.data || []).map((p: any) =>
            this.normalize(p, cat.name)
          );
          results.push(...items);
        } catch {
          // bỏ qua lỗi từng category
        }
      })
    );

    return results;
  }

  async searchByKeywords(keywords: string[], limitPerKw = 5): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    await Promise.allSettled(
      keywords.map(async (kw) => {
        try {
          const res = await axios.get('https://tiki.vn/api/v2/products', {
            params: { q: kw, limit: limitPerKw, sort: 'top_seller' },
            headers: this.headers,
            timeout: 8000,
          });
          const items = (res.data?.data || []).map((p: any) => this.normalize(p));
          results.push(...items);
        } catch {
          // bỏ qua
        }
      })
    );

    return results;
  }

  async getTrending(limit = 80): Promise<MarketplaceProduct[]> {
    const [byCat, byKw] = await Promise.all([
      this.getTopSellers(limit),
      this.searchByKeywords(HOT_KEYWORDS.slice(0, 8), 4),
    ]);

    const seen = new Set<string>();
    return [...byCat, ...byKw].filter(p => {
      if (seen.has(p.sourceId)) return false;
      seen.add(p.sourceId);
      return true;
    }).slice(0, limit);
  }

  private normalize(p: any, categoryHint?: string): MarketplaceProduct {
    const qty = p.quantity_sold;
    const sold = typeof qty === 'object' && qty ? qty.value ?? 0 : Number(qty ?? 0);
    const cat = p.categories?.name || categoryHint || 'Khác';

    return {
      sourceId: `tiki-${p.id}`,
      platform: 'shopee' as any,   // map to existing enum, tiki not in enum
      name: p.name || 'Sản phẩm Tiki',
      price: Math.round(Number(p.price || 0)),
      image: p.thumbnail_url || p.images?.[0]?.base_url || '',
      sales: sold,
      commission: 8,   // Tiki affiliate mặc định ~8%
      affiliateLink: `https://tiki.vn/api/v2/products/${p.id}`,
      category: cat,
      shopName: p.seller_specifications?.name || p.brand_name || 'Tiki',
      rating: Number(p.rating_average || 0),
      originalUrl: `https://tiki.vn/${p.url_key || p.id}`,
    };
  }
}
