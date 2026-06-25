import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { PriceAlert, PriceAction } from '../../../database/entities/price-alert.entity';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';

@Injectable()
export class CompetitorMonitorService {
  private readonly logger = new Logger(CompetitorMonitorService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    @InjectRepository(PriceAlert)
    private readonly alertRepo: Repository<PriceAlert>,
  ) {}

  // Theo dõi đối thủ mỗi 3h
  @Cron('0 */3 * * *')
  async runMonitor() {
    this.logger.log('Agent18 CompetitorMonitor: theo dõi đối thủ cạnh tranh...');
    await this.monitor();
  }

  async monitor() {
    const log = this.logRepo.create({ agent: AgentName.COMPETITOR_MONITOR, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(15);
      const insights: any[] = [];

      for (const product of products) {
        const insight = await this.analyzeCompetition(product);
        if (insight) {
          insights.push(insight);
          // Lưu alert nếu phát hiện giá đối thủ thấp hơn đáng kể
          if (insight.action && insight.action !== 'maintain') {
            const rawCp = insight.lowestCompetitorPrice;
            const competitorPrice = typeof rawCp === 'number' && !isNaN(rawCp)
              ? rawCp
              : parseFloat(String(rawCp).replace(/[^0-9.]/g, '')) || product.price;
            const diff = product.price - competitorPrice;
            const pct = product.price > 0 ? (diff / product.price) * 100 : 0;
            await this.alertRepo.save(this.alertRepo.create({
              productId: product.id,
              ourPrice: product.price,
              competitorPrice,
              competitorPlatform: insight.platform || 'unknown',
              priceDiffPercent: pct,
              suggestedAction: insight.action === 'lower_price' ? PriceAction.DECREASE : PriceAction.INCREASE,
              reason: insight.reason || 'Competitor price analysis',
            }));
          }
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { analyzed: products.length, insights: insights.length, data: insights } as any,
        durationMs: Date.now() - startMs,
      });

      return { analyzed: products.length, insights };
    } catch (err: any) {
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: err.message,
        durationMs: Date.now() - startMs,
      });
      throw err;
    }
  }

  private async analyzeCompetition(product: any) {
    const prompt = `Bạn là chuyên gia phân tích đối thủ cạnh tranh.
Sản phẩm: ${product.name}
Giá hiện tại: ${product.price} VND

Mô phỏng phân tích đối thủ:
1. Ước tính giá đối thủ thấp nhất trên Shopee/Lazada/TikTok Shop
2. Đánh giá vị trí cạnh tranh
3. Đề xuất hành động: lower_price / raise_price / maintain / bundle

Trả lời JSON: { lowestCompetitorPrice, platform, position, action, reason }`;

    try {
      const raw = await this.aiService.generate(prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        return { productId: product.id, productName: product.name, ...JSON.parse(match[0]) };
      }
    } catch {}
    return null;
  }

  async getAlerts() {
    return this.alertRepo.find({ order: { createdAt: 'DESC' }, take: 20 });
  }

  async getStats() {
    const logs = await this.logRepo.find({
      where: { agent: AgentName.COMPETITOR_MONITOR },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const alertCount = await this.alertRepo.count();
    return { recentRuns: logs, totalAlerts: alertCount };
  }
}
