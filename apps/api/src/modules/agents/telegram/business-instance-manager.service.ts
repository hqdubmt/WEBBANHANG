import { Injectable, Logger } from '@nestjs/common';

export interface Instance {
  id: string;
  type: 'high-risk' | 'stable' | 'niche';
  dna: Record<string, any>;
  revenue: number;
  ctr: number;
  conversion: number;
  active: boolean;
}

@Injectable()
export class BusinessInstanceManagerService {
  private readonly logger = new Logger(BusinessInstanceManagerService.name);

  instances: Map<string, Instance> = new Map();

  createInstance(type: string, dna: Record<string, any>): Instance {
    const validType = ['high-risk', 'stable', 'niche'].includes(type)
      ? (type as Instance['type'])
      : 'stable';
    const id = `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const instance: Instance = {
      id,
      type: validType,
      dna,
      revenue: 0,
      ctr: 0,
      conversion: 0,
      active: true,
    };
    this.instances.set(id, instance);
    this.logger.log(`Created instance ${id} type=${validType}`);
    return instance;
  }

  updateMetrics(id: string, revenue: number, ctr: number, conversion: number): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    inst.revenue = revenue;
    inst.ctr = ctr;
    inst.conversion = conversion;
  }

  getRanking(): Instance[] {
    return Array.from(this.instances.values())
      .filter(i => i.active)
      .sort((a, b) => b.revenue - a.revenue);
  }

  deactivate(id: string): void {
    const inst = this.instances.get(id);
    if (inst) {
      inst.active = false;
      this.logger.log(`Deactivated instance ${id}`);
    }
  }

  getStats() {
    const all = Array.from(this.instances.values());
    const active = all.filter(i => i.active);
    return {
      total: all.length,
      active: active.length,
      totalRevenue: active.reduce((s, i) => s + i.revenue, 0),
      byType: {
        'high-risk': active.filter(i => i.type === 'high-risk').length,
        stable: active.filter(i => i.type === 'stable').length,
        niche: active.filter(i => i.type === 'niche').length,
      },
    };
  }
}
