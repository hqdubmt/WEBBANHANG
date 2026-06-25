import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChannelBalancerService {
  private readonly logger = new Logger(ChannelBalancerService.name);

  private weights: Map<string, number> = new Map([
    ['telegram', 0.33],
    ['facebook', 0.33],
    ['youtube', 0.34],
  ]);

  private ctrData: Map<string, number[]> = new Map();
  private rebalanceCount = 0;

  recordCtr(channel: string, ctr: number): void {
    if (!this.ctrData.has(channel)) this.ctrData.set(channel, []);
    const history = this.ctrData.get(channel)!;
    history.push(ctr);
    if (history.length > 20) history.shift();
  }

  rebalance(): Record<string, number> {
    const avgCtr: Map<string, number> = new Map();
    let totalCtr = 0;

    for (const [ch, data] of this.ctrData) {
      if (data.length === 0) continue;
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      avgCtr.set(ch, avg);
      totalCtr += avg;
    }

    if (totalCtr === 0) {
      const equal = 1 / this.weights.size;
      for (const ch of this.weights.keys()) this.weights.set(ch, equal);
    } else {
      for (const [ch, avg] of avgCtr) {
        this.weights.set(ch, avg / totalCtr);
      }
    }

    this.rebalanceCount++;
    this.logger.log(`Rebalanced channels: ${JSON.stringify(Object.fromEntries(this.weights))}`);
    return this.getWeights();
  }

  getWeights(): Record<string, number> {
    return Object.fromEntries(this.weights);
  }

  getStats() {
    const ctrSummary: Record<string, number> = {};
    for (const [ch, data] of this.ctrData) {
      ctrSummary[ch] = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    }
    return {
      weights: this.getWeights(),
      averageCtr: ctrSummary,
      rebalanceCount: this.rebalanceCount,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
