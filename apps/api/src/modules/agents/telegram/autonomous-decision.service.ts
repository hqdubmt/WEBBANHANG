import { Injectable, Logger } from '@nestjs/common';
import { ProfitScoreService } from './profit-score.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export type RevenueAction = 'BOOST' | 'HOLD' | 'KILL';

export interface AutonomousDecision {
  productId: string;
  productName: string;
  action: RevenueAction;
  reason: string;
  confidence: number;  // 0.0 – 1.0
  profitScore: number;
  stage: string;
  decidedAt: Date;
}

// Thresholds
const BOOST_THRESHOLD = 65;   // profit score >= 65 → BOOST
const KILL_THRESHOLD = 25;    // profit score < 25 → KILL
const MIN_CONFIDENCE = 0.5;   // cần confidence >= 0.5 để ra quyết định dứt khoát

@Injectable()
export class AutonomousDecisionService {
  private readonly logger = new Logger(AutonomousDecisionService.name);
  private readonly history = new Map<string, AutonomousDecision>();

  constructor(
    private readonly profitScore: ProfitScoreService,
    private readonly lifecycle: ProductLifecycleService,
    private readonly tracker: AffiliateTrackerService,
  ) {}

  decide(productId: string): AutonomousDecision {
    const product = this.tracker.getProduct(productId);
    const score = this.profitScore.compute(productId);
    const stage = this.lifecycle.getStage(productId) || 'NEW';
    const entry = this.lifecycle.getEntry(productId);

    const name = entry?.productName || product?.name || productId;

    let action: RevenueAction;
    let reason: string;
    let confidence: number;

    if (stage === 'WINNER' || (score.total >= BOOST_THRESHOLD)) {
      action = 'BOOST';
      confidence = Math.min(0.99, 0.6 + (score.total - BOOST_THRESHOLD) / 100);
      reason = `Score ${score.total}/100 ≥ ${BOOST_THRESHOLD} — CTR cao (${Math.round(score.ctrScore)}/30) + velocity tốt (${Math.round(score.cvrScore)}/25)`;
    } else if (stage === 'LOSER' || (score.total < KILL_THRESHOLD && (entry?.postCount || 0) >= 3)) {
      action = 'KILL';
      confidence = Math.min(0.99, 0.6 + (KILL_THRESHOLD - score.total) / 50);
      reason = `Score ${score.total}/100 < ${KILL_THRESHOLD} sau ${entry?.postCount || 0} lần đăng — hiệu quả thấp, tiết kiệm nguồn lực`;
    } else {
      action = 'HOLD';
      confidence = 0.7;
      const distToBoost = BOOST_THRESHOLD - score.total;
      const distToKill = score.total - KILL_THRESHOLD;
      reason = `Score ${score.total}/100 ở giữa (cần thêm ${distToBoost} điểm để BOOST, còn ${distToKill} điểm trước khi KILL)`;
    }

    const decision: AutonomousDecision = {
      productId,
      productName: name,
      action,
      reason,
      confidence,
      profitScore: score.total,
      stage,
      decidedAt: new Date(),
    };

    this.history.set(productId, decision);

    this.logger.log(
      `Decision [${name.slice(0, 40)}]: ${action} (conf=${confidence.toFixed(2)}) — ${reason}`
    );

    return decision;
  }

  // Quyết định hàng loạt cho tất cả sản phẩm tracked
  decideAll(): AutonomousDecision[] {
    return this.tracker.getAllProducts()
      .map(p => this.decide(p.id))
      .sort((a, b) => {
        // BOOST lên đầu, KILL cuối
        const order = { BOOST: 0, HOLD: 1, KILL: 2 };
        return order[a.action] - order[b.action] || b.profitScore - a.profitScore;
      });
  }

  getDecision(productId: string): AutonomousDecision | undefined {
    return this.history.get(productId);
  }

  getActionList(action: RevenueAction): AutonomousDecision[] {
    return Array.from(this.history.values()).filter(d => d.action === action);
  }

  getStats(): {
    total: number;
    boost: number;
    hold: number;
    kill: number;
    avgConfidence: number;
    recentDecisions: AutonomousDecision[];
  } {
    const decisions = Array.from(this.history.values());
    const boost = decisions.filter(d => d.action === 'BOOST').length;
    const hold = decisions.filter(d => d.action === 'HOLD').length;
    const kill = decisions.filter(d => d.action === 'KILL').length;
    const avgConf = decisions.length > 0
      ? decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length
      : 0;

    return {
      total: decisions.length,
      boost,
      hold,
      kill,
      avgConfidence: Math.round(avgConf * 100) / 100,
      recentDecisions: decisions
        .sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime())
        .slice(0, 10),
    };
  }
}
