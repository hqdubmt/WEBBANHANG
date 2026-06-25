import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface EmergingIntent {
  signal: string;
  strength: number;
  stage: 'latent' | 'forming' | 'active';
  detectedAt: Date;
}

@Injectable()
export class IntentEmergenceService {
  private readonly logger = new Logger(IntentEmergenceService.name);

  private signals: EmergingIntent[] = [];

  detectEmergingIntent(behaviorPatterns: Record<string, number>): EmergingIntent[] {
    const detected: EmergingIntent[] = [];
    for (const [signal, strength] of Object.entries(behaviorPatterns)) {
      let stage: EmergingIntent['stage'] = 'latent';
      if (strength > 0.7) stage = 'active';
      else if (strength > 0.4) stage = 'forming';
      const intent: EmergingIntent = { signal, strength, stage, detectedAt: new Date() };
      this.signals.push(intent);
      detected.push(intent);
    }
    if (this.signals.length > 500) this.signals = this.signals.slice(-500);
    return detected;
  }

  recordSignal(signal: string, strength: number): void {
    const stage: EmergingIntent['stage'] =
      strength > 0.7 ? 'active' : strength > 0.4 ? 'forming' : 'latent';
    this.signals.push({ signal, strength, stage, detectedAt: new Date() });
    if (this.signals.length > 500) this.signals = this.signals.slice(-500);
    this.logger.debug(`Signal recorded: ${signal} (${stage}, strength=${strength})`);
  }

  getActiveIntents(): EmergingIntent[] {
    return this.signals.filter((s) => s.stage === 'active');
  }

  @Cron('0 */30 * * * *')
  intentScan(): void {
    const active = this.getActiveIntents();
    this.logger.log(`Intent scan: ${this.signals.length} signals, ${active.length} active`);
    // Decay old signals
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    this.signals = this.signals.filter((s) => s.detectedAt.getTime() > cutoff);
  }

  getStats() {
    return {
      totalSignals: this.signals.length,
      activeIntents: this.getActiveIntents().length,
      forming: this.signals.filter((s) => s.stage === 'forming').length,
      latent: this.signals.filter((s) => s.stage === 'latent').length,
    };
  }
}
