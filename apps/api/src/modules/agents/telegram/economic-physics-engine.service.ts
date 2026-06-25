import { Injectable, Logger } from '@nestjs/common';

interface PhysicsModel {
  trafficFlow: number;
  clickConversionRate: number;
  contentVirality: number;
  consumptionRate: number;
}

@Injectable()
export class EconomicPhysicsEngineService {
  private readonly logger = new Logger(EconomicPhysicsEngineService.name);
  private models: Map<string, PhysicsModel> = new Map();

  definePhysics(realityId: string, model: PhysicsModel): void {
    this.models.set(realityId, { ...model });
    this.logger.log(`Defined physics for reality ${realityId}`);
  }

  simulate(realityId: string, input: Record<string, number>): Record<string, number> {
    const model = this.models.get(realityId);
    if (!model) {
      return { error: -1 };
    }
    const traffic = (input['traffic'] ?? 1000) * model.trafficFlow;
    const clicks = traffic * model.clickConversionRate;
    const viralReach = clicks * model.contentVirality;
    const consumed = viralReach * model.consumptionRate;
    const revenue = consumed * (input['avgOrderValue'] ?? 50);

    return {
      traffic: parseFloat(traffic.toFixed(2)),
      clicks: parseFloat(clicks.toFixed(2)),
      viralReach: parseFloat(viralReach.toFixed(2)),
      consumed: parseFloat(consumed.toFixed(2)),
      revenue: parseFloat(revenue.toFixed(2)),
    };
  }

  getModel(realityId: string): PhysicsModel | undefined {
    return this.models.get(realityId);
  }

  getStats() {
    return {
      totalModels: this.models.size,
      modelIds: Array.from(this.models.keys()),
      avgTrafficFlow: this.models.size > 0
        ? parseFloat(
            (Array.from(this.models.values()).reduce((s, m) => s + m.trafficFlow, 0) / this.models.size).toFixed(3),
          )
        : 0,
    };
  }
}
