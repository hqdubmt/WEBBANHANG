import { Injectable, Logger } from '@nestjs/common';

export interface CivSimResult { scenario: { resource: string; delta: number; affectedRegion: string }; impact: number; confidence: number; }

@Injectable()
export class CivilizationSimulationService {
  private readonly logger = new Logger(CivilizationSimulationService.name);
  private simulations: Array<{ scenario: CivSimResult['scenario']; result: { impact: number; confidence: number }; timestamp: Date }> = [];

  simulate(scenario: { resource: string; delta: number; affectedRegion: string }): { impact: number; confidence: number } {
    const baseImpact = scenario.delta * (scenario.resource === 'traffic' ? 0.8 : 0.5);
    const noise = (Math.random() - 0.5) * 0.2 * Math.abs(baseImpact);
    const result = { impact: baseImpact + noise, confidence: 0.6 + Math.random() * 0.3 };
    this.simulations.push({ scenario, result, timestamp: new Date() });
    return result;
  }

  runBatch(scenarios: Array<{ resource: string; delta: number; affectedRegion: string }>): Array<{ scenario: typeof scenarios[0]; impact: number }> {
    return scenarios.map(s => ({ scenario: s, impact: this.simulate(s).impact }));
  }

  getStats() {
    return { totalSimulations: this.simulations.length, lastSimulation: this.simulations[this.simulations.length - 1] };
  }
}
