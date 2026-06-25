import { Injectable, Logger } from '@nestjs/common';

interface DashboardSnapshot {
  revenuePerModel: Record<string, number>;
  bestChannel: string;
  topContent: string;
  systemHealth: number;
  updatedAt: Date;
}

@Injectable()
export class ExecutiveDashboardService {
  private readonly logger = new Logger(ExecutiveDashboardService.name);

  snapshot: DashboardSnapshot = {
    revenuePerModel: {
      affiliate: 5000,
      content: 3000,
      flashdeal: 7000,
      review: 2000,
    },
    bestChannel: 'telegram',
    topContent: 'flash-deal-banner',
    systemHealth: 0.87,
    updatedAt: new Date(),
  };

  updateSnapshot(data: Partial<DashboardSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...data, updatedAt: new Date() };
    this.logger.log('Dashboard snapshot updated');
  }

  getSnapshot(): DashboardSnapshot {
    return { ...this.snapshot };
  }

  generateReport(): string {
    const snap = this.snapshot;
    const totalRevenue = Object.values(snap.revenuePerModel).reduce((s, v) => s + v, 0);
    const topModel = Object.entries(snap.revenuePerModel).sort((a, b) => b[1] - a[1])[0];
    const lines = [
      `=== EXECUTIVE REPORT [${snap.updatedAt.toISOString()}] ===`,
      `Total Revenue: $${totalRevenue.toLocaleString()}`,
      `Top Model: ${topModel?.[0]} ($${topModel?.[1]?.toLocaleString()})`,
      `Best Channel: ${snap.bestChannel}`,
      `Top Content: ${snap.topContent}`,
      `System Health: ${(snap.systemHealth * 100).toFixed(1)}%`,
      `Revenue Breakdown: ${Object.entries(snap.revenuePerModel).map(([k, v]) => `${k}=$${v}`).join(', ')}`,
    ];
    return lines.join('\n');
  }

  getStats() {
    const snap = this.snapshot;
    const totalRevenue = Object.values(snap.revenuePerModel).reduce((s, v) => s + v, 0);
    return {
      totalRevenue,
      modelCount: Object.keys(snap.revenuePerModel).length,
      bestChannel: snap.bestChannel,
      systemHealth: snap.systemHealth,
      lastUpdate: snap.updatedAt,
    };
  }

  getStatus() {
    return { health: this.snapshot.systemHealth, updatedAt: this.snapshot.updatedAt };
  }
}
