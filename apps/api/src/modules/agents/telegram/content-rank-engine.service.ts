import { Injectable, Logger } from '@nestjs/common';
import { EngagementScoreService } from './engagement-score.service';

export type RankAction = 'BOOST' | 'HOLD' | 'STOP';

export interface RankResult {
  productId: string;
  score: number;
  action: RankAction;
  impressions: number;
  clicks: number;
}

// Giống TikTok Ads: >80 boost, 50-80 hold test, <50 stop
const BOOST_THRESHOLD = 80;
const STOP_THRESHOLD = 50;
const MIN_IMPRESSIONS = 3;

@Injectable()
export class ContentRankEngineService {
  private readonly logger = new Logger(ContentRankEngineService.name);

  constructor(private readonly engagement: EngagementScoreService) {}

  rank(productId: string): RankResult {
    const s = this.engagement.compute(productId);

    if (s.impressions < MIN_IMPRESSIONS) {
      return { productId, score: s.score, action: 'HOLD', impressions: s.impressions, clicks: s.clicks };
    }

    let action: RankAction;
    if (s.score >= BOOST_THRESHOLD) {
      action = 'BOOST';
    } else if (s.score >= STOP_THRESHOLD) {
      action = 'HOLD';
    } else {
      action = 'STOP';
    }

    this.logger.debug(`Rank [${productId}] score=${s.score} → ${action}`);
    return { productId, score: s.score, action, impressions: s.impressions, clicks: s.clicks };
  }

  rankAll(): RankResult[] {
    return this.engagement
      .computeAll()
      .filter(s => s.impressions >= MIN_IMPRESSIONS)
      .map(s => this.rank(s.productId))
      .sort((a, b) => b.score - a.score);
  }

  getLeaderboard(limit = 20): RankResult[] {
    return this.rankAll().slice(0, limit);
  }
}
