import { Injectable, Logger } from '@nestjs/common';

export interface KpiMetric {
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  updatedAt: Date;
}

@Injectable()
export class KpiIntelligenceService {
  private readonly logger = new Logger(KpiIntelligenceService.name);

  kpis: Map<string, KpiMetric> = new Map([
    ['revenue', { name: 'revenue', value: 17000, target: 20000, trend: 'up', updatedAt: new Date() }],
    ['ctr', { name: 'ctr', value: 0.034, target: 0.05, trend: 'up', updatedAt: new Date() }],
    ['conversion', { name: 'conversion', value: 0.021, target: 0.03, trend: 'stable', updatedAt: new Date() }],
    ['roi', { name: 'roi', value: 2.8, target: 3.5, trend: 'down', updatedAt: new Date() }],
  ]);

  private prevValues: Map<string, number> = new Map();

  update(name: string, value: number, target: number): void {
    const prev = this.prevValues.get(name);
    let trend: KpiMetric['trend'] = 'stable';
    if (prev !== undefined) {
      if (value > prev * 1.01) trend = 'up';
      else if (value < prev * 0.99) trend = 'down';
    }
    this.prevValues.set(name, value);
    this.kpis.set(name, { name, value, target, trend, updatedAt: new Date() });
    this.logger.log(`KPI update: ${name}=${value} (target=${target}, trend=${trend})`);
  }

  getTrend(name: string): string {
    return this.kpis.get(name)?.trend ?? 'unknown';
  }

  getKpisBelowTarget(): KpiMetric[] {
    return Array.from(this.kpis.values()).filter(k => k.value < k.target);
  }

  getKpisAboveTarget(): KpiMetric[] {
    return Array.from(this.kpis.values()).filter(k => k.value >= k.target);
  }

  generateKpiReport(): string {
    const below = this.getKpisBelowTarget();
    const above = this.getKpisAboveTarget();
    const lines = [
      `=== KPI INTELLIGENCE REPORT [${new Date().toISOString()}] ===`,
      `KPIs Above Target (${above.length}): ${above.map(k => `${k.name}=${k.value.toFixed(3)}`).join(', ')}`,
      `KPIs Below Target (${below.length}): ${below.map(k => `${k.name}=${k.value.toFixed(3)} (target=${k.target})`).join(', ')}`,
      ...Array.from(this.kpis.values()).map(k => `  [${k.trend.toUpperCase()}] ${k.name}: ${k.value} / ${k.target}`),
    ];
    return lines.join('\n');
  }

  getStats() {
    const all = Array.from(this.kpis.values());
    return {
      total: all.length,
      aboveTarget: this.getKpisAboveTarget().length,
      belowTarget: this.getKpisBelowTarget().length,
      trending: { up: all.filter(k => k.trend === 'up').length, down: all.filter(k => k.trend === 'down').length, stable: all.filter(k => k.trend === 'stable').length },
    };
  }

  getStatus() {
    return { kpiCount: this.kpis.size };
  }
}
