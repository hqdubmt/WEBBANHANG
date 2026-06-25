import { Injectable, Logger } from '@nestjs/common';

interface MutationRecord {
  original: Record<string, any>;
  mutated: Record<string, any>;
  timestamp: number;
}

@Injectable()
export class StrategyMutationService {
  private readonly logger = new Logger(StrategyMutationService.name);

  history: MutationRecord[] = [];

  private readonly styles = ['review', 'comparison', 'urgency', 'storytelling', 'list', 'unboxing'];

  mutate(genome: Record<string, any>): Record<string, any> {
    const mutated: Record<string, any> = { ...genome };

    if (typeof mutated.postingRate === 'number') {
      mutated.postingRate = Math.max(1, Math.min(24, mutated.postingRate + Math.round((Math.random() - 0.5) * 4)));
    }
    if (typeof mutated.contentStyle === 'string') {
      if (Math.random() > 0.6) mutated.contentStyle = this.styles[Math.floor(Math.random() * this.styles.length)];
    }
    if (typeof mutated.discountThreshold === 'number') {
      mutated.discountThreshold = Math.max(0, Math.min(100, mutated.discountThreshold + Math.round((Math.random() - 0.5) * 10)));
    }
    if (typeof mutated.frequency === 'number') {
      mutated.frequency = Math.max(1, mutated.frequency + (Math.random() > 0.5 ? 1 : -1));
    }

    if (mutated.weights && typeof mutated.weights === 'object') {
      const keys = Object.keys(mutated.weights);
      for (const k of keys) {
        mutated.weights[k] = Math.max(0, (mutated.weights[k] as number) + (Math.random() - 0.5) * 0.15);
      }
    }

    this.history.push({ original: genome, mutated, timestamp: Date.now() });
    if (this.history.length > 100) this.history.shift();
    this.logger.log(`Genome mutated, history size: ${this.history.length}`);
    return mutated;
  }

  generateVariants(baseGenome: Record<string, any>, count: number): Record<string, any>[] {
    return Array.from({ length: count }, () => this.mutate({ ...baseGenome }));
  }

  getStats() {
    return {
      mutationsTotal: this.history.length,
      recentMutations: this.history.slice(-5).map(h => ({ timestamp: h.timestamp })),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
