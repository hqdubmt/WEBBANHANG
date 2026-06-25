import { Injectable, Logger } from '@nestjs/common';

export interface CivScore { id: string; score: number; revenue: number; stability: number; growthRate: number; efficiency: number; }

@Injectable()
export class CivilizationComparatorService {
  private readonly logger = new Logger(CivilizationComparatorService.name);
  private comparisons: Array<{ timestamp: Date; winner: string; scores: CivScore[] }> = [];

  compare(civs: Array<{ id: string; revenue: number; stability: number; growthRate: number; efficiency: number }>): CivScore[] {
    const scored = civs.map(c => ({
      ...c,
      score: c.revenue * 0.4 + c.stability * 0.25 + c.growthRate * 0.2 + c.efficiency * 0.15,
    }));
    scored.sort((a, b) => b.score - a.score);
    if (scored.length > 0) {
      this.comparisons.push({ timestamp: new Date(), winner: scored[0].id, scores: scored });
    }
    return scored;
  }

  getBestCiv(civIds: string[], revenues: Record<string, number>): string {
    let best = civIds[0];
    let bestRev = revenues[best] || 0;
    for (const id of civIds) {
      if ((revenues[id] || 0) > bestRev) { best = id; bestRev = revenues[id]; }
    }
    return best;
  }

  generateReport(): string {
    const last = this.comparisons[this.comparisons.length - 1];
    if (!last) return 'No comparisons yet';
    return `Winner: ${last.winner} | Total civs: ${last.scores.length} | Top score: ${last.scores[0]?.score.toFixed(2)}`;
  }

  getStats() {
    return { totalComparisons: this.comparisons.length, lastComparison: this.comparisons[this.comparisons.length - 1] };
  }
}
