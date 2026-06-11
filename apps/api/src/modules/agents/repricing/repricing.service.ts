import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { PriceAlert, PriceAction } from '../../../database/entities/price-alert.entity';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';

@Injectable()
export class RepricingService {
  private readonly logger = new Logger(RepricingService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    @InjectRepository(PriceAlert)
    private readonly alertRepo: Repository<PriceAlert>,
  ) {}

  // Tự động định giá lại mỗi 2h
  @Cron('0 */2 * * *')
  async runRepricing() {
    this.logger.log('Agent20 RepricingAgent: tự động định giá lại...');
    await this.reprice();
  }

  async reprice() {
    const log = this.logRepo.create({ agent: AgentName.REPRICING, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      // Lấy các cảnh báo giá chưa xử lý
      const alerts = await this.alertRepo.find({
        where: { isActedOn: false },
        take: 20,
        order: { createdAt: 'DESC' },
      });

      const actions: any[] = [];

      for (const alert of alerts) {
        const decision = await this.makeRepricingDecision(alert);
        if (decision && decision.newPrice) {
          actions.push({ alert: alert.id, productId: alert.productId, ...decision });
          // Đánh dấu alert đã xử lý
          await this.alertRepo.update(alert.id, { isActedOn: true });
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { processed: alerts.length, actions: actions.length, data: actions } as any,
        durationMs: Date.now() - startMs,
      });

      return { processed: alerts.length, actions };
    } catch (err: any) {
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: err.message,
        durationMs: Date.now() - startMs,
      });
      throw err;
    }
  }

  private async makeRepricingDecision(alert: PriceAlert) {
    const prompt = `Bạn là chuyên gia repricing (định giá lại) tự động.
Giá hiện tại: ${alert.ourPrice} VND
Giá đối thủ: ${alert.competitorPrice} VND
Platform đối thủ: ${alert.competitorPlatform}
Hành động gợi ý: ${alert.suggestedAction}
Lý do: ${alert.reason}

Quyết định repricing:
1. Giá mới đề xuất (số VND, không giảm quá 15% và không tăng quá 20%)
2. Lý do ngắn gọn

Trả lời JSON: { newPrice, reason, changePercent }`;

    try {
      const raw = await this.aiService.generate(prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}
    return null;
  }

  async getStats() {
    const logs = await this.logRepo.find({
      where: { agent: AgentName.REPRICING },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const pendingAlerts = await this.alertRepo.count({ where: { isActedOn: false } });
    return { recentRuns: logs, pendingAlerts };
  }
}
