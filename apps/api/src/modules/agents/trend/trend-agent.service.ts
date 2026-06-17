import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { MarketplaceService, MarketplaceProduct } from '../../marketplace/marketplace.service';
import { TikiService } from '../../marketplace/tiki.service';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { ProductSource, ProductStatus } from '../../../database/entities/product.entity';

interface ScoredProduct extends MarketplaceProduct {
  trendScore: number;
  trendReason: string;
}

@Injectable()
export class TrendAgentService {
  private readonly logger = new Logger(TrendAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    private readonly marketplace: MarketplaceService,
    private readonly tiki: TikiService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 6 * * *')
  async runDailyTrendScan() {
    this.logger.log('Trend Agent: bắt đầu quét sản phẩm hot...');
    await this.scanTrends();
  }

  async scanTrends(): Promise<ScoredProduct[]> {
    const log = this.logRepo.create({ agent: AgentName.TREND, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      // Bước 1: Lấy dữ liệu thật từ Shopee + Lazada + TikTok song song
      const rawProducts = await this.fetchFromAllPlatforms();
      this.logger.log(`Lấy được ${rawProducts.length} sản phẩm từ marketplace`);

      // Bước 2: AI chấm điểm trend (batch để tiết kiệm token)
      const scored = await this.scoreWithAI(rawProducts);

      // Bước 3: Lọc top 100 sản phẩm có điểm >= 50
      const top = scored.filter((p) => p.trendScore >= 50).slice(0, 100);

      // Bước 4: Lưu vào database
      await this.saveProducts(top);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: {
          total: rawProducts.length,
          saved: top.length,
          platforms: this.marketplace.configuredPlatforms,
          topProducts: top.slice(0, 5).map((p) => ({ name: p.name, score: p.trendScore, platform: p.platform })),
        } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Trend Agent xong: ${top.length} sản phẩm hot lưu DB`);
      return top;
    } catch (e) {
      this.logger.error('Trend Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async fetchFromAllPlatforms(): Promise<MarketplaceProduct[]> {
    const configured = this.marketplace.configuredPlatforms;

    if (configured.length > 0) {
      // Có API key: lấy dữ liệu thật
      const [trending, fromKeywords] = await Promise.all([
        this.marketplace.getTrendingProducts(100),
        this.marketplace.scanHotKeywords(5),
      ]);
      // Gộp + dedup dựa trên sourceId
      const all = [...trending, ...fromKeywords];
      const seen = new Set<string>();
      return all.filter((p) => {
        if (seen.has(p.sourceId)) return false;
        seen.add(p.sourceId);
        return true;
      });
    }

    // Không có API key: lấy từ Tiki (không cần key)
    this.logger.log('Không có marketplace API key, dùng Tiki.vn public data');
    const tikiProducts = await this.tiki.getTrending(80);
    if (tikiProducts.length > 0) {
      this.logger.log(`Tiki: lấy được ${tikiProducts.length} sản phẩm thật`);
      return tikiProducts;
    }

    this.logger.warn('Tiki không trả dữ liệu, dùng mock tạm thời');
    return this.getMockProducts();
  }

  private async scoreWithAI(products: MarketplaceProduct[]): Promise<ScoredProduct[]> {
    // Chia thành batch 20 sản phẩm để AI phân tích nhanh hơn
    const BATCH_SIZE = 20;
    const scored: ScoredProduct[] = [];

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchScored = await this.scoreBatch(batch);
      scored.push(...batchScored);
    }

    return scored;
  }

  private async scoreBatch(products: MarketplaceProduct[]): Promise<ScoredProduct[]> {
    const list = products.map((p, idx) =>
      `${idx + 1}. [${p.platform.toUpperCase()}] ${p.name} | Giá: ${p.price.toLocaleString('vi-VN')}đ | Bán: ${p.sales} | Hoa hồng: ${p.commission}%`,
    ).join('\n');

    const systemPrompt = `Bạn là chuyên gia phân tích xu hướng TMĐT Việt Nam.
Đánh giá mức độ hot của từng sản phẩm (0-100) dựa trên:
- Lượt bán (sales volume)
- Hoa hồng affiliate (commission)
- Độ phổ biến thị trường VN
- Tiềm năng viral trên mạng xã hội

Trả về JSON array: [{"idx":1,"score":85,"reason":"..."}]`;

    const prompt = `Phân tích và cho điểm:\n${list}\n\nJSON array:`;

    try {
      const result = await this.aiService.parseJson<Array<{ idx: number; score: number; reason: string }>>(
        prompt,
        systemPrompt,
      );

      return products.map((p, i) => {
        const aiResult = result.find((r) => r.idx === i + 1) || result[i];
        return {
          ...p,
          trendScore: aiResult?.score ?? this.calculateFallbackScore(p),
          trendReason: aiResult?.reason ?? 'Tính điểm tự động',
        };
      });
    } catch {
      // Fallback: tính điểm theo công thức đơn giản
      return products.map((p) => ({
        ...p,
        trendScore: this.calculateFallbackScore(p),
        trendReason: 'AI không khả dụng, tính điểm theo sales + commission',
      }));
    }
  }

  private calculateFallbackScore(p: MarketplaceProduct): number {
    const salesScore = Math.min(p.sales / 1000, 40);    // tối đa 40 điểm
    const commissionScore = Math.min(p.commission * 2, 30); // tối đa 30 điểm
    const ratingScore = (p.rating / 5) * 30;             // tối đa 30 điểm
    return Math.round(salesScore + commissionScore + ratingScore);
  }

  private async saveProducts(products: ScoredProduct[]): Promise<void> {
    const platformMap: Record<string, ProductSource> = {
      shopee: ProductSource.SHOPEE,
      lazada: ProductSource.LAZADA,
      tiktok: ProductSource.TIKTOK,
      tiki: ProductSource.MANUAL,
    };

    const entities = products.map((p) => ({
      name: p.name,
      category: p.category,
      price: p.price,
      image: p.image,
      trendScore: p.trendScore,
      source: platformMap[p.platform] || ProductSource.SHOPEE,
      sourceId: p.sourceId,
      affiliateLink: p.affiliateLink || null,
      commission: p.commission,
      status: p.affiliateLink ? ProductStatus.ACTIVE : ProductStatus.PENDING,
      meta: {
        reason: p.trendReason,
        shopName: p.shopName,
        sales: p.sales,
        rating: p.rating,
      },
    }));

    await this.productsService.bulkUpsert(entities);
  }

  private getMockProducts(): MarketplaceProduct[] {
    return [
      { sourceId: 'mock-1', platform: 'shopee', name: 'Kem chống nắng SPF50 Anessa', price: 350000, image: '', sales: 15000, commission: 8, affiliateLink: '', category: 'Làm đẹp', shopName: 'Shop Demo', rating: 4.8 },
      { sourceId: 'mock-2', platform: 'lazada', name: 'Tai nghe Bluetooth TWS 5.0', price: 450000, image: '', sales: 8500, commission: 12, affiliateLink: '', category: 'Điện tử', shopName: 'Tech Store', rating: 4.5 },
      { sourceId: 'mock-3', platform: 'tiktok', name: 'Vitamin C 1000mg Nature Made', price: 250000, image: '', sales: 20000, commission: 10, affiliateLink: '', category: 'Sức khỏe', shopName: 'Health VN', rating: 4.9 },
      { sourceId: 'mock-4', platform: 'shopee', name: 'Serum HA Neutrogena', price: 380000, image: '', sales: 12000, commission: 9, affiliateLink: '', category: 'Làm đẹp', shopName: 'Beauty Hub', rating: 4.7 },
      { sourceId: 'mock-5', platform: 'lazada', name: 'Bình giữ nhiệt Lock&Lock 1L', price: 280000, image: '', sales: 9000, commission: 7, affiliateLink: '', category: 'Gia dụng', shopName: 'Home Store', rating: 4.6 },
    ];
  }
}
