import { Injectable, Logger } from '@nestjs/common';

interface StrategyMemory {
  strategyId: string;
  revenue: number;
  ctr: number;
  conversion: number;
  result: 'success' | 'failure';
  learnedAt: number;
}

@Injectable()
export class StrategyMemoryService {
  private readonly logger = new Logger(StrategyMemoryService.name);

  private memories: StrategyMemory[] = [];
  private readonly maxSize = 500;

  store(memory: StrategyMemory): void {
    this.memories.push({ ...memory, learnedAt: memory.learnedAt ?? Date.now() });
    if (this.memories.length > this.maxSize) this.memories.shift();
    this.logger.log(`Memory stored: ${memory.strategyId} — ${memory.result}`);
  }

  getSuccessPatterns(): StrategyMemory[] {
    return this.memories.filter(m => m.result === 'success');
  }

  getFailurePatterns(): StrategyMemory[] {
    return this.memories.filter(m => m.result === 'failure');
  }

  getSimilar(revenue: number): StrategyMemory[] {
    const tolerance = revenue * 0.2;
    return this.memories.filter(m => Math.abs(m.revenue - revenue) <= tolerance);
  }

  getBestStrategyId(): string | null {
    const successes = this.getSuccessPatterns();
    if (successes.length === 0) return null;
    const byStrategy: Record<string, number> = {};
    for (const m of successes) {
      byStrategy[m.strategyId] = (byStrategy[m.strategyId] ?? 0) + m.revenue;
    }
    return Object.entries(byStrategy).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  }

  getStats() {
    const successes = this.getSuccessPatterns().length;
    const failures = this.getFailurePatterns().length;
    return {
      totalMemories: this.memories.length,
      successCount: successes,
      failureCount: failures,
      successRate: this.memories.length ? successes / this.memories.length : 0,
      bestStrategyId: this.getBestStrategyId(),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
