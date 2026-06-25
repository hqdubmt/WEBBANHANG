import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RealityDriftInjectorService {
  private readonly logger = new Logger(RealityDriftInjectorService.name);
  private drifts: Array<{ type: string; magnitude: number; timestamp: Date }> = [];

  injectDrift(type: string, magnitude: number): void {
    this.drifts.push({ type, magnitude, timestamp: new Date() });
    this.logger.log(`Drift injected: ${type} magnitude=${magnitude.toFixed(3)}`);
  }

  applyDrift(systemState: Record<string, number>): Record<string, number> {
    const totalDrift = this.getTotalDriftMagnitude();
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(systemState)) {
      result[k] = v * (1 + totalDrift * 0.01 * (Math.random() - 0.5));
    }
    return result;
  }

  getTotalDriftMagnitude(): number {
    return this.drifts.reduce((sum, d) => sum + d.magnitude, 0);
  }

  @Cron('0 */6 * * *')
  driftInjection(): void {
    const types = ['temporal', 'behavioral', 'structural', 'probabilistic'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.injectDrift(type, Math.random() * 0.1);
    this.logger.log(`Scheduled drift injection: ${this.drifts.length} total drifts`);
  }

  getStats() { return { totalDrifts: this.drifts.length, totalMagnitude: this.getTotalDriftMagnitude(), lastDrift: this.drifts[this.drifts.length - 1] }; }
}
