import { Injectable } from '@nestjs/common';
import { EventCollectorService } from './event-collector.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';

export type ProfitTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ProfitScore {
  productId: string;
  tier: ProfitTier;
  total: number;         // 0–100
  ctrScore: number;      // 0–30: click rate
  cvrScore: number;      // 0–25: conversion proxy (click velocity)
  discountScore: number; // 0–20: discount strength
  trendScore: number;    // 0–15: trend velocity (recent vs all-time)
  qualityScore: number;  // 0–10: engagement quality (multi-channel)
  updatedAt: Date;
}

const TIER_THRESHOLD: Record<ProfitTier, number> = {
  HIGH: 65,
  MEDIUM: 35,
  LOW: 0,
};

@Injectable()
export class ProfitScoreService {
  constructor(
    private readonly events: EventCollectorService,
    private readonly tracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
  ) {}

  compute(productId: string, discountPct = 0): ProfitScore {
    const empty: ProfitScore = {
      productId, tier: 'LOW', total: 0,
      ctrScore: 0, cvrScore: 0, discountScore: 0, trendScore: 0, qualityScore: 0,
      updatedAt: new Date(),
    };

    const product = this.tracker.getProduct(productId);
    if (!product) return empty;

    const abStats = this.contentVariant.getStats().find(s => s.productId === productId);
    const impressions = abStats?.stats.reduce((s, v) => s + v.impressions, 0) || 0;
    const clicks = product.clicks || 0;

    // CTR score (0–30): target 10% CTR = full score
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const ctrScore = Math.min(30, (ctr / 0.1) * 30);

    // CVR proxy (0–25): clicks/day velocity — 5 clicks/day = full
    const ageDays = Math.max(1, (Date.now() - product.registeredAt.getTime()) / 86_400_000);
    const cvrScore = Math.min(25, (clicks / ageDays / 5) * 25);

    // Discount strength (0–20): 50% off = full
    const discountScore = Math.min(20, (discountPct / 50) * 20);

    // Trend velocity (0–15): clicks in last 24h vs historical daily avg
    const recentClicks = this.events.getClickCounts(86_400_000)[productId] || 0;
    const historicalDailyAvg = clicks / ageDays;
    const trendRatio = historicalDailyAvg > 0 ? recentClicks / historicalDailyAvg : (recentClicks > 0 ? 2 : 0);
    const trendScore = Math.min(15, trendRatio * 7.5);

    // Engagement quality (0–10): number of distinct channels with clicks
    const channelCount = Object.keys(product.clicksBySource || {}).length;
    const qualityScore = Math.min(10, channelCount * 2.5);

    const total = Math.round(ctrScore + cvrScore + discountScore + trendScore + qualityScore);

    const tier: ProfitTier = total >= TIER_THRESHOLD.HIGH ? 'HIGH'
      : total >= TIER_THRESHOLD.MEDIUM ? 'MEDIUM'
      : 'LOW';

    return { productId, tier, total, ctrScore, cvrScore, discountScore, trendScore, qualityScore, updatedAt: new Date() };
  }

  computeAll(discountMap: Record<string, number> = {}): ProfitScore[] {
    return this.tracker.getAllProducts()
      .map(p => this.compute(p.id, discountMap[p.id] || 0))
      .sort((a, b) => b.total - a.total);
  }

  getHighProfitIds(): string[] {
    return this.computeAll().filter(s => s.tier === 'HIGH').map(s => s.productId);
  }

  getLowProfitIds(): string[] {
    return this.computeAll().filter(s => s.tier === 'LOW').map(s => s.productId);
  }
}
