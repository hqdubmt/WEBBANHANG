import { Injectable, Logger } from '@nestjs/common';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';

export interface KilledEntry {
  productId: string;
  productName: string;
  reason: string;
  killedAt: Date;
  impressions: number;
  clicks: number;
}

@Injectable()
export class KillSwitchService {
  private readonly logger = new Logger(KillSwitchService.name);
  private readonly killed = new Map<string, KilledEntry>();

  // Ngưỡng kill
  private readonly ZERO_CLICK_IMPRESSIONS = 5;   // 5+ lần hiện, 0 click → kill
  private readonly LOW_CTR_IMPRESSIONS = 10;      // 10+ impressions
  private readonly LOW_CTR_THRESHOLD = 0.02;      // CTR < 2%

  constructor(
    private readonly tracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
  ) {}

  // Đánh giá sản phẩm — tự động kill nếu vượt ngưỡng
  evaluate(productId: string): boolean {
    if (this.killed.has(productId)) return true;

    const product = this.tracker.getProduct(productId);
    if (!product) return false;

    const abStats = this.contentVariant.getStats().find(s => s.productId === productId);
    const totalImpressions = abStats?.stats.reduce((sum, s) => sum + s.impressions, 0) || 0;
    const clicks = product.clicks;

    if (totalImpressions < 3) return false;

    // Zero click sau nhiều lần hiện
    if (totalImpressions >= this.ZERO_CLICK_IMPRESSIONS && clicks === 0) {
      this.kill(productId, `${totalImpressions} impressions, 0 click`, totalImpressions, clicks);
      return true;
    }

    // CTR quá thấp
    const ctr = totalImpressions > 0 ? clicks / totalImpressions : 0;
    if (totalImpressions >= this.LOW_CTR_IMPRESSIONS && ctr < this.LOW_CTR_THRESHOLD) {
      this.kill(productId, `CTR ${(ctr * 100).toFixed(1)}% sau ${totalImpressions} impressions`, totalImpressions, clicks);
      return true;
    }

    return false;
  }

  kill(productId: string, reason: string, impressions = 0, clicks = 0): void {
    if (this.killed.has(productId)) return;
    const product = this.tracker.getProduct(productId);
    const productName = product?.name || productId;

    this.killed.set(productId, {
      productId,
      productName,
      reason,
      killedAt: new Date(),
      impressions,
      clicks,
    });
    this.logger.log(`Kill switch: [${productName.slice(0, 40)}] — ${reason}`);
  }

  isKilled(productId: string): boolean {
    return this.killed.has(productId);
  }

  revive(productId: string): void {
    if (this.killed.delete(productId)) {
      this.logger.log(`Revived: ${productId}`);
    }
  }

  getStats(): { totalKilled: number; entries: KilledEntry[] } {
    return {
      totalKilled: this.killed.size,
      entries: Array.from(this.killed.values()).sort((a, b) => b.killedAt.getTime() - a.killedAt.getTime()),
    };
  }
}
