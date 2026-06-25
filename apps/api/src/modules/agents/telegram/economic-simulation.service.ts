import { Injectable, Logger } from '@nestjs/common';

interface SimResult {
  revenueImpact: number;
  confidence: number;
}

interface SimRecord {
  scenario: { channel: string; delta: number };
  result: SimResult;
  timestamp: Date;
}

@Injectable()
export class EconomicSimulationService {
  private readonly logger = new Logger(EconomicSimulationService.name);

  simulations: SimRecord[] = [];

  private readonly channelBaseRevenue: Record<string, number> = {
    facebook: 4000,
    telegram: 5500,
    youtube: 1000,
    instagram: 2000,
    tiktok: 3000,
  };

  simulate(scenario: { channel: string; delta: number }): SimResult {
    const baseRevenue = this.channelBaseRevenue[scenario.channel] ?? 2000;
    const revenueImpact = baseRevenue * scenario.delta;
    const confidence = Math.max(0.4, Math.min(0.95, 0.8 - Math.abs(scenario.delta) * 0.3));

    const result: SimResult = {
      revenueImpact: +revenueImpact.toFixed(2),
      confidence: +confidence.toFixed(3),
    };

    this.simulations.push({ scenario, result, timestamp: new Date() });
    this.logger.log(`Simulated ${scenario.channel} delta=${scenario.delta}: impact=${revenueImpact.toFixed(0)}, confidence=${confidence.toFixed(2)}`);
    return result;
  }

  runScenarios(scenarios: Array<{ channel: string; delta: number }>): Array<{ scenario: { channel: string; delta: number }; result: SimResult }> {
    return scenarios.map(scenario => ({
      scenario,
      result: this.simulate(scenario),
    }));
  }

  getBestScenario(): SimRecord | undefined {
    if (this.simulations.length === 0) return undefined;
    return this.simulations.reduce((best, sim) =>
      sim.result.revenueImpact * sim.result.confidence > best.result.revenueImpact * best.result.confidence
        ? sim
        : best
    );
  }

  getStats() {
    const total = this.simulations.length;
    const avgImpact = total
      ? this.simulations.reduce((s, sim) => s + sim.result.revenueImpact, 0) / total
      : 0;
    const avgConfidence = total
      ? this.simulations.reduce((s, sim) => s + sim.result.confidence, 0) / total
      : 0;
    const best = this.getBestScenario();
    return {
      totalSimulations: total,
      avgRevenueImpact: +avgImpact.toFixed(2),
      avgConfidence: +avgConfidence.toFixed(3),
      bestScenario: best ? { channel: best.scenario.channel, delta: best.scenario.delta, impact: best.result.revenueImpact } : null,
    };
  }

  getStatus() {
    return { simulations: this.simulations.length };
  }
}
