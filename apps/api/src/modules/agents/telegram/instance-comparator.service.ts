import { Injectable, Logger } from '@nestjs/common';

interface CompareInput {
  id: string;
  revenue: number;
  ctr: number;
  conversion: number;
  stability?: number;
}

interface CompareResult {
  id: string;
  score: number;
}

interface ComparisonRecord {
  timestamp: Date;
  winner: string;
  scores: CompareResult[];
}

@Injectable()
export class InstanceComparatorService {
  private readonly logger = new Logger(InstanceComparatorService.name);

  comparisons: ComparisonRecord[] = [];

  compare(instances: CompareInput[]): CompareResult[] {
    const results: CompareResult[] = instances.map(inst => {
      const revenueScore = inst.revenue * 0.5;
      const ctrScore = inst.ctr * 100 * 0.3;
      const convScore = inst.conversion * 100 * 0.15;
      const stabScore = (inst.stability ?? 50) * 0.05;
      return { id: inst.id, score: revenueScore + ctrScore + convScore + stabScore };
    });

    results.sort((a, b) => b.score - a.score);

    if (results.length > 0) {
      this.comparisons.push({ timestamp: new Date(), winner: results[0].id, scores: results });
    }
    return results;
  }

  getBestInstance(instanceIds: string[]): string {
    if (instanceIds.length === 0) return '';
    // Find most recent comparison where one of these ids won
    for (let i = this.comparisons.length - 1; i >= 0; i--) {
      const comp = this.comparisons[i];
      const ranked = comp.scores.filter(s => instanceIds.includes(s.id));
      if (ranked.length > 0) {
        ranked.sort((a, b) => b.score - a.score);
        return ranked[0].id;
      }
    }
    return instanceIds[0];
  }

  generateComparisonReport(instances: Array<{ id: string; revenue: number; ctr: number }>): string {
    const sorted = [...instances].sort((a, b) => b.revenue - a.revenue);
    const lines = sorted.map(
      (i, idx) => `${idx + 1}. ${i.id} — revenue: ${i.revenue.toFixed(2)}, ctr: ${(i.ctr * 100).toFixed(2)}%`,
    );
    return `Comparison Report (${new Date().toISOString()}):\n${lines.join('\n')}`;
  }

  getStats() {
    return {
      totalComparisons: this.comparisons.length,
      lastWinner: this.comparisons.at(-1)?.winner ?? null,
      lastTimestamp: this.comparisons.at(-1)?.timestamp ?? null,
    };
  }
}
