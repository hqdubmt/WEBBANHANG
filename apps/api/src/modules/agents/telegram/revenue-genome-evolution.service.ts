import { Injectable, Logger } from '@nestjs/common';

export interface Generation {
  id: number;
  topGenome: Record<string, any>;
  avgFitness: number;
  timestamp: Date;
}

@Injectable()
export class RevenueGenomeEvolutionService {
  private readonly logger = new Logger(RevenueGenomeEvolutionService.name);

  generations: Generation[] = [];

  evolve(genomes: Array<{ genome: Record<string, any>; fitness: number }>): Record<string, any> {
    if (genomes.length === 0) return {};

    const sorted = [...genomes].sort((a, b) => b.fitness - a.fitness);
    const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3)));
    const avgFitness = sorted.reduce((s, g) => s + g.fitness, 0) / sorted.length;

    let best = top[0].genome;
    if (top.length >= 2) {
      const child = this.crossover(top[0].genome, top[1].genome);
      best = this.mutateGenome(child);
    }

    const gen: Generation = {
      id: this.generations.length + 1,
      topGenome: best,
      avgFitness,
      timestamp: new Date(),
    };
    this.generations.push(gen);
    this.logger.log(`Generation ${gen.id}: avgFitness=${avgFitness.toFixed(3)}`);
    return best;
  }

  crossover(a: Record<string, any>, b: Record<string, any>): Record<string, any> {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const child: Record<string, any> = {};
    for (const k of keys) {
      child[k] = Math.random() < 0.5 ? a[k] : b[k];
    }
    return child;
  }

  private mutateGenome(genome: Record<string, any>): Record<string, any> {
    const result = { ...genome };
    const numericKeys = Object.keys(result).filter(k => typeof result[k] === 'number');
    if (numericKeys.length > 0) {
      const key = numericKeys[Math.floor(Math.random() * numericKeys.length)];
      result[key] = result[key] * (0.9 + Math.random() * 0.2);
    }
    return result;
  }

  getLatestGeneration(): Generation | undefined {
    return this.generations.at(-1);
  }

  getStats() {
    const latest = this.getLatestGeneration();
    return {
      generations: this.generations.length,
      latestAvgFitness: latest?.avgFitness ?? 0,
      latestId: latest?.id ?? 0,
    };
  }
}
