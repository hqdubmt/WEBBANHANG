import { Injectable, Logger } from '@nestjs/common';
import { ProductLifecycleService } from './product-lifecycle.service';
import { ProfitScoreService } from './profit-score.service';

export interface ScaleEntry {
  productId: string;
  productName: string;
  profitScore: number;
  publishMultiplier: number;  // Tần suất đăng × baseline
  channelCount: number;       // Số kênh phân phối
  repostFrequency: number;    // Số lần repost mỗi ngày
  addedAt: Date;
  lastScaledAt?: Date;
}

const MAX_MULTIPLIER = 3.0;   // Tối đa 3x baseline
const MAX_CHANNELS = 5;
const MAX_REPOSTS_PER_DAY = 4;

@Injectable()
export class AutoScaleService {
  private readonly logger = new Logger(AutoScaleService.name);
  private readonly scaleQueue = new Map<string, ScaleEntry>();

  constructor(
    private readonly lifecycle: ProductLifecycleService,
    private readonly profitScore: ProfitScoreService,
  ) {}

  // Sync từ WINNER list — tự động thêm/cập nhật/xóa
  sync(): { added: number; updated: number; removed: number } {
    let added = 0, updated = 0, removed = 0;

    const winners = this.lifecycle.getWinners();
    const winnerIds = new Set(winners.map(w => w.productId));

    // Thêm WINNER mới
    for (const winner of winners) {
      const score = this.profitScore.compute(winner.productId);
      const multiplier = this.calcMultiplier(score.total);
      const channelCount = this.calcChannelCount(score.total);
      const repostFreq = this.calcRepostFreq(score.total);

      if (!this.scaleQueue.has(winner.productId)) {
        this.scaleQueue.set(winner.productId, {
          productId: winner.productId,
          productName: winner.productName,
          profitScore: score.total,
          publishMultiplier: multiplier,
          channelCount,
          repostFrequency: repostFreq,
          addedAt: new Date(),
        });
        added++;
        this.logger.log(`AutoScale ADD [${winner.productName.slice(0, 40)}] ×${multiplier} ${channelCount}ch ${repostFreq}x/day`);
      } else {
        // Cập nhật nếu score thay đổi đáng kể
        const entry = this.scaleQueue.get(winner.productId)!;
        if (Math.abs(entry.profitScore - score.total) >= 5) {
          entry.profitScore = score.total;
          entry.publishMultiplier = multiplier;
          entry.channelCount = channelCount;
          entry.repostFrequency = repostFreq;
          entry.lastScaledAt = new Date();
          updated++;
        }
      }
    }

    // Xóa khi không còn là WINNER
    for (const id of this.scaleQueue.keys()) {
      if (!winnerIds.has(id)) {
        const entry = this.scaleQueue.get(id)!;
        this.scaleQueue.delete(id);
        removed++;
        this.logger.log(`AutoScale REMOVE [${entry.productName.slice(0, 40)}] — không còn WINNER`);
      }
    }

    return { added, updated, removed };
  }

  private calcMultiplier(score: number): number {
    // score 65→100 maps to 1.5→3.0
    const ratio = Math.min(1, (score - 65) / 35);
    return Math.round((1.5 + ratio * 1.5) * 10) / 10;
  }

  private calcChannelCount(score: number): number {
    if (score >= 85) return MAX_CHANNELS;
    if (score >= 75) return 4;
    if (score >= 65) return 3;
    return 2;
  }

  private calcRepostFreq(score: number): number {
    if (score >= 85) return MAX_REPOSTS_PER_DAY;
    if (score >= 75) return 3;
    if (score >= 65) return 2;
    return 1;
  }

  getTopScaled(limit = 10): ScaleEntry[] {
    return Array.from(this.scaleQueue.values())
      .sort((a, b) => b.profitScore - a.profitScore)
      .slice(0, limit);
  }

  getEntry(productId: string): ScaleEntry | undefined {
    return this.scaleQueue.get(productId);
  }

  isInQueue(productId: string): boolean {
    return this.scaleQueue.has(productId);
  }

  getStats(): { total: number; avgMultiplier: number; entries: ScaleEntry[] } {
    const entries = this.getTopScaled(20);
    const avg = entries.length > 0
      ? entries.reduce((s, e) => s + e.publishMultiplier, 0) / entries.length
      : 0;
    return { total: this.scaleQueue.size, avgMultiplier: Math.round(avg * 10) / 10, entries };
  }
}
