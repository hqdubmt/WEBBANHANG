import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UniverseRankingService {
  private readonly logger = new Logger(UniverseRankingService.name);
  private scores: Map<string, number> = new Map();

  updateScore(
    universeId: string,
    revenue: number,
    stability: number,
    growth: number,
    efficiency: number,
  ): void {
    const score =
      revenue * 0.4 +
      stability * 100 * 0.2 +
      growth * 100 * 0.2 +
      efficiency * 100 * 0.2;
    this.scores.set(universeId, score);
    this.logger.log(`Updated score for ${universeId}: ${score.toFixed(2)}`);
  }

  getRanking(): Array<{ id: string; score: number }> {
    return [...this.scores.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);
  }

  getTopN(n: number): Array<{ id: string; score: number }> {
    return this.getRanking().slice(0, n);
  }

  getScore(universeId: string): number {
    return this.scores.get(universeId) ?? 0;
  }

  removeUniverse(universeId: string): void {
    this.scores.delete(universeId);
  }

  getStats() {
    const all = this.getRanking();
    const total = all.reduce((s, r) => s + r.score, 0);
    return {
      count: all.length,
      top: all[0] ?? null,
      avgScore: all.length ? total / all.length : 0,
    };
  }
}
