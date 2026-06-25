import { Injectable, Logger } from '@nestjs/common';

interface SurvivalMetrics {
  revenue: number;
  stability: number;
  scalability: number;
  efficiency: number;
}

interface SurvivalLogEntry {
  realityId: string;
  score: number;
  survived: boolean;
  timestamp: Date;
}

@Injectable()
export class RealitySurvivalEngineService {
  private readonly logger = new Logger(RealitySurvivalEngineService.name);
  private survivalScores: Map<string, number> = new Map();
  private survivalLog: SurvivalLogEntry[] = [];

  evaluateSurvival(realityId: string, metrics: SurvivalMetrics): number {
    const score =
      metrics.revenue * 0.4 +
      metrics.stability * 30 +
      metrics.scalability * 20 +
      metrics.efficiency * 10;

    const normalized = Math.min(100, Math.max(0, score / 100));
    this.survivalScores.set(realityId, normalized);
    this.survivalLog.push({
      realityId,
      score: parseFloat(normalized.toFixed(3)),
      survived: normalized >= 0.5,
      timestamp: new Date(),
    });

    this.logger.log(`Reality ${realityId} survival score: ${normalized.toFixed(3)}`);
    return normalized;
  }

  getSurvivors(threshold: number): string[] {
    return Array.from(this.survivalScores.entries())
      .filter(([, score]) => score >= threshold)
      .map(([id]) => id);
  }

  getEliminated(threshold: number): string[] {
    return Array.from(this.survivalScores.entries())
      .filter(([, score]) => score < threshold)
      .map(([id]) => id);
  }

  getStats() {
    const scores = Array.from(this.survivalScores.values());
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      totalEvaluated: this.survivalScores.size,
      survivors50pct: this.getSurvivors(0.5).length,
      eliminated50pct: this.getEliminated(0.5).length,
      avgScore: parseFloat(avg.toFixed(3)),
      logEntries: this.survivalLog.length,
    };
  }
}
