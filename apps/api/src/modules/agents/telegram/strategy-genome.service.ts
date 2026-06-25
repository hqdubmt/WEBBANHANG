import { Injectable, Logger } from '@nestjs/common';

interface StrategyDNA {
  traffic: Record<string, number>;
  contentStyle: string;
  productFocus: string;
  postingRate: number;
}

const CONTENT_STYLES = ['review', 'comparison', 'flash_sale', 'storytelling', 'list'];
const PRODUCT_FOCUSES = ['electronics', 'fashion', 'beauty', 'home', 'sports'];

@Injectable()
export class StrategyGenomeService {
  private readonly logger = new Logger(StrategyGenomeService.name);

  private genomes: Map<string, StrategyDNA> = new Map();

  createGenome(id: string, dna: StrategyDNA): void {
    this.genomes.set(id, { ...dna });
    this.logger.log(`Genome created: ${id}`);
  }

  mutateGenome(id: string): StrategyDNA {
    const original = this.genomes.get(id);
    if (!original) throw new Error(`Genome not found: ${id}`);

    const mutated: StrategyDNA = {
      traffic: { ...original.traffic },
      contentStyle: Math.random() > 0.7 ? CONTENT_STYLES[Math.floor(Math.random() * CONTENT_STYLES.length)] : original.contentStyle,
      productFocus: Math.random() > 0.8 ? PRODUCT_FOCUSES[Math.floor(Math.random() * PRODUCT_FOCUSES.length)] : original.productFocus,
      postingRate: Math.max(1, Math.min(20, original.postingRate + Math.round((Math.random() - 0.5) * 4))),
    };

    // Mutate traffic weights
    const channels = Object.keys(mutated.traffic);
    for (const ch of channels) {
      mutated.traffic[ch] = Math.max(0, (mutated.traffic[ch] ?? 0) + (Math.random() - 0.5) * 0.2);
    }
    const total = Object.values(mutated.traffic).reduce((a, b) => a + b, 0);
    if (total > 0) for (const ch of channels) mutated.traffic[ch] /= total;

    const mutatedId = `${id}_mutated_${Date.now()}`;
    this.genomes.set(mutatedId, mutated);
    this.logger.log(`Genome mutated: ${id} -> ${mutatedId}`);
    return mutated;
  }

  getGenome(id: string): StrategyDNA | undefined {
    return this.genomes.get(id);
  }

  getAllGenomes(): StrategyDNA[] {
    return [...this.genomes.values()];
  }

  getStats() {
    return {
      totalGenomes: this.genomes.size,
      genomeIds: [...this.genomes.keys()],
    };
  }

  getStatus() {
    return this.getStats();
  }
}
