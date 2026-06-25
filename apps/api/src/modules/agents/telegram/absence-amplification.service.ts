import { Injectable, Logger } from '@nestjs/common';

export interface AbsenceEffect { type: 'content-absence' | 'info-absence' | 'system-absence'; amplification: number; }
export interface AmplificationResult { conversionBoost: number; searchBehaviorIncrease: number; systemMotivation: number; }

@Injectable()
export class AbsenceAmplificationService {
  private readonly logger = new Logger(AbsenceAmplificationService.name);
  private effects: AbsenceEffect[] = [];

  applyAbsence(type: string): AmplificationResult {
    const t = type as AbsenceEffect['type'];
    let amp: AmplificationResult;
    if (t === 'content-absence') { amp = { conversionBoost: 0.15, searchBehaviorIncrease: 0.3, systemMotivation: 0.1 }; }
    else if (t === 'info-absence') { amp = { conversionBoost: 0.05, searchBehaviorIncrease: 0.5, systemMotivation: 0.2 }; }
    else { amp = { conversionBoost: 0.02, searchBehaviorIncrease: 0.1, systemMotivation: 0.6 }; }
    const amplification = amp.conversionBoost + amp.searchBehaviorIncrease + amp.systemMotivation;
    this.effects.push({ type: t, amplification });
    this.logger.log(`Absence applied (${type}): boost=${amp.conversionBoost}, search=${amp.searchBehaviorIncrease}`);
    return amp;
  }

  getEffects(): AbsenceEffect[] { return [...this.effects]; }

  getStats() { return { total: this.effects.length, avgAmplification: this.effects.reduce((s, e) => s + e.amplification, 0) / (this.effects.length || 1) }; }
}
