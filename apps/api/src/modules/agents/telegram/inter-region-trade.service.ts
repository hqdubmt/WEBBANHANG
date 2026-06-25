import { Injectable, Logger } from '@nestjs/common';

export interface Trade {
  fromRegion: string;
  toRegion: string;
  resource: string;
  amount: number;
  timestamp: Date;
}

@Injectable()
export class InterRegionTradeService {
  private readonly logger = new Logger(InterRegionTradeService.name);

  trades: Trade[] = [];

  trade(from: string, to: string, resource: string, amount: number): void {
    if (amount <= 0) {
      this.logger.warn(`Invalid trade amount: ${amount}`);
      return;
    }
    const t: Trade = { fromRegion: from, toRegion: to, resource, amount, timestamp: new Date() };
    this.trades.push(t);
    this.logger.debug(`Trade: ${from} → ${to}, ${resource}=${amount}`);
  }

  getTradeVolume(regionId: string): number {
    return this.trades
      .filter(t => t.fromRegion === regionId || t.toRegion === regionId)
      .reduce((s, t) => s + t.amount, 0);
  }

  getTradeHistory(): Trade[] {
    return this.trades;
  }

  getStats() {
    const resourceVolumes: Record<string, number> = {};
    for (const t of this.trades) {
      resourceVolumes[t.resource] = (resourceVolumes[t.resource] ?? 0) + t.amount;
    }
    return {
      totalTrades: this.trades.length,
      totalVolume: this.trades.reduce((s, t) => s + t.amount, 0),
      byResource: resourceVolumes,
    };
  }
}
