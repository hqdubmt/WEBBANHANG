import { Injectable, Logger } from '@nestjs/common';

type BalanceMode = 'STABILITY' | 'EVOLUTION' | 'HYBRID';

@Injectable()
export class StabilityEvolutionBalancerService {
  private readonly logger = new Logger(StabilityEvolutionBalancerService.name);
  private mode: BalanceMode = 'HYBRID';
  private history: Array<{ mode: BalanceMode; changedAt: Date; reason: string }> = [];

  setMode(mode: string): void {
    const valid = ['STABILITY', 'EVOLUTION', 'HYBRID'];
    if (valid.includes(mode)) {
      this.mode = mode as BalanceMode;
      this.logger.log(`Balance mode set to ${mode}`);
    }
  }

  getBalanceSettings(): { explorationRate: number; stabilizationWeight: number; evolutionEnabled: boolean } {
    if (this.mode === 'STABILITY') return { explorationRate: 0.05, stabilizationWeight: 0.9, evolutionEnabled: false };
    if (this.mode === 'EVOLUTION') return { explorationRate: 0.6, stabilizationWeight: 0.2, evolutionEnabled: true };
    return { explorationRate: 0.3, stabilizationWeight: 0.5, evolutionEnabled: true };
  }

  autoBalance(revenueVariance: number, growthRate: number): void {
    let newMode: BalanceMode;
    if (revenueVariance > 0.3) { newMode = 'STABILITY'; }
    else if (growthRate < 0.01) { newMode = 'EVOLUTION'; }
    else { newMode = 'HYBRID'; }
    const reason = `variance=${revenueVariance.toFixed(2)}, growth=${growthRate.toFixed(2)}`;
    this.history.push({ mode: newMode, changedAt: new Date(), reason });
    this.mode = newMode;
  }

  getStats() { return { mode: this.mode, settings: this.getBalanceSettings(), history: this.history.slice(-5) }; }
}
