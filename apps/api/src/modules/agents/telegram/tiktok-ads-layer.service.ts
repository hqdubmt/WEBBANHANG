import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContentTestEngineService } from './content-test-engine.service';
import { AutoBoostService } from './auto-boost.service';
import { AutoKillService } from './auto-kill.service';
import { DistributionWeightService } from './distribution-weight.service';
import { ContentRankEngineService } from './content-rank-engine.service';
import { MicroDistributionService } from './micro-distribution.service';

export interface TikTokLoopResult {
  loopNumber: number;
  synced: number;
  promoted: string[];
  killed: string[];
  boostQueueSize: number;
  killQueueSize: number;
  weightSnapshot: Record<string, number>;
  timestamp: Date;
}

/**
 * Orchestrator cho TikTok Ads AI Layer.
 *
 * Closed loop (giống TikTok Ads):
 *   Publish → Test (10%) → Score → Rank → BOOST/HOLD/KILL → Redistribute → Repeat
 *
 * Chạy song song với SelfOptimizationEngineService (hệ thống cũ).
 * KHÔNG thay đổi crawler / posting / affiliate flow.
 */
@Injectable()
export class TikTokAdsLayerService {
  private readonly logger = new Logger(TikTokAdsLayerService.name);
  private loopNumber = 0;
  private lastResult?: TikTokLoopResult;

  constructor(
    private readonly testEngine: ContentTestEngineService,
    private readonly autoBoost: AutoBoostService,
    private readonly autoKill: AutoKillService,
    private readonly distributionWeight: DistributionWeightService,
    private readonly rankEngine: ContentRankEngineService,
    private readonly microDist: MicroDistributionService,
  ) {}

  // Chạy mỗi 6 tiếng — lệch với SelfOpt (4 tiếng) để không tranh tài nguyên AI
  @Cron('0 */6 * * *')
  async runLoop(): Promise<TikTokLoopResult> {
    this.loopNumber++;
    this.logger.log(`TikTok Ads Layer Loop #${this.loopNumber} bắt đầu...`);

    // 1. Đồng bộ tất cả sản phẩm đang tracked vào TikTok layer
    this.testEngine.syncFromTracker();
    const totalSynced = this.testEngine.getAllEntries().length;

    // 2. Đánh giá tất cả content theo rank engine → cập nhật TEST/WIN/LOSE
    const { promoted, killed } = this.testEngine.evaluateAll();

    // 3. Sync auto-boost queue từ WIN entries
    const { added: boostAdded } = this.autoBoost.syncFromTestEngine();

    // 4. Sync auto-kill từ LOSE entries
    const { newKills } = this.autoKill.syncFromTestEngine();

    // 5. Recalibrate channel distribution weights dựa trên click data thật
    this.distributionWeight.recalibrate();

    const stats = this.testEngine.getStats();
    const result: TikTokLoopResult = {
      loopNumber: this.loopNumber,
      synced: totalSynced,
      promoted,
      killed,
      boostQueueSize: this.autoBoost.getStats().queued,
      killQueueSize: this.autoKill.getStats().totalKilled,
      weightSnapshot: this.distributionWeight.getAllWeights(),
      timestamp: new Date(),
    };

    this.lastResult = result;
    this.logger.log(
      `TikTok Ads Layer #${this.loopNumber} xong: ` +
      `${totalSynced} content | TEST:${stats.test} WIN:${stats.win} LOSE:${stats.lose} | ` +
      `Promoted:${promoted.length} Killed:${killed.length} | ` +
      `BoostQ:${result.boostQueueSize} (+${boostAdded}) | NewKills:${newKills}`,
    );

    return result;
  }

  // Manual trigger từ API
  async triggerLoop(): Promise<TikTokLoopResult> {
    return this.runLoop();
  }

  getStatus(): {
    loopNumber: number;
    lastResult?: TikTokLoopResult;
    testEngineStats: ReturnType<ContentTestEngineService['getStats']>;
    boostStats: ReturnType<AutoBoostService['getStats']>;
    killStats: ReturnType<AutoKillService['getStats']>;
    channelWeights: Record<string, number>;
    leaderboard: ReturnType<ContentRankEngineService['getLeaderboard']>;
    distributionSummary: ReturnType<MicroDistributionService['getDistributionSummary']>;
  } {
    return {
      loopNumber: this.loopNumber,
      lastResult: this.lastResult,
      testEngineStats: this.testEngine.getStats(),
      boostStats: this.autoBoost.getStats(),
      killStats: this.autoKill.getStats(),
      channelWeights: this.distributionWeight.getAllWeights(),
      leaderboard: this.rankEngine.getLeaderboard(10),
      distributionSummary: this.microDist.getDistributionSummary(),
    };
  }
}
