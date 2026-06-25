import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface Reality {
  id: string;
  rules: Record<string, any>;
  simRevenue: number;
  simStability: number;
  active: boolean;
  createdAt: Date;
}

@Injectable()
export class RevenueRealityGeneratorService {
  private readonly logger = new Logger(RevenueRealityGeneratorService.name);
  private realities: Map<string, Reality> = new Map();

  createReality(rules: Record<string, any> = {}): Reality {
    const id = uuidv4();
    const reality: Reality = {
      id,
      rules: {
        baseConversionRate: 0.03,
        trafficMultiplier: 1.0,
        contentQuality: 0.8,
        ...rules,
      },
      simRevenue: Math.random() * 5000 + 500,
      simStability: Math.random() * 0.4 + 0.6,
      active: true,
      createdAt: new Date(),
    };
    this.realities.set(id, reality);
    this.logger.log(`Created reality ${id} with simRevenue=${reality.simRevenue.toFixed(2)}`);
    return reality;
  }

  getActiveRealities(): Reality[] {
    return Array.from(this.realities.values()).filter(r => r.active);
  }

  destroyReality(id: string): void {
    const reality = this.realities.get(id);
    if (reality) {
      reality.active = false;
      this.logger.log(`Destroyed reality ${id}`);
    }
  }

  getStats() {
    const all = Array.from(this.realities.values());
    const active = all.filter(r => r.active);
    const totalRevenue = active.reduce((sum, r) => sum + r.simRevenue, 0);
    return {
      totalRealities: all.length,
      activeRealities: active.length,
      totalSimRevenue: parseFloat(totalRevenue.toFixed(2)),
      avgStability: active.length > 0
        ? parseFloat((active.reduce((s, r) => s + r.simStability, 0) / active.length).toFixed(3))
        : 0,
    };
  }
}
