import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface Decision {
  action: 'SELECT' | 'SCALE' | 'KILL';
  strategyId: string;
  timestamp: number;
  reason: string;
}

@Injectable()
export class StrategyCeoService {
  private readonly logger = new Logger(StrategyCeoService.name);

  currentStrategy = 'default';
  private killedStrategies: Set<string> = new Set();
  private scaledStrategies: Set<string> = new Set();
  decisions: Decision[] = [];

  selectDailyStrategy(strategies: Record<string, number>): string {
    let best = 'default';
    let bestScore = -Infinity;
    for (const [id, score] of Object.entries(strategies)) {
      if (!this.killedStrategies.has(id) && score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    this.currentStrategy = best;
    this.decisions.push({ action: 'SELECT', strategyId: best, timestamp: Date.now(), reason: `highest score: ${bestScore}` });
    if (this.decisions.length > 200) this.decisions.shift();
    this.logger.log(`CEO selected strategy: ${best} (score: ${bestScore})`);
    return best;
  }

  scaleStrategy(id: string): void {
    this.scaledStrategies.add(id);
    this.decisions.push({ action: 'SCALE', strategyId: id, timestamp: Date.now(), reason: 'manual scale up' });
    this.logger.log(`Strategy scaled: ${id}`);
  }

  killStrategy(id: string): void {
    this.killedStrategies.add(id);
    this.scaledStrategies.delete(id);
    if (this.currentStrategy === id) this.currentStrategy = 'default';
    this.decisions.push({ action: 'KILL', strategyId: id, timestamp: Date.now(), reason: 'manual kill' });
    this.logger.warn(`Strategy killed: ${id}`);
  }

  @Cron('0 6 * * *')
  dailyDecision(): void {
    this.logger.log(`Daily CEO check — current: ${this.currentStrategy}, killed: ${this.killedStrategies.size}, scaled: ${this.scaledStrategies.size}`);
  }

  getStats() {
    return {
      currentStrategy: this.currentStrategy,
      killedCount: this.killedStrategies.size,
      scaledCount: this.scaledStrategies.size,
      totalDecisions: this.decisions.length,
      recentDecisions: this.decisions.slice(-5),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
