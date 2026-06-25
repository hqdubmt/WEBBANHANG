import { Injectable, Logger } from '@nestjs/common';

interface EventRecord {
  hour: number;
  product: string;
  channel: string;
  revenue: number;
}

@Injectable()
export class PatternMiningService {
  private readonly logger = new Logger(PatternMiningService.name);

  private events: EventRecord[] = [];
  private readonly maxEvents = 1000;

  record(hour: number, product: string, channel: string, revenue: number): void {
    this.events.push({ hour, product, channel, revenue });
    if (this.events.length > this.maxEvents) this.events.shift();
  }

  getBestHour(): number {
    if (this.events.length === 0) return 20;
    const hourRevenue: Record<number, number> = {};
    for (const e of this.events) {
      hourRevenue[e.hour] = (hourRevenue[e.hour] ?? 0) + e.revenue;
    }
    const best = Object.entries(hourRevenue).sort(([, a], [, b]) => b - a)[0];
    return best ? Number(best[0]) : 20;
  }

  getBestChannel(): string {
    if (this.events.length === 0) return 'telegram';
    const channelRevenue: Record<string, number> = {};
    for (const e of this.events) {
      channelRevenue[e.channel] = (channelRevenue[e.channel] ?? 0) + e.revenue;
    }
    return Object.entries(channelRevenue).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'telegram';
  }

  getBestProductType(): string {
    if (this.events.length === 0) return 'electronics';
    const productRevenue: Record<string, number> = {};
    for (const e of this.events) {
      productRevenue[e.product] = (productRevenue[e.product] ?? 0) + e.revenue;
    }
    return Object.entries(productRevenue).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'electronics';
  }

  minePatterns(): { bestHour: number; bestChannel: string; bestProduct: string } {
    const result = {
      bestHour: this.getBestHour(),
      bestChannel: this.getBestChannel(),
      bestProduct: this.getBestProductType(),
    };
    this.logger.log(`Patterns mined: hour=${result.bestHour} ch=${result.bestChannel} prod=${result.bestProduct}`);
    return result;
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      uniqueChannels: new Set(this.events.map(e => e.channel)).size,
      uniqueProducts: new Set(this.events.map(e => e.product)).size,
      patterns: this.events.length > 0 ? this.minePatterns() : null,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
