import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

export interface GrowthPlan {
  civId: string;
  targetRevenue: number;
  newRegions: number;
  timeline: number;
  status: 'planned' | 'executing' | 'done';
}

@Injectable()
export class CivilizationGrowthService {
  private readonly logger = new Logger(CivilizationGrowthService.name);

  growthPlans: Map<string, GrowthPlan> = new Map();

  planGrowth(civId: string, targetRevenue: number): GrowthPlan {
    const plan: GrowthPlan = {
      civId,
      targetRevenue,
      newRegions: Math.ceil(targetRevenue / 200),
      timeline: 7,
      status: 'planned',
    };
    this.growthPlans.set(civId, plan);
    this.logger.log(`Growth plan for ${civId}: target=${targetRevenue}, newRegions=${plan.newRegions}`);
    return plan;
  }

  executeGrowth(civId: string): void {
    const plan = this.growthPlans.get(civId);
    if (!plan) {
      this.logger.warn(`No growth plan for ${civId}`);
      return;
    }
    plan.status = 'executing';
    this.logger.log(`Executing growth plan for ${civId}`);
    // Simulate instant completion for in-memory model
    setTimeout(() => {
      plan.status = 'done';
      this.logger.log(`Growth plan done for ${civId}`);
    }, 0);
  }

  getActivePlans(): GrowthPlan[] {
    return Array.from(this.growthPlans.values()).filter(
      p => p.status === 'planned' || p.status === 'executing',
    );
  }

  @Cron('0 */8 * * *')
  growthCycle() {
    this.logger.log('Growth cycle triggered');
    for (const plan of this.growthPlans.values()) {
      if (plan.status === 'planned') {
        this.executeGrowth(plan.civId);
      }
    }
  }

  getStats() {
    const plans = Array.from(this.growthPlans.values());
    return {
      total: plans.length,
      planned: plans.filter(p => p.status === 'planned').length,
      executing: plans.filter(p => p.status === 'executing').length,
      done: plans.filter(p => p.status === 'done').length,
    };
  }
}
