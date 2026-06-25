import { Injectable, Logger } from '@nestjs/common';

interface MutationRecord {
  original: Record<string, any>;
  result: Record<string, any>;
  timestamp: Date;
}

const CONTENT_STYLES = ['urgency', 'storytelling', 'social-proof', 'scarcity', 'educational'];
const FUNNELS = ['direct-buy', 'lead-nurture', 'flash-sale', 'bundle-upsell', 'trial'];
const TRAFFIC_MIXES = ['organic', 'paid', 'viral', 'referral', 'mixed'];
const PRODUCT_FOCUSES = ['bestseller', 'high-margin', 'trending', 'clearance', 'bundle'];

@Injectable()
export class UniverseMutationService {
  private readonly logger = new Logger(UniverseMutationService.name);
  private mutations: MutationRecord[] = [];

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  mutate(config: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {
      ...config,
      contentStyle: this.pick(CONTENT_STYLES),
      funnel: this.pick(FUNNELS),
      trafficMix: this.pick(TRAFFIC_MIXES),
      productFocus: this.pick(PRODUCT_FOCUSES),
      mutatedAt: new Date().toISOString(),
    };
    this.mutations.push({ original: config, result, timestamp: new Date() });
    this.logger.log(`Mutated config: contentStyle=${result.contentStyle}, funnel=${result.funnel}`);
    return result;
  }

  createVariants(base: Record<string, any>, n: number): Record<string, any>[] {
    const variants: Record<string, any>[] = [];
    for (let i = 0; i < n; i++) {
      variants.push(this.mutate({ ...base, variantIndex: i }));
    }
    return variants;
  }

  getMutations(): MutationRecord[] {
    return this.mutations;
  }

  getStats() {
    return {
      totalMutations: this.mutations.length,
      recent: this.mutations.slice(-5).map(m => ({
        contentStyle: m.result.contentStyle,
        funnel: m.result.funnel,
        ts: m.timestamp,
      })),
    };
  }
}
