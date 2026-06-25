import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventCollectorService } from './event-collector.service';
import { ProfitScoreService } from './profit-score.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { AiInsightService } from './ai-insight.service';
import { SmartDistributionService } from './smart-distribution.service';
import { AdaptiveContentService } from './adaptive-content.service';
import { AutonomousDecisionService } from './autonomous-decision.service';
import { SelfRegulationService } from './self-regulation.service';
import { AutoScaleService } from './auto-scale.service';
import { AutoDownrankService } from './auto-downrank.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export interface BrainLoopResult {
  loopNumber: number;
  timestamp: Date;
  lifecycle: { promoted: string[]; demoted: string[] };
  decisions: { boost: number; hold: number; kill: number };
  scale: { added: number; updated: number; removed: number };
  downrank: { downranked: number; removed: number };
  distribution: Record<string, number>;
  regulation: { throttled: number; lowQuality: number };
  topWinners: Array<{ id: string; name: string; score: number }>;
  durationMs: number;
}

/**
 * Revenue Brain — Closed Loop Orchestrator
 *
 * Loop:
 *   Crawl Products (external) → [Track Behavior] → Profit Score
 *     → Lifecycle Update → AI Decision (BOOST/HOLD/KILL)
 *     → Scale WINNER / Downrank LOSER → Adaptive Distribution
 *     → Feedback Learning → REPEAT
 *
 * Chạy song song với TikTokAdsLayerService & SelfOptimizationEngineService.
 * KHÔNG thay đổi crawler / posting / affiliate flow.
 */
@Injectable()
export class RevenueBrainService {
  private readonly logger = new Logger(RevenueBrainService.name);
  private loopNumber = 0;
  private lastResult?: BrainLoopResult;
  private readonly startedAt = new Date();

  constructor(
    private readonly events: EventCollectorService,
    private readonly profitScore: ProfitScoreService,
    private readonly lifecycle: ProductLifecycleService,
    private readonly analytics: RevenueAnalyticsService,
    private readonly insight: AiInsightService,
    private readonly smartDist: SmartDistributionService,
    private readonly adaptiveContent: AdaptiveContentService,
    private readonly decision: AutonomousDecisionService,
    private readonly regulation: SelfRegulationService,
    private readonly autoScale: AutoScaleService,
    private readonly autoDownrank: AutoDownrankService,
    private readonly tracker: AffiliateTrackerService,
  ) {}

  // Revenue Brain chạy mỗi 3 tiếng — lệch với TikTokAdsLayer (6h) và SelfOpt (4h)
  @Cron('0 */3 * * *')
  async runLoop(): Promise<BrainLoopResult> {
    this.loopNumber++;
    const startMs = Date.now();
    this.logger.log(`Revenue Brain Loop #${this.loopNumber} bắt đầu...`);

    // 1. Register tất cả products vào lifecycle nếu chưa có
    for (const product of this.tracker.getAllProducts()) {
      this.lifecycle.register(product.id, product.name);
    }

    // 2. Evaluate lifecycle — cập nhật stage dựa trên profit score
    const { promoted, demoted } = this.lifecycle.evaluate();

    // 3. AI decisions cho tất cả sản phẩm
    const decisions = this.decision.decideAll();
    const boostCount = decisions.filter(d => d.action === 'BOOST').length;
    const holdCount = decisions.filter(d => d.action === 'HOLD').length;
    const killCount = decisions.filter(d => d.action === 'KILL').length;

    // 4. Sync Auto-Scale (WINNER) & Auto-Downrank (LOSER)
    const scaleSync = this.autoScale.sync();
    const downrankSync = this.autoDownrank.sync();

    // 5. Recalibrate channel distribution weights
    const distWeights = this.smartDist.recalibrate();

    // 6. Invalidate adaptive content cache cho promoted/demoted products
    for (const id of [...promoted, ...demoted]) {
      this.adaptiveContent.invalidate(id);
    }

    // 7. Update quality scores in self-regulation
    for (const product of this.tracker.getAllProducts()) {
      const quality = this.regulation.computeQuality(product.id);
      this.regulation.setQualityScore(product.id, quality);
    }

    // 8. Emit loop event
    this.events.emit('boost', 'system', 'revenue-brain', {
      loop: this.loopNumber,
      promoted: promoted.length,
      demoted: demoted.length,
    });

    const topWinners = this.lifecycle.getWinners().slice(0, 5).map(w => ({
      id: w.productId,
      name: w.productName.slice(0, 40),
      score: w.profitScore,
    }));

    const regStats = this.regulation.getStats();

    const result: BrainLoopResult = {
      loopNumber: this.loopNumber,
      timestamp: new Date(),
      lifecycle: { promoted, demoted },
      decisions: { boost: boostCount, hold: holdCount, kill: killCount },
      scale: scaleSync,
      downrank: { downranked: downrankSync.downranked, removed: downrankSync.removed },
      distribution: this.smartDist.getAllWeights(),
      regulation: { throttled: regStats.throttled, lowQuality: regStats.lowQuality },
      topWinners,
      durationMs: Date.now() - startMs,
    };

    this.lastResult = result;

    this.logger.log(
      `Revenue Brain #${this.loopNumber} xong (${result.durationMs}ms): ` +
      `Lifecycle promoted=${promoted.length} demoted=${demoted.length} | ` +
      `Decisions BOOST=${boostCount} HOLD=${holdCount} KILL=${killCount} | ` +
      `Scale +${scaleSync.added} ~${scaleSync.updated} -${scaleSync.removed} | ` +
      `Downrank ${downrankSync.downranked}↓ ${downrankSync.removed}✕ | ` +
      `Winners: ${topWinners.map(w => `[${w.name}:${w.score}]`).join(' ')}`
    );

    return result;
  }

  // Manual trigger
  async triggerLoop(): Promise<BrainLoopResult> {
    return this.runLoop();
  }

  getStatus() {
    const lcStats = this.lifecycle.getStats();
    const decStats = this.decision.getStats();
    const scaleStats = this.autoScale.getStats();
    const downrankStats = this.autoDownrank.getStats();
    const eventStats = this.events.getStats();
    const regStats = this.regulation.getStats();

    return {
      loopNumber: this.loopNumber,
      startedAt: this.startedAt,
      lastResult: this.lastResult,
      lifecycle: lcStats,
      decisions: decStats,
      scale: scaleStats,
      downrank: downrankStats,
      distribution: this.smartDist.getAllWeights(),
      events: eventStats,
      regulation: regStats,
    };
  }

  // Daily brief text để gửi qua Telegram
  getDailyBrief(): string {
    return this.insight.generateDailyBrief();
  }

  // Tổng hợp insight về 1 sản phẩm
  explainProduct(productId: string) {
    return this.insight.explainProductSuccess(productId);
  }

  // So sánh kênh
  compareChannels(a: string, b: string) {
    return this.insight.compareChannels(a, b);
  }

  // Báo cáo analytics đầy đủ
  getAnalyticsReport() {
    return this.analytics.generateReport();
  }
}
