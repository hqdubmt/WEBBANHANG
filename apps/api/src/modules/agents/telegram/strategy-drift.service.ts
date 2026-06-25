import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StrategyDriftService {
  private readonly logger = new Logger(StrategyDriftService.name);

  private strategyScores: Map<string, number[]> = new Map();
  private readonly windowSize = 10;
  private readonly driftThreshold = 0.15;
  private readonly saturationThreshold = 0.05;

  recordScore(strategyId: string, score: number): void {
    if (!this.strategyScores.has(strategyId)) this.strategyScores.set(strategyId, []);
    const scores = this.strategyScores.get(strategyId)!;
    scores.push(score);
    if (scores.length > this.windowSize) scores.shift();
  }

  detectDrift(strategyId: string): boolean {
    const scores = this.strategyScores.get(strategyId);
    if (!scores || scores.length < 4) return false;
    const half = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, half);
    const secondHalf = scores.slice(half);
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const drift = avg1 > 0 ? (avg1 - avg2) / avg1 : 0;
    return drift > this.driftThreshold;
  }

  detectSaturation(strategyId: string): boolean {
    const scores = this.strategyScores.get(strategyId);
    if (!scores || scores.length < 4) return false;
    const recent = scores.slice(-4);
    const maxDiff = Math.max(...recent) - Math.min(...recent);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return avg > 0 && maxDiff / avg < this.saturationThreshold;
  }

  getDriftReport(): Record<string, boolean> {
    const report: Record<string, boolean> = {};
    for (const id of this.strategyScores.keys()) {
      report[id] = this.detectDrift(id);
    }
    return report;
  }

  getStats() {
    const driftReport = this.getDriftReport();
    const driftingCount = Object.values(driftReport).filter(Boolean).length;
    const saturationReport: Record<string, boolean> = {};
    for (const id of this.strategyScores.keys()) saturationReport[id] = this.detectSaturation(id);
    return {
      trackedStrategies: this.strategyScores.size,
      driftingCount,
      driftReport,
      saturationReport,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
