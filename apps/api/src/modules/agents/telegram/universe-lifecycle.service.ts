import { Injectable, Logger } from '@nestjs/common';

type Phase = 'birth' | 'growth' | 'saturation' | 'decline' | 'death';

interface LifecycleEntry {
  phase: Phase;
  enteredAt: Date;
  revenue: number;
}

const PHASE_ORDER: Phase[] = ['birth', 'growth', 'saturation', 'decline', 'death'];

@Injectable()
export class UniverseLifecycleService {
  private readonly logger = new Logger(UniverseLifecycleService.name);
  private lifecycles: Map<string, LifecycleEntry> = new Map();

  setPhase(universeId: string, phase: Phase): void {
    const current = this.lifecycles.get(universeId);
    this.lifecycles.set(universeId, {
      phase,
      enteredAt: new Date(),
      revenue: current?.revenue ?? 0,
    });
    this.logger.log(`Universe ${universeId} -> phase ${phase}`);
  }

  getPhase(universeId: string): Phase | undefined {
    return this.lifecycles.get(universeId)?.phase;
  }

  advancePhase(universeId: string, revenueChange: number): void {
    const entry = this.lifecycles.get(universeId);
    if (!entry) {
      this.setPhase(universeId, 'birth');
      return;
    }
    entry.revenue += revenueChange;
    const currentIndex = PHASE_ORDER.indexOf(entry.phase);

    if (revenueChange < -100 && currentIndex < PHASE_ORDER.length - 1) {
      entry.phase = PHASE_ORDER[currentIndex + 1];
      entry.enteredAt = new Date();
      this.logger.log(`Universe ${universeId} advanced to ${entry.phase}`);
    } else if (revenueChange > 200 && entry.phase === 'birth') {
      entry.phase = 'growth';
      entry.enteredAt = new Date();
    }
  }

  getDyingUniverses(): string[] {
    return [...this.lifecycles.entries()]
      .filter(([, e]) => e.phase === 'decline' || e.phase === 'death')
      .map(([id]) => id);
  }

  getStats() {
    const byPhase: Record<Phase, number> = {
      birth: 0, growth: 0, saturation: 0, decline: 0, death: 0,
    };
    for (const e of this.lifecycles.values()) byPhase[e.phase]++;
    return { total: this.lifecycles.size, byPhase };
  }
}
