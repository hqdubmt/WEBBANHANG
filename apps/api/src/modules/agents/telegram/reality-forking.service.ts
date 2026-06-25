import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface Fork {
  originalId: string;
  forkId: string;
  changedParam: string;
  changedValue: any;
  createdAt: Date;
}

@Injectable()
export class RealtiyForkingService {
  private readonly logger = new Logger(RealtiyForkingService.name);
  private forks: Fork[] = [];

  fork(originalId: string, param: string, value: any): Fork {
    const fork: Fork = {
      originalId,
      forkId: uuidv4(),
      changedParam: param,
      changedValue: value,
      createdAt: new Date(),
    };
    this.forks.push(fork);
    this.logger.log(`Forked reality ${originalId} → ${fork.forkId} (param=${param})`);
    return fork;
  }

  getForks(originalId: string): Fork[] {
    return this.forks.filter(f => f.originalId === originalId);
  }

  compareFork(originalId: string, forkId: string, metric: string): number {
    const original = this.forks.find(f => f.forkId === originalId);
    const fork = this.forks.find(f => f.forkId === forkId);

    if (!fork) return 0;

    // Simulate metric difference — numeric changedValue affects metric by scaling
    const baseValue = typeof fork.changedValue === 'number' ? fork.changedValue : 1;
    const originalBase = original ? (typeof original.changedValue === 'number' ? original.changedValue : 1) : 1;
    const diff = (baseValue - originalBase) * (metric.length % 5 + 1) * 0.1;

    return parseFloat(diff.toFixed(4));
  }

  getStats() {
    const byOriginal = this.forks.reduce<Record<string, number>>((acc, f) => {
      acc[f.originalId] = (acc[f.originalId] ?? 0) + 1;
      return acc;
    }, {});
    return {
      totalForks: this.forks.length,
      uniqueOriginals: Object.keys(byOriginal).length,
      mostForked: Object.entries(byOriginal).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
    };
  }
}
