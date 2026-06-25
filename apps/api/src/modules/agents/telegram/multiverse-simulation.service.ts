import { Injectable, Logger } from '@nestjs/common';

interface SimulationRecord {
  type: string;
  input: Record<string, any>;
  output: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class MultiverseSimulationService {
  private readonly logger = new Logger(MultiverseSimulationService.name);
  private simulations: SimulationRecord[] = [];

  simulate(universeId: string, scaleFactor: number): { projectedRevenue: number; risk: number } {
    const baseRevenue = 1000 + Math.random() * 4000;
    const projectedRevenue = baseRevenue * Math.max(0.1, scaleFactor);
    const risk = Math.min(1, 0.1 + (scaleFactor - 1) * 0.15 + Math.random() * 0.05);

    const output = { projectedRevenue, risk };
    this.simulations.push({
      type: 'scale',
      input: { universeId, scaleFactor },
      output,
      timestamp: new Date(),
    });
    this.logger.log(`Simulated ${universeId} x${scaleFactor}: revenue=${projectedRevenue.toFixed(0)}, risk=${risk.toFixed(2)}`);
    return output;
  }

  simulateRemoval(
    universeId: string,
    currentRevenues: Record<string, number>,
  ): { impact: number; redistribution: Record<string, number> } {
    const removedRevenue = currentRevenues[universeId] ?? 0;
    const others = Object.entries(currentRevenues).filter(([id]) => id !== universeId);
    const totalOther = others.reduce((s, [, v]) => s + v, 0);

    const redistribution: Record<string, number> = {};
    if (totalOther > 0) {
      for (const [id, rev] of others) {
        redistribution[id] = rev + removedRevenue * (rev / totalOther) * 0.7;
      }
    }

    const impact = removedRevenue - (totalOther > 0 ? removedRevenue * 0.7 : 0);
    const output = { impact, redistribution };
    this.simulations.push({
      type: 'removal',
      input: { universeId, currentRevenues },
      output,
      timestamp: new Date(),
    });
    return output;
  }

  getStats() {
    const byType: Record<string, number> = {};
    for (const s of this.simulations) byType[s.type] = (byType[s.type] ?? 0) + 1;
    return { total: this.simulations.length, byType };
  }
}
