import { Injectable, Logger } from '@nestjs/common';

interface Incident {
  type: string;
  timestamp: Date;
  resolved: boolean;
}

@Injectable()
export class EcosystemStabilizerService {
  private readonly logger = new Logger(EcosystemStabilizerService.name);

  maxInstances: number = 10;
  targetRevenuePerInstance: number = 100;
  incidents: Incident[] = [];

  checkOverload(instanceCount: number, totalTraffic: number): boolean {
    const trafficPerInstance = instanceCount > 0 ? totalTraffic / instanceCount : 0;
    const overloaded = instanceCount > this.maxInstances || trafficPerInstance > 500;
    if (overloaded) {
      const incident: Incident = { type: 'overload', timestamp: new Date(), resolved: false };
      this.incidents.push(incident);
      this.logger.warn(`Ecosystem overload: instances=${instanceCount}, traffic/inst=${trafficPerInstance.toFixed(0)}`);
    }
    return overloaded;
  }

  stabilize(instances: Array<{ id: string; revenue: number }>): { remove: string[]; boost: string[] } {
    const target = this.targetRevenuePerInstance;
    const remove: string[] = [];
    const boost: string[] = [];

    for (const inst of instances) {
      if (inst.revenue < target * 0.3) {
        remove.push(inst.id);
      } else if (inst.revenue < target * 0.7) {
        boost.push(inst.id);
      }
    }

    // Cap instances if over max
    if (instances.length > this.maxInstances) {
      const sorted = [...instances].sort((a, b) => a.revenue - b.revenue);
      const excess = sorted.slice(0, instances.length - this.maxInstances);
      for (const e of excess) {
        if (!remove.includes(e.id)) remove.push(e.id);
      }
    }

    if (remove.length > 0 || boost.length > 0) {
      this.logger.log(`Stabilize: remove=${remove.length}, boost=${boost.length}`);
      const incident: Incident = { type: 'stabilization', timestamp: new Date(), resolved: true };
      this.incidents.push(incident);
    }

    return { remove, boost };
  }

  getStats() {
    return {
      maxInstances: this.maxInstances,
      targetRevenuePerInstance: this.targetRevenuePerInstance,
      totalIncidents: this.incidents.length,
      unresolvedIncidents: this.incidents.filter(i => !i.resolved).length,
    };
  }
}
