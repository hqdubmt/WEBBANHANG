import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { RevenueOptimizationService } from './revenue-optimization.service';
import { ExecutiveReportsService } from './executive-reports.service';
import { SnapshotPeriod } from '../../database/entities/revenue-snapshot.entity';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService,
    private readonly revenueAnalytics: RevenueAnalyticsService,
    private readonly optimization: RevenueOptimizationService,
    private readonly reports: ExecutiveReportsService,
  ) {}

  // ─── Existing endpoints ───────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard tổng quan' })
  dashboard() { return this.service.getDashboard(); }

  @Get('revenue')
  @ApiOperation({ summary: 'Thống kê doanh thu' })
  revenue() { return this.service.getRevenueSummary(); }

  @Get('leads')
  @ApiOperation({ summary: 'Thống kê lead' })
  leads() { return this.service.getLeadSummary(); }

  @Get('customers')
  @ApiOperation({ summary: 'Thống kê khách hàng' })
  customers() { return this.service.getCustomerSummary(); }

  @Get('ai')
  @ApiOperation({ summary: 'Thống kê AI token & chi phí' })
  ai() { return this.service.getAiSummary(); }

  @Get('content')
  @ApiOperation({ summary: 'Thống kê nội dung' })
  content() { return this.service.getContentSummary(); }

  // ─── EPIC 13 F01: Revenue Analytics ──────────────────────────────────────

  @Get('kpi')
  @ApiOperation({ summary: 'Revenue Analytics — KPI tracking theo kỳ' })
  kpi(@Query('period') period?: 'daily' | 'weekly' | 'monthly') {
    return this.revenueAnalytics.getKpis(period);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Revenue Analytics — dự báo doanh thu kỳ tiếp theo' })
  forecast(@Query('period') period?: 'weekly' | 'monthly') {
    return this.revenueAnalytics.forecast(period);
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Revenue Analytics — lịch sử snapshot doanh thu' })
  snapshots(
    @Query('period') period?: SnapshotPeriod,
    @Query('limit') limit?: number,
  ) {
    return this.revenueAnalytics.getSnapshotHistory(period || SnapshotPeriod.DAILY, limit);
  }

  // ─── EPIC 13 F02: Revenue Optimization ───────────────────────────────────

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Revenue Optimization — phát hiện bottleneck' })
  bottlenecks() { return this.optimization.detectBottlenecks(); }

  @Get('growth-suggestions')
  @ApiOperation({ summary: 'Revenue Optimization — đề xuất tăng trưởng' })
  growthSuggestions() { return this.optimization.getGrowthSuggestions(); }

  @Get('optimization-report')
  @ApiOperation({ summary: 'Revenue Optimization — báo cáo tối ưu đầy đủ' })
  optimizationReport() { return this.optimization.getOptimizationReport(); }

  // ─── EPIC 13 F03: Executive Reports ──────────────────────────────────────

  @Post('reports/daily')
  @ApiOperation({ summary: 'Executive Report — báo cáo hàng ngày' })
  dailyReport() { return this.reports.generateDailyReport(); }

  @Post('reports/weekly')
  @ApiOperation({ summary: 'Executive Report — báo cáo hàng tuần' })
  weeklyReport() { return this.reports.generateWeeklyReport(); }

  @Post('reports/monthly')
  @ApiOperation({ summary: 'Executive Report — báo cáo hàng tháng' })
  monthlyReport() { return this.reports.generateMonthlyReport(); }
}
