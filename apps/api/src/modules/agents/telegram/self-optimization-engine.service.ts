import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';
import { AiRankingAgentService } from './ai-ranking-agent.service';
import { KillSwitchService } from './kill-switch.service';
import { ProductScoreService } from './product-score.service';

export interface LoopResult {
  evaluated: number;
  boosted: string[];
  killed: string[];
  rewritten: string[];
  skipped: string[];
  timestamp: Date;
}

@Injectable()
export class SelfOptimizationEngineService {
  private readonly logger = new Logger(SelfOptimizationEngineService.name);

  // Queues được telegram-agent.service đọc khi publish
  private readonly boostQueue = new Set<string>();
  private readonly rewriteQueue = new Set<string>();

  private lastRun?: LoopResult;
  private totalLoops = 0;

  constructor(
    private readonly tracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
    private readonly aiRanking: AiRankingAgentService,
    private readonly killSwitch: KillSwitchService,
    private readonly productScore: ProductScoreService,
  ) {}

  // Chạy tự học mỗi 4 tiếng — cải thiện dựa trên data thật
  @Cron('0 */4 * * *')
  async runLoop(): Promise<LoopResult> {
    this.totalLoops++;
    this.logger.log(`Self-Opt Loop #${this.totalLoops} bắt đầu...`);

    const result: LoopResult = {
      evaluated: 0,
      boosted: [],
      killed: [],
      rewritten: [],
      skipped: [],
      timestamp: new Date(),
    };

    const allProducts = this.tracker.getAllProducts();
    if (allProducts.length === 0) {
      this.logger.log('Self-Opt: Chưa có sản phẩm nào được track');
      this.lastRun = result;
      return result;
    }

    // Sắp xếp: đánh giá sản phẩm có nhiều impressions trước (data đáng tin cậy hơn)
    const abStatsMap = new Map(this.contentVariant.getStats().map(s => [s.productId, s]));
    const sorted = allProducts
      .map(p => {
        const ab = abStatsMap.get(p.id);
        const impressions = ab?.stats.reduce((sum, s) => sum + s.impressions, 0) || 0;
        return { product: p, impressions };
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 50); // Tối đa 50 sản phẩm mỗi vòng

    for (const { product } of sorted) {
      result.evaluated++;

      // 1. Kill switch tự động
      const wasKilled = this.killSwitch.evaluate(product.id);
      if (wasKilled) {
        result.killed.push(product.id);
        this.boostQueue.delete(product.id);
        this.rewriteQueue.delete(product.id);
        continue;
      }

      // 2. AI ranking decision
      let decision;
      try {
        decision = await this.aiRanking.decide(product.id, product.name, product.category);
      } catch (e) {
        this.logger.debug(`AI ranking lỗi cho ${product.id}: ${e.message}`);
        continue;
      }

      this.logger.debug(`[${product.name.slice(0, 35)}] → ${decision.action} (${(decision.confidence * 100).toFixed(0)}%): ${decision.reason}`);

      // 3. Áp dụng quyết định
      switch (decision.action) {
        case 'BOOST':
          this.boostQueue.add(product.id);
          this.rewriteQueue.delete(product.id);
          result.boosted.push(product.id);
          break;

        case 'SKIP':
          // SKIP với confidence cao → kill hẳn
          if (decision.confidence >= 0.85) {
            this.killSwitch.kill(product.id, decision.reason, 0, product.clicks);
            result.killed.push(product.id);
          } else {
            result.skipped.push(product.id);
          }
          this.boostQueue.delete(product.id);
          break;

        case 'REWRITE':
          this.rewriteQueue.add(product.id);
          this.boostQueue.delete(product.id);
          result.rewritten.push(product.id);
          break;

        case 'POST':
        default:
          // Không làm gì thêm — đăng bình thường
          break;
      }

      // Không call AI quá nhanh
      await new Promise(r => setTimeout(r, 200));
    }

    this.lastRun = result;
    this.logger.log(
      `Self-Opt Loop #${this.totalLoops} xong: ${result.evaluated} sp | ` +
      `Boost:${result.boosted.length} Kill:${result.killed.length} ` +
      `Rewrite:${result.rewritten.length} Skip:${result.skipped.length}`,
    );
    return result;
  }

  // ─── Queue API (dùng bởi TelegramAgentService) ────────────────────────────

  isInBoostQueue(productId: string): boolean {
    return this.boostQueue.has(productId);
  }

  isInRewriteQueue(productId: string): boolean {
    return this.rewriteQueue.has(productId);
  }

  consumeRewrite(productId: string): void {
    this.rewriteQueue.delete(productId);
  }

  consumeBoost(productId: string): void {
    // Boost không xóa ngay — giữ để đăng nhiều lần, xóa sau N lần
    // Xóa thủ công qua API hoặc sau khi đã boost đủ
  }

  clearBoostQueue(): void {
    this.boostQueue.clear();
  }

  getStatus(): {
    totalLoops: number;
    lastRun?: LoopResult;
    boostQueue: string[];
    rewriteQueue: string[];
    killedCount: number;
    trackedProducts: number;
  } {
    return {
      totalLoops: this.totalLoops,
      lastRun: this.lastRun,
      boostQueue: Array.from(this.boostQueue),
      rewriteQueue: Array.from(this.rewriteQueue),
      killedCount: this.killSwitch.getStats().totalKilled,
      trackedProducts: this.tracker.getAllProducts().length,
    };
  }
}
