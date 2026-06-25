import { Injectable, Logger } from '@nestjs/common';
import { ShopeeService, ShopeeProduct } from './shopee.service';
import { LazadaService, LazadaProduct } from './lazada.service';
import { TiktokService, TiktokProduct } from './tiktok.service';
import { AccessTradeService } from './accesstrade.service';

export interface MarketplaceProduct {
  sourceId: string;
  platform: 'shopee' | 'lazada' | 'tiktok';
  name: string;
  price: number;
  image: string;
  sales: number;
  commission: number;
  affiliateLink: string;
  category: string;
  shopName: string;
  rating: number;
  originalUrl?: string;
  discountRate?: number;
  originalPrice?: number;
  isAuthentic?: boolean;
}

export interface AffiliateResult {
  platform: 'shopee' | 'lazada' | 'tiktok' | 'tiki';
  affiliateLink: string;
  commission: number;
  method?: string;
}

const HOT_KEYWORDS = [
  'kem chống nắng', 'serum', 'vitamin', 'tai nghe', 'đồng hồ',
  'bình giữ nhiệt', 'áo thun', 'giày', 'túi xách', 'nước hoa',
  'son môi', 'máy sấy tóc', 'điện thoại', 'phụ kiện', 'đồ gia dụng',
];

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly shopee: ShopeeService,
    private readonly lazada: LazadaService,
    private readonly tiktok: TiktokService,
    private readonly accesstrade: AccessTradeService,
  ) {}

  get configuredPlatforms(): string[] {
    const platforms: string[] = [];
    if (this.shopee.isConfigured) platforms.push('shopee');
    if (this.lazada.isConfigured) platforms.push('lazada');
    if (this.tiktok.isConfigured) platforms.push('tiktok');
    return platforms;
  }

  // Lấy sản phẩm hot từ tất cả platform song song
  async getTrendingProducts(limitPerPlatform = 50): Promise<MarketplaceProduct[]> {
    this.logger.log(`Quét trending từ: ${this.configuredPlatforms.join(', ') || 'không có platform nào được cấu hình'}`);

    const [shopeeProducts, lazadaProducts, tiktokProducts] = await Promise.all([
      this.shopee.getTrendingProducts(limitPerPlatform),
      this.lazada.getTopProducts(limitPerPlatform),
      this.tiktok.getTrendingProducts(limitPerPlatform),
    ]);

    const all: MarketplaceProduct[] = [
      ...shopeeProducts.map((p) => this.normalizeShopee(p)),
      ...lazadaProducts.map((p) => this.normalizeLazada(p)),
      ...tiktokProducts.map((p) => this.normalizeTiktok(p)),
    ];

    this.logger.log(`Đã lấy ${all.length} sản phẩm: Shopee=${shopeeProducts.length}, Lazada=${lazadaProducts.length}, TikTok=${tiktokProducts.length}`);
    return all;
  }

  // Tìm sản phẩm theo nhiều keyword song song
  async searchAllPlatforms(keywords: string[], limitPerKeyword = 10): Promise<MarketplaceProduct[]> {
    const searchFns = keywords.flatMap((kw) => [
      this.shopee.searchProducts(kw, limitPerKeyword).then((r) => r.map((p) => this.normalizeShopee(p))),
      this.lazada.searchProducts(kw, limitPerKeyword).then((r) => r.map((p) => this.normalizeLazada(p))),
      this.tiktok.searchProducts(kw, limitPerKeyword).then((r) => r.map((p) => this.normalizeTiktok(p))),
    ]);

    const results = await Promise.allSettled(searchFns);
    const products: MarketplaceProduct[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') products.push(...r.value);
    }

    return this.deduplicateAndSort(products);
  }

  // Quét theo danh mục hot (dùng khi không có keyword cụ thể)
  async scanHotKeywords(maxKeywords = 5): Promise<MarketplaceProduct[]> {
    const keywords = HOT_KEYWORDS.slice(0, maxKeywords);
    return this.searchAllPlatforms(keywords, 10);
  }

  // Tìm link affiliate tốt nhất cho một sản phẩm, thử lần lượt từng platform
  async findBestAffiliateLink(
    productName: string,
    preferredPlatform?: 'shopee' | 'lazada' | 'tiktok',
  ): Promise<AffiliateResult | null> {
    const searchResults = await this.searchAllPlatforms([productName], 5);
    if (searchResults.length === 0) return null;

    // Ưu tiên platform được chọn, sau đó chọn hoa hồng cao nhất
    const sorted = searchResults
      .filter((p) => p.affiliateLink)
      .sort((a, b) => {
        if (preferredPlatform) {
          if (a.platform === preferredPlatform && b.platform !== preferredPlatform) return -1;
          if (b.platform === preferredPlatform && a.platform !== preferredPlatform) return 1;
        }
        return b.commission - a.commission;
      });

    if (sorted.length === 0) return null;
    const best = sorted[0];
    return { platform: best.platform, affiliateLink: best.affiliateLink, commission: best.commission };
  }

  // Tạo affiliate link từ URL gốc (khi đã biết product URL)
  async generateAffiliateFromUrl(originalUrl: string): Promise<AffiliateResult | null> {
    if (originalUrl.includes('shopee.vn') && this.shopee.isConfigured) {
      const result = await this.shopee.generateAffiliateLink(originalUrl);
      if (result) return { platform: 'shopee', affiliateLink: result, commission: 0 };
    }

    if (originalUrl.includes('lazada.vn') && this.lazada.isConfigured) {
      const result = await this.lazada.generateAffiliateLink(originalUrl);
      if (result) return { platform: 'lazada', affiliateLink: result, commission: 0 };
    }

    if ((originalUrl.includes('tiktok.com') || originalUrl.includes('tiktokshop')) && this.tiktok.isConfigured) {
      const productId = this.extractTiktokProductId(originalUrl);
      if (productId) {
        const result = await this.tiktok.generateAffiliateLink(productId);
        if (result) return { platform: 'tiktok', affiliateLink: result, commission: 0 };
      }
    }

    if (originalUrl.includes('tiki.vn') && this.accesstrade.isConfigured) {
      const tikiCampaign = await this.accesstrade.findTikiCampaign();
      const campaignId = tikiCampaign?.id;
      const { trackingUrl, method } = await this.accesstrade.generateTrackingLink(originalUrl, campaignId);
      return {
        platform: 'tiki',
        affiliateLink: trackingUrl,
        commission: this.accesstrade.tikiCommission,
        method,
      };
    }

    return null;
  }

  private normalizeShopee(p: ShopeeProduct): MarketplaceProduct {
    return {
      sourceId: `shopee-${p.itemId}`,
      platform: 'shopee',
      name: p.name,
      price: p.price,
      image: p.image,
      sales: p.sales,
      commission: p.commission,
      affiliateLink: p.affiliateLink,
      category: p.category,
      shopName: p.shopName,
      rating: p.ratingStar,
    };
  }

  private normalizeLazada(p: LazadaProduct): MarketplaceProduct {
    return {
      sourceId: `lazada-${p.itemId}`,
      platform: 'lazada',
      name: p.name,
      price: p.salePrice || p.price,
      image: p.image,
      sales: p.sales,
      commission: p.commission,
      affiliateLink: p.affiliateLink,
      category: p.category,
      shopName: p.shopName,
      rating: p.rating,
      originalUrl: p.url,
    };
  }

  private normalizeTiktok(p: TiktokProduct): MarketplaceProduct {
    return {
      sourceId: `tiktok-${p.productId}`,
      platform: 'tiktok',
      name: p.name,
      price: p.price,
      image: p.image,
      sales: p.sales,
      commission: p.commissionRate,
      affiliateLink: p.affiliateLink,
      category: p.category,
      shopName: p.shopName,
      rating: p.rating,
    };
  }

  private deduplicateAndSort(products: MarketplaceProduct[]): MarketplaceProduct[] {
    const seen = new Set<string>();
    const unique = products.filter((p) => {
      const key = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.sort((a, b) => b.sales - a.sales || b.commission - a.commission);
  }

  private extractTiktokProductId(url: string): string | null {
    const match = url.match(/\/(\d+)(?:\?|$)/);
    return match?.[1] || null;
  }
}
