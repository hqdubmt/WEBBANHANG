import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../../database/entities/product.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../database/entities/agent-log.entity';

export interface AffiliateScore {
  product: string;
  productId: string;
  ctr: number;
  conversion: number;
  commission: number;
  score: number;
  rank: number;
  recommendation: string;
}

@Injectable()
export class AffiliateIntelligenceService {
  private readonly logger = new Logger(AffiliateIntelligenceService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 5 * * *')
  async runDailyRanking() {
    this.logger.log('Affiliate Intelligence: xếp hạng sản phẩm affiliate...');
    await this.rankProducts();
  }

  async rankProducts(): Promise<AffiliateScore[]> {
    const log = this.logRepo.create({ agent: AgentName.AFFILIATE, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productRepo.find({
        order: { trendScore: 'DESC' },
        take: 50,
      });

      const validProducts = products.filter((p) => p.affiliateLink);
      const scored = await this.scoreProducts(validProducts.length ? validProducts : products);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: {
          total: scored.length,
          top5: scored.slice(0, 5).map((s) => ({ product: s.product, score: s.score })),
        } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Affiliate Intelligence: xếp hạng ${scored.length} sản phẩm`);
      return scored;
    } catch (e) {
      this.logger.error('Affiliate Intelligence lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async scoreProducts(products: Product[]): Promise<AffiliateScore[]> {
    const productSummary = products.map((p, i) =>
      `${i + 1}. ${p.name} | Giá: ${Number(p.price).toLocaleString('vi-VN')}đ | Trend: ${p.trendScore} | Hoa hồng: ${p.commission}%`
    ).join('\n');

    const systemPrompt = `Bạn là chuyên gia affiliate marketing Việt Nam.
Xếp hạng sản phẩm dựa trên CTR tiềm năng, conversion rate và hoa hồng.
Trả về JSON array: [{
  "idx": 1,
  "ctr": 0-100,
  "conversion": 0-100,
  "score": 0-100,
  "recommendation": "lý do ngắn gọn"
}]`;

    try {
      const aiScores = await this.aiService.parseJson<Array<{
        idx: number;
        ctr: number;
        conversion: number;
        score: number;
        recommendation: string;
      }>>(
        `Xếp hạng affiliate:\n${productSummary}\n\nJSON:`,
        systemPrompt,
      );

      return products
        .map((p, i) => {
          const aiResult = aiScores.find((s) => s.idx === i + 1) || aiScores[i];
          const ctr = aiResult?.ctr ?? this.estimateCtr(p);
          const conversion = aiResult?.conversion ?? this.estimateConversion(p);
          const commission = p.commission;
          const score = aiResult?.score ?? Math.round((ctr * 0.3 + conversion * 0.3 + commission * 4) * 0.4);

          return {
            product: p.name,
            productId: p.id,
            ctr,
            conversion,
            commission,
            score,
            rank: 0,
            recommendation: aiResult?.recommendation || 'Điểm tự động',
          };
        })
        .sort((a, b) => b.score - a.score)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    } catch {
      return products
        .map((p) => ({
          product: p.name,
          productId: p.id,
          ctr: this.estimateCtr(p),
          conversion: this.estimateConversion(p),
          commission: p.commission,
          score: Math.round(p.trendScore * 0.5 + p.commission * 2),
          rank: 0,
          recommendation: 'Điểm tự động từ trend + commission',
        }))
        .sort((a, b) => b.score - a.score)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    }
  }

  private estimateCtr(product: Product): number {
    return Math.min(Math.round(product.trendScore * 0.7 + product.commission * 0.5), 100);
  }

  private estimateConversion(product: Product): number {
    const priceScore = product.price < 500000 ? 30 : product.price < 1000000 ? 20 : 10;
    return Math.min(Math.round(priceScore + product.commission * 0.3), 100);
  }

  async getTopAffiliateProducts(limit = 10): Promise<AffiliateScore[]> {
    const scored = await this.rankProducts();
    return scored.slice(0, limit);
  }
}
