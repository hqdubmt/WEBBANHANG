import { Injectable, Logger } from '@nestjs/common';

interface LearningEntry {
  strategyId: string;
  profitScore: number;
  failScore: number;
  netScore: number;
  updatedAt: number;
}

@Injectable()
export class StrategyLearningService {
  private readonly logger = new Logger(StrategyLearningService.name);

  private learnings: Map<string, LearningEntry> = new Map();
  private readonly keepThreshold = 0;
  private readonly profitDecay = 0.95;
  private readonly failDecay = 0.9;

  recordOutcome(strategyId: string, outcome: 'profit' | 'loss', magnitude: number): void {
    const existing = this.learnings.get(strategyId) ?? {
      strategyId,
      profitScore: 0,
      failScore: 0,
      netScore: 0,
      updatedAt: Date.now(),
    };

    // Decay old scores
    existing.profitScore *= this.profitDecay;
    existing.failScore *= this.failDecay;

    if (outcome === 'profit') {
      existing.profitScore += magnitude;
    } else {
      existing.failScore += magnitude;
    }

    existing.netScore = existing.profitScore - existing.failScore;
    existing.updatedAt = Date.now();
    this.learnings.set(strategyId, existing);
    this.logger.log(`Learning update ${strategyId}: net=${existing.netScore.toFixed(2)}`);
  }

  getRanking(): Array<{ strategyId: string; netScore: number }> {
    return [...this.learnings.values()]
      .map(e => ({ strategyId: e.strategyId, netScore: e.netScore }))
      .sort((a, b) => b.netScore - a.netScore);
  }

  shouldKeep(strategyId: string): boolean {
    const entry = this.learnings.get(strategyId);
    if (!entry) return true;
    return entry.netScore > this.keepThreshold;
  }

  getEntry(strategyId: string): LearningEntry | undefined {
    return this.learnings.get(strategyId);
  }

  getStats() {
    const ranking = this.getRanking();
    return {
      totalStrategies: this.learnings.size,
      topStrategy: ranking[0]?.strategyId ?? null,
      keepCount: [...this.learnings.keys()].filter(id => this.shouldKeep(id)).length,
      ranking: ranking.slice(0, 10),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
