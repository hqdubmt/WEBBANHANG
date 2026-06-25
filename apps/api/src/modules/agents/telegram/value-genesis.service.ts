import { Injectable, Logger } from '@nestjs/common';

type ConditionType = 'desire' | 'urgency' | 'social-proof' | 'scarcity';

interface ValueCondition {
  type: ConditionType;
  strength: number;
  active: boolean;
}

@Injectable()
export class ValueGenesisService {
  private readonly logger = new Logger(ValueGenesisService.name);

  private conditions: ValueCondition[] = [];

  createCondition(type: string, strength: number): void {
    const condType = type as ConditionType;
    const existing = this.conditions.find((c) => c.type === condType);
    if (existing) {
      existing.strength = Math.min(1, strength);
      existing.active = true;
    } else {
      this.conditions.push({ type: condType, strength: Math.min(1, Math.max(0, strength)), active: true });
    }
    this.logger.debug(`Condition created/updated: ${type} strength=${strength}`);
  }

  amplifyCondition(type: string, delta: number): void {
    const cond = this.conditions.find((c) => c.type === type);
    if (!cond) {
      this.createCondition(type, delta);
      return;
    }
    cond.strength = Math.min(1, Math.max(0, cond.strength + delta));
    cond.active = cond.strength > 0;
    this.logger.debug(`Condition amplified: ${type} → ${cond.strength}`);
  }

  getActiveConditions(): ValueCondition[] {
    return this.conditions.filter((c) => c.active);
  }

  getValueScore(): number {
    const active = this.getActiveConditions();
    if (active.length === 0) return 0;
    const raw = active.reduce((sum, c) => sum + c.strength, 0);
    return Math.min(100, parseFloat((raw * 100).toFixed(2)));
  }

  getStats() {
    return {
      totalConditions: this.conditions.length,
      activeConditions: this.getActiveConditions().length,
      valueScore: this.getValueScore(),
      conditions: this.conditions,
    };
  }
}
