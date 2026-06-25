import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface CivRecord {
  type: string;
  revenue: number;
  startedAt: Date;
}

@Injectable()
export class CivilizationOrchestratorService {
  private readonly logger = new Logger(CivilizationOrchestratorService.name);

  runningCivs: Map<string, CivRecord> = new Map();

  startCivilization(type: 'affiliate' | 'content' | 'experimental'): string {
    const id = `civ-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.runningCivs.set(id, { type, revenue: 0, startedAt: new Date() });
    this.logger.log(`Started civilization ${id} (${type})`);
    return id;
  }

  stopCivilization(id: string): void {
    if (this.runningCivs.has(id)) {
      this.runningCivs.delete(id);
      this.logger.log(`Stopped civilization ${id}`);
    }
  }

  getCivStatus(id: string): any {
    const civ = this.runningCivs.get(id);
    if (!civ) return null;
    const uptimeMs = Date.now() - civ.startedAt.getTime();
    return {
      id,
      type: civ.type,
      revenue: civ.revenue,
      startedAt: civ.startedAt,
      uptimeHours: (uptimeMs / 3_600_000).toFixed(2),
    };
  }

  @Cron('0 5 * * *')
  orchestratorLoop() {
    this.logger.log('Orchestrator loop triggered');
    // Simulate revenue ticks
    for (const [id, civ] of this.runningCivs.entries()) {
      const tick = Math.random() * 50;
      civ.revenue += tick;
      this.logger.debug(`Civ ${id} revenue tick +${tick.toFixed(2)}`);
    }
    // Auto-start missing types if all are absent
    const types = Array.from(this.runningCivs.values()).map(c => c.type);
    if (!types.includes('affiliate')) {
      this.startCivilization('affiliate');
    }
  }

  getStats() {
    const all = Array.from(this.runningCivs.values());
    return {
      running: this.runningCivs.size,
      totalRevenue: all.reduce((s, c) => s + c.revenue, 0),
      byType: {
        affiliate: all.filter(c => c.type === 'affiliate').length,
        content: all.filter(c => c.type === 'content').length,
        experimental: all.filter(c => c.type === 'experimental').length,
      },
    };
  }
}
