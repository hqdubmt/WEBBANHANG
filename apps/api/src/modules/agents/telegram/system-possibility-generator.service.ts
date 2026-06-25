import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

type PossibilityType = 'affiliate-model' | 'funnel' | 'distribution' | 'hybrid';

interface Possibility {
  id: string;
  type: PossibilityType;
  description: string;
  estimatedROI: number;
  createdAt: Date;
}

const AFFILIATE_DESCRIPTIONS = [
  'Multi-tier commission affiliate with upsell tracking',
  'Single-product deep-funnel affiliate model',
  'Seasonal flash-sale affiliate burst strategy',
];

const FUNNEL_DESCRIPTIONS = [
  'TOFU content → email capture → retargeting → conversion',
  'Telegram post → landing page → instant checkout funnel',
  'Organic post → warm DM → link drop → purchase',
];

const DISTRIBUTION_DESCRIPTIONS = [
  'Weighted round-robin across channels by engagement score',
  'Burst distribution at peak hours with cool-down windows',
  'Geo-targeted micro-distribution for regional offers',
];

const HYBRID_DESCRIPTIONS = [
  'Hybrid affiliate + content syndication across platforms',
  'Funnel + affiliate split-test with auto-optimization',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

@Injectable()
export class SystemPossibilityGeneratorService {
  private readonly logger = new Logger(SystemPossibilityGeneratorService.name);
  private possibilities: Possibility[] = [];

  generateAffiliateModel(): Possibility {
    const p: Possibility = {
      id: uuidv4(),
      type: 'affiliate-model',
      description: pick(AFFILIATE_DESCRIPTIONS),
      estimatedROI: parseFloat((Math.random() * 4 + 1).toFixed(2)),
      createdAt: new Date(),
    };
    this.possibilities.push(p);
    this.logger.log(`Generated affiliate-model possibility: ${p.description}`);
    return p;
  }

  generateFunnel(): Possibility {
    const p: Possibility = {
      id: uuidv4(),
      type: 'funnel',
      description: pick(FUNNEL_DESCRIPTIONS),
      estimatedROI: parseFloat((Math.random() * 3 + 1.5).toFixed(2)),
      createdAt: new Date(),
    };
    this.possibilities.push(p);
    return p;
  }

  generateDistributionLogic(): Possibility {
    const p: Possibility = {
      id: uuidv4(),
      type: 'distribution',
      description: pick(DISTRIBUTION_DESCRIPTIONS),
      estimatedROI: parseFloat((Math.random() * 2 + 0.8).toFixed(2)),
      createdAt: new Date(),
    };
    this.possibilities.push(p);
    return p;
  }

  generateBatch(count: number): Possibility[] {
    const generators = [
      () => this.generateAffiliateModel(),
      () => this.generateFunnel(),
      () => this.generateDistributionLogic(),
    ];
    const batch: Possibility[] = [];
    for (let i = 0; i < count; i++) {
      batch.push(pick(generators)());
    }
    return batch;
  }

  getStats() {
    const byType = this.possibilities.reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] ?? 0) + 1;
      return acc;
    }, {});
    const avgROI =
      this.possibilities.length > 0
        ? parseFloat((this.possibilities.reduce((s, p) => s + p.estimatedROI, 0) / this.possibilities.length).toFixed(2))
        : 0;
    return { totalPossibilities: this.possibilities.length, byType, avgROI };
  }
}
