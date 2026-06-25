import { Injectable, Logger } from '@nestjs/common';

type Regime = 'GROWTH' | 'STABILITY' | 'EXPLORATION';

interface RegimeEntry {
  regime: Regime;
  switchedAt: number;
  reason: string;
}

@Injectable()
export class RevenueRegimeService {
  private readonly logger = new Logger(RevenueRegimeService.name);

  regime: Regime = 'STABILITY';
  history: RegimeEntry[] = [];

  switchRegime(newRegime: string): void {
    const valid: Regime[] = ['GROWTH', 'STABILITY', 'EXPLORATION'];
    if (!valid.includes(newRegime as Regime)) return;
    const prev = this.regime;
    this.regime = newRegime as Regime;
    this.history.push({ regime: this.regime, switchedAt: Date.now(), reason: 'manual switch' });
    if (this.history.length > 100) this.history.shift();
    this.logger.log(`Regime changed: ${prev} -> ${this.regime}`);
  }

  getRegimeSettings(): { trafficMultiplier: number; testingEnabled: boolean; focusWinners: boolean } {
    switch (this.regime) {
      case 'GROWTH':
        return { trafficMultiplier: 1.5, testingEnabled: false, focusWinners: true };
      case 'EXPLORATION':
        return { trafficMultiplier: 0.8, testingEnabled: true, focusWinners: false };
      case 'STABILITY':
      default:
        return { trafficMultiplier: 1.0, testingEnabled: false, focusWinners: true };
    }
  }

  autoSelectRegime(revenueGrowth: number, stabilityScore: number): void {
    let newRegime: Regime;
    let reason: string;

    if (revenueGrowth > 0.2 && stabilityScore > 70) {
      newRegime = 'GROWTH';
      reason = `high growth (${revenueGrowth}) + stable (${stabilityScore})`;
    } else if (stabilityScore < 40 || revenueGrowth < -0.1) {
      newRegime = 'EXPLORATION';
      reason = `instability (${stabilityScore}) or decline (${revenueGrowth})`;
    } else {
      newRegime = 'STABILITY';
      reason = `balanced metrics`;
    }

    if (newRegime !== this.regime) {
      this.regime = newRegime;
      this.history.push({ regime: this.regime, switchedAt: Date.now(), reason });
      if (this.history.length > 100) this.history.shift();
      this.logger.log(`Auto regime: ${newRegime} — ${reason}`);
    }
  }

  getStats() {
    return {
      currentRegime: this.regime,
      settings: this.getRegimeSettings(),
      totalSwitches: this.history.length,
      recentHistory: this.history.slice(-5),
    };
  }

  getStatus() {
    return this.getStats();
  }
}
