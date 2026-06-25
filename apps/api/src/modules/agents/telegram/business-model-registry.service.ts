import { Injectable, Logger } from '@nestjs/common';

export interface BusinessModel {
  id: string;
  name: string;
  revenue: number;
  cost: number;
  stability: number;
  growthPotential: number;
  active: boolean;
}

@Injectable()
export class BusinessModelRegistryService {
  private readonly logger = new Logger(BusinessModelRegistryService.name);

  models: Map<string, BusinessModel> = new Map([
    ['affiliate', { id: 'affiliate', name: 'Affiliate Marketing', revenue: 5000, cost: 800, stability: 0.85, growthPotential: 0.12, active: true }],
    ['content', { id: 'content', name: 'Content Commerce', revenue: 3000, cost: 400, stability: 0.78, growthPotential: 0.20, active: true }],
    ['flashdeal', { id: 'flashdeal', name: 'Flash Deal Engine', revenue: 7000, cost: 1500, stability: 0.65, growthPotential: 0.30, active: true }],
    ['review', { id: 'review', name: 'Review Funnel', revenue: 2000, cost: 200, stability: 0.90, growthPotential: 0.08, active: true }],
  ]);

  register(model: BusinessModel): void {
    this.models.set(model.id, model);
    this.logger.log(`Registered model: ${model.id}`);
  }

  get(id: string): BusinessModel | undefined {
    return this.models.get(id);
  }

  getAll(): BusinessModel[] {
    return Array.from(this.models.values());
  }

  updateMetrics(id: string, metrics: Partial<BusinessModel>): void {
    const existing = this.models.get(id);
    if (!existing) return;
    this.models.set(id, { ...existing, ...metrics });
  }

  getTopModels(n: number): BusinessModel[] {
    return this.getAll()
      .filter(m => m.active)
      .sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))
      .slice(0, n);
  }

  getStats() {
    const all = this.getAll();
    const active = all.filter(m => m.active);
    const totalRevenue = active.reduce((s, m) => s + m.revenue, 0);
    const totalCost = active.reduce((s, m) => s + m.cost, 0);
    return {
      totalModels: all.length,
      activeModels: active.length,
      totalRevenue,
      totalCost,
      netProfit: totalRevenue - totalCost,
      topModels: this.getTopModels(3).map(m => m.id),
    };
  }

  getStatus() {
    return { registered: this.models.size };
  }
}
