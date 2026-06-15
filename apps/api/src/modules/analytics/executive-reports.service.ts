import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { RevenueOptimizationService } from './revenue-optimization.service';
import { SnapshotPeriod } from '../../database/entities/revenue-snapshot.entity';

export interface ExecutiveReport {
  type: 'daily' | 'weekly' | 'monthly';
  period: string;
  headline: string;
  kpis: Record<string, any>;
  topWins: string[];
  concerns: string[];
  actionItems: string[];
  generatedAt: Date;
}

@Injectable()
export class ExecutiveReportsService {
  private readonly logger = new Logger(ExecutiveReportsService.name);

  constructor(
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly optimization: RevenueOptimizationService,
    private readonly aiService: AiService,
  ) {}

  // ─── F03: Daily Report ────────────────────────────────────────────────────

  async generateDailyReport(): Promise<ExecutiveReport> {
    const kpis = await this.revenueAnalytics.getKpis('daily');

    const wins: string[] = [];
    const concerns: string[] = [];

    if (kpis.growthVsPrevious > 0) wins.push(`Doanh thu hôm nay tăng ${kpis.growthVsPrevious}% so với hôm qua`);
    if (kpis.newCustomers > 0) wins.push(`${kpis.newCustomers} khách hàng mới`);
    if (kpis.orders > 0) wins.push(`${kpis.orders} đơn hàng, AOV ${kpis.avgOrderValue.toLocaleString('vi-VN')}đ`);
    if (kpis.growthVsPrevious < -10) concerns.push(`Doanh thu giảm ${Math.abs(kpis.growthVsPrevious)}% so với hôm qua`);
    if (kpis.conversionRate < 5) concerns.push(`Tỷ lệ chuyển đổi thấp: ${kpis.conversionRate}%`);

    let headline: string;
    let actionItems: string[];

    try {
      const result = await this.aiService.parseJson<{ headline: string; actions: string[] }>(
        `KPIs hôm nay: Doanh thu ${kpis.revenue.toLocaleString('vi-VN')}đ, ${kpis.orders} đơn, ${kpis.newCustomers} KH mới, tăng trưởng ${kpis.growthVsPrevious}%.
Tạo tiêu đề báo cáo ngắn (1 câu) và 3 việc cần làm hôm nay. JSON: {"headline":"...","actions":["..."]}`,
        'CFO AI assistant. Tiếng Việt, chuyên nghiệp.',
      );
      headline = result.headline;
      actionItems = result.actions;
    } catch {
      headline = kpis.growthVsPrevious >= 0
        ? `Ngày tốt — ${kpis.orders} đơn, doanh thu ${kpis.revenue.toLocaleString('vi-VN')}đ`
        : `Cần chú ý — doanh thu giảm ${Math.abs(kpis.growthVsPrevious)}% hôm nay`;
      actionItems = ['Theo dõi đơn đang xử lý', 'Kiểm tra hàng tồn kho', 'Review lead mới'];
    }

    // Save daily snapshot
    await this.revenueAnalytics.createDailySnapshot();

    return {
      type: 'daily',
      period: kpis.period,
      headline,
      kpis,
      topWins: wins,
      concerns,
      actionItems,
      generatedAt: new Date(),
    };
  }

  // ─── F03: Weekly Report ───────────────────────────────────────────────────

  async generateWeeklyReport(): Promise<ExecutiveReport> {
    const [kpis, history, optimization] = await Promise.all([
      this.revenueAnalytics.getKpis('weekly'),
      this.revenueAnalytics.getSnapshotHistory(SnapshotPeriod.WEEKLY, 4),
      this.optimization.getOptimizationReport(),
    ]);

    const wins: string[] = [];
    const concerns: string[] = [];

    if (kpis.growthVsPrevious > 5)  wins.push(`Tăng trưởng tuần: +${kpis.growthVsPrevious}%`);
    if (kpis.newCustomers > 10)      wins.push(`${kpis.newCustomers} khách hàng mới trong tuần`);
    wins.push(...optimization.suggestions.slice(0, 2).map((s) => `Cơ hội: ${s.title}`));

    optimization.bottlenecks.filter((b) => b.severity === 'critical' || b.severity === 'high')
      .forEach((b) => concerns.push(`${b.area}: ${b.currentValue} (chuẩn: ${b.benchmark})`));

    let headline: string;
    let actionItems: string[];

    try {
      const result = await this.aiService.parseJson<{ headline: string; actions: string[] }>(
        `Báo cáo tuần: Doanh thu ${kpis.revenue.toLocaleString('vi-VN')}đ, ${kpis.orders} đơn, tăng trưởng ${kpis.growthVsPrevious}%.
Bottlenecks: ${optimization.bottlenecks.map((b) => b.area).join(', ') || 'không có'}.
Tóm tắt 1 câu và 3 action items cho tuần tới. JSON: {"headline":"...","actions":["..."]}`,
        'CEO AI assistant. Chiến lược, quyết đoán, tiếng Việt.',
      );
      headline = result.headline;
      actionItems = result.actions;
    } catch {
      headline = `Tuần ${kpis.period}: ${kpis.orders} đơn, ${kpis.revenue.toLocaleString('vi-VN')}đ doanh thu`;
      actionItems = [optimization.topPriority, ...optimization.suggestions.slice(0, 2).map((s) => s.title)];
    }

    return {
      type: 'weekly',
      period: kpis.period,
      headline,
      kpis: { ...kpis, snapshotHistory: history.slice(0, 4) },
      topWins: wins,
      concerns,
      actionItems,
      generatedAt: new Date(),
    };
  }

