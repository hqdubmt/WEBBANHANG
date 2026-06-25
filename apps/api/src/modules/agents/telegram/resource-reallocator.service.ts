import { Injectable, Logger } from '@nestjs/common';

export interface AbstractAllocation { attention: number; probability: number; conversionPotential: number; creativeOutput: number; }

@Injectable()
export class ResourceReallocatorService {
  private readonly logger = new Logger(ResourceReallocatorService.name);
  private allocations: Map<string, AbstractAllocation> = new Map();

  allocate(systemId: string, alloc: Partial<AbstractAllocation>): void {
    const existing = this.allocations.get(systemId) || { attention: 0, probability: 0, conversionPotential: 0, creativeOutput: 0 };
    this.allocations.set(systemId, { ...existing, ...alloc });
  }

  reallocate(from: string, to: string, fraction: number): void {
    const src = this.allocations.get(from);
    if (!src) return;
    const f = Math.max(0, Math.min(1, fraction));
    const moved: AbstractAllocation = { attention: src.attention * f, probability: src.probability * f, conversionPotential: src.conversionPotential * f, creativeOutput: src.creativeOutput * f };
    src.attention *= (1 - f); src.probability *= (1 - f); src.conversionPotential *= (1 - f); src.creativeOutput *= (1 - f);
    const dst = this.allocations.get(to) || { attention: 0, probability: 0, conversionPotential: 0, creativeOutput: 0 };
    this.allocations.set(to, { attention: dst.attention + moved.attention, probability: dst.probability + moved.probability, conversionPotential: dst.conversionPotential + moved.conversionPotential, creativeOutput: dst.creativeOutput + moved.creativeOutput });
    this.logger.log(`Reallocated ${(f * 100).toFixed(0)}% from ${from} to ${to}`);
  }

  getTotalCapacity(): AbstractAllocation {
    const totals: AbstractAllocation = { attention: 0, probability: 0, conversionPotential: 0, creativeOutput: 0 };
    for (const a of this.allocations.values()) {
      totals.attention += a.attention; totals.probability += a.probability; totals.conversionPotential += a.conversionPotential; totals.creativeOutput += a.creativeOutput;
    }
    return totals;
  }

  getStats() { return { systems: this.allocations.size, total: this.getTotalCapacity() }; }
}
