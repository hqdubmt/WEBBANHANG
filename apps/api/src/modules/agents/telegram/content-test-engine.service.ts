import { Injectable, Logger } from '@nestjs/common';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentRankEngineService, RankAction } from './content-rank-engine.service';

export type ContentState = 'TEST' | 'WIN' | 'LOSE';

export interface ContentEntry {
  productId: string;
  productName: string;
  state: ContentState;
  trafficLayer: 1 | 2 | 3;  // 1=10%, 2=50%, 3=100%
  score: number;
  registeredAt: Date;
  stateUpdatedAt: Date;
}

const ACTION_TO_STATE: Record<RankAction, ContentState | null> = {
  BOOST: 'WIN',
  HOLD: null,   // giữ nguyên state hiện tại
  STOP: 'LOSE',
};

@Injectable()
export class ContentTestEngineService {
  private readonly logger = new Logger(ContentTestEngineService.name);
  private readonly entries = new Map<string, ContentEntry>();

  constructor(
    private readonly tracker: AffiliateTrackerService,
    private readonly rankEngine: ContentRankEngineService,
  ) {}

  // Đăng ký content mới vào vòng TEST
  register(productId: string): void {
    if (this.entries.has(productId)) return;
    const product = this.tracker.getProduct(productId);
    this.entries.set(productId, {
      productId,
      productName: product?.name || productId,
      state: 'TEST',
      trafficLayer: 1,
      score: 0,
      registeredAt: new Date(),
      stateUpdatedAt: new Date(),
    });
  }

  // Đánh giá tất cả content — cập nhật state theo rank engine
  evaluateAll(): { promoted: string[]; killed: string[] } {
    const promoted: string[] = [];
    const killed: string[] = [];

    for (const [productId, entry] of this.entries) {
      if (entry.state === 'LOSE') continue;

      const rank = this.rankEngine.rank(productId);
      entry.score = rank.score;

      const newState = ACTION_TO_STATE[rank.action];
      if (!newState || newState === entry.state) continue;

      const prev = entry.state;
      entry.state = newState;
      entry.stateUpdatedAt = new Date();

      // WIN: scale traffic layer theo score
      if (newState === 'WIN') {
        entry.trafficLayer = rank.score >= 90 ? 3 : 2;
        promoted.push(productId);
        this.logger.log(`TEST→WIN: [${entry.productName.slice(0, 40)}] score=${rank.score} layer=${entry.trafficLayer}`);
      } else if (newState === 'LOSE') {
        entry.trafficLayer = 1;
        killed.push(productId);
        this.logger.log(`TEST→LOSE: [${entry.productName.slice(0, 40)}] score=${rank.score} (was ${prev})`);
      }
    }

    return { promoted, killed };
  }

  // Tự động đăng ký tất cả sản phẩm đang được track
  syncFromTracker(): void {
    for (const product of this.tracker.getAllProducts()) {
      this.register(product.id);
    }
  }

  getEntry(productId: string): ContentEntry | undefined {
    return this.entries.get(productId);
  }

  getState(productId: string): ContentState {
    return this.entries.get(productId)?.state ?? 'TEST';
  }

  getAllEntries(): ContentEntry[] {
    return Array.from(this.entries.values());
  }

  getStats(): { total: number; test: number; win: number; lose: number } {
    const all = this.getAllEntries();
    return {
      total: all.length,
      test: all.filter(e => e.state === 'TEST').length,
      win:  all.filter(e => e.state === 'WIN').length,
      lose: all.filter(e => e.state === 'LOSE').length,
    };
  }

  getWinners(): ContentEntry[] {
    return this.getAllEntries()
      .filter(e => e.state === 'WIN')
      .sort((a, b) => b.score - a.score);
  }

  getLosers(): ContentEntry[] {
    return this.getAllEntries()
      .filter(e => e.state === 'LOSE')
      .sort((a, b) => b.stateUpdatedAt.getTime() - a.stateUpdatedAt.getTime());
  }
}
