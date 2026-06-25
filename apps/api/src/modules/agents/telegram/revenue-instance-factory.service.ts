import { Injectable, Logger } from '@nestjs/common';

const defaultConfig = {
  hookStyle: 'urgency',
  contentFormat: 'review',
  productCategory: 'electronics',
  channelWeight: { telegram: 0.6, facebook: 0.4 },
  postFreq: 8,
};

type FactoryConfig = typeof defaultConfig;

@Injectable()
export class RevenueInstanceFactoryService {
  private readonly logger = new Logger(RevenueInstanceFactoryService.name);

  readonly defaultConfig: FactoryConfig = { ...defaultConfig, channelWeight: { ...defaultConfig.channelWeight } };

  created: Array<{ config: FactoryConfig; createdAt: Date }> = [];

  create(params?: Partial<FactoryConfig>): FactoryConfig {
    const config: FactoryConfig = {
      ...this.defaultConfig,
      ...params,
      channelWeight: {
        ...this.defaultConfig.channelWeight,
        ...(params?.channelWeight ?? {}),
      },
    };
    this.created.push({ config, createdAt: new Date() });
    this.logger.debug(`Created instance config: ${JSON.stringify(config)}`);
    return config;
  }

  createBatch(count: number): FactoryConfig[] {
    return Array.from({ length: count }, () => this.create());
  }

  getStats() {
    return {
      totalCreated: this.created.length,
      lastCreated: this.created.at(-1)?.createdAt ?? null,
      hookStyleBreakdown: this.created.reduce<Record<string, number>>((acc, c) => {
        acc[c.config.hookStyle] = (acc[c.config.hookStyle] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }
}
