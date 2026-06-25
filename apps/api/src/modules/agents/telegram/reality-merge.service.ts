import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

type MergeStrategy = 'best-of-both' | 'weighted-avg';

interface Merge {
  id1: string;
  id2: string;
  mergedId: string;
  mergedAt: Date;
  strategy: MergeStrategy;
}

@Injectable()
export class RealityMergeService {
  private readonly logger = new Logger(RealityMergeService.name);
  private merges: Merge[] = [];

  merge(id1: string, id2: string, strategy: string = 'best-of-both'): string {
    const validStrategy: MergeStrategy =
      strategy === 'weighted-avg' ? 'weighted-avg' : 'best-of-both';

    const mergedId = uuidv4();
    const entry: Merge = {
      id1,
      id2,
      mergedId,
      mergedAt: new Date(),
      strategy: validStrategy,
    };

    this.merges.push(entry);
    this.logger.log(`Merged realities ${id1} + ${id2} → ${mergedId} (strategy=${validStrategy})`);
    return mergedId;
  }

  getMergeHistory(): Merge[] {
    return [...this.merges];
  }

  getStats() {
    const strategies = this.merges.reduce<Record<string, number>>((acc, m) => {
      acc[m.strategy] = (acc[m.strategy] ?? 0) + 1;
      return acc;
    }, {});
    return {
      totalMerges: this.merges.length,
      byStrategy: strategies,
      latestMergedId: this.merges[this.merges.length - 1]?.mergedId ?? null,
    };
  }
}
