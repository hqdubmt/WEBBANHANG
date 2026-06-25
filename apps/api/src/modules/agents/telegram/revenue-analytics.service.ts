import { Injectable } from '@nestjs/common';
import { EventCollectorService } from './event-collector.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ProfitScoreService } from './profit-score.service';
import { ProductLifecycleService } from './product-lifecycle.service';

export interface ChannelPerformance {
  channel: string;
  clicks: number;
  share: number; // %
}

export interface TopProductSummary {
  productId: string;
  name: string;
  category: string;
  clicks: number;
  profitScore: number;
  profitTier: string;
  stage: string;
}

export interface BestHour {
  hour: number;
  clicks: number;
  label: string; // "14:00"
}

export interface RevenueReport {
  topProducts: TopProductSummary[];
  topChannels: ChannelPerformance[];
  bestHours: BestHour[];
  totalClicks24h: number;
  totalProductsTracked: number;
  winnersCount: number;
  losersCount: number;
  generatedAt: Date;
}

@Injectable()
export class RevenueAnalyticsService {
  constructor(
    private readonly events: EventCollectorService,
    private readonly tracker: AffiliateTrackerService,
    private readonly profitScore: ProfitScoreService,
    private readonly lifecycle: ProductLifecycleService,
  ) {}

  generateReport(): RevenueReport {
    const allProducts = this.tracker.getAllProducts();
    const scores = this.profitScore.computeAll();
    const scoreMap = new Map(scores.map(s => [s.productId, s]));

    // Top sản phẩm theo profit score
    const topProducts: TopProductSummary[] = scores
      .slice(0, 10)
      .map(s => {
        const p = this.tracker.getProduct(s.productId);
        const stage = this.lifecycle.getStage(s.productId) || 'NEW';
        return {
          productId: s.productId,
          name: p?.name || 'Unknown',
          category: p?.category || '',
          clicks: p?.clicks || 0,
          profitScore: s.total,
          profitTier: s.tier,
          stage,
        };
      });

    // Channel performance 24h
    const clicksByChannel = this.events.getClicksByChannel(86_400_000);
    const totalChannelClicks = Object.values(clicksByChannel).reduce((a, b) => a + b, 0);
    const topChannels: ChannelPerformance[] = Object.entries(clicksByChannel)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, clicks]) => ({
        channel,
        clicks,
        share: totalChannelClicks > 0 ? Math.round((clicks / totalChannelClicks) * 100) : 0,
      }));

    // Best hours (top 5)
    const hourlyStats = this.events.getHourlyStats();
    const bestHours: BestHour[] = [...hourlyStats]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map(h => ({
        hour: h.hour,
        clicks: h.clicks,
        label: `${String(h.hour).padStart(2, '0')}:00`,
      }));

    const clicks24h = this.events.getClickCounts(86_400_000);
    const totalClicks24h = Object.values(clicks24h).reduce((a, b) => a + b, 0);

    return {
      topProducts,
      topChannels,
      bestHours,
      totalClicks24h,
      totalProductsTracked: allProducts.length,
      winnersCount: this.lifecycle.getWinners().length,
      losersCount: this.lifecycle.getLosers().length,
      generatedAt: new Date(),
    };
  }

  // Kênh có hiệu quả cao nhất trong 24h
  getBestChannel(): string {
    const byChannel = this.events.getClicksByChannel(86_400_000);
    if (Object.keys(byChannel).length === 0) return 'telegram';
    return Object.entries(byChannel).sort(([, a], [, b]) => b - a)[0][0];
  }

  // Giờ đăng tốt nhất trong tuần
  getBestPostHour(): number {
    const stats = this.events.getHourlyStats();
    return stats.reduce((best, h) => (h.clicks > best.clicks ? h : best), stats[0]).hour;
  }

  // Loại content (hook) nào hiệu quả nhất — xem qua channel breakdown
  getTopCategoryByClicks(): string {
    const all = this.tracker.getAllProducts();
    const byCat: Record<string, number> = {};
    for (const p of all) {
      byCat[p.category] = (byCat[p.category] || 0) + p.clicks;
    }
    const top = Object.entries(byCat).sort(([, a], [, b]) => b - a)[0];
    return top ? top[0] : 'Unknown';
  }
}
