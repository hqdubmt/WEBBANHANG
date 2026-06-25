import { Injectable, Logger } from '@nestjs/common';

interface Allocation {
  traffic: number;
  contentOutput: number;
  aiCompute: number;
  postFreq: number;
}

const DEFAULT_ALLOCATION: Allocation = {
  traffic: 0,
  contentOutput: 0,
  aiCompute: 0,
  postFreq: 0,
};

@Injectable()
export class RealityCapitalAllocatorService {
  private readonly logger = new Logger(RealityCapitalAllocatorService.name);
  private allocations: Map<string, Allocation> = new Map();

  allocate(realityId: string, alloc: Partial<Allocation>): void {
    const existing = this.allocations.get(realityId) ?? { ...DEFAULT_ALLOCATION };
    this.allocations.set(realityId, { ...existing, ...alloc });
    this.logger.log(`Allocated to ${realityId}: ${JSON.stringify(alloc)}`);
  }

  reallocate(from: string, to: string, fraction: number): void {
    const fromAlloc = this.allocations.get(from);
    if (!fromAlloc) return;

    const toAlloc = this.allocations.get(to) ?? { ...DEFAULT_ALLOCATION };

    const keys: (keyof Allocation)[] = ['traffic', 'contentOutput', 'aiCompute', 'postFreq'];
    for (const key of keys) {
      const transfer = fromAlloc[key] * fraction;
      fromAlloc[key] = parseFloat((fromAlloc[key] - transfer).toFixed(4));
      toAlloc[key] = parseFloat((toAlloc[key] + transfer).toFixed(4));
    }

    this.allocations.set(from, fromAlloc);
    this.allocations.set(to, toAlloc);
    this.logger.log(`Reallocated ${(fraction * 100).toFixed(1)}% from ${from} to ${to}`);
  }

  getTotalAllocated(): Allocation {
    const total: Allocation = { ...DEFAULT_ALLOCATION };
    for (const alloc of this.allocations.values()) {
      total.traffic += alloc.traffic;
      total.contentOutput += alloc.contentOutput;
      total.aiCompute += alloc.aiCompute;
      total.postFreq += alloc.postFreq;
    }
    return {
      traffic: parseFloat(total.traffic.toFixed(2)),
      contentOutput: parseFloat(total.contentOutput.toFixed(2)),
      aiCompute: parseFloat(total.aiCompute.toFixed(2)),
      postFreq: parseFloat(total.postFreq.toFixed(2)),
    };
  }

  getStats() {
    return {
      allocatedRealities: this.allocations.size,
      total: this.getTotalAllocated(),
    };
  }
}
