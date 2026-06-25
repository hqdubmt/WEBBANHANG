import { Injectable, Logger } from '@nestjs/common';

interface SimResult {
  realityId: string;
  type: string;
  revenue: number;
  stability: number;
  scalability: number;
  efficiency: number;
}

@Injectable()
export class ParallelRealitySimulatorService {
  private readonly logger = new Logger(ParallelRealitySimulatorService.name);
  private results: SimResult[] = [];

  runSimulation(realityId: string, type: string, ticks: number): SimResult {
    let revenue = Math.random() * 2000 + 200;
    let stability = Math.random() * 0.5 + 0.5;

    for (let i = 0; i < ticks; i++) {
      const growthFactor = 1 + (Math.random() * 0.1 - 0.02);
      revenue *= growthFactor;
      stability = Math.min(1, stability * (1 + (Math.random() * 0.02 - 0.01)));
    }

    const result: SimResult = {
      realityId,
      type,
      revenue: parseFloat(revenue.toFixed(2)),
      stability: parseFloat(stability.toFixed(3)),
      scalability: parseFloat((Math.random() * 0.6 + 0.4).toFixed(3)),
      efficiency: parseFloat((Math.random() * 0.5 + 0.5).toFixed(3)),
    };

    const existing = this.results.findIndex(r => r.realityId === realityId);
    if (existing >= 0) {
      this.results[existing] = result;
    } else {
      this.results.push(result);
    }

    this.logger.log(`Simulation done: reality=${realityId} type=${type} ticks=${ticks} revenue=${result.revenue}`);
    return result;
  }

  getAllResults(): SimResult[] {
    return [...this.results];
  }

  getRealityPerformance(realityId: string): SimResult | undefined {
    return this.results.find(r => r.realityId === realityId);
  }

  getStats() {
    const count = this.results.length;
    const avgRevenue = count > 0
      ? parseFloat((this.results.reduce((s, r) => s + r.revenue, 0) / count).toFixed(2))
      : 0;
    const best = this.results.reduce<SimResult | null>((b, r) => (!b || r.revenue > b.revenue ? r : b), null);
    return { totalSimulations: count, avgRevenue, bestRealityId: best?.realityId ?? null };
  }
}
