import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EvolutionAmplifierService {
  private readonly logger = new Logger(EvolutionAmplifierService.name);
  private cycleMs: number = 3600000;
  private feedbackLatencyMs: number = 1800000;
  private amplifyHistory: Array<{ timestamp: Date; fromMs: number; toMs: number }> = [];
  private readonly minCycleMs = 300000;

  amplify(): void {
    const from = this.cycleMs;
    this.cycleMs = Math.max(this.minCycleMs, Math.floor(this.cycleMs * 0.7));
    this.feedbackLatencyMs = Math.max(60000, Math.floor(this.feedbackLatencyMs * 0.7));
    this.amplifyHistory.push({ timestamp: new Date(), fromMs: from, toMs: this.cycleMs });
    this.logger.log(`Evolution amplified: ${from}ms → ${this.cycleMs}ms`);
  }

  resetAmplification(): void {
    this.cycleMs = 3600000;
    this.feedbackLatencyMs = 1800000;
  }

  getSettings(): { cycleMs: number; feedbackLatencyMs: number; speedupFactor: number } {
    return { cycleMs: this.cycleMs, feedbackLatencyMs: this.feedbackLatencyMs, speedupFactor: 3600000 / this.cycleMs };
  }

  getStats() {
    return { amplifications: this.amplifyHistory.length, current: this.getSettings(), history: this.amplifyHistory.slice(-5) };
  }
}
