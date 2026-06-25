import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PreCausalityEngineService {
  private readonly logger = new Logger(PreCausalityEngineService.name);
  private effects: Array<{ effect: string; noKnownCause: boolean; timestamp: Date }> = [];
  effectCount: number = 0;

  generateEffect(type: string): void {
    this.effectCount++;
    this.effects.push({ effect: type, noKnownCause: true, timestamp: new Date() });
    this.logger.log(`Pre-causal effect generated: ${type} (no cause)`);
  }

  observeEffect(effect: string): void {
    this.effects.push({ effect, noKnownCause: false, timestamp: new Date() });
  }

  getEffects(): typeof this.effects { return [...this.effects]; }

  getNoCauseEffects(): typeof this.effects { return this.effects.filter(e => e.noKnownCause); }

  getStats() { return { total: this.effects.length, noCause: this.getNoCauseEffects().length, effectCount: this.effectCount }; }
}
