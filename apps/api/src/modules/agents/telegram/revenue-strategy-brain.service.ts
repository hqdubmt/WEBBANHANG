import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface Strategy {
  id: string;
  name: string;
  roi: number;
  stability: number;
  active: boolean;
}

@Injectable()
export class RevenueStrategyBrainService {
  private readonly logger = new Logger(RevenueStrategyBrainService.name);

  private strategies: Map<string, Strategy> = new Map([
    ['discount_heavy', { id: 'discount_heavy', name: 'Heavy Discount Push', roi: 0.15, stability: 0.6, active: true }],
    ['review_focus', { id: 'review_focus', name: 'Review Content Focus', roi: 0.22, stability: 0.8, active: true }],
    ['urgency_flash', { id: 'urgency_flash', name: 'Flash Sale Urgency', roi: 0.18, stability: 0.5, active: true }],
    ['evergreen', { id: 'evergreen', name: 'Evergreen Products', roi: 0.12, stability: 0.95, active: true }],
  ]);

  analyzeSystem(): { effectiveStrategies: string[]; ineffectiveStrategies: string[] } {
    const effective: string[] = [];
    const ineffective: string[] = [];
    for (const [id, s] of this.strategies) {
      if (s.active && s.roi > 0.15 && s.stability > 0.6) effective.push(id);
      else ineffective.push(id);
    }
    return { effectiveStrategies: effective, ineffectiveStrategies: ineffective };
  }

  evaluateROI(strategyId: string): number {
    const s = this.strategies.get(strategyId);
    if (!s) return 0;
    return Math.round(s.roi * 100);
  }

  selectBestStrategy(): string {
    let best: Strategy | null = null;
    for (const s of this.strategies.values()) {
      if (!s.active) continue;
      if (!best || s.roi * s.stability > best.roi * best.stability) best = s;
    }
    return best?.id ?? 'evergreen';
  }

  upsertStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  @Cron('0 2 * * *')
  dailyAnalysis(): void {
    const best = this.selectBestStrategy();
    const analysis = this.analyzeSystem();
    this.logger.log(`Daily analysis — best: ${best}, effective: ${analysis.effectiveStrategies.length}, ineffective: ${analysis.ineffectiveStrategies.length}`);
  }

  getStats() {
    return {
      totalStrategies: this.strategies.size,
      activeStrategies: [...this.strategies.values()].filter(s => s.active).length,
      bestStrategy: this.selectBestStrategy(),
      analysis: this.analyzeSystem(),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
