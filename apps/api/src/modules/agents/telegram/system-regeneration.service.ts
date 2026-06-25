import { Injectable, Logger } from '@nestjs/common';

export interface Regen { trigger: 'stagnation' | 'ceiling' | 'collapse'; oldSystem: string; newSystem: string; timestamp: Date; }

@Injectable()
export class SystemRegenerationService {
  private readonly logger = new Logger(SystemRegenerationService.name);
  private regenerations: Regen[] = [];
  private systemCounter: number = 0;

  detectStagnation(growthHistory: number[]): boolean {
    if (growthHistory.length < 5) return false;
    const avg = growthHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
    return Math.abs(avg) < 0.005;
  }

  triggerRegeneration(reason: string): void {
    const trigger = reason as Regen['trigger'];
    const oldSystem = `system_v${this.systemCounter}`;
    this.systemCounter++;
    const newSystem = `system_v${this.systemCounter}`;
    this.regenerations.push({ trigger, oldSystem, newSystem, timestamp: new Date() });
    this.logger.log(`System regenerated: ${oldSystem} → ${newSystem} (trigger: ${reason})`);
  }

  buildNewSystem(): Record<string, any> {
    return { id: `system_v${this.systemCounter}`, architecture: 'dynamic', channels: ['telegram', 'facebook'], strategies: ['affiliate', 'content'], createdAt: new Date() };
  }

  getStats() { return { regenerations: this.regenerations.length, currentVersion: this.systemCounter, history: this.regenerations.slice(-3) }; }
}
