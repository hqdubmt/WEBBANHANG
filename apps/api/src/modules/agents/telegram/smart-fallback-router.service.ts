import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmartFallbackRouterService {
  private readonly logger = new Logger(SmartFallbackRouterService.name);

  private channelWeights: Map<string, number> = new Map([
    ['telegram', 0.33],
    ['facebook', 0.33],
    ['youtube', 0.34],
  ]);

  private failedChannels: Set<string> = new Set();

  onChannelFail(channel: string): void {
    if (!this.channelWeights.has(channel)) return;
    const failedWeight = this.channelWeights.get(channel)!;
    this.failedChannels.add(channel);
    this.channelWeights.set(channel, 0);
    const active = [...this.channelWeights.entries()].filter(([, w]) => w > 0);
    if (active.length === 0) return;
    const share = failedWeight / active.length;
    for (const [ch] of active) {
      this.channelWeights.set(ch, (this.channelWeights.get(ch) ?? 0) + share);
    }
    this.logger.warn(`Channel failed: ${channel}, redistributed ${failedWeight.toFixed(2)} weight`);
  }

  onChannelRecover(channel: string): void {
    if (!this.channelWeights.has(channel)) return;
    this.failedChannels.delete(channel);
    const channels = [...this.channelWeights.keys()];
    const equalShare = 1 / channels.length;
    for (const ch of channels) this.channelWeights.set(ch, equalShare);
    this.logger.log(`Channel recovered: ${channel}, weights rebalanced`);
  }

  getActiveChannels(): string[] {
    return [...this.channelWeights.entries()]
      .filter(([, w]) => w > 0)
      .map(([ch]) => ch);
  }

  getWeights(): Record<string, number> {
    return Object.fromEntries(this.channelWeights);
  }

  getStats() {
    return {
      weights: this.getWeights(),
      activeChannels: this.getActiveChannels(),
      failedChannels: [...this.failedChannels],
      totalChannels: this.channelWeights.size,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
