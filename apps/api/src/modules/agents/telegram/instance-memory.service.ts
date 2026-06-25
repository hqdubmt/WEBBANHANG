import { Injectable, Logger } from '@nestjs/common';

export interface InstanceData {
  data: Record<string, any>;
  performance: number;
  strategy: string;
  updatedAt: Date;
}

@Injectable()
export class InstanceMemoryService {
  private readonly logger = new Logger(InstanceMemoryService.name);

  memories: Map<string, InstanceData> = new Map();

  store(instanceId: string, data: InstanceData): void {
    this.memories.set(instanceId, { ...data, updatedAt: new Date() });
    this.logger.debug(`Stored memory for ${instanceId}: strategy=${data.strategy}, perf=${data.performance}`);
  }

  get(instanceId: string): InstanceData | undefined {
    return this.memories.get(instanceId);
  }

  isolate(instanceId: string): void {
    if (this.memories.has(instanceId)) {
      this.memories.set(instanceId, {
        data: {},
        performance: 0,
        strategy: 'isolated',
        updatedAt: new Date(),
      });
      this.logger.log(`Isolated memory for instance ${instanceId}`);
    }
  }

  getStats() {
    const entries = Array.from(this.memories.values());
    return {
      totalInstances: this.memories.size,
      avgPerformance: entries.length
        ? entries.reduce((s, e) => s + e.performance, 0) / entries.length
        : 0,
      isolated: entries.filter(e => e.strategy === 'isolated').length,
      strategies: [...new Set(entries.map(e => e.strategy))],
    };
  }
}
