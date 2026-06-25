import { Injectable, Logger } from '@nestjs/common';

interface UniverseConfig {
  id: string;
  type: 'affiliate-flash' | 'viral-content' | 'high-conversion' | 'experimental';
  params: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class UniverseGeneratorService {
  private readonly logger = new Logger(UniverseGeneratorService.name);
  private generated: Map<string, UniverseConfig> = new Map();

  private defaultParams(type: string): Record<string, any> {
    const base: Record<string, Record<string, any>> = {
      'affiliate-flash': { flashDuration: 3600, discountMin: 30, contentFreq: 'high' },
      'viral-content': { viralTarget: 'meme', engagementBoost: 2, shareIncentive: true },
      'high-conversion': { funnel: 'direct', ctaStyle: 'urgent', retarget: true },
      experimental: { mode: 'random', riskTolerance: 0.8, mutation: true },
    };
    return base[type] ?? { mode: 'default' };
  }

  generate(type: string): UniverseConfig {
    const validTypes = ['affiliate-flash', 'viral-content', 'high-conversion', 'experimental'];
    const resolvedType = validTypes.includes(type)
      ? (type as UniverseConfig['type'])
      : 'experimental';

    const id = `univ-${resolvedType}-${Date.now()}`;
    const config: UniverseConfig = {
      id,
      type: resolvedType,
      params: this.defaultParams(resolvedType),
      createdAt: new Date(),
    };
    this.generated.set(id, config);
    this.logger.log(`Generated universe ${id} of type ${resolvedType}`);
    return config;
  }

  getAll(): UniverseConfig[] {
    return [...this.generated.values()];
  }

  decommission(id: string): void {
    if (this.generated.has(id)) {
      this.generated.delete(id);
      this.logger.log(`Decommissioned universe ${id}`);
    }
  }

  getStats() {
    const byType: Record<string, number> = {};
    for (const c of this.generated.values()) {
      byType[c.type] = (byType[c.type] ?? 0) + 1;
    }
    return { total: this.generated.size, byType };
  }
}
