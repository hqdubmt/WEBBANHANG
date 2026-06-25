import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface SystemEntry {
  type: string;
  revenuePotential: number;
  active: boolean;
}

@Injectable()
export class UltimateMetaOriginBrainService {
  private readonly logger = new Logger(UltimateMetaOriginBrainService.name);
  private systemPool: SystemEntry[] = [];

  observeAllSystems(): { totalSystems: number; topSystem: SystemEntry | null; avgPotential: number } {
    const active = this.systemPool.filter(s => s.active);
    const top = active.reduce<SystemEntry | null>((b, s) => (!b || s.revenuePotential > b.revenuePotential ? s : b), null);
    const avg = active.length > 0 ? active.reduce((s, e) => s + e.revenuePotential, 0) / active.length : 0;
    return {
      totalSystems: active.length,
      topSystem: top,
      avgPotential: parseFloat(avg.toFixed(2)),
    };
  }

  generateSystemClass(type: string): { type: string; revenuePotential: number; rules: Record<string, any> } {
    const entry: SystemEntry = {
      type,
      revenuePotential: Math.random() * 10000 + 1000,
      active: true,
    };
    this.systemPool.push(entry);

    return {
      type: entry.type,
      revenuePotential: parseFloat(entry.revenuePotential.toFixed(2)),
      rules: {
        autoScale: true,
        minConversionRate: 0.02,
        maxBudget: entry.revenuePotential * 0.3,
        evolutionEnabled: true,
      },
    };
  }

  destroyOutdatedSystems(): number {
    const threshold = 2000;
    let count = 0;
    for (const sys of this.systemPool) {
      if (sys.active && sys.revenuePotential < threshold) {
        sys.active = false;
        count++;
      }
    }
    this.logger.log(`Destroyed ${count} outdated systems below threshold ${threshold}`);
    return count;
  }

  @Cron('0 0 * * *')
  metaOriginLoop(): void {
    this.logger.log('MetaOriginBrain: daily observation loop');
    const obs = this.observeAllSystems();
    this.logger.log(`Total active: ${obs.totalSystems}, avgPotential: ${obs.avgPotential}`);
    this.destroyOutdatedSystems();
  }

  getStats() {
    const obs = this.observeAllSystems();
    return {
      poolSize: this.systemPool.length,
      activeSystems: obs.totalSystems,
      avgPotential: obs.avgPotential,
      topSystemType: obs.topSystem?.type ?? null,
    };
  }
}
