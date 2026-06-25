import { Injectable, Logger } from '@nestjs/common';

type Budget = { traffic: number; content: number; compute: number; postingFreq: number };

@Injectable()
export class CivilizationResourceAllocatorService {
  private readonly logger = new Logger(CivilizationResourceAllocatorService.name);

  budget: Budget = { traffic: 1000, content: 500, compute: 100, postingFreq: 20 };

  allocations: Map<string, Record<string, number>> = new Map();

  allocateTo(regionId: string, resources: Partial<Budget>): void {
    const existing = this.allocations.get(regionId) ?? {};
    const updated = { ...existing };
    for (const [key, value] of Object.entries(resources)) {
      if (value !== undefined) {
        updated[key] = (updated[key] ?? 0) + value;
      }
    }
    this.allocations.set(regionId, updated);
    this.logger.debug(`Allocated to ${regionId}: ${JSON.stringify(resources)}`);
  }

  reallocate(from: string, to: string, resourceType: string, amount: number): void {
    const fromAlloc = this.allocations.get(from) ?? {};
    const toAlloc = this.allocations.get(to) ?? {};

    const available = fromAlloc[resourceType] ?? 0;
    const actual = Math.min(amount, available);

    fromAlloc[resourceType] = available - actual;
    toAlloc[resourceType] = (toAlloc[resourceType] ?? 0) + actual;

    this.allocations.set(from, fromAlloc);
    this.allocations.set(to, toAlloc);

    this.logger.log(`Reallocated ${actual} of ${resourceType} from ${from} → ${to}`);
  }

  getAllocations(): Map<string, Record<string, number>> {
    return this.allocations;
  }

  getStats() {
    let totalTraffic = 0;
    let totalContent = 0;
    for (const alloc of this.allocations.values()) {
      totalTraffic += alloc['traffic'] ?? 0;
      totalContent += alloc['content'] ?? 0;
    }
    return {
      regions: this.allocations.size,
      totalTrafficAllocated: totalTraffic,
      totalContentAllocated: totalContent,
      budget: this.budget,
    };
  }
}
