import { Injectable, Logger } from '@nestjs/common';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export type DistributionChannel = 'telegram' | 'facebook' | 'discord' | 'zalo' | 'youtube';

// Telegram cao nhất vì direct conversion tốt nhất
const DEFAULT_WEIGHTS: Record<DistributionChannel, number> = {
  telegram: 1.0,
  facebook: 0.8,
  discord:  0.7,
  zalo:     0.6,
  youtube:  0.6,
};

// Mapping từ tracker source sang channel
const SOURCE_TO_CHANNEL: Record<string, DistributionChannel> = {
  tele: 'telegram',
  fb: 'facebook',
  discord: 'discord',
  zalo: 'zalo',
  opt: 'telegram',
};

@Injectable()
export class DistributionWeightService {
  private readonly logger = new Logger(DistributionWeightService.name);
  private readonly weights: Record<DistributionChannel, number> = { ...DEFAULT_WEIGHTS };

  constructor(private readonly tracker: AffiliateTrackerService) {}

  getWeight(channel: DistributionChannel): number {
    return this.weights[channel] ?? 0.5;
  }

  getAllWeights(): Record<DistributionChannel, number> {
    return { ...this.weights };
  }

  // Auto-adjust weights dựa trên click data từ tracker
  recalibrate(): void {
    const stats = this.tracker.getStats();
    const totalByChannel: Partial<Record<DistributionChannel, number>> = {};

    for (const [src, count] of Object.entries(stats.ctrBySource)) {
      const ch = SOURCE_TO_CHANNEL[src];
      if (ch) totalByChannel[ch] = (totalByChannel[ch] || 0) + count;
    }

    const channels = Object.keys(DEFAULT_WEIGHTS) as DistributionChannel[];
    const totalClicks = Object.values(totalByChannel).reduce((a, b) => a + b, 0);

    if (totalClicks < 20) {
      this.logger.debug('DistributionWeight: chưa đủ data để recalibrate (<20 clicks)');
      return;
    }

    for (const ch of channels) {
      const clicks = totalByChannel[ch] || 0;
      const clickShare = clicks / totalClicks;
      // Blend: 70% default + 30% performance-based
      const perfWeight = Math.min(1.0, clickShare * channels.length);
      const newWeight = 0.7 * DEFAULT_WEIGHTS[ch] + 0.3 * perfWeight;
      const prev = this.weights[ch];
      this.weights[ch] = Math.round(newWeight * 100) / 100;

      if (Math.abs(this.weights[ch] - prev) >= 0.05) {
        this.logger.log(`Weight [${ch}]: ${prev.toFixed(2)} → ${this.weights[ch].toFixed(2)} (clicks: ${clicks}/${totalClicks})`);
      }
    }
  }

  resetToDefault(): void {
    Object.assign(this.weights, DEFAULT_WEIGHTS);
    this.logger.log('Distribution weights reset về mặc định');
  }
}
