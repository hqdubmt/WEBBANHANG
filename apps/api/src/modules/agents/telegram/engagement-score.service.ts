import { Injectable } from '@nestjs/common';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';

export interface EngagementScore {
  productId: string;
  score: number;         // 0–100
  ctrScore: number;      // up to 40pts
  velocityScore: number; // up to 30pts
  variantScore: number;  // up to 30pts
  impressions: number;
  clicks: number;
  ctr: number;
}

@Injectable()
export class EngagementScoreService {
  constructor(
    private readonly tracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
  ) {}

  compute(productId: string): EngagementScore {
    const empty: EngagementScore = {
      productId, score: 0, ctrScore: 0, velocityScore: 0,
      variantScore: 0, impressions: 0, clicks: 0, ctr: 0,
    };

    const product = this.tracker.getProduct(productId);
    if (!product) return empty;

    const abStats = this.contentVariant.getStats().find(s => s.productId === productId);
    const impressions = abStats?.stats.reduce((sum, s) => sum + s.impressions, 0) || 0;
    const clicks = product.clicks || 0;

    if (impressions === 0) return empty;

    const ctr = clicks / impressions;

    // CTR component — 40pts: CTR 10% = full 40pts
    const ctrScore = Math.min(40, (ctr / 0.1) * 40);

    // Velocity — 30pts: clicks per day since registered
    const ageDays = Math.max(1, (Date.now() - product.registeredAt.getTime()) / 86_400_000);
    const velocityScore = Math.min(30, (clicks / ageDays) * 10);

    // Best variant CTR — 30pts: best variant CTR 20% = full 30pts
    const bestVariantCtr = abStats ? Math.max(...abStats.stats.map(s => s.ctr)) : 0;
    const variantScore = Math.min(30, bestVariantCtr * 150);

    const score = Math.round(ctrScore + velocityScore + variantScore);

    return { productId, score, ctrScore, velocityScore, variantScore, impressions, clicks, ctr };
  }

  computeAll(): EngagementScore[] {
    return this.tracker
      .getAllProducts()
      .map(p => this.compute(p.id))
      .filter(s => s.impressions > 0)
      .sort((a, b) => b.score - a.score);
  }
}
