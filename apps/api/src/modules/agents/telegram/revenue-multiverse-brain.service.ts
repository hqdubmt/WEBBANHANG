import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface Universe {
  id: string;
  type: string;
  revenue: number;
  stability: number;
  growthRate: number;
  status: 'active' | 'dead' | 'scaling';
}

@Injectable()
export class RevenueMultiverseBrainService {
  private readonly logger = new Logger(RevenueMultiverseBrainService.name);
  private universes: Map<string, Universe> = new Map();

  manageUniverses(): { scaled: string[]; killed: string[]; created: string[] } {
    const scaled: string[] = [];
    const killed: string[] = [];
    const created: string[] = [];

    for (const [id, u] of this.universes) {
      if (u.status === 'dead') continue;
      if (u.revenue > 1000 && u.stability > 0.7 && u.growthRate > 0.05) {
        u.status = 'scaling';
        scaled.push(id);
      } else if (u.stability < 0.2 || u.revenue < 0) {
        u.status = 'dead';
        killed.push(id);
      }
    }

    const newId = `universe-${Date.now()}`;
    this.universes.set(newId, {
      id: newId,
      type: 'experimental',
      revenue: 0,
      stability: 0.8,
      growthRate: 0.1,
      status: 'active',
    });
    created.push(newId);

    return { scaled, killed, created };
  }

  getBestUniverse(): string {
    let best = '';
    let bestScore = -Infinity;
    for (const [id, u] of this.universes) {
      if (u.status === 'dead') continue;
      const score = u.revenue * u.stability * (1 + u.growthRate);
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }

  seedUniverse(id: string, type: string): void {
    this.universes.set(id, {
      id,
      type,
      revenue: Math.random() * 500,
      stability: 0.5 + Math.random() * 0.5,
      growthRate: Math.random() * 0.2,
      status: 'active',
    });
  }

  @Cron('0 2 * * *')
  multiverseLoop(): void {
    this.logger.log('Multiverse loop running');
    const result = this.manageUniverses();
    this.logger.log(`Scaled: ${result.scaled.length}, Killed: ${result.killed.length}, Created: ${result.created.length}`);
  }

  getStats() {
    const active = [...this.universes.values()].filter(u => u.status !== 'dead').length;
    return {
      total: this.universes.size,
      active,
      dead: this.universes.size - active,
      best: this.getBestUniverse(),
    };
  }
}
