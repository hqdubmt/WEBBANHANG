import { Injectable, Logger } from '@nestjs/common';

interface ReallocationEntry {
  from: string;
  to: string;
  amount: number;
  reason: string;
  timestamp: Date;
}

@Injectable()
export class EconomicReallocationService {
  private readonly logger = new Logger(EconomicReallocationService.name);

  reallocations: ReallocationEntry[] = [];

  reallocate(from: string, to: string, amount: number, reason: string): void {
    const entry: ReallocationEntry = { from, to, amount, reason, timestamp: new Date() };
    this.reallocations.push(entry);
    this.logger.log(`Reallocated ${amount} from ${from} to ${to}: ${reason}`);
  }

  autoRebalance(sectorScores: Record<string, number>): void {
    const entries = Object.entries(sectorScores).sort((a, b) => b[1] - a[1]);
    if (entries.length < 2) return;

    const [topSector] = entries[0];
    const weakSectors = entries.slice(-Math.ceil(entries.length / 2));

    for (const [weakSector, score] of weakSectors) {
      if (weakSector === topSector) continue;
      const amount = Math.round((1 - score) * 1000);
      if (amount > 0) {
        this.reallocate(weakSector, topSector, amount, `Auto-rebalance: score=${score.toFixed(2)}`);
      }
    }
  }

  getHistory(): ReallocationEntry[] {
    return [...this.reallocations];
  }

  getTotalReallocated(): number {
    return this.reallocations.reduce((s, r) => s + r.amount, 0);
  }

  getNetFlowBySector(): Record<string, number> {
    const flow: Record<string, number> = {};
    for (const r of this.reallocations) {
      flow[r.from] = (flow[r.from] ?? 0) - r.amount;
      flow[r.to] = (flow[r.to] ?? 0) + r.amount;
    }
    return flow;
  }

  getStats() {
    return {
      totalReallocations: this.reallocations.length,
      totalAmountMoved: this.getTotalReallocated(),
      netFlow: this.getNetFlowBySector(),
      recentReallocations: this.reallocations.slice(-5),
    };
  }

  getStatus() {
    return { total: this.reallocations.length };
  }
}
