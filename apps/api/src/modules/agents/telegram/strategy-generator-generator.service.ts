import { Injectable, Logger } from '@nestjs/common';

export interface GeneratorConfig { type: 'affiliate' | 'funnel' | 'content'; params: Record<string, any>; produced: number; }

@Injectable()
export class StrategyGeneratorGeneratorService {
  private readonly logger = new Logger(StrategyGeneratorGeneratorService.name);
  private generators: Map<string, GeneratorConfig> = new Map();

  createGenerator(type: string): GeneratorConfig {
    const config: GeneratorConfig = {
      type: type as GeneratorConfig['type'],
      params: type === 'affiliate' ? { discountMin: 20, categories: ['electronics', 'fashion'] }
        : type === 'funnel' ? { stages: 3, conversionTarget: 0.05 }
        : { styles: ['review', 'urgency', 'shock'], outputRate: 5 },
      produced: 0,
    };
    this.generators.set(type, config);
    this.logger.log(`Generator created: ${type}`);
    return config;
  }

  runGenerator(type: string): Record<string, any> {
    let gen = this.generators.get(type);
    if (!gen) gen = this.createGenerator(type);
    gen.produced++;
    return { type, output: { ...gen.params, generatedAt: new Date(), id: `${type}_${gen.produced}` } };
  }

  getGenerators(): GeneratorConfig[] { return Array.from(this.generators.values()); }

  getStats() { return { total: this.generators.size, generators: this.getGenerators() }; }
}
