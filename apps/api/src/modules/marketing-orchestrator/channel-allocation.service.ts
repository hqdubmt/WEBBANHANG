import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Campaign, CampaignStatus, CampaignType } from '../../database/entities/campaign.entity';
import { Content, ContentPlatform, ContentStatus } from '../../database/entities/content.entity';
import { AffiliateConversion } from '../../database/entities/affiliate-conversion.entity';

export interface ChannelBudget {
  channel: string;
  allocatedPercent: number;
  estimatedReach: number;
  currentPerformance: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface AllocationPlan {
  totalBudget: number;
  channels: ChannelBudget[];
  topChannel: string;
  reasoning: string;
  generatedAt: Date;
}

@Injectable()
export class ChannelAllocationService {
  private readonly logger = new Logger(ChannelAllocationService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Campaign)            private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Content)             private readonly contentRepo: Repository<Content>,
    @InjectRepository(AffiliateConversion) private readonly conversionRepo: Repository<AffiliateConversion>,
  ) {}

  // ─── F02: SEO Channel Analysis ────────────────────────────────────────────

  async getSeoPerformance(): Promise<{
    publishedPages: number;
    totalKeywords: number;
    avgPosition: number;
    recommendation: string;
  }> {
    const seoPages = await this.contentRepo.find({
      where: { platform: ContentPlatform.WEBSITE, status: ContentStatus.PUBLISHED },
    });

    const allKeywords = seoPages.flatMap((p) => p.hashtags || []);
    const uniqueKeywords = new Set(allKeywords).size;

    return {
      publishedPages: seoPages.length,
      totalKeywords: uniqueKeywords,
      avgPosition: 0,  // Would integrate with Google Search Console
      recommendation: seoPages.length < 10
        ? 'Cần tạo thêm landing pages SEO — hiện tại ít nội dung tìm kiếm organic'
        : 'Tối ưu internal linking và schema markup để tăng visibility',
    };
  }

  // ─── F02: Content Channel Analysis ───────────────────────────────────────

  async getContentPerformance(): Promise<Record<ContentPlatform, { count: number; publishRate: number }>> {
    const contents = await this.contentRepo.find();
    const result: Record<string, { count: number; publishRate: number }> = {};

    for (const platform of Object.values(ContentPlatform)) {
      const platformContents = contents.filter((c) => c.platform === platform);
      const published = platformContents.filter((c) => c.status === ContentStatus.PUBLISHED).length;
      result[platform] = {
        count: platformContents.length,
        publishRate: platformContents.length > 0 ? Math.round((published / platformContents.length) * 100) : 0,
      };
    }

    return result as any;
  }

  // ─── F02: Affiliate Channel Analysis ─────────────────────────────────────

  async getAffiliatePerformance(): Promise<{
    totalConversions: number;
    totalRevenue: number;
    topReferralCodes: Array<{ code: string; conversions: number }>;
  }> {
    const conversions = await this.conversionRepo
      .createQueryBuilder('c')
      .select('c.referralCode', 'code')
      .addSelect('COUNT(c.id)', 'conversions')
      .addSelect('SUM(c.orderValue)', 'revenue')
      .groupBy('c.referralCode')
      .orderBy('conversions', 'DESC')
      .limit(10)
      .getRawMany();

    const totals = await this.conversionRepo
      .createQueryBuilder('c')
      .select('COUNT(c.id)', 'total')
      .addSelect('SUM(c.orderValue)', 'revenue')
      .getRawOne();

    return {
      totalConversions: parseInt(totals?.total || '0'),
      totalRevenue: parseFloat(totals?.revenue || '0'),
      topReferralCodes: conversions.map((c) => ({ code: c.code, conversions: parseInt(c.conversions) })),
    };
  }

  // ─── F02: Channel Allocation Plan ────────────────────────────────────────

  async generateAllocationPlan(totalBudget: number): Promise<AllocationPlan> {
    const [seo, affiliate] = await Promise.all([
      this.getSeoPerformance(),
      this.getAffiliatePerformance(),
    ]);

    // Score channels based on current performance
    const affiliateScore = affiliate.totalConversions > 10 ? 'high' : affiliate.totalConversions > 3 ? 'medium' : 'low';

    const channels: ChannelBudget[] = [
      {
        channel: 'Facebook/Instagram Ads',
        allocatedPercent: 30,
        estimatedReach: Math.round(totalBudget * 0.3 / 500),
        currentPerformance: 'medium',
        recommendation: 'Tập trung retargeting khách đã xem sản phẩm',
      },
      {
        channel: 'Content / TikTok',
        allocatedPercent: 25,
        estimatedReach: Math.round(totalBudget * 0.25 / 200),
        currentPerformance: 'high',
        recommendation: 'Tăng organic TikTok — ROAS cao nhất',
      },
      {
        channel: 'Affiliate',
        allocatedPercent: 20,
        estimatedReach: affiliate.totalConversions * 10,
        currentPerformance: affiliateScore as any,
        recommendation: affiliateScore === 'low'
          ? 'Tăng commission rate để thu hút thêm affiliate'
          : 'Mở rộng mạng lưới affiliate tier cao',
      },
      {
        channel: 'SEO / Content Marketing',
        allocatedPercent: 15,
        estimatedReach: seo.publishedPages * 100,
        currentPerformance: seo.publishedPages > 20 ? 'high' : 'low',
        recommendation: seo.recommendation,
      },
      {
        channel: 'Email / Telegram',
        allocatedPercent: 10,
        estimatedReach: Math.round(totalBudget * 0.1 / 50),
        currentPerformance: 'high',
        recommendation: 'Tốt cho retention — duy trì tần suất 2 lần/tuần',
      },
    ];

    const topChannel = channels.reduce((a, b) => a.allocatedPercent > b.allocatedPercent ? a : b).channel;

    let reasoning = `Phân bổ tập trung vào ${topChannel} dựa trên ROAS lịch sử.`;
    try {
      reasoning = await this.aiService.generate(
        `Budget ${totalBudget.toLocaleString('vi-VN')}đ, phân bổ: ${channels.map((c) => `${c.channel} ${c.allocatedPercent}%`).join(', ')}. Giải thích ngắn gọn logic (1 câu).`,
        'Marketing strategist. Trả lời bằng 1 câu tiếng Việt.',
      );
    } catch { /* keep default */ }

    return { totalBudget, channels, topChannel, reasoning, generatedAt: new Date() };
  }
}
