import { Injectable, Logger } from '@nestjs/common';
import { ContentTestEngineService } from './content-test-engine.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';

export interface BoostEntry {
  productId: string;
  productName: string;
  score: number;
  boostCount: number;
  maxBoosts: number;
  lastBoostedAt?: Date;
  enqueuedAt: Date;
}

// WIN content được boost tối đa 5 lần trước khi tự xóa khỏi queue
const MAX_BOOSTS = 5;

@Injectable()
export class AutoBoostService {
  private readonly logger = new Logger(AutoBoostService.name);
  private readonly queue = new Map<string, BoostEntry>();

  constructor(
    private readonly testEngine: ContentTestEngineService,
    private readonly tracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
  ) {}

  // Sync queue từ WIN entries trong ContentTestEngine
  syncFromTestEngine(): { added: number; removed: number } {
    let added = 0;
    let removed = 0;

    // Thêm WIN content mới vào queue
    for (const entry of this.testEngine.getWinners()) {
      if (!this.queue.has(entry.productId)) {
        this.queue.set(entry.productId, {
          productId: entry.productId,
          productName: entry.productName,
          score: entry.score,
          boostCount: 0,
          maxBoosts: MAX_BOOSTS,
          enqueuedAt: new Date(),
        });
        added++;
        this.logger.log(`Auto Boost enqueue: [${entry.productName.slice(0, 40)}] score=${entry.score}`);
      } else {
        // Cập nhật score
        this.queue.get(entry.productId)!.score = entry.score;
      }
    }

    // Xóa LOSE content khỏi queue
    const loserIds = new Set(this.testEngine.getLosers().map(e => e.productId));
    for (const id of loserIds) {
      if (this.queue.delete(id)) {
        removed++;
        this.logger.log(`Auto Boost dequeue (now LOSE): ${id}`);
      }
    }

    return { added, removed };
  }

  // Trả về top N content cần boost (theo score)
  getTopBoosts(limit = 5): BoostEntry[] {
    return Array.from(this.queue.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Ghi nhận đã boost — tự xóa khi đạt maxBoosts
  consumeBoost(productId: string): void {
    const entry = this.queue.get(productId);
    if (!entry) return;

    entry.boostCount++;
    entry.lastBoostedAt = new Date();

    if (entry.boostCount >= entry.maxBoosts) {
      this.queue.delete(productId);
      this.logger.log(`Boost exhausted: [${entry.productName.slice(0, 40)}] (${MAX_BOOSTS} boosts done)`);
    }
  }

  // Lấy best variant text để boost (hook không trùng với lần trước)
  getBestVariantText(productId: string): string | null {
    const entry = this.queue.get(productId);
    if (!entry) return null;

    const variant = this.contentVariant.getBestVariant(productId);
    return variant ? variant.fullText : null;
  }

  isInQueue(productId: string): boolean {
    return this.queue.has(productId);
  }

  getStats(): { queued: number; entries: BoostEntry[] } {
    return {
      queued: this.queue.size,
      entries: this.getTopBoosts(20),
    };
  }
}
