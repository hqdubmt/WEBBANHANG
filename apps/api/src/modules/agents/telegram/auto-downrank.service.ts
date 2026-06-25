import { Injectable, Logger } from '@nestjs/common';
import { ProductLifecycleService } from './product-lifecycle.service';
import { ProfitScoreService } from './profit-score.service';
import { AdaptiveContentService } from './adaptive-content.service';

export interface DownrankEntry {
  productId: string;
  productName: string;
  profitScore: number;
  priorityScore: number;    // 0.0 – 1.0 (thấp hơn = ít được đăng hơn)
  removedFromQueue: boolean;
  downrankedAt: Date;
  reason: string;
}

const DOWNRANK_THRESHOLD = 25;   // score < 25 → downrank
const REMOVE_THRESHOLD = 10;     // score < 10 → loại khỏi queue hoàn toàn

@Injectable()
export class AutoDownrankService {
  private readonly logger = new Logger(AutoDownrankService.name);
  private readonly downranked = new Map<string, DownrankEntry>();

  constructor(
    private readonly lifecycle: ProductLifecycleService,
    private readonly profitScore: ProfitScoreService,
    private readonly adaptiveContent: AdaptiveContentService,
  ) {}

  // Sync từ LOSER list — tự động downrank/remove
  sync(): { downranked: number; removed: number; cleared: number } {
    let downrankedCount = 0, removedCount = 0, cleared = 0;

    const losers = this.lifecycle.getLosers();
    const loserIds = new Set(losers.map(l => l.productId));

    // Downrank losers
    for (const loser of losers) {
      const score = this.profitScore.compute(loser.productId);
      const shouldRemove = score.total < REMOVE_THRESHOLD;
      const priorityScore = shouldRemove ? 0 : Math.max(0.05, score.total / DOWNRANK_THRESHOLD * 0.3);

      const reason = shouldRemove
        ? `Score ${score.total} < ${REMOVE_THRESHOLD} — loại hoàn toàn khỏi content queue`
        : `Score ${score.total} < ${DOWNRANK_THRESHOLD} — giảm priority xuống ${(priorityScore * 100).toFixed(0)}%`;

      const existing = this.downranked.get(loser.productId);
      if (!existing) {
        this.downranked.set(loser.productId, {
          productId: loser.productId,
          productName: loser.productName,
          profitScore: score.total,
          priorityScore,
          removedFromQueue: shouldRemove,
          downrankedAt: new Date(),
          reason,
        });

        if (shouldRemove) {
          removedCount++;
          this.logger.log(`AutoDownrank REMOVE [${loser.productName.slice(0, 40)}] score=${score.total}`);
        } else {
          downrankedCount++;
          this.logger.log(`AutoDownrank DOWNRANK [${loser.productName.slice(0, 40)}] priority=${(priorityScore * 100).toFixed(0)}%`);
        }

        // Xóa adaptive content cache để không tái dùng content cũ
        this.adaptiveContent.invalidate(loser.productId);
      } else {
        existing.profitScore = score.total;
        existing.priorityScore = priorityScore;
        existing.removedFromQueue = shouldRemove;
      }
    }

    // Xóa khỏi downrank list nếu không còn là LOSER (ví dụ user revive)
    for (const id of this.downranked.keys()) {
      if (!loserIds.has(id)) {
        this.downranked.delete(id);
        cleared++;
      }
    }

    return { downranked: downrankedCount, removed: removedCount, cleared };
  }

  isDownranked(productId: string): boolean {
    return this.downranked.has(productId);
  }

  isRemoved(productId: string): boolean {
    return this.downranked.get(productId)?.removedFromQueue ?? false;
  }

  getPriorityScore(productId: string): number {
    if (this.isRemoved(productId)) return 0;
    return this.downranked.get(productId)?.priorityScore ?? 1.0;
  }

  // Lọc danh sách sản phẩm theo priority — loại removed, giảm tần suất downranked
  filterByPriority<T extends { id: string }>(products: T[]): T[] {
    return products.filter(p => !this.isRemoved(p.id));
  }

  getDownrankedList(): DownrankEntry[] {
    return Array.from(this.downranked.values())
      .sort((a, b) => a.profitScore - b.profitScore);
  }

  getStats(): { total: number; removed: number; downranked: number; entries: DownrankEntry[] } {
    const all = this.getDownrankedList();
    return {
      total: all.length,
      removed: all.filter(e => e.removedFromQueue).length,
      downranked: all.filter(e => !e.removedFromQueue).length,
      entries: all.slice(0, 20),
    };
  }
}
