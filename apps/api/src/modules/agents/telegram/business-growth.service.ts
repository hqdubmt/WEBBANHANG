import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface GrowthAction {
  action: string;
  modelId: string;
  timestamp: Date;
}

@Injectable()
export class BusinessGrowthService {
  private readonly logger = new Logger(BusinessGrowthService.name);

  growthTargets: Map<string, number> = new Map([
    ['affiliate', 1.5],
    ['content', 1.3],
    ['flashdeal', 2.0],
    ['review', 1.1],
  ]);

  expandedChannels: Set<string> = new Set();
  growthActions: GrowthAction[] = [];

  setGrowthTarget(modelId: string, multiplier: number): void {
    this.growthTargets.set(modelId, multiplier);
    this.logger.log(`Growth target set for ${modelId}: ${multiplier}x`);
  }

  scaleModel(modelId: string): { trafficIncrease: number; contentIncrease: number } {
    const multiplier = this.growthTargets.get(modelId) ?? 1.0;
    const trafficIncrease = Math.round((multiplier - 1) * 100);
    const contentIncrease = Math.round((multiplier - 1) * 80);
    this.growthActions.push({ action: `SCALE:${multiplier}x`, modelId, timestamp: new Date() });
    this.logger.log(`Scaled ${modelId}: traffic+${trafficIncrease}%, content+${contentIncrease}%`);
    return { trafficIncrease, contentIncrease };
  }

  expandChannel(channel: string): void {
    if (!this.expandedChannels.has(channel)) {
      this.expandedChannels.add(channel);
      this.growthActions.push({ action: 'EXPAND_CHANNEL', modelId: channel, timestamp: new Date() });
      this.logger.log(`Expanded channel: ${channel}`);
    }
  }

  @Cron('0 */12 * * *')
  growthLoop(): void {
    this.logger.log('[Growth] Running autonomous growth loop');
    for (const [modelId, multiplier] of this.growthTargets) {
      if (multiplier > 1.2) {
        this.scaleModel(modelId);
      }
    }
    ['telegram', 'facebook', 'youtube'].forEach(ch => this.expandChannel(ch));
  }

  getStats() {
    return {
      trackedModels: this.growthTargets.size,
      expandedChannels: Array.from(this.expandedChannels),
      totalActions: this.growthActions.length,
      recentActions: this.growthActions.slice(-5),
      targets: Object.fromEntries(this.growthTargets),
    };
  }

  getStatus() {
    return { models: this.growthTargets.size, channels: this.expandedChannels.size };
  }
}
