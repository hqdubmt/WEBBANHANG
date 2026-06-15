import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';

export interface Bottleneck {
  area: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric: string;
  currentValue: string;
  benchmark: string;
  impact: string;
  fix: string;
}

export interface GrowthSuggestion {
  title: string;
  category: 'revenue' | 'conversion' | 'retention' | 'acquisition';
  estimatedImpact: string;
  effort: 'quick_win' | 'medium' | 'long_term';
  steps: string[];
}

export interface OptimizationReport {
  bottlenecks: Bottleneck[];
  suggestions: GrowthSuggestion[];
  topPriority: string;
  generatedAt: Date;
}

@Injectable()
export class RevenueOptimizationService {
  private readonly logger = new Logger(RevenueOptimizationService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Order)    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Lead)     private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Product)  private readonly productRepo: Repository<Product>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  // ─── F02: Bottleneck Detection ────────────────────────────────────────────

  async detectBottlenecks(): Promise<Bottleneck[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const bottlenecks: Bottleneck[] = [];

    const [
      totalLeads,
      convertedLeads,
      cancelledOrders,
      totalOrders,
      lowStockCount,
      churnRiskCount,
      totalCustomers,
    ] = await Promise.all([
      this.leadRepo.createQueryBuilder('l').where('l.createdAt >= :d', { d: thirtyDaysAgo }).getCount(),
      this.leadRepo.createQueryBuilder('l')
        .where('l.status = :s', { s: LeadStatus.CONVERTED })
        .andWhere('l.createdAt >= :d', { d: thirtyDaysAgo })
        .getCount(),
      this.orderRepo.count({ where: { status: OrderStatus.CANCELLED } }),
      this.orderRepo.createQueryBuilder('o').where('o.createdAt >= :d', { d: thirtyDaysAgo }).getCount(),
      this.productRepo.createQueryBuilder('p').where('p.stock <= 5 AND p.stock > 0').getCount(),
      this.customerRepo.createQueryBuilder('c').where('c.churnRisk >= 70').getCount(),
      this.customerRepo.count(),
    ]);

    // Lead conversion rate
    const convRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    if (convRate < 10) {
      bottlenecks.push({
        area: 'Lead Conversion',
        severity: convRate < 3 ? 'critical' : 'high',
        metric: 'Tỷ lệ chuyển đổi Lead',
        currentValue: `${convRate.toFixed(1)}%`,
        benchmark: '15-25%',
        impact: `Nếu tăng lên 15%, doanh thu tăng ${Math.round(totalLeads * 0.05 * 500000).toLocaleString('vi-VN')}đ/tháng (ước tính)`,
        fix: 'Thiết lập follow-up tự động trong 1h đầu sau khi lead đăng ký. Cải thiện script bán hàng.',
      });
    }

    // Cancellation rate
    const cancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    if (cancelRate > 15) {
      bottlenecks.push({
        area: 'Order Cancellations',
        severity: cancelRate > 25 ? 'critical' : 'high',
        metric: 'Tỷ lệ hủy đơn',
        currentValue: `${cancelRate.toFixed(1)}%`,
        benchmark: '<10%',
        impact: 'Doanh thu thực tế thấp hơn đáng kể so với số đơn đặt',
        fix: 'Xác nhận đơn qua điện thoại trong 30 phút. Cải thiện mô tả sản phẩm để giảm kỳ vọng sai.',
      });
    }

    // Low stock
    if (lowStockCount > 5) {
      bottlenecks.push({
        area: 'Inventory',
        severity: 'medium',
        metric: 'Sản phẩm sắp hết hàng',
        currentValue: `${lowStockCount} sản phẩm`,
        benchmark: '<3 sản phẩm',
        impact: 'Mất đơn hàng tiềm năng khi hết stock đột ngột',
        fix: 'Thiết lập cảnh báo tự động khi stock ≤ 10. Đặt hàng trước 2 tuần.',
      });
    }

    // Churn risk
    const churnRate = totalCustomers > 0 ? (churnRiskCount / totalCustomers) * 100 : 0;
    if (churnRate > 20) {
      bottlenecks.push({
        area: 'Customer Retention',
        severity: churnRate > 40 ? 'critical' : 'high',
        metric: 'Khách hàng có nguy cơ rời bỏ',
        currentValue: `${churnRiskCount} khách (${churnRate.toFixed(1)}%)`,
        benchmark: '<15%',
        impact: `Mất ${churnRiskCount} khách = mất LTV ước tính cao`,
        fix: 'Triển khai retention campaign ngay cho ${churnRiskCount} khách. Gửi win-back offer 20%.',
      });
    }

    return bottlenecks;
  }

  // ─── F02: Growth Suggestions ──────────────────────────────────────────────

  async getGrowthSuggestions(): Promise<GrowthSuggestion[]> {
    const bottlenecks = await this.detectBottlenecks();
    const topProduct = await this.productRepo.findOne({ order: { trendScore: 'DESC' } });

    let aiSuggestions: GrowthSuggestion[] = [];
    try {
      const context = bottlenecks.map((b) => `${b.area}: ${b.currentValue} (target: ${b.benchmark})`).join('; ');
      const result = await this.aiService.parseJson<{ suggestions: Array<{
        title: string;
        category: string;
        estimatedImpact: string;
        effort: string;
        steps: string[];
      }> }>(
        `Bottlenecks: ${context || 'không có bottleneck rõ rệt'}. Sản phẩm hot: ${topProduct?.name || 'N/A'}.
Đề xuất 3 chiến lược tăng doanh thu. JSON: {"suggestions":[{"title":"...","category":"revenue","estimatedImpact":"...","effort":"quick_win","steps":["..."]}]}`,
        'Revenue strategist. Đề xuất thực tế, có thể thực hiện ngay.',
      );
      aiSuggestions = (result.suggestions || []).map((s) => ({
        ...s,
        category: (s.category as any) || 'revenue',
        effort: (s.effort as any) || 'medium',
        steps: s.steps || [],
      }));
    } catch { /* use defaults */ }

    const defaults: GrowthSuggestion[] = [
      {
        title: 'Flash Sale 48h cho top sản phẩm',
        category: 'revenue',
        estimatedImpact: '+20-40% doanh thu trong 2 ngày',
        effort: 'quick_win',
        steps: ['Chọn 3-5 sản phẩm margin cao', 'Tạo content TikTok + Facebook', 'Bật countdown timer', 'Theo dõi theo giờ'],
      },
      {
        title: 'Upsell Bundle Pack',
        category: 'revenue',
        estimatedImpact: '+15% AOV (Average Order Value)',
        effort: 'medium',
        steps: ['Tạo 3 combo sản phẩm', 'Thiết lập rule upsell trên checkout', 'Track conversion rate bundle'],
      },
      {
        title: 'Win-back Campaign cho khách inactive',
        category: 'retention',
        estimatedImpact: '+10-15% repeat purchase rate',
        effort: 'quick_win',
        steps: ['Lọc khách không mua 30+ ngày', 'Gửi coupon 15% hết hạn 72h', 'Follow-up call top khách VIP'],
      },
    ];

    return aiSuggestions.length ? aiSuggestions : defaults;
  }

  async getOptimizationReport(): Promise<OptimizationReport> {
    const [bottlenecks, suggestions] = await Promise.all([
      this.detectBottlenecks(),
      this.getGrowthSuggestions(),
    ]);

    const topPriority = bottlenecks.length > 0
      ? `Ưu tiên xử lý: ${bottlenecks[0].area} — ${bottlenecks[0].fix}`
      : suggestions[0]?.title || 'Duy trì hiệu suất tốt — không có bottleneck nghiêm trọng';

    return { bottlenecks, suggestions, topPriority, generatedAt: new Date() };
  }
}
