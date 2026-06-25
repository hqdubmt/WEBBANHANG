import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AutoScalingGovernorService {
  private readonly logger = new Logger(AutoScalingGovernorService.name);

  postsPerDay = 12;
  activeProducts = 20;
  repostFrequency = 3;

  private readonly minPosts = 4;
  private readonly maxPosts = 30;
  private readonly minProducts = 5;
  private readonly maxProducts = 50;
  private lastAdjustmentReason = 'initial';
  private adjustmentCount = 0;

  adjustFromLoad(serverLoad: number): void {
    if (serverLoad > 80) {
      this.postsPerDay = Math.max(this.minPosts, Math.round(this.postsPerDay * 0.75));
      this.activeProducts = Math.max(this.minProducts, Math.round(this.activeProducts * 0.8));
      this.lastAdjustmentReason = `high load: ${serverLoad}%`;
      this.adjustmentCount++;
      this.logger.warn(`Load > 80%, scaling down: postsPerDay=${this.postsPerDay}`);
    } else if (serverLoad < 40) {
      this.postsPerDay = Math.min(this.maxPosts, Math.round(this.postsPerDay * 1.1));
      this.lastAdjustmentReason = `low load: ${serverLoad}%`;
      this.adjustmentCount++;
    }
  }

  adjustFromConversion(rate: number): void {
    if (rate > 5) {
      this.postsPerDay = Math.min(this.maxPosts, Math.round(this.postsPerDay * 1.2));
      this.activeProducts = Math.min(this.maxProducts, this.activeProducts + 5);
      this.repostFrequency = Math.min(8, this.repostFrequency + 1);
      this.lastAdjustmentReason = `high conversion: ${rate}%`;
      this.adjustmentCount++;
      this.logger.log(`Conversion > 5%, scaling up: postsPerDay=${this.postsPerDay}`);
    } else if (rate < 1) {
      this.repostFrequency = Math.max(1, this.repostFrequency - 1);
      this.lastAdjustmentReason = `low conversion: ${rate}%`;
      this.adjustmentCount++;
    }
  }

  @Cron('0 */6 * * *')
  governorLoop(): void {
    this.logger.log(`Governor check: posts=${this.postsPerDay} products=${this.activeProducts} repost=${this.repostFrequency}`);
  }

  getSettings() {
    return {
      postsPerDay: this.postsPerDay,
      activeProducts: this.activeProducts,
      repostFrequency: this.repostFrequency,
      lastAdjustmentReason: this.lastAdjustmentReason,
    };
  }

  getStats() {
    return {
      ...this.getSettings(),
      adjustmentCount: this.adjustmentCount,
      limits: { minPosts: this.minPosts, maxPosts: this.maxPosts, minProducts: this.minProducts, maxProducts: this.maxProducts },
    };
  }

  getStatus() {
    return this.getStats();
  }
}
