import { Injectable, Logger } from '@nestjs/common';

export interface CapitalAlloc {
  modelId: string;
  trafficShare: number;
  contentVolume: number;
  postingFreq: number;
  channelWeight: number;
  updatedAt: Date;
}

@Injectable()
export class CapitalAllocationService {
  private readonly logger = new Logger(CapitalAllocationService.name);

  allocations: Map<string, CapitalAlloc> = new Map([
    ['affiliate', { modelId: 'affiliate', trafficShare: 0.4, contentVolume: 20, postingFreq: 3, channelWeight: 1.2, updatedAt: new Date() }],
    ['content', { modelId: 'content', trafficShare: 0.3, contentVolume: 15, postingFreq: 2, channelWeight: 1.0, updatedAt: new Date() }],
    ['flashdeal', { modelId: 'flashdeal', trafficShare: 0.2, contentVolume: 10, postingFreq: 4, channelWeight: 1.5, updatedAt: new Date() }],
    ['review', { modelId: 'review', trafficShare: 0.1, contentVolume: 5, postingFreq: 1, channelWeight: 0.8, updatedAt: new Date() }],
  ]);

  allocate(modelId: string, alloc: Partial<CapitalAlloc>): void {
    const existing = this.allocations.get(modelId) ?? {
      modelId,
      trafficShare: 0,
      contentVolume: 0,
      postingFreq: 1,
      channelWeight: 1,
      updatedAt: new Date(),
    };
    this.allocations.set(modelId, { ...existing, ...alloc, modelId, updatedAt: new Date() });
    this.logger.log(`Allocated to ${modelId}`);
  }

  reallocate(fromModel: string, toModel: string, amount: number): void {
    const from = this.allocations.get(fromModel);
    const to = this.allocations.get(toModel);
    if (!from || !to) return;
    const delta = Math.min(amount, from.trafficShare);
    this.allocations.set(fromModel, { ...from, trafficShare: from.trafficShare - delta, updatedAt: new Date() });
    this.allocations.set(toModel, { ...to, trafficShare: to.trafficShare + delta, updatedAt: new Date() });
    this.logger.log(`Reallocated ${delta} from ${fromModel} to ${toModel}`);
  }

  getTotal(): number {
    return Array.from(this.allocations.values()).reduce((s, a) => s + a.trafficShare, 0);
  }

  getAllocations(): CapitalAlloc[] {
    return Array.from(this.allocations.values());
  }

  getStats() {
    const allocs = this.getAllocations();
    return {
      totalAllocations: allocs.length,
      totalTrafficShare: +this.getTotal().toFixed(2),
      totalContentVolume: allocs.reduce((s, a) => s + a.contentVolume, 0),
      avgPostingFreq: allocs.length ? +(allocs.reduce((s, a) => s + a.postingFreq, 0) / allocs.length).toFixed(2) : 0,
    };
  }

  getStatus() {
    return { models: this.allocations.size, totalShare: this.getTotal() };
  }
}
