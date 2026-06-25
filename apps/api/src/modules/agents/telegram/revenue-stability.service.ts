import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RevenueStabilityService {
  private readonly logger = new Logger(RevenueStabilityService.name);

  dailyRevenue: number[] = [];
  private readonly windowSize = 7;
  private spikeThreshold = 2.0;
  private dropThreshold = 0.5;

  recordRevenue(amount: number): void {
    this.dailyRevenue.push(amount);
    if (this.dailyRevenue.length > this.windowSize) this.dailyRevenue.shift();
    this.logger.log(`Revenue recorded: ${amount}`);
  }

  private getAverage(): number {
    if (this.dailyRevenue.length === 0) return 0;
    return this.dailyRevenue.reduce((a, b) => a + b, 0) / this.dailyRevenue.length;
  }

  private getVariance(): number {
    if (this.dailyRevenue.length < 2) return 0;
    const avg = this.getAverage();
    const squaredDiffs = this.dailyRevenue.map(r => Math.pow(r - avg, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  }

  getStabilityScore(): number {
    if (this.dailyRevenue.length === 0) return 100;
    const avg = this.getAverage();
    if (avg === 0) return 0;
    const cv = Math.sqrt(this.getVariance()) / avg;
    return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  }

  detectSpike(): boolean {
    if (this.dailyRevenue.length < 2) return false;
    const avg = this.getAverage();
    const latest = this.dailyRevenue[this.dailyRevenue.length - 1];
    return latest > avg * this.spikeThreshold;
  }

  detectDrop(): boolean {
    if (this.dailyRevenue.length < 2) return false;
    const avg = this.getAverage();
    const latest = this.dailyRevenue[this.dailyRevenue.length - 1];
    return latest < avg * this.dropThreshold;
  }

  getStats() {
    return {
      windowSize: this.windowSize,
      dataPoints: this.dailyRevenue.length,
      average: Math.round(this.getAverage()),
      stabilityScore: this.getStabilityScore(),
      hasSpike: this.detectSpike(),
      hasDrop: this.detectDrop(),
      history: [...this.dailyRevenue],
    };
  }

  getStatus() {
    return this.getStats();
  }
}
