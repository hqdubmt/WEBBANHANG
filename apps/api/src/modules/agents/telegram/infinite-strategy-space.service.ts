import { Injectable, Logger } from '@nestjs/common';

export interface StrategyPoint { id: string; dimensions: Record<string, number>; revenuePotential: number; explored: boolean; }

@Injectable()
export class InfiniteStrategySpaceService {
  private readonly logger = new Logger(InfiniteStrategySpaceService.name);
  private strategySpace: StrategyPoint[] = [];
  explorationCount: number = 0;

  explore(point: Partial<StrategyPoint>): StrategyPoint {
    const id = `sp_${++this.explorationCount}`;
    const dims = point.dimensions || { traffic: Math.random(), content: Math.random(), conversion: Math.random() };
    const potential = Object.values(dims).reduce((a, b) => a + b, 0) * 30 + Math.random() * 20;
    const sp: StrategyPoint = { id, dimensions: dims, revenuePotential: potential, explored: true };
    this.strategySpace.push(sp);
    return sp;
  }

  getUnexplored(): StrategyPoint[] { return this.strategySpace.filter(s => !s.explored); }

  getBestExplored(): StrategyPoint | undefined {
    const explored = this.strategySpace.filter(s => s.explored);
    return explored.sort((a, b) => b.revenuePotential - a.revenuePotential)[0];
  }

  getStats() { return { total: this.strategySpace.length, explored: this.explorationCount, best: this.getBestExplored()?.revenuePotential }; }
}
