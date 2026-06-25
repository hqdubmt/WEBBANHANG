import { Injectable, Logger } from '@nestjs/common';

export interface Region {
  id: string;
  name: string;
  type: 'affiliate' | 'content' | 'viral' | 'funnel';
  revenue: number;
  active: boolean;
}

@Injectable()
export class EconomicRegionsService {
  private readonly logger = new Logger(EconomicRegionsService.name);

  regions: Map<string, Region> = new Map();

  createRegion(name: string, type: string): Region {
    const validType = ['affiliate', 'content', 'viral', 'funnel'].includes(type)
      ? (type as Region['type'])
      : 'affiliate';
    const id = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const region: Region = { id, name, type: validType, revenue: 0, active: true };
    this.regions.set(id, region);
    this.logger.log(`Created region ${id}: ${name} (${validType})`);
    return region;
  }

  getActiveRegions(): Region[] {
    return Array.from(this.regions.values()).filter(r => r.active);
  }

  updateRevenue(id: string, revenue: number): void {
    const region = this.regions.get(id);
    if (region) region.revenue = revenue;
  }

  getTopRegion(): Region | undefined {
    const active = this.getActiveRegions();
    if (active.length === 0) return undefined;
    return active.reduce((best, r) => (r.revenue > best.revenue ? r : best));
  }

  getStats() {
    const active = this.getActiveRegions();
    return {
      total: this.regions.size,
      active: active.length,
      totalRevenue: active.reduce((s, r) => s + r.revenue, 0),
      topRegion: this.getTopRegion()?.name ?? null,
      byType: {
        affiliate: active.filter(r => r.type === 'affiliate').length,
        content: active.filter(r => r.type === 'content').length,
        viral: active.filter(r => r.type === 'viral').length,
        funnel: active.filter(r => r.type === 'funnel').length,
      },
    };
  }
}
