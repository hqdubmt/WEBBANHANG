import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

export interface Civilization {
  id: string;
  name: string;
  regions: string[];
  totalRevenue: number;
  stability: number;
  status: 'growing' | 'stable' | 'shrinking';
}

@Injectable()
export class RevenueCivilizationBrainService {
  private readonly logger = new Logger(RevenueCivilizationBrainService.name);

  civilizations: Map<string, Civilization> = new Map();

  private ensureDefault() {
    if (this.civilizations.size === 0) {
      const civ: Civilization = {
        id: 'civ-default',
        name: 'Default',
        regions: [],
        totalRevenue: 0,
        stability: 80,
        status: 'stable',
      };
      this.civilizations.set(civ.id, civ);
    }
  }

  observeCivilizations(): { best: Civilization | null; worst: Civilization | null; totalRevenue: number } {
    this.ensureDefault();
    const all = Array.from(this.civilizations.values());
    if (all.length === 0) return { best: null, worst: null, totalRevenue: 0 };
    const sorted = [...all].sort((a, b) => b.totalRevenue - a.totalRevenue);
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      totalRevenue: all.reduce((s, c) => s + c.totalRevenue, 0),
    };
  }

  expandCivilization(civId: string): void {
    const civ = this.civilizations.get(civId);
    if (!civ) return;
    const newRegion = `region-${civ.regions.length + 1}`;
    civ.regions.push(newRegion);
    civ.status = 'growing';
    this.logger.log(`Expanded civ ${civId} → added ${newRegion}`);
  }

  contractCivilization(civId: string): void {
    const civ = this.civilizations.get(civId);
    if (!civ || civ.regions.length === 0) return;
    civ.regions.pop();
    civ.status = civ.regions.length === 0 ? 'shrinking' : 'stable';
    this.logger.log(`Contracted civ ${civId}, regions left=${civ.regions.length}`);
  }

  @Cron('0 1 * * *')
  civLoop() {
    this.logger.log('Civilization brain loop triggered');
    for (const civ of this.civilizations.values()) {
      const drift = (Math.random() - 0.5) * 20;
      civ.totalRevenue = Math.max(0, civ.totalRevenue + drift);
      civ.status = civ.totalRevenue > 500 ? 'growing' : civ.totalRevenue > 100 ? 'stable' : 'shrinking';
    }
  }

  getStats() {
    const { best, worst, totalRevenue } = this.observeCivilizations();
    return {
      total: this.civilizations.size,
      totalRevenue,
      bestCiv: best?.id ?? null,
      worstCiv: worst?.id ?? null,
    };
  }
}
