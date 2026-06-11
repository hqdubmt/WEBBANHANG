import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { PriceAlert, PriceAction } from '../../../database/entities/price-alert.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

interface CompetitorPrice {
  platform: string;
  price: number;
  productName: string;
  url: string;
}

@Injectable()
export class PriceAgentService {
  private readonly logger = new Logger(PriceAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(PriceAlert)
    private readonly alertRepo: Repository<PriceAlert>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 */1 * * *')
  async runPriceCheck() {
    this.logger.log('Price Agent: kiểm tra giá đối thủ...');
    await this.checkPrices();
  }

  async checkPrices(): Promise<PriceAlert[]> {
    const log = this.logRepo.create({ agent: AgentName.PRICE, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(20);
      const alerts: PriceAlert[] = [];

      for (const product of products) {
        const competitors = await this.fetchCompetitorPrices(product);
        const analysis = await this.analyzePrice(product, competitors);

        if (analysis) {
          const alert = this.alertRepo.create({
            productId: product.id,
            ourPrice: product.price,
            competitorPrice: analysis.competitorPrice,
            competitorPlatform: analysis.platform,
            priceDiffPercent: analysis.diffPercent,
            suggestedAction: analysis.action,
            reason: analysis.reason,
            marketData: { competitors },
          });
          alerts.push(await this.alertRepo.save(alert));
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { checked: products.length, alerts: alerts.length } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Price Agent: ${alerts.length} cảnh báo giá`);
      return alerts;
    } catch (e) {
      this.logger.error('Price Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async fetchCompetitorPrices(product: any): Promise<CompetitorPrice[]> {
    const dropThreshold = parseFloat(process.env.PRICE_DROP_THRESHOLD || '5');
    const variance = (Math.random() - 0.5) * 0.3;
    const mockCompetitorPrice = product.price * (1 + variance);

    return [
      {
        platform: 'Shopee',
        price: Math.round(mockCompetitorPrice),
        productName: product.name,
        url: `https://shopee.vn/search?keyword=${encodeURIComponent(product.name)}`,
      },
      {
        platform: 'Lazada',
        price: Math.round(product.price * (1 + (Math.random() - 0.5) * 0.25)),
        productName: product.name,
        url: `https://www.lazada.vn/catalog/?q=${encodeURIComponent(product.name)}`,
      },
    ];
  }

  private async analyzePrice(
    product: any,
    competitors: CompetitorPrice[],
  ): Promise<{ competitorPrice: number; platform: string; diffPercent: number; action: PriceAction; reason: string } | null> {
    if (!competitors.length) return null;

    const cheapest = competitors.reduce((min, c) => (c.price < min.price ? c : min));
    const diffPercent = ((product.price - cheapest.price) / cheapest.price) * 100;
    const threshold = parseFloat(process.env.PRICE_DROP_THRESHOLD || '5');

    if (Math.abs(diffPercent) < threshold) return null;

    const systemPrompt = `Bạn là chuyên gia định giá TMĐT. Đề xuất hành động giá. Trả về JSON: {"action":"increase|decrease|combo|flash_sale","reason":"..."}`;
    const prompt = `Sản phẩm: ${product.name}
Giá chúng ta: ${product.price.toLocaleString('vi-VN')}đ
Đối thủ rẻ nhất (${cheapest.platform}): ${cheapest.price.toLocaleString('vi-VN')}đ
Chênh lệch: ${diffPercent.toFixed(1)}%

Đề xuất:`;

    try {
      const result = await this.aiService.parseJson<{ action: string; reason: string }>(prompt, systemPrompt);
      return {
        competitorPrice: cheapest.price,
        platform: cheapest.platform,
        diffPercent: Math.round(diffPercent * 100) / 100,
        action: (result.action as PriceAction) || (diffPercent > 0 ? PriceAction.DECREASE : PriceAction.INCREASE),
        reason: result.reason || `Chênh lệch ${diffPercent.toFixed(1)}% so với ${cheapest.platform}`,
      };
    } catch {
      return {
        competitorPrice: cheapest.price,
        platform: cheapest.platform,
        diffPercent: Math.round(diffPercent * 100) / 100,
        action: diffPercent > 0 ? PriceAction.DECREASE : PriceAction.INCREASE,
        reason: `Tự động: chênh lệch ${diffPercent.toFixed(1)}% so với ${cheapest.platform}`,
      };
    }
  }

  async getPendingAlerts(): Promise<PriceAlert[]> {
    return this.alertRepo.find({
      where: { isActedOn: false },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
