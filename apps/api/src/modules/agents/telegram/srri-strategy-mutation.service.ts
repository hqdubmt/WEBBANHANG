import { Injectable, Logger } from '@nestjs/common';

interface MutationRecord {
  original: Record<string, any>;
  result: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class SrriStrategyMutationService {
  private readonly logger = new Logger(SrriStrategyMutationService.name);

  mutations: MutationRecord[] = [];

  private readonly hookStyles = ['urgency', 'scarcity', 'curiosity', 'social-proof', 'discount', 'exclusive'];
  private readonly contentFormats = ['review', 'comparison', 'story', 'listicle', 'tutorial', 'unboxing'];
  private readonly productCategories = ['electronics', 'fashion', 'beauty', 'home', 'sports', 'gaming'];

  mutate(config: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...config };

    if (Math.random() < 0.4) {
      result.hookStyle = this.hookStyles[Math.floor(Math.random() * this.hookStyles.length)];
    }
    if (Math.random() < 0.4) {
      result.contentFormat = this.contentFormats[Math.floor(Math.random() * this.contentFormats.length)];
    }
    if (Math.random() < 0.25) {
      result.productCategory = this.productCategories[Math.floor(Math.random() * this.productCategories.length)];
    }
    if (config.channelWeight && typeof config.channelWeight === 'object') {
      const cw: Record<string, number> = { ...config.channelWeight };
      const keys = Object.keys(cw);
      if (keys.length > 0) {
        const k = keys[Math.floor(Math.random() * keys.length)];
        cw[k] = Math.max(0.05, Math.min(0.95, (cw[k] ?? 0.5) + (Math.random() - 0.5) * 0.2));
      }
      result.channelWeight = cw;
    }
    if (typeof config.postFreq === 'number') {
      result.postFreq = Math.max(1, Math.min(24, config.postFreq + Math.floor((Math.random() - 0.5) * 4)));
    }

    this.mutations.push({ original: config, result, timestamp: new Date() });
    this.logger.debug(`Mutated config: hookStyle=${result.hookStyle}, contentFormat=${result.contentFormat}`);
    return result;
  }

  createVariants(base: Record<string, any>, count: number): Record<string, any>[] {
    return Array.from({ length: count }, () => this.mutate(base));
  }

  getStats() {
    return {
      totalMutations: this.mutations.length,
      last: this.mutations.at(-1)?.timestamp ?? null,
    };
  }
}
