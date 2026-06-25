import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class VoidInfluenceFieldService {
  private readonly logger = new Logger(VoidInfluenceFieldService.name);
  private voidStrength: number = 0;
  private mutations: Array<{ delta: number; timestamp: Date }> = [];

  generateVoidImpulse(): number {
    return (Math.random() - 0.5) * 0.3;
  }

  applyToSystem(strength: number): void {
    this.voidStrength = Math.max(0, Math.min(1, this.voidStrength + strength));
  }

  recordMutation(delta: number): void {
    this.mutations.push({ delta, timestamp: new Date() });
    this.voidStrength = Math.max(0, this.voidStrength + delta * 0.1);
  }

  getVoidState(): { strength: number; totalMutations: number } {
    return { strength: this.voidStrength, totalMutations: this.mutations.length };
  }

  @Cron('0 */3 * * *')
  voidPulse(): void {
    const impulse = this.generateVoidImpulse();
    this.applyToSystem(impulse);
    this.logger.log(`Void pulse: impulse=${impulse.toFixed(3)}, strength=${this.voidStrength.toFixed(3)}`);
  }

  getStats() { return { ...this.getVoidState(), lastMutation: this.mutations[this.mutations.length - 1] }; }
}
