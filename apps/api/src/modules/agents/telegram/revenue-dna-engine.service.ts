import { Injectable, Logger } from '@nestjs/common';

export interface RevenueDNA {
  traffic: Record<string, number>;
  contentStyle: string;
  productFocus: string;
  channelDist: Record<string, number>;
  hookStyle: string;
  postingRate: number;
}

@Injectable()
export class RevenueDnaEngineService {
  private readonly logger = new Logger(RevenueDnaEngineService.name);

  private readonly defaultDna: RevenueDNA = {
    traffic: { organic: 60, paid: 30, referral: 10 },
    contentStyle: 'review',
    productFocus: 'electronics',
    channelDist: { telegram: 0.5, facebook: 0.3, tiktok: 0.2 },
    hookStyle: 'urgency',
    postingRate: 8,
  };

  dnaPool: RevenueDNA[] = [];

  encode(config: RevenueDNA): string {
    return JSON.stringify(config);
  }

  decode(dna: string): RevenueDNA {
    try {
      return JSON.parse(dna) as RevenueDNA;
    } catch {
      this.logger.warn('Failed to decode DNA, returning default');
      return this.createDna();
    }
  }

  createDna(overrides?: Partial<RevenueDNA>): RevenueDNA {
    const dna: RevenueDNA = { ...this.defaultDna, ...overrides };
    this.dnaPool.push(dna);
    return dna;
  }

  mutateDna(dna: RevenueDNA): RevenueDNA {
    const styles = ['review', 'comparison', 'story', 'listicle', 'tutorial'];
    const hooks = ['urgency', 'scarcity', 'social-proof', 'curiosity', 'discount'];
    const categories = ['electronics', 'fashion', 'beauty', 'home', 'sports'];

    const mutated: RevenueDNA = {
      traffic: Object.fromEntries(
        Object.entries(dna.traffic).map(([k, v]) => [
          k,
          Math.max(0, v + Math.floor((Math.random() - 0.5) * 20)),
        ]),
      ),
      contentStyle: Math.random() < 0.3 ? styles[Math.floor(Math.random() * styles.length)] : dna.contentStyle,
      productFocus: Math.random() < 0.2 ? categories[Math.floor(Math.random() * categories.length)] : dna.productFocus,
      channelDist: Object.fromEntries(
        Object.entries(dna.channelDist).map(([k, v]) => [
          k,
          Math.max(0.05, Math.min(0.9, v + (Math.random() - 0.5) * 0.1)),
        ]),
      ),
      hookStyle: Math.random() < 0.25 ? hooks[Math.floor(Math.random() * hooks.length)] : dna.hookStyle,
      postingRate: Math.max(1, Math.min(24, dna.postingRate + Math.floor((Math.random() - 0.5) * 4))),
    };

    this.dnaPool.push(mutated);
    return mutated;
  }

  getStats() {
    return {
      poolSize: this.dnaPool.length,
      uniqueContentStyles: [...new Set(this.dnaPool.map(d => d.contentStyle))],
      avgPostingRate: this.dnaPool.length
        ? this.dnaPool.reduce((s, d) => s + d.postingRate, 0) / this.dnaPool.length
        : 0,
    };
  }
}
