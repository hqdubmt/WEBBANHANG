import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AntiMetricService {
  private readonly logger = new Logger(AntiMetricService.name);
  private removedMetrics: Set<string> = new Set();
  private rawOutcomes: number[] = [];

  removeMetric(name: string): void {
    this.removedMetrics.add(name);
    this.logger.log(`Metric removed: ${name}`);
  }

  restoreMetric(name: string): void {
    this.removedMetrics.delete(name);
    this.logger.log(`Metric restored: ${name}`);
  }

  getRealOutcome(): { rawRevenueDelta: number } {
    if (this.rawOutcomes.length < 2) return { rawRevenueDelta: 0 };
    const last = this.rawOutcomes[this.rawOutcomes.length - 1];
    const prev = this.rawOutcomes[this.rawOutcomes.length - 2];
    return { rawRevenueDelta: last - prev };
  }

  recordRawOutcome(value: number): void {
    this.rawOutcomes.push(value);
    if (this.rawOutcomes.length > 100) this.rawOutcomes.shift();
  }

  getStats() { return { removedMetrics: Array.from(this.removedMetrics), outcome: this.getRealOutcome(), rawSamples: this.rawOutcomes.length }; }
}
