import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Order } from '../../database/entities/order.entity';
import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';

export interface MarketingGoal {
  period: 'weekly' | 'monthly' | 'quarterly';
  revenueTarget: number;
  leadsTarget: number;
  conversionRateTarget: number;
  retentionRateTarget: number;
}

export interface AudienceSegment {
  name: string;
  size: number;
  characteristics: string[];
  recommendedChannel: string;
  recommendedMessage: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MarketingStrategy {
  period: string;
  goals: MarketingGoal;
  audiences: AudienceSegment[];
  priorityActions: string[];
  estimatedROI: string;
  generatedAt: Date;
}

@Injectable()
export class StrategyEngineService {
  private readonly logger = new Logger(StrategyEngineService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Lead)     private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Order)    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Campaign) private readonly campaignRepo: Repository<Campaign>,
  ) {}

  // ─── F01: Goal Planning ───────────────────────────────────────────────────

  async planGoals(period: MarketingGoal['period'] = 'monthly'): Promise<MarketingGoal> {
    // Gather current metrics for context
    const [totalCustomers, totalLeads, recentOrders] = await Promise.all([
      this.customerRepo.count(),
      this.leadRepo.count(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.total)', 'revenue')
        .addSelect('COUNT(o.id)', 'orders')
        .where("o.createdAt >= NOW() - INTERVAL '30 days'")
        .getRawOne(),
    ]);

    const currentRevenue = parseFloat(recentOrders?.revenue || '0');
    const currentConvRate = totalLeads > 0 ? (parseFloat(recentOrders?.orders || '0') / totalLeads) * 100 : 2;

    // Targets: 20% growth for monthly, adjusted for period
    const growthFactor = period === 'weekly' ? 1.05 : period === 'monthly' ? 1.2 : 1.5;

    const goals: MarketingGoal = {
      period,
      revenueTarget: Math.round(currentRevenue * growthFactor),
      leadsTarget: Math.round(totalLeads * growthFactor * 0.3),
      conversionRateTarget: Math.min(currentConvRate * 1.1, 25),
      retentionRateTarget: 70,
    };

    this.logger.log(`Goals planned for ${period}: revenue=${goals.revenueTarget.toLocaleString('vi-VN')}đ`);
    return goals;
  }

  // ─── F01: Audience Planning ───────────────────────────────────────────────

  async planAudiences(): Promise<AudienceSegment[]> {
    const [vipCount, regularCount, newCount, atRiskCount] = await Promise.all([
      this.customerRepo.count({ where: { tier: CustomerTier.VIP } }),
      this.customerRepo.count({ where: { tier: CustomerTier.REGULAR } }),
      this.customerRepo.count({ where: { tier: CustomerTier.NEW } }),
      this.customerRepo.createQueryBuilder('c').where('c.churnRisk >= 60').getCount(),
    ]);

    const segments: AudienceSegment[] = [
      {
        name: 'VIP Champions',
        size: vipCount,
        characteristics: ['High LTV', 'Frequent buyer', 'Brand advocate'],
        recommendedChannel: 'Telegram + Phone',
        recommendedMessage: 'Ưu đãi độc quyền VIP, early access sản phẩm mới',
        priority: 'high',
      },
      {
        name: 'Regular Loyal',
        size: regularCount,
        characteristics: ['Consistent buyer', 'Price-conscious'],
        recommendedChannel: 'Email + Facebook',
        recommendedMessage: 'Flash sale, bundle deals, loyalty points',
        priority: 'high',
      },
      {
        name: 'At-Risk',
        size: atRiskCount,
        characteristics: ['Inactive 30+ days', 'High churn risk'],
        recommendedChannel: 'Push + SMS',
        recommendedMessage: 'Win-back offer: giảm 20% cho đơn tiếp theo',
        priority: 'high',
      },
      {
        name: 'New Customers',
        size: newCount,
        characteristics: ['First-time buyers', 'Discovery phase'],
        recommendedChannel: 'Facebook + TikTok',
        recommendedMessage: 'Welcome offer, product education, social proof',
        priority: 'medium',
      },
    ];

    return segments.filter((s) => s.size > 0);
  }

  // ─── Full Strategy Generation ─────────────────────────────────────────────

  async generateStrategy(period: MarketingGoal['period'] = 'monthly'): Promise<MarketingStrategy> {
    const [goals, audiences] = await Promise.all([
      this.planGoals(period),
      this.planAudiences(),
    ]);

    let priorityActions: string[];
    let estimatedROI: string;

    try {
      const contextSummary = `
Khách hàng: ${audiences.reduce((s, a) => s + a.size, 0)} tổng
Mục tiêu doanh thu ${period}: ${goals.revenueTarget.toLocaleString('vi-VN')}đ
Chiến lược audiences: ${audiences.map((a) => `${a.name} (${a.size})`).join(', ')}`;

      const result = await this.aiService.parseJson<{ actions: string[]; roi: string }>(
        `${contextSummary}\n\nĐề xuất 5 hành động marketing ưu tiên và ROI ước tính. JSON: {"actions":["..."],"roi":"..."}`,
        'Bạn là CMO của startup e-commerce Việt Nam. Thực tế, ngắn gọn.',
      );
      priorityActions = result.actions;
      estimatedROI = result.roi;
    } catch {
      priorityActions = [
        'Re-engage at-risk customers với win-back campaign',
        'Chạy content TikTok cho top 5 sản phẩm trending',
        'Nâng tier loyalty cho khách Regular → VIP',
        'Tối ưu affiliate commission cho sản phẩm high-margin',
        'A/B test Facebook ads với 2 audience segments',
      ];
      estimatedROI = `${Math.round(goals.revenueTarget / 1000000 * 15)}%`;
    }

    return { period, goals, audiences, priorityActions, estimatedROI, generatedAt: new Date() };
  }
}
