import { Injectable, Logger } from '@nestjs/common';

interface Arbitrage {
  from: string;
  to: string;
  resource: string;
  amount: number;
  expectedGain: number;
  timestamp: Date;
}

@Injectable()
export class ResourceArbitrageService {
  private readonly logger = new Logger(ResourceArbitrageService.name);
  private arbitrages: Arbitrage[] = [];

  findArbitrage(universeScores: Record<string, number>): Arbitrage[] {
    const entries = Object.entries(universeScores).sort(([, a], [, b]) => b - a);
    const found: Arbitrage[] = [];

    for (let i = 0; i < entries.length - 1; i++) {
      const [highId, highScore] = entries[i];
      const [lowId, lowScore] = entries[entries.length - 1 - i];
      if (highScore <= lowScore) break;

      const scoreDiff = highScore - lowScore;
      if (scoreDiff > 50) {
        const arb: Arbitrage = {
          from: lowId,
          to: highId,
          resource: 'traffic',
          amount: scoreDiff * 0.1,
          expectedGain: scoreDiff * 0.3,
          timestamp: new Date(),
        };
        found.push(arb);
      }
    }
    return found;
  }

  executeArbitrage(arb: Arbitrage): void {
    this.arbitrages.push({ ...arb, timestamp: new Date() });
    this.logger.log(
      `Arbitrage executed: ${arb.resource} ${arb.amount.toFixed(1)} from ${arb.from} -> ${arb.to}, gain=${arb.expectedGain.toFixed(1)}`,
    );
  }

  getHistory(): Arbitrage[] {
    return this.arbitrages;
  }

  getTotalGain(): number {
    return this.arbitrages.reduce((s, a) => s + a.expectedGain, 0);
  }

  getStats() {
    return {
      total: this.arbitrages.length,
      totalExpectedGain: this.getTotalGain(),
      lastArbitrage: this.arbitrages[this.arbitrages.length - 1] ?? null,
    };
  }
}
