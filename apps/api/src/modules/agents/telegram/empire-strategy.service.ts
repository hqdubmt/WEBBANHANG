import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface EmpireStrategy {
  focusSectors: string[];
  exitSectors: string[];
  coreRevChannel: string;
  horizon: number;
}

interface StrategyHistoryEntry {
  strategy: EmpireStrategy;
  adoptedAt: Date;
}

@Injectable()
export class EmpireStrategyService {
  private readonly logger = new Logger(EmpireStrategyService.name);

  currentStrategy: EmpireStrategy = {
    focusSectors: ['affiliate', 'flashdeal'],
    exitSectors: [],
    coreRevChannel: 'telegram',
    horizon: 30,
  };

  strategyHistory: StrategyHistoryEntry[] = [];

  setStrategy(strategy: Partial<EmpireStrategy>): void {
    const prev = { ...this.currentStrategy };
    this.currentStrategy = { ...this.currentStrategy, ...strategy };
    this.strategyHistory.push({ strategy: prev, adoptedAt: new Date() });
    this.logger.log(`Strategy updated: focus=[${this.currentStrategy.focusSectors.join(',')}] exit=[${this.currentStrategy.exitSectors.join(',')}]`);
  }

  generateStrategy(sectorScores: Record<string, number>): EmpireStrategy {
    const entries = Object.entries(sectorScores).sort((a, b) => b[1] - a[1]);
    const topHalf = entries.slice(0, Math.ceil(entries.length / 2));
    const bottomHalf = entries.slice(Math.ceil(entries.length / 2));

    const focusSectors = topHalf.map(([sector]) => sector);
    const exitSectors = bottomHalf.filter(([, score]) => score < 0.3).map(([sector]) => sector);

    const channelScores: Record<string, number> = {
      telegram: 0.85,
      facebook: 0.75,
      youtube: 0.60,
    };
    const coreRevChannel = Object.entries(channelScores).sort((a, b) => b[1] - a[1])[0][0];

    const avgScore = entries.length ? entries.reduce((s, [, v]) => s + v, 0) / entries.length : 0.5;
    const horizon = avgScore > 0.7 ? 90 : avgScore > 0.5 ? 30 : 14;

    const strategy: EmpireStrategy = { focusSectors, exitSectors, coreRevChannel, horizon };
    this.setStrategy(strategy);
    return strategy;
  }

  getStrategy(): EmpireStrategy {
    return { ...this.currentStrategy };
  }

  @Cron('0 0 */7 * *')
  weeklyStrategy(): void {
    this.logger.log('[EmpireStrategy] Running weekly strategy evaluation');
    const defaultScores: Record<string, number> = {
      affiliate: 0.82,
      flashdeal: 0.91,
      content: 0.65,
      ads: 0.40,
    };
    const strategy = this.generateStrategy(defaultScores);
    this.logger.log(`[EmpireStrategy] New strategy: focus=${strategy.focusSectors.join(',')} exit=${strategy.exitSectors.join(',')}`);
  }

  getStats() {
    return {
      currentFocus: this.currentStrategy.focusSectors,
      exitSectors: this.currentStrategy.exitSectors,
      coreChannel: this.currentStrategy.coreRevChannel,
      horizon: this.currentStrategy.horizon,
      strategyRevisions: this.strategyHistory.length,
    };
  }

  getStatus() {
    return { strategy: this.currentStrategy, historyCount: this.strategyHistory.length };
  }
}
