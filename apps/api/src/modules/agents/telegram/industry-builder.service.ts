import { Injectable, Logger } from '@nestjs/common';

export interface Industry {
  id: string;
  name: string;
  type: 'affiliate' | 'review' | 'flashdeal' | 'arbitrage';
  createdAt: Date;
  revenue: number;
  active: boolean;
}

@Injectable()
export class IndustryBuilderService {
  private readonly logger = new Logger(IndustryBuilderService.name);

  industries: Map<string, Industry> = new Map();
  private counter = 0;

  buildIndustry(type: string, name: string): Industry {
    const id = `ind-${++this.counter}-${Date.now()}`;
    const validType = (['affiliate', 'review', 'flashdeal', 'arbitrage'].includes(type)
      ? type
      : 'affiliate') as Industry['type'];

    const baseRevenue: Record<string, number> = {
      affiliate: 3000,
      review: 1500,
      flashdeal: 5000,
      arbitrage: 2500,
    };

    const industry: Industry = {
      id,
      name,
      type: validType,
      createdAt: new Date(),
      revenue: baseRevenue[validType] ?? 2000,
      active: true,
    };

    this.industries.set(id, industry);
    this.logger.log(`Built industry: ${name} (${validType}) [${id}]`);
    return industry;
  }

  getActiveIndustries(): Industry[] {
    return Array.from(this.industries.values()).filter(i => i.active);
  }

  expandIndustry(id: string): void {
    const ind = this.industries.get(id);
    if (!ind || !ind.active) return;
    const expanded = { ...ind, revenue: ind.revenue * 1.3 };
    this.industries.set(id, expanded);
    this.logger.log(`Expanded industry ${id}: revenue now ${expanded.revenue.toFixed(0)}`);
  }

  shutdownIndustry(id: string): void {
    const ind = this.industries.get(id);
    if (!ind) return;
    this.industries.set(id, { ...ind, active: false });
    this.logger.warn(`Shutdown industry: ${id}`);
  }

  getStats() {
    const all = Array.from(this.industries.values());
    const active = all.filter(i => i.active);
    const totalRevenue = active.reduce((s, i) => s + i.revenue, 0);
    const byType: Record<string, number> = {};
    for (const i of active) byType[i.type] = (byType[i.type] ?? 0) + 1;
    return {
      total: all.length,
      active: active.length,
      totalRevenue: +totalRevenue.toFixed(2),
      byType,
    };
  }

  getStatus() {
    return { total: this.industries.size, active: this.getActiveIndustries().length };
  }
}
