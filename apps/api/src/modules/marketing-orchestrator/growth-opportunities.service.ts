import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Product } from '../../database/entities/product.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Order } from '../../database/entities/order.entity';

export interface TrendSignal {
  type: 'product_trend' | 'keyword_trend' | 'category_trend';
  name: string;
  score: number;
  growth: string;
  recommendation: string;
}

export interface MarketExpansion {
  opportunity: string;
  channel: string;
  estimatedReach: number;
  effort: 'low' | 'medium' | 'high';
  expectedImpact: 'low' | 'medium' | 'high';
  actionPlan: string;
}

export interface GrowthReport {
  trends: TrendSignal[];
  expansions: MarketExpansion[];
  quickWins: string[];
  generatedAt: Date;
}

@Injectable()
export class GrowthOpportunitiesService {
  private readonly logger = new Logger(GrowthOpportunitiesService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Lead)    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Order)   private readonly orderRepo: Repository<Order>,
  ) {}

  // ─── F03: Trend Detection ─────────────────────────────────────────────────

  async detectTrends(): Promise<TrendSignal[]> {
    const topProducts = await this.productRepo.find({
      order: { trendScore: 'DESC' },
      take: 20,
    });

    // Detect trending categories
    const categoryMap = new Map<string, { count: number; totalTrend: number }>();
    for (const p of topProducts) {
      const key = p.category || 'uncategorized';
      const existing = categoryMap.get(key) || { count: 0, totalTrend: 0 };
      categoryMap.set(key, { count: existing.count + 1, totalTrend: existing.totalTrend + (p.trendScore || 0) });
    }

    const categoryTrends: TrendSignal[] = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        type: 'category_trend' as const,
        name,
        score: Math.round(data.totalTrend / data.count),
        growth: `+${Math.round(data.totalTrend / data.count * 0.3)}%`,
        recommendation: `Tăng cường nội dung và ads cho category "${name}"`,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const productTrends: TrendSignal[] = topProducts.slice(0, 5).map((p) => ({
      type: 'product_trend' as const,
      name: p.name,
      score: p.trendScore || 0,
      growth: `+${Math.round((p.trendScore || 0) * 0.5)}%`,
      recommendation: `Tạo content viral cho "${p.name}" — đang trending`,
    }));

    // AI enrichment
    let aiSignals: TrendSignal[] = [];
    try {
      const topNames = topProducts.slice(0, 10).map((p) => `${p.name} (score:${p.trendScore})`).join(', ');
      const result = await this.aiService.parseJson<{ trends: Array<{ name: string; recommendation: string }> }>(
        `Sản phẩm trending: ${topNames}. Phát hiện 2 xu hướng thị trường tiềm năng. JSON: {"trends":[{"name":"...","recommendation":"..."}]}`,
        'Bạn là market analyst Việt Nam. Ngắn gọn, thực tế.',
      );
      aiSignals = (result.trends || []).map((t) => ({
        type: 'keyword_trend' as const,
        name: t.name,
        score: 70,
        growth: '+20%',
        recommendation: t.recommendation,
      }));
    } catch { /* skip */ }

    return [...productTrends, ...categoryTrends, ...aiSignals].slice(0, 8);
  }

  // ─── F03: Market Expansion ────────────────────────────────────────────────

  async identifyExpansions(): Promise<MarketExpansion[]> {
    const [totalLeads, totalOrders] = await Promise.all([
      this.leadRepo.count(),
      this.orderRepo.count(),
    ]);

    const leadPlatforms = await this.leadRepo
      .createQueryBuilder('l')
      .select('l.platform', 'platform')
      .addSelect('COUNT(l.id)', 'count')
      .groupBy('l.platform')
      .getRawMany();

    const usedChannels = new Set(leadPlatforms.map((p) => p.platform));

    const expansions: MarketExpansion[] = [];

    // Suggest channels not yet used
    if (!usedChannels.has('zalo')) {
      expansions.push({
        opportunity: 'Zalo OA — 74M người dùng Việt Nam',
        channel: 'Zalo',
        estimatedReach: 50000,
        effort: 'low',
        expectedImpact: 'high',
        actionPlan: 'Tạo Zalo Official Account, thiết lập chatbot và broadcast đến khách hàng cũ',
      });
    }

    if (!usedChannels.has('tiktok') || leadPlatforms.find((p) => p.platform === 'tiktok')?.count < 100) {
      expansions.push({
        opportunity: 'TikTok Shop — ROAS trung bình 3-5x',
        channel: 'TikTok',
        estimatedReach: 100000,
        effort: 'medium',
        expectedImpact: 'high',
        actionPlan: 'Tạo TikTok Shop, livestream bán hàng 3 buổi/tuần, hợp tác KOC micro',
      });
    }

    if (totalOrders > 50) {
      expansions.push({
        opportunity: 'Dropship B2B — bán sỉ cho reseller',
        channel: 'Direct B2B',
        estimatedReach: 1000,
        effort: 'medium',
        expectedImpact: 'high',
        actionPlan: 'Tạo bảng giá sỉ, tuyển reseller qua Facebook Groups, hỗ trợ marketing kit',
      });
    }

    expansions.push({
      opportunity: 'SEO Long-tail — traffic organic miễn phí',
      channel: 'Google Search',
      estimatedReach: 10000,
      effort: 'low',
      expectedImpact: 'medium',
      actionPlan: 'Tạo 20 bài blog review sản phẩm với keyword dài, tối ưu on-page SEO',
    });

    return expansions;
  }

  // ─── F03: Full Growth Report ──────────────────────────────────────────────

  async getGrowthReport(): Promise<GrowthReport> {
    const [trends, expansions] = await Promise.all([
      this.detectTrends(),
      this.identifyExpansions(),
    ]);

    let quickWins: string[];
    try {
      const topTrend = trends[0]?.name || 'top products';
      const topExpansion = expansions[0]?.opportunity || 'new channel';

      const result = await this.aiService.parseJson<{ quickWins: string[] }>(
        `Trending: ${topTrend}. Cơ hội mở rộng: ${topExpansion}. Đề xuất 3 quick wins có thể triển khai ngay trong 1 tuần. JSON: {"quickWins":["..."]}`,
        'CMO startup e-commerce. Thực tế, actionable.',
      );
      quickWins = result.quickWins;
    } catch {
      quickWins = [
        `Chạy flash sale 24h cho top sản phẩm trending`,
        'Tạo 5 short video TikTok với sản phẩm hot nhất',
        'Gửi win-back email/SMS cho khách inactive 30 ngày',
      ];
    }

    return { trends, expansions, quickWins, generatedAt: new Date() };
  }
}