  // ─── F03: Monthly Report ──────────────────────────────────────────────────

  async generateMonthlyReport(): Promise<ExecutiveReport> {
    const [kpis, forecast, optimization, monthHistory] = await Promise.all([
      this.revenueAnalytics.getKpis('monthly'),
      this.revenueAnalytics.forecast('monthly'),
      this.optimization.getOptimizationReport(),
      this.revenueAnalytics.getSnapshotHistory(SnapshotPeriod.MONTHLY, 6),
    ]);

    const wins: string[] = [];
    const concerns: string[] = [];

    if (kpis.growthVsPrevious > 0)
      wins.push(`Tăng trưởng tháng: +${kpis.growthVsPrevious}%`);
    if (forecast.trendDirection === 'up')
      wins.push(`Dự báo tháng tới: ${forecast.predictedRevenue.toLocaleString('vi-VN')}đ (+${((forecast.predictedRevenue - kpis.revenue) / kpis.revenue * 100).toFixed(1)}%)`);

    optimization.bottlenecks.forEach((b) => concerns.push(`[${b.severity.toUpperCase()}] ${b.area}: ${b.fix}`));
    if (kpis.growthVsPrevious < 0)
      concerns.push(`Doanh thu giảm ${Math.abs(kpis.growthVsPrevious)}% so với tháng trước`);

    let headline: string;
    let actionItems: string[];

    try {
      const result = await this.aiService.parseJson<{ headline: string; actions: string[] }>(
        `Báo cáo tháng ${kpis.period}:
- Doanh thu: ${kpis.revenue.toLocaleString('vi-VN')}đ (${kpis.growthVsPrevious >= 0 ? '+' : ''}${kpis.growthVsPrevious}% MoM)
- Đơn hàng: ${kpis.orders}, AOV: ${kpis.avgOrderValue.toLocaleString('vi-VN')}đ
- Khách mới: ${kpis.newCustomers}
- Dự báo tháng tới: ${forecast.predictedRevenue.toLocaleString('vi-VN')}đ (${forecast.confidenceLevel} confidence)
- Bottlenecks chính: ${optimization.bottlenecks.slice(0, 2).map((b) => b.area).join(', ') || 'không có'}

Tổng kết 1 câu và 5 action items chiến lược cho tháng tới. JSON: {"headline":"...","actions":["..."]}`,
        'Board-level AI CEO assistant. Chiến lược dài hạn, tiếng Việt.',
      );
      headline = result.headline;
      actionItems = result.actions;
    } catch {
      headline = `Tháng ${kpis.period}: ${kpis.revenue.toLocaleString('vi-VN')}đ — ${kpis.growthVsPrevious >= 0 ? 'Tăng trưởng tốt' : 'Cần cải thiện'}`;
      actionItems = [
        optimization.topPriority,
        ...optimization.suggestions.map((s) => s.title),
      ].slice(0, 5);
    }

    return {
      type: 'monthly',
      period: kpis.period,
      headline,
      kpis: { ...kpis, forecast, monthHistory: monthHistory.slice(0, 6) },
      topWins: wins,
      concerns,
      actionItems,
      generatedAt: new Date(),
    };
  }

  // ─── Scheduled auto-generation ────────────────────────────────────────────

  @Cron('0 6 * * *')
  async scheduledDailyReport(): Promise<void> {
    this.logger.log('Executive Reports: generating daily report...');
    await this.generateDailyReport();
  }

  @Cron('0 7 * * 1')
  async scheduledWeeklyReport(): Promise<void> {
    this.logger.log('Executive Reports: generating weekly report...');
    await this.generateWeeklyReport();
  }

  @Cron('0 7 1 * *')
  async scheduledMonthlyReport(): Promise<void> {
    this.logger.log('Executive Reports: generating monthly report...');
    await this.generateMonthlyReport();
  }
}
