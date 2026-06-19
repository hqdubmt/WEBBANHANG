import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MarketplaceProduct } from './marketplace.service';
import { AccessTradeService } from './accesstrade.service';

const TIKI_CATEGORIES = [
  { id: 1789,  name: 'Điện thoại & Phụ kiện' },
  { id: 1815,  name: 'Điện tử - Điện máy' },
  { id: 8322,  name: 'Làm đẹp' },
  { id: 1520,  name: 'Sức khỏe' },
  { id: 1883,  name: 'Nhà cửa & Đời sống' },
  { id: 2549,  name: 'Thể thao & Du lịch' },
  { id: 8371,  name: 'Thời trang nữ' },
  { id: 1686,  name: 'Thời trang nam' },
  { id: 4221,  name: 'Thực phẩm & Đồ uống' },
  { id: 8594,  name: 'Đồ chơi & Mẹ & Bé' },
  { id: 1752,  name: 'Sách' },
  { id: 15078, name: 'Văn phòng phẩm' },
  { id: 11312, name: 'Ô tô - Xe máy' },
  { id: 6000,  name: 'Balo & Túi ví' },
];

const HOT_KEYWORDS = [
  'kem chống nắng', 'serum collagen', 'vitamin c', 'tai nghe bluetooth',
  'đồng hồ thông minh', 'bình giữ nhiệt', 'máy sấy tóc', 'son dưỡng môi',
  'áo thun nam', 'giày sneaker', 'túi xách nữ', 'dây sạc nhanh',
  'máy massage cổ', 'thực phẩm chức năng', 'tã bỉm pampers', 'đồ chơi trẻ em',
  'sữa rửa mặt', 'dưỡng ẩm', 'nước tẩy trang', 'mặt nạ dưỡng da',
  'sạc dự phòng', 'đèn led', 'nồi cơm điện', 'máy pha cà phê',
  'sách kỹ năng', 'giáo trình tiếng anh',
];

@Injectable()
export class TikiService {
  private readonly logger = new Logger(TikiService.name);

  constructor(private readonly at: AccessTradeService) {}

  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://tiki.vn',
    'Accept': 'application/json',
  };

  async getTopSellers(perCategory = 15): Promise<MarketplaceProduct[]> {
    const results: MarketplaceProduct[] = [];

    await Promise.allSettled(
      TIKI_CATEGORIES.map(async (cat) => {
        try {
          const res = await axios.get('https://tiki.vn/api/v2/products', {
            params: { limit: perCategory, sort: 'top_seller', category: cat.id },
            headers: this.headers,
            timeout: 10000,
          });
          const items = (res.data?.data || []).map((p: any) => this.normalize(p, cat.name));
          results.push(...items);
        } catch {
          // ignore per-category errors
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
          // ignore
        }
      })
    );

    return results;
  }

  async getTrending(limit = 200): Promise<MarketplaceProduct[]> {
    const [byCat, byKw] = await Promise.all([
      this.getTopSellers(15),                          // 14 cat × 15 = 210
      this.searchByKeywords(HOT_KEYWORDS, 5),          // 26 kw  × 5  = 130
    ]);

    const seen = new Set<string>();
    const all = [...byCat, ...byKw].filter(p => {
      if (!p.sourceId || seen.has(p.sourceId)) return false;
      seen.add(p.sourceId);
      return true;
    });

    this.logger.log(`Tiki: ${byCat.length} by-cat + ${byKw.length} by-kw = ${all.length} unique`);
    return all.slice(0, limit);
  }

  private normalize(p: any, categoryHint?: string): MarketplaceProduct {
    const qty = p.quantity_sold;
    const sold = typeof qty === 'object' && qty ? Number(qty.value ?? 0) : Number(qty ?? 0);
    const cat = p.categories?.name || categoryHint || 'Khác';
    const slug = p.url_key || '';
    // Tiki url_key already includes -p{id} suffix; only add it if missing
    const productUrl = slug
      ? `https://tiki.vn/${slug}${slug.includes(`p${p.id}`) ? '' : `-p${p.id}`}.html`
      : `https://tiki.vn/p${p.id}.html`;

    const affiliateLink = this.at.generateDeepLink(productUrl);
    return {
      sourceId: `tiki-${p.id}`,
      platform: 'tiki' as any,
      name: p.name || 'Sản phẩm Tiki',
      price: Math.round(Number(p.price || 0)),
      image: p.thumbnail_url || p.images?.[0]?.base_url || '',
      sales: sold,
      commission: this.at.tikiCommission,
      affiliateLink,
      category: cat,
      shopName: p.seller_specifications?.name || p.brand_name || 'Tiki',
      rating: Number(p.rating_average || 0),
      originalUrl: productUrl,
    };
  }
}
