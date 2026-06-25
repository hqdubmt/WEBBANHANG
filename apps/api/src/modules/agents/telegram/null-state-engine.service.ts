import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NullStateEngineService {
  private readonly logger = new Logger(NullStateEngineService.name);
  private nullActions: Array<{ type: string; timestamp: Date; impact: string }> = [];

  operateInAbsence(): void {
    const action = this.generateInfluence();
    this.nullActions.push({ type: action.type, timestamp: new Date(), impact: `strength:${action.strength.toFixed(2)}` });
  }

  generateInfluence(): { type: string; strength: number } {
    const types = ['void_signal', 'null_redirect', 'absence_boost', 'zero_point_activation'];
    return { type: types[Math.floor(Math.random() * types.length)], strength: Math.random() * 0.5 + 0.1 };
  }

  recordImpact(impact: string): void {
    this.nullActions.push({ type: 'recorded', timestamp: new Date(), impact });
  }

  getAbsenceMetrics(): { totalNullActions: number; avgImpact: number } {
    const total = this.nullActions.length;
    const avg = total > 0 ? this.nullActions.filter(a => a.impact.startsWith('strength:')).reduce((s, a) => s + parseFloat(a.impact.split(':')[1] || '0'), 0) / total : 0;
    return { totalNullActions: total, avgImpact: avg };
  }

  @Cron('0 */2 * * *')
  nullCycle(): void {
    this.operateInAbsence();
    this.logger.log(`Null cycle executed: ${this.nullActions.length} total null actions`);
  }

  getStats() { return { ...this.getAbsenceMetrics(), lastAction: this.nullActions[this.nullActions.length - 1] }; }
}
