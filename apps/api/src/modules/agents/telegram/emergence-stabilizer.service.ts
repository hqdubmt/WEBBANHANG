import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmergenceStabilizerService {
  private readonly logger = new Logger(EmergenceStabilizerService.name);
  private noise: number = 0;
  private stabilityScore: number = 100;
  private stabilityLog: Array<{ score: number; timestamp: Date }> = [];

  recordNoise(level: number): void {
    this.noise = Math.max(0, this.noise + level);
    this.stabilityScore = Math.max(0, 100 - this.noise * 10);
    this.stabilityLog.push({ score: this.stabilityScore, timestamp: new Date() });
  }

  stabilize(): void {
    this.noise = Math.max(0, this.noise * 0.5);
    this.stabilityScore = Math.min(100, this.stabilityScore + 10);
    this.logger.log(`Stabilizing: noise=${this.noise.toFixed(2)}, score=${this.stabilityScore.toFixed(1)}`);
  }

  preventCollapse(): void {
    if (this.stabilityScore < 20) {
      this.noise = 0;
      this.stabilityScore = 50;
      this.logger.log('Collapse prevention triggered — stabilityScore reset to 50');
    }
  }

  isStable(): boolean { return this.stabilityScore > 60; }

  getStats() { return { noise: this.noise, stabilityScore: this.stabilityScore, stable: this.isStable(), log: this.stabilityLog.slice(-5) }; }
}
