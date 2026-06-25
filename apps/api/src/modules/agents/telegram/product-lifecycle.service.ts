import { Injectable, Logger } from '@nestjs/common';
import { ProfitScoreService } from './profit-score.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export type LifecycleStage = 'NEW' | 'TEST' | 'WINNER' | 'LOSER';

export interface LifecycleEntry {
  productId: string;
  productName: string;
  stage: LifecycleStage;
  profitScore: number;
  profitTier: string;
  enteredStageAt: Date;
  postCount: number;
  clickCount: number;
  discountPct: number;
}

// Thresholds để promote/demote
const PROMOTE_TO_WINNER = 65;   // profit score >= 65 → WINNER
const DEMOTE_TO_LOSER = 25;     // profit score < 25 sau test → LOSER
const MIN_POSTS_TO_EVALUATE = 3; // cần ít nhất 3 lần đăng mới đánh giá

@Injectable()
export class ProductLifecycleService {
  private readonly logger = new Logger(ProductLifecycleService.name);
  private readonly lifecycle = new Map<string, LifecycleEntry>();
  private readonly discountMap = new Map<string, number>();

  constructor(
    private readonly profitScore: ProfitScoreService,
    private readonly tracker: AffiliateTrackerService,
  ) {}

  // Đăng ký sản phẩm mới — tự động vào giai đoạn NEW
  register(productId: string, productName: string, discountPct = 0): LifecycleEntry {
    if (this.lifecycle.has(productId)) return this.lifecycle.get(productId)!;

    this.discountMap.set(productId, discountPct);
    const entry: LifecycleEntry = {
      productId,
      productName,
      stage: 'NEW',
      profitScore: 0,
      profitTier: 'LOW',
      enteredStageAt: new Date(),
      postCount: 0,
      clickCount: 0,
      discountPct,
    };
    this.lifecycle.set(productId, entry);
    return entry;
  }

  // Ghi nhận lần đăng bài → chuyển NEW → TEST
  recordPost(productId: string): void {
    const entry = this.lifecycle.get(productId);
    if (!entry) return;

    entry.postCount++;
    if (entry.stage === 'NEW') {
      entry.stage = 'TEST';
      entry.enteredStageAt = new Date();
      this.logger.log(`Lifecycle [${entry.productName.slice(0, 40)}]: NEW → TEST`);
    }
  }

  // Chạy evaluation cycle — cập nhật stage cho tất cả sản phẩm
  evaluate(): { promoted: string[]; demoted: string[]; unchanged: string[] } {
    const promoted: string[] = [];
    const demoted: string[] = [];
    const unchanged: string[] = [];

    for (const [productId, entry] of this.lifecycle) {
      // Chỉ evaluate sản phẩm đã qua TEST phase
      if (entry.stage === 'NEW') { unchanged.push(productId); continue; }
      if (entry.stage === 'WINNER' || entry.stage === 'LOSER') { unchanged.push(productId); continue; }

      // Cần đủ số lần đăng để đánh giá
      if (entry.postCount < MIN_POSTS_TO_EVALUATE) { unchanged.push(productId); continue; }

      const score = this.profitScore.compute(productId, this.discountMap.get(productId) || 0);
      entry.profitScore = score.total;
      entry.profitTier = score.tier;

      const product = this.tracker.getProduct(productId);
      entry.clickCount = product?.clicks || 0;

      const prevStage = entry.stage;

      if (score.total >= PROMOTE_TO_WINNER) {
        entry.stage = 'WINNER';
        entry.enteredStageAt = new Date();
        promoted.push(productId);
        this.logger.log(`Lifecycle WINNER: [${entry.productName.slice(0, 40)}] score=${score.total}`);
      } else if (score.total < DEMOTE_TO_LOSER) {
        entry.stage = 'LOSER';
        entry.enteredStageAt = new Date();
        demoted.push(productId);
        this.logger.log(`Lifecycle LOSER: [${entry.productName.slice(0, 40)}] score=${score.total}`);
      } else {
        unchanged.push(productId);
      }

      if (entry.stage !== prevStage) {
        this.logger.log(`Lifecycle [${entry.productName.slice(0, 40)}]: ${prevStage} → ${entry.stage}`);
      }
    }

    return { promoted, demoted, unchanged };
  }

  getStage(productId: string): LifecycleStage | null {
    return this.lifecycle.get(productId)?.stage ?? null;
  }

  getEntry(productId: string): LifecycleEntry | undefined {
    return this.lifecycle.get(productId);
  }

  getByStage(stage: LifecycleStage): LifecycleEntry[] {
    return Array.from(this.lifecycle.values()).filter(e => e.stage === stage);
  }

  getWinners(): LifecycleEntry[] {
    return this.getByStage('WINNER').sort((a, b) => b.profitScore - a.profitScore);
  }

  getLosers(): LifecycleEntry[] {
    return this.getByStage('LOSER').sort((a, b) => a.profitScore - b.profitScore);
  }

  // Cho phép reset LOSER về TEST để thử lại (nếu user muốn)
  revive(productId: string): boolean {
    const entry = this.lifecycle.get(productId);
    if (!entry || entry.stage !== 'LOSER') return false;
    entry.stage = 'TEST';
    entry.enteredStageAt = new Date();
    entry.postCount = 0;
    this.logger.log(`Lifecycle revive: [${entry.productName.slice(0, 40)}] LOSER → TEST`);
    return true;
  }

  getStats() {
    const all = Array.from(this.lifecycle.values());
    const byStage: Record<LifecycleStage, number> = { NEW: 0, TEST: 0, WINNER: 0, LOSER: 0 };
    for (const e of all) byStage[e.stage]++;
    return {
      total: all.length,
      byStage,
      winners: this.getWinners().slice(0, 5),
      losers: this.getLosers().slice(0, 5),
    };
  }
}
