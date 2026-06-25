import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface BusinessEntry {
  revenue: number;
  cost: number;
  stability: number;
  growth: number;
}

@Injectable()
export class AiCeoBrainService {
  private readonly logger = new Logger(AiCeoBrainService.name);

  businessMap: Map<string, BusinessEntry> = new Map([
    ['affiliate', { revenue: 5000, cost: 800, stability: 0.85, growth: 0.12 }],
    ['content', { revenue: 3000, cost: 400, stability: 0.78, growth: 0.20 }],
    ['flashdeal', { revenue: 7000, cost: 1500, stability: 0.65, growth: 0.30 }],
    ['review', { revenue: 2000, cost: 200, stability: 0.90, growth: 0.08 }],
  ]);

  observeSystem(): { totalRevenue: number; bestModel: string; worstModel: string } {
    let totalRevenue = 0;
    let bestModel = '';
    let worstModel = '';
    let bestScore = -Infinity;
    let worstScore = Infinity;

    for (const [id, data] of this.businessMap) {
      totalRevenue += data.revenue;
      const score = data.revenue - data.cost + data.growth * 1000;
      if (score > bestScore) { bestScore = score; bestModel = id; }
      if (score < worstScore) { worstScore = score; worstModel = id; }
    }

    return { totalRevenue, bestModel, worstModel };
  }

  evaluateModel(modelId: string): 'SCALE' | 'MAINTAIN' | 'DOWNGRADE' | 'STOP' {
    const m = this.businessMap.get(modelId);
    if (!m) return 'STOP';
    const roi = (m.revenue - m.cost) / (m.cost || 1);
    if (roi > 3 && m.growth > 0.15) return 'SCALE';
    if (roi > 1.5) return 'MAINTAIN';
    if (roi > 0.5) return 'DOWNGRADE';
    return 'STOP';
  }

  makeDecision(): Array<{ model: string; action: string }> {
    const decisions: Array<{ model: string; action: string }> = [];
    for (const [id] of this.businessMap) {
      decisions.push({ model: id, action: this.evaluateModel(id) });
    }
    return decisions;
  }

  @Cron('0 0 * * *')
  dailyCeoLoop(): void {
    const obs = this.observeSystem();
    const decisions = this.makeDecision();
    this.logger.log(`[CEO] Total revenue: ${obs.totalRevenue} | Best: ${obs.bestModel} | Worst: ${obs.worstModel}`);
    for (const d of decisions) {
      this.logger.log(`[CEO] Model ${d.model} → ${d.action}`);
    }
  }

  getStats() {
    const obs = this.observeSystem();
    return {
      totalModels: this.businessMap.size,
      totalRevenue: obs.totalRevenue,
      bestModel: obs.bestModel,
      worstModel: obs.worstModel,
      decisions: this.makeDecision(),
    };
  }

  getStatus() {
    return { running: true, models: this.businessMap.size };
  }
}
