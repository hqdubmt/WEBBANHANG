import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SingularityGovernorService {
  private readonly logger = new Logger(SingularityGovernorService.name);
  private evolutionRate: number = 1;
  private stabilityThreshold: number = 0.5;
  private governLog: Array<{ decision: string; stability: number; pressure: number; timestamp: Date }> = [];

  govern(currentStability: number, evolutionPressure: number): 'allow' | 'throttle' | 'pause' {
    let decision: 'allow' | 'throttle' | 'pause';
    if (currentStability < 0.2) { decision = 'pause'; }
    else if (currentStability < this.stabilityThreshold || evolutionPressure > 0.8) { decision = 'throttle'; }
    else { decision = 'allow'; }
    this.governLog.push({ decision, stability: currentStability, pressure: evolutionPressure, timestamp: new Date() });
    return decision;
  }

  setThreshold(threshold: number): void { this.stabilityThreshold = Math.max(0, Math.min(1, threshold)); }

  getStats() {
    return { evolutionRate: this.evolutionRate, stabilityThreshold: this.stabilityThreshold, decisions: this.governLog.length, lastDecision: this.governLog[this.governLog.length - 1] };
  }
}
