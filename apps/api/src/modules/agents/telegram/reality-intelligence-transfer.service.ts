import { Injectable, Logger } from '@nestjs/common';

interface Transfer {
  fromReality: string;
  toReality: string;
  insight: string;
  metric: string;
  value: number;
  timestamp: Date;
}

@Injectable()
export class RealityIntelligenceTransferService {
  private readonly logger = new Logger(RealityIntelligenceTransferService.name);
  private transfers: Transfer[] = [];

  transfer(from: string, to: string, insight: string, metric: string, value: number): void {
    const t: Transfer = {
      fromReality: from,
      toReality: to,
      insight,
      metric,
      value,
      timestamp: new Date(),
    };
    this.transfers.push(t);
    this.logger.log(`Intelligence transfer: ${from} → ${to} [${metric}=${value}] "${insight}"`);
  }

  getKnowledgeMap(): Record<string, Transfer[]> {
    const map: Record<string, Transfer[]> = {};
    for (const t of this.transfers) {
      if (!map[t.toReality]) map[t.toReality] = [];
      map[t.toReality].push(t);
    }
    return map;
  }

  getBestInsight(realityId: string): Transfer | undefined {
    const incoming = this.transfers.filter(t => t.toReality === realityId);
    if (incoming.length === 0) return undefined;
    return incoming.reduce((best, t) => (t.value > best.value ? t : best), incoming[0]);
  }

  getStats() {
    const uniqueFrom = new Set(this.transfers.map(t => t.fromReality)).size;
    const uniqueTo = new Set(this.transfers.map(t => t.toReality)).size;
    const avgValue =
      this.transfers.length > 0
        ? parseFloat((this.transfers.reduce((s, t) => s + t.value, 0) / this.transfers.length).toFixed(3))
        : 0;
    return {
      totalTransfers: this.transfers.length,
      uniqueSourceRealities: uniqueFrom,
      uniqueTargetRealities: uniqueTo,
      avgInsightValue: avgValue,
    };
  }
}
