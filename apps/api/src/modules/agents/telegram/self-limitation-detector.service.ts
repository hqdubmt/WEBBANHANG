import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SelfLimitationDetectorService {
  private readonly logger = new Logger(SelfLimitationDetectorService.name);
  private plateauThreshold: number = 0.01;
  private recentGrowth: number[] = [];
  private breakouts: Array<{ timestamp: Date; reason: string }> = [];

  recordGrowth(rate: number): void {
    this.recentGrowth.push(rate);
    if (this.recentGrowth.length > 20) this.recentGrowth.shift();
  }

  detectPlateau(): boolean {
    if (this.recentGrowth.length < 5) return false;
    const recent = this.recentGrowth.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return Math.abs(avg) < this.plateauThreshold;
  }

  detectLogicLoop(): boolean {
    if (this.recentGrowth.length < 10) return false;
    const last10 = this.recentGrowth.slice(-10);
    const variance = last10.reduce((acc, v) => { const m = last10.reduce((a, b) => a + b) / 10; return acc + (v - m) ** 2; }, 0) / 10;
    return variance < 0.0001;
  }

  triggerBreakout(): void {
    const reason = this.detectPlateau() ? 'plateau' : 'logic_loop';
    this.breakouts.push({ timestamp: new Date(), reason });
    this.recentGrowth = [];
    this.logger.log(`Breakout triggered: ${reason}`);
  }

  getStats() {
    return { plateau: this.detectPlateau(), logicLoop: this.detectLogicLoop(), breakouts: this.breakouts.length, growthSamples: this.recentGrowth.length };
  }
}
