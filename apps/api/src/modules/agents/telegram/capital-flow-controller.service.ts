import { Injectable, Logger } from '@nestjs/common';

export interface FlowConfig {
  sectorId: string;
  trafficAlloc: number;
  contentCapacity: number;
  postingFreq: number;
  channelWeight: number;
}

@Injectable()
export class CapitalFlowControllerService {
  private readonly logger = new Logger(CapitalFlowControllerService.name);

  flows: Map<string, FlowConfig> = new Map([
    ['affiliate', { sectorId: 'affiliate', trafficAlloc: 0.40, contentCapacity: 20, postingFreq: 3, channelWeight: 1.2 }],
    ['content', { sectorId: 'content', trafficAlloc: 0.30, contentCapacity: 15, postingFreq: 2, channelWeight: 1.0 }],
    ['ads', { sectorId: 'ads', trafficAlloc: 0.20, contentCapacity: 8, postingFreq: 1, channelWeight: 0.8 }],
    ['flashdeal', { sectorId: 'flashdeal', trafficAlloc: 0.10, contentCapacity: 12, postingFreq: 4, channelWeight: 1.5 }],
  ]);

  setFlow(sectorId: string, config: FlowConfig): void {
    this.flows.set(sectorId, { ...config, sectorId });
    this.logger.log(`Flow set for ${sectorId}`);
  }

  boostSector(sectorId: string, multiplier: number): void {
    const flow = this.flows.get(sectorId);
    if (!flow) return;
    this.flows.set(sectorId, {
      ...flow,
      trafficAlloc: flow.trafficAlloc * multiplier,
      contentCapacity: Math.round(flow.contentCapacity * multiplier),
      postingFreq: Math.round(flow.postingFreq * multiplier),
    });
    this.logger.log(`Boosted ${sectorId} by ${multiplier}x`);
  }

  reduceSector(sectorId: string, factor: number): void {
    const flow = this.flows.get(sectorId);
    if (!flow) return;
    this.flows.set(sectorId, {
      ...flow,
      trafficAlloc: flow.trafficAlloc * factor,
      contentCapacity: Math.max(1, Math.round(flow.contentCapacity * factor)),
      postingFreq: Math.max(1, Math.round(flow.postingFreq * factor)),
    });
    this.logger.log(`Reduced ${sectorId} by factor ${factor}`);
  }

  rebalance(): void {
    const totalAlloc = Array.from(this.flows.values()).reduce((s, f) => s + f.trafficAlloc, 0);
    if (totalAlloc === 0) return;
    for (const [id, flow] of this.flows) {
      this.flows.set(id, { ...flow, trafficAlloc: flow.trafficAlloc / totalAlloc });
    }
    this.logger.log('Rebalanced all sector traffic allocations to sum=1.0');
  }

  getFlows(): FlowConfig[] {
    return Array.from(this.flows.values());
  }

  getStats() {
    const flows = this.getFlows();
    const totalTraffic = flows.reduce((s, f) => s + f.trafficAlloc, 0);
    const totalCapacity = flows.reduce((s, f) => s + f.contentCapacity, 0);
    return {
      sectors: flows.length,
      totalTrafficAlloc: +totalTraffic.toFixed(2),
      totalContentCapacity: totalCapacity,
      avgPostingFreq: flows.length ? +(flows.reduce((s, f) => s + f.postingFreq, 0) / flows.length).toFixed(1) : 0,
    };
  }

  getStatus() {
    return { sectors: this.flows.size };
  }
}
